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
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Vendor splits — isolate heavy node_modules
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor';
              if (id.includes('pixi')) return 'pixi-vendor';
              if (id.includes('framer-motion') || id.includes('@react-spring')) return 'ui-vendor';
              if (id.includes('zustand') || id.includes('@tanstack')) return 'state-vendor';
              if (id.includes('gsap')) return 'anim-vendor';
              if (id.includes('peerjs') || id.includes('uuid')) return 'network-vendor';
              if (id.includes('drizzle') || id.includes('idb')) return 'db-vendor';
            }
            // Card data splits — large static registries benefit from stable chunks.
            if (id.includes('/game/data/cardRegistry/sets/core/pets/')) return 'card-data-pets';
            if (id.includes('/game/data/cardRegistry/sets/core/neutrals/')) return 'card-data-neutrals';
            if (id.includes('/game/data/cardRegistry/sets/core/classes/')) return 'card-data-classes';
            if (id.includes('/game/data/cardRegistry/sets/')) return 'card-data-sets';
            if (id.includes('/game/data/norseHeroes/')) return 'card-data-heroes';
            if (id.includes('/game/data/allCards') || id.includes('/game/data/cardSets/')) return 'card-data';
            if (id.includes('/game/data/')) return 'card-data';
            return undefined;
          },
        },
      },
    },
    assetsInclude: ["**/*.mp3", "**/*.ogg", "**/*.wav"],
  };
});

