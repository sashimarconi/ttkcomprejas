import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for push notifications (production only, not in iframe)
if ("serviceWorker" in navigator) {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isPreview =
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com");

  if (!isInIframe && !isPreview) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  } else {
    // Unregister SW in preview/iframe
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    );
  }
}

createRoot(document.getElementById("root")!).render(<App />);
