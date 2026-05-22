import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger, loadEnv } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Express } from "express";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { log } from "./static";

const viteLogger = createLogger();

function resolveViteMode(): string {
  const modeIndex = process.argv.indexOf('--mode');
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : undefined;
  return mode && !mode.startsWith('-') ? mode : 'development';
}

export async function setupVite(app: Express, server: Server) {
  const mode = resolveViteMode();
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  // WSL/Windows file-watcher fix:
  // When the dev server runs inside WSL with the project on /mnt/c, native
  // inotify does NOT receive events for files written from the Windows side.
  // This caused every CSS/TSX edit to silently fail to hot-reload — Vite
  // would keep serving the in-memory bundle from boot until restart.
  // Polling works correctly across the WSL/Windows boundary.
  // HMR client port must be explicit: `httpServer.address()` returns null
  // here because `setupVite` runs before `server.listen()`, so Vite cannot
  // derive the port to embed in the injected client config (results in
  // `ws://localhost:undefined/...` in the browser).
  const hmrPort = parseInt(process.env.PORT || '5000', 10);
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, port: hmrPort, clientPort: hmrPort },
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 300,
    },
  } as const;

  const resolvedConfig = typeof viteConfig === 'function'
    ? viteConfig({ command: 'serve', mode } as any)
    : viteConfig;

  const vite = await createViteServer({
    ...resolvedConfig,
    mode,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = url.split('?')[0] ?? url;

    if (pathname.startsWith('/.well-known/') || pathname.endsWith('.json')) {
      res.status(404).end();
      return;
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
