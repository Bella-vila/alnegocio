export function cup(value: number): string {
  const sign = value < 0 ? "-" : "";
  const n = Math.abs(Math.round(value));
  return `${sign}$${new Intl.NumberFormat("es-CU").format(n)}`;
}

export function cupExact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const n = Math.abs(value);
  return `${sign}$${new Intl.NumberFormat("es-CU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

export function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

export function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function dateInput(iso?: string): string {
  return (iso ? new Date(iso) : new Date()).toISOString().slice(0, 10);
}

export function fromDateInput(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CU", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CU", { month: "long", year: "numeric" });
}

export function uid(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}
