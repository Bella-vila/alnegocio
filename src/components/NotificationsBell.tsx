import { useEffect, useRef, useState } from "react";
import type { Notif } from "../lib/notifications";
import { cn } from "../utils/cn";

export function NotificationsBell({ notifs }: { notifs: Notif[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const count = notifs.length;
  const danger = notifs.some((n) => n.level === "danger");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
        aria-label="Notificaciones"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && (
          <span className={cn("absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white", danger ? "bg-red-500" : "bg-amber-500")}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-bold text-slate-900">Notificaciones</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Todo en orden. No hay avisos. ✅</div>
            ) : (
              notifs.map((n) => (
                <div key={n.id} className="flex gap-3 border-b border-slate-50 px-4 py-3 last:border-0">
                  <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", n.level === "danger" ? "bg-red-500" : n.level === "warning" ? "bg-amber-500" : "bg-sky-500")} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500">{n.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
