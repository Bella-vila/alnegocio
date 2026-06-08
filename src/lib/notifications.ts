import type { AppData } from "./types";

export type NotifType = "stock" | "turno" | "suscripcion" | "insumo";

export type Notif = {
  id: string;
  type: NotifType;
  title: string;
  detail: string;
  level: "info" | "warning" | "danger";
};

/**
 * Construye la lista de notificaciones a partir de los datos del negocio.
 * - Productos / insumos por agotarse (stock <= mínimo)
 * - Turnos cerrados recientes con mini resumen
 * - Suscripción próxima a vencer
 */
export function buildNotifications(
  data: AppData,
  opts: { daysToExpire?: number | null } = {},
): Notif[] {
  const list: Notif[] = [];

  // 1) Suscripción próxima a vencer
  const d = opts.daysToExpire;
  if (typeof d === "number") {
    if (d < 0) {
      list.push({
        id: "sub-vencida",
        type: "suscripcion",
        title: "Suscripción vencida",
        detail: `Tu suscripción venció hace ${Math.abs(d)} día(s). Renueva para seguir usando la app.`,
        level: "danger",
      });
    } else if (d <= 5) {
      list.push({
        id: "sub-porvencer",
        type: "suscripcion",
        title: "Suscripción por vencer",
        detail: `Te quedan ${d} día(s) de suscripción. Paga pronto para no perder acceso.`,
        level: "warning",
      });
    }
  }

  // 2) Productos por agotarse
  const lowProducts = data.products.filter((p) => p.stock <= p.minStock);
  lowProducts.forEach((p) =>
    list.push({
      id: `prod-${p.id}`,
      type: "stock",
      title: p.stock <= 0 ? `Sin stock: ${p.name}` : `Stock bajo: ${p.name}`,
      detail: `Quedan ${p.stock} ${p.unit} (mínimo ${p.minStock}).`,
      level: p.stock <= 0 ? "danger" : "warning",
    }),
  );

  // 3) Insumos por agotarse
  (data.supplies ?? []).filter((s) => s.stock <= s.minStock).forEach((s) =>
    list.push({
      id: `ins-${s.id}`,
      type: "insumo",
      title: s.stock <= 0 ? `Insumo agotado: ${s.name}` : `Insumo bajo: ${s.name}`,
      detail: `Quedan ${s.stock} ${s.unit} (mínimo ${s.minStock}).`,
      level: s.stock <= 0 ? "danger" : "warning",
    }),
  );

  // 4) Turnos cerrados hoy (mini resumen)
  const today = new Date().toISOString().slice(0, 10);
  (data.shifts ?? [])
    .filter((sh) => sh.status === "cerrado" && (sh.closedAt ?? "").slice(0, 10) === today)
    .forEach((sh) => {
      const cuadra = sh.cashDiff === 0;
      list.push({
        id: `turno-${sh.id}`,
        type: "turno",
        title: `Turno cerrado · ${sh.sellerName}`,
        detail: `${sh.salesCount} ventas · efectivo ${cuadra ? "cuadró" : sh.cashDiff > 0 ? `sobró ${Math.round(sh.cashDiff)}` : `faltó ${Math.abs(Math.round(sh.cashDiff))}`}.`,
        level: cuadra ? "info" : "danger",
      });
    });

  return list;
}
