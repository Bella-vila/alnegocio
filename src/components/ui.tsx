import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger" | "soft" | "outline";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
};

export function Button({ children, onClick, type = "button", variant = "primary", size = "md", className, disabled }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm" };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/20",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    soft: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  step,
  required,
  className,
}: {
  label?: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  step?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span> : null}
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
    </label>
  );
}

/**
 * Campo numérico que SÍ se puede borrar (no se queda pegado el 0).
 * Mantiene el texto mientras editas y reporta el número con onChange.
 */
export function NumberInput({
  label,
  value,
  onChange,
  min,
  step,
  placeholder,
  className,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: string;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState<string>(value === 0 ? "" : String(value));

  // Si el valor externo cambia (ej. al abrir un formulario), sincroniza el texto
  useEffect(() => {
    const current = text === "" ? 0 : Number(text);
    if (current !== value) setText(value === 0 ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className={cn("block", className)}>
      {label ? <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span> : null}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        min={min}
        step={step}
        placeholder={placeholder ?? "0"}
        onChange={(e) => {
          const raw = e.target.value;
          // permitir vacío, números y un punto decimal
          if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
            setText(raw);
            onChange(raw === "" || raw === "." ? 0 : Number(raw));
          }
        }}
        onBlur={() => { if (text === "" || text === ".") setText(""); }}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-[fadeUp_.25s_ease-out] sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: "slate" | "green" | "red" | "amber" | "blue" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colors[color])}>{children}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "slate" }: { label: string; value: string; hint?: string; tone?: "slate" | "green" | "red" | "blue" | "amber" }) {
  const tones = {
    slate: "text-slate-900",
    green: "text-emerald-600",
    red: "text-red-600",
    blue: "text-sky-600",
    amber: "text-amber-600",
  };
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-black tracking-tight", tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}
