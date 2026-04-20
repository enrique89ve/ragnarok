import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { visualizer } from "rollup-plugin-visualizer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let buildHash = "dev";
try {
  buildHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  buildHash = Date.now().toString(36);
}

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH || (command === 'build' ? './' : '/'),
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  plugins: [
    react(),
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
    // Pre-bundle heavy / hot-path deps so cold page loads don't stall
    // re-reading them through the slow /mnt/c WSL filesystem mount.
    // Each entry here gets bundled once at server startup instead of
    // resolved on every request.
    // Only includes deps actually present in package.json — Vite errors
    // out if you list a missing one.
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'framer-motion',
      'react-spring',
      'zustand',
      'gsap',
      'peerjs',
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
            if (id.includes('@radix-ui')) return 'radix-vendor';
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
          /*
            Let Rollup decide how to split the local app graph.
            Earlier source-level buckets for combat/game/blockchain code created
            circular chunk assignments because those modules are tightly coupled
            and imported across multiple routes.
          */
          return undefined;
        },
      },
    },
  },
  assetsInclude: ["**/*.mp3", "**/*.ogg", "**/*.wav"],
}));
