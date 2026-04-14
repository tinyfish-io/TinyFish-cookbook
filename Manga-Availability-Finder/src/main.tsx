import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error('Root element "#root" not found');
}

// If the page is blank, this makes it obvious whether JS executed at all.
rootEl.innerHTML =
  '<div style="padding:16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">Booting app…</div>';

try {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  rootEl.innerHTML = `<pre style="padding:16px;white-space:pre-wrap;color:#b91c1c;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace">${message}</pre>`;
}

