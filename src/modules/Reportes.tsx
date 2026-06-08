import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, SectionTitle, Stat, EmptyState } from "../components/ui";
import { BarChart } from "../components/Chart";
import { cup, monthLabel, dateInput } from "../lib/format";
import { computeTotals, lastNMonths, monthlySeries, topProducts, inRange } from "../lib/analytics";

export function Reportes() {
  const { data } = useStore();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(dateInput());

  const totals = computeTotals(data, from, to);
  const months = lastNMonths(6);
  const series = monthlySeries(data, months);
  const top = topProducts(data, from, to, 8);

  const revChart = series.map((s) => ({ label: monthLabel(s.month).slice(0, 3), value: s.revenue }));
  const profitChart = series.map((s) => ({ label: monthLabel(s.month).slice(0, 3), value: Math.max(0, s.revenue - s.expenses) }));

  function exportSalesCSV() {
    const rows = data.sales.filter((s) => inRange(s.date, from, to));
    const header = "Fecha,Cliente,Pago,Subtotal,Descuento,Total,Costo,Ganancia\n";
    const body = rows
      .map((s) => `${s.date.slice(0, 10)},${s.customerName},${s.payment},${s.subtotal},${s.discount},${s.total},${s.cogs},${s.profit}`)
      .join("\n");
    download("ventas.csv", header + body);
  }

  function exportProductsCSV() {
    const header = "Producto,SKU,Costo,Precio,Stock,StockMinimo\n";
    const body = data.products.map((p) => `${p.name},${p.sku},${p.cost},${p.price},${p.stock},${p.minStock}`).join("\n");
    download("productos.csv", header + body);
  }

  function download(name: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Desde</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
          </label>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportSalesCSV}>Exportar ventas CSV</Button>
            <Button variant="outline" onClick={exportProductsCSV}>Exportar productos CSV</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={cup(totals.revenue)} tone="green" />
        <Stat label="Costo mercancía" value={cup(totals.cogs)} tone="red" />
        <Stat label="Ganancia bruta" value={cup(totals.grossProfit)} tone="blue" />
        <Stat label="Ganancia neta" value={cup(totals.netProfit)} tone={totals.netProfit >= 0 ? "green" : "red"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Ingresos mensuales" subtitle="Últimos 6 meses" />
          <BarChart data={revChart} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Ganancia estimada" subtitle="Ingresos − egresos" />
          <BarChart data={profitChart} />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle title="Ranking de productos" subtitle="Por ingresos en el período" />
        {top.length === 0 ? (
          <EmptyState title="Sin datos de ventas en el rango" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Producto</th>
                  <th className="px-3 py-2 text-right font-semibold">Unidades</th>
                  <th className="px-3 py-2 text-right font-semibold">Ingresos</th>
                  <th className="px-3 py-2 text-right font-semibold">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {top.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{t.name}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{t.qty}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{cup(t.revenue)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{cup(t.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
