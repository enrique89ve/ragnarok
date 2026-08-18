import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { visualizer } from "rollup-plugin-visualizer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SENSITIVE_PUBLIC_ENV_RE = /^VITE_.*(?:KEY|SECRET|TOKEN|PASSWORD|PRIVATE|WIF)/i;
const HIVE_PRIVATE_KEY_VALUE_RE = /^(?:PVT_[A-Z0-9]+_[1-9A-HJ-NP-Za-km-z]+|[5KL][1-9A-HJ-NP-Za-km-z]{50,51})$/;
const URL_CREDENTIALS_RE = /^[a-z][a-z0-9+.-]*:\/\/[^/?#\s:@]+:[^/?#\s@]+@/i;
const URL_SECRET_QUERY_RE = /[?&](?:api_?key|key|secret|token|password|private)=/i;

let buildHash = "dev";
try {
  buildHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  buildHash = Date.now().toString(36);
}

function assertNoSensitivePublicEnv(env: Record<string, string | undefined>): void {
  const blockedNames: string[] = [];

  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_')) continue;
    if (SENSITIVE_PUBLIC_ENV_RE.test(name)) {
      blockedNames.push(name);
      continue;
    }
    if (!value) continue;
    if (
      HIVE_PRIVATE_KEY_VALUE_RE.test(value)
      || URL_CREDENTIALS_RE.test(value)
      || URL_SECRET_QUERY_RE.test(value)
    ) {
      blockedNames.push(name);
    }
  }

  const uniqueBlockedNames = [...new Set(blockedNames)].sort();
  if (uniqueBlockedNames.length === 0) return;

  throw new Error(
    `Sensitive Vite env var(s) are not allowed in the client bundle: ${uniqueBlockedNames.join(', ')}. ` +
    'Use a server/operator-only env var without the VITE_ prefix.',
  );
}

export default defineConfig(({ command, mode }) => {
  assertNoSensitivePublicEnv({
    ...process.env,
    ...loadEnv(mode, process.cwd(), ''),
  });

  return {
    base: process.env.VITE_BASE_PATH || (command === 'build' ? './' : '/'),
    define: {
      __BUILD_HASH__: JSON.stringify(buildHash),
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(command === 'build' ? [visualizer({ filename: 'dist/bundle-stats.html', gzipSize: true, brotliSize: true })] : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      // Pre-bundle heavy / hot-path deps so cold page loads don't stall.
      // Only includes deps actually present in package.json — Vite errors
      // out if you list a missing one.
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'framer-motion',
        'zustand',
        'gsap',
        'uuid',
      ],
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      target: 'esnext',
      /*
        After vendor/data splitting, the remaining heavy chunks are intentional:
        Pixi, the chess surface, and the main game store graph. A 500 kB warning
        threshold keeps the build focused on real regressions instead of
        re-flagging known large gameplay chunks on every build.
      */
      chunkSizeWarningLimit: 500,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              // Vendor splits — isolate heavy node_modules with explicit priority.
              { name: 'react-vendor', test: /node_modules[\\/]react(?:-dom)?[\\/]/, priority: 100 },
              { name: 'pixi-vendor', test: /node_modules[\\/]pixi(?:\.js|-[^\\/]+)[\\/]/, priority: 90 },
              { name: 'ui-vendor', test: /node_modules[\\/](?:framer-motion|@react-spring)[\\/]/, priority: 80 },
              { name: 'state-vendor', test: /node_modules[\\/](?:zustand|@tanstack)[\\/]/, priority: 70 },
              { name: 'anim-vendor', test: /node_modules[\\/]gsap[\\/]/, priority: 60 },
              { name: 'network-vendor', test: /node_modules[\\/](?:peerjs|uuid)[\\/]/, priority: 50 },
              { name: 'db-vendor', test: /node_modules[\\/](?:drizzle|idb)[\\/]/, priority: 40 },

              // Card data splits — large static registries benefit from stable chunks.
              { name: 'card-data-pets', test: /[\\/]game[\\/]data[\\/]cardRegistry[\\/]sets[\\/]core[\\/]pets[\\/]/, priority: 30 },
              { name: 'card-data-neutrals', test: /[\\/]game[\\/]data[\\/]cardRegistry[\\/]sets[\\/]core[\\/]neutrals[\\/]/, priority: 29 },
              { name: 'card-data-classes', test: /[\\/]game[\\/]data[\\/]cardRegistry[\\/]sets[\\/]core[\\/]classes[\\/]/, priority: 28 },
              { name: 'card-data-sets', test: /[\\/]game[\\/]data[\\/]cardRegistry[\\/]sets[\\/]/, priority: 27 },
              { name: 'card-data-heroes', test: /[\\/]game[\\/]data[\\/]norseHeroes[\\/]/, priority: 26 },
              { name: 'card-data', test: /[\\/]game[\\/]data[\\/]/, priority: 24 },
            ],
          },
        },
      },
    },
    assetsInclude: ["**/*.mp3", "**/*.ogg", "**/*.wav"],
  };
});

