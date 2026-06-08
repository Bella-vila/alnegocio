import { useStore } from "../lib/store";
import { Card, Stat, SectionTitle, Badge } from "../components/ui";
import { DualBarChart } from "../components/Chart";
import { computeTotals, monthlySeries, lastNMonths, topProducts, inventoryValue, lowStock } from "../lib/analytics";
import { cup, monthLabel, fmtDate } from "../lib/format";
import { AlertIcon } from "../components/icons";
import type { ModuleKey } from "../lib/types";

export function Dashboard({ go }: { go: (m: ModuleKey) => void }) {
  const { data } = useStore();
  const totals = computeTotals(data);
  const months = lastNMonths(6);
  const series = monthlySeries(data, months);
  const top = topProducts(data, undefined, undefined, 5);
  const inv = inventoryValue(data);
  const low = lowStock(data);
  const recent = data.sales.slice(0, 6);

  const chartData = series.map((s) => ({
    label: monthLabel(s.month).slice(0, 3),
    a: s.revenue,
    b: s.expenses,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Hola, {data.business.owner}</h1>
        <p className="text-sm text-slate-500">Resumen de {data.business.name} · histórico completo</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={cup(totals.revenue)} hint={`${totals.salesCount} ventas`} tone="green" />
        <Stat label="Ganancia bruta" value={cup(totals.grossProfit)} hint="Ingresos − costo" tone="blue" />
        <Stat label="Gastos + salarios" value={cup(totals.expenses + totals.payroll)} tone="red" />
        <Stat label="Ganancia neta" value={cup(totals.netProfit)} hint={`Tras impuesto ${data.business.taxRate}%`} tone={totals.netProfit >= 0 ? "green" : "red"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Ingresos vs. egresos" subtitle="Últimos 6 meses" />
          <DualBarChart data={chartData} />
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Egresos</span>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Inventario" subtitle="Valor en almacén" />
          <div className="space-y-3">
            <Row label="Valor a costo" value={cup(inv.cost)} />
            <Row label="Valor a venta" value={cup(inv.retail)} />
            <Row label="Ganancia potencial" value={cup(inv.potential)} accent />
          </div>
          <button onClick={() => go("productos")} className="mt-4 w-full rounded-xl bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Ver productos
          </button>
        </Card>
      </div>

      {low.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60 p-5">
          <div className="mb-3 flex items-center gap-2 text-amber-700">
            <AlertIcon className="h-5 w-5" />
            <h2 className="font-bold">Stock bajo ({low.length})</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {low.map((p) => (
              <span key={p.id} className="rounded-lg bg-white px-3 py-1.5 text-sm text-amber-800 ring-1 ring-amber-200">
                {p.name} · <strong>{p.stock}</strong> {p.unit}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Más vendidos" />
          {top.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay ventas.</p>
          ) : (
            <div className="space-y-3">
              {top.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.qty} uds · ganancia {cup(t.profit)}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{cup(t.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="Ventas recientes" action={<button onClick={() => go("ventas")} className="text-sm font-semibold text-emerald-600">Ver todas</button>} />
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">Sin ventas registradas.</p>
          ) : (
            <div className="space-y-2.5">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{s.customerName}</p>
                    <p className="text-xs text-slate-500">{fmtDate(s.date)} · {s.items.length} art.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{cup(s.total)}</p>
                    <Badge color="green">+{cup(s.profit)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={accent ? "font-black text-emerald-600" : "font-bold text-slate-900"}>{value}</span>
    </div>
  );
}
