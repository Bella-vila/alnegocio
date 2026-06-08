import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RootApp from "./RootApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);

// Registrar el Service Worker para que la app funcione sin internet (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* sin conexión o no soportado: la app sigue funcionando online */
    });
  });
}
