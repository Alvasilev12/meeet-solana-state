import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const STALE_CHUNK_RELOAD_KEY = "meeet_stale_chunk_reload";
const STALE_CHUNK_PATTERNS = [
  "failed to fetch dynamically imported module",
  "loading chunk",
  "importing a module script failed",
  "unable to preload css",
];

function isStaleChunkError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return STALE_CHUNK_PATTERNS.some((pattern) => normalized.includes(pattern));
}

async function cleanupServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
  } catch {}

  try {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  } catch {}
}

function installStaleChunkRecovery() {
  const reloadOnce = () => {
    if (sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) === "1") return;
    sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  };

  window.addEventListener("load", () => {
    sessionStorage.removeItem(STALE_CHUNK_RELOAD_KEY);
  });

  window.addEventListener("error", (event) => {
    if (isStaleChunkError(event.message)) {
      reloadOnce();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      typeof reason === "string"
        ? reason
        : reason instanceof Error
          ? reason.message
          : typeof reason?.message === "string"
            ? reason.message
            : undefined;

    if (isStaleChunkError(message)) {
      reloadOnce();
    }
  });
}

void cleanupServiceWorkers();
installStaleChunkRecovery();

if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
}

createRoot(document.getElementById("root")!).render(<App />);
