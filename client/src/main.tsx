import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import {
  RAGNAROK_NETWORK_CONFIG,
  createRuntimeStorageKey,
} from "./game/config/networkConfig";
import {
  clearChunkReloadFlag,
  isChunkLoadError,
  recoverFromChunkLoadError,
} from "./lib/chunkLoadRecovery";

const DEV_SW_RESET_KEY = createRuntimeStorageKey('dev-sw-reset');

function hasServiceWorkerSupport(): boolean {
  return 'serviceWorker' in navigator;
}

function readDevSwResetFlag(): boolean {
  try {
    return window.sessionStorage.getItem(DEV_SW_RESET_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDevSwResetFlag(): void {
  try {
    window.sessionStorage.setItem(DEV_SW_RESET_KEY, '1');
  } catch {
    // Session storage can be unavailable in hardened browser contexts.
  }
}

function clearDevSwResetFlag(): void {
  try {
    window.sessionStorage.removeItem(DEV_SW_RESET_KEY);
  } catch {
    // Session storage can be unavailable in hardened browser contexts.
  }
}

async function deleteRagnarokCaches(): Promise<void> {
  if (!('caches' in window)) return;

  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith('ragnarok-'))
      .map((cacheName) => window.caches.delete(cacheName)),
  );
}

async function resetDevelopmentServiceWorker(): Promise<boolean> {
  if (!hasServiceWorkerSupport()) return true;

  try {
    const hadController = navigator.serviceWorker.controller !== null;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregisterResults = await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );

    await deleteRagnarokCaches();

    const removedServiceWorker = unregisterResults.some(Boolean);
    if (!hadController && !removedServiceWorker) {
      clearDevSwResetFlag();
      return true;
    }

    if (readDevSwResetFlag()) {
      clearDevSwResetFlag();
      return true;
    }

    writeDevSwResetFlag();
    window.location.reload();
    return false;
  } catch (error) {
    console.error('Failed to reset development service worker:', error);
    return true;
  }
}

function registerProductionServiceWorker(): void {
  if (!hasServiceWorkerSupport()) return;

  window.addEventListener('load', () => {
    const resetEpoch = encodeURIComponent(RAGNAROK_NETWORK_CONFIG.resetEpoch);
    const swPath = `${import.meta.env.BASE_URL}sw.js?resetEpoch=${resetEpoch}`;
    navigator.serviceWorker.register(swPath, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' })
      .then((reg) => {
        // Check for updates every 30 minutes
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            // New SW activated + old one existed = app updated, reload silently
            if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {});
  });
}

function renderApp(): void {
  createRoot(document.getElementById("root")!).render(
    <App />
  );
}

async function bootstrap(): Promise<void> {
  const shouldRender = import.meta.env.DEV
    ? await resetDevelopmentServiceWorker()
    : true;

  if (!shouldRender) return;

  if (import.meta.env.PROD) {
    registerProductionServiceWorker();
  }

  renderApp();

  window.setTimeout(clearChunkReloadFlag, 5000);
}

void bootstrap();

window.addEventListener('vite:preloadError', (event: Event) => {
  event.preventDefault();
  void recoverFromChunkLoadError();
});

// Global error handlers — catch crashes outside React error boundaries
window.addEventListener('unhandledrejection', (e) => {
  if (isChunkLoadError(e.reason)) {
    e.preventDefault();
    void recoverFromChunkLoadError();
    return;
  }

	if (import.meta.env.DEV) console.error('Unhandled rejection:', e.reason);
});

window.addEventListener('error', (e) => {
  if (isChunkLoadError(e.error ?? e.message)) {
    e.preventDefault();
    void recoverFromChunkLoadError();
  }
});

// Offline detection: show/hide banner when network status changes
function updateOfflineBanner(offline: boolean) {
  let banner = document.getElementById('offline-banner');
  if (offline) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#92400e;color:#fef3c7;text-align:center;padding:6px 16px;font-size:13px;font-weight:600;letter-spacing:0.03em;pointer-events:none;';
      banner.textContent = 'You are offline — playing from cached data';
      document.body.appendChild(banner);
    }
    banner.style.display = '';
  } else if (banner) {
    banner.style.display = 'none';
  }
}

window.addEventListener('online', () => updateOfflineBanner(false));
window.addEventListener('offline', () => updateOfflineBanner(true));
if (!navigator.onLine) updateOfflineBanner(true);
