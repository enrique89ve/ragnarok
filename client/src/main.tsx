import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <App />
);

// Global error handlers — catch crashes outside React error boundaries
window.addEventListener('unhandledrejection', (e) => {
	if (import.meta.env.DEV) console.error('Unhandled rejection:', e.reason);
});

// Service worker: register + detect updates so users get fresh builds
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = `${import.meta.env.BASE_URL}sw.js`;
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
