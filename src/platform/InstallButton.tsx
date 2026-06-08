import { useEffect, useState } from "react";

// Evento del navegador para instalar la PWA
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Botón "Instalar app". Aparece cuando el navegador permite instalar la PWA.
 * En iPhone (Safari) no existe ese evento, así que mostramos instrucciones.
 */
export function InstallButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Ya está instalada o ejecutándose como app: no mostrar nada
  if (installed || isStandalone) return null;

  // Android/Chrome/Edge: botón nativo de instalación
  if (deferred) {
    return (
      <button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow hover:bg-emerald-50"
        }
      >
        <DownloadIcon /> Instalar app
      </button>
    );
  }

  // iPhone (Safari): no hay botón automático -> instrucciones
  if (isIos) {
    return (
      <>
        <button
          onClick={() => setShowIosHelp(true)}
          className={
            className ??
            "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow hover:bg-emerald-50"
          }
        >
          <DownloadIcon /> Instalar app
        </button>
        {showIosHelp && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setShowIosHelp(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black">Instalar en iPhone</h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Toca el botón <strong>Compartir</strong> ⬆️ en Safari.</li>
                <li>2. Elige <strong>“Agregar a inicio”</strong>.</li>
                <li>3. Toca <strong>Agregar</strong>. ¡Listo, ya tienes la app!</li>
              </ol>
              <button onClick={() => setShowIosHelp(false)} className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white">Entendido</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
