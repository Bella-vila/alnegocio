import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, NumberInput, Select, Modal, Badge, EmptyState, Stat, SectionTitle } from "../components/ui";
import { DonutChart } from "../components/Chart";
import { PlusIcon, TrashIcon } from "../components/icons";
import { cup, fmtDate, dateInput, fromDateInput } from "../lib/format";
import { computeTotals, inRange } from "../lib/analytics";
import type { Expense, ExpenseCategory, PaymentMethod } from "../lib/types";

const categories: Array<{ value: ExpenseCategory; label: string; color: string }> = [
  { value: "alquiler", label: "Alquiler", color: "#0ea5e9" },
  { value: "servicios", label: "Servicios", color: "#8b5cf6" },
  { value: "transporte", label: "Transporte", color: "#f59e0b" },
  { value: "impuestos", label: "Impuestos", color: "#ef4444" },
  { value: "salarios", label: "Salarios", color: "#10b981" },
  { value: "compras", label: "Compras", color: "#6366f1" },
  { value: "otros", label: "Otros", color: "#64748b" },
];

const payOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mlc", label: "MLC / USD" },
];

const emptyExpense = { date: dateInput(), category: "otros" as ExpenseCategory, description: "", amount: 0, payment: "efectivo" as PaymentMethod };

export function Contabilidad() {
  const { data, saveExpense, deleteExpense } = useStore();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(dateInput());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Expense, "id"> & { id?: string }>(emptyExpense);

  const totals = computeTotals(data, from, to);
  const expensesInRange = data.expenses.filter((e) => inRange(e.date, from, to));

  const donut = useMemo(() => {
    const map = new Map<string, number>();
    expensesInRange.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    // add payroll as salarios bucket
    const payroll = data.payrolls.filter((p) => inRange(p.date, from, to)).reduce((a, p) => a + p.net, 0);
    if (payroll > 0) map.set("salarios", (map.get("salarios") ?? 0) + payroll);
    return categories
      .map((c) => ({ label: c.label, value: map.get(c.value) ?? 0, color: c.color }))
      .filter((s) => s.value > 0);
  }, [expensesInRange, data.payrolls, from, to]);

  function openNew() { setForm({ ...emptyExpense, date: dateInput() }); setOpen(true); }
  function submit() {
    if (!form.description.trim() || form.amount <= 0) return;
    saveExpense({ ...form, date: fromDateInput(form.date.slice(0, 10)) });
    setOpen(false);
  }
  const catLabel = (v: string) => categories.find((c) => c.value === v)?.label ?? v;

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Desde" type="date" value={from} onChange={setFrom} />
          <Input label="Hasta" type="date" value={to} onChange={setTo} />
          <div className="ml-auto">
            <Button onClick={openNew}><PlusIcon className="h-4 w-4" /> Registrar gasto</Button>
          </div>
        </div>
      </Card>

      {/* Estado de resultados */}
      <Card className="p-5">
        <SectionTitle title="Estado de resultados" subtitle="Pérdidas y ganancias del período" />
        <div className="space-y-2.5">
          <PLRow label="Ingresos por ventas" value={totals.salesRevenue} positive />
          <PLRow label="(−) Costo de mercancía vendida" value={-totals.cogs} />
          <PLRow label="= Ganancia bruta" value={totals.grossProfit} bold />
          <PLRow label="(−) Gastos operativos" value={-totals.expenses} />
          <PLRow label="(−) Salarios" value={-totals.payroll} />
          <PLRow label={`(−) Impuesto ONAT (${data.business.taxRate}%)`} value={-totals.tax} />
          <div className="my-1 border-t border-slate-200" />
          <PLRow label="= Ganancia neta" value={totals.netProfit} bold accent />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Stat label="Margen neto" value={totals.revenue > 0 ? `${((totals.netProfit / totals.revenue) * 100).toFixed(1)}%` : "—"} tone={totals.netProfit >= 0 ? "green" : "red"} />
        <Stat label="Total egresos" value={cup(totals.cogs + totals.expenses + totals.payroll + totals.tax)} tone="red" />
        <Stat label="Ventas del período" value={`${totals.salesCount}`} tone="blue" />
      </div>

      {donut.length > 0 && (
        <Card className="p-5">
          <SectionTitle title="Distribución de egresos" />
          <DonutChart segments={donut} />
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold text-slate-900">Gastos registrados</h2>
        </div>
        {expensesInRange.length === 0 ? (
          <div className="p-6"><EmptyState title="Sin gastos en el rango" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Categoría</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 text-right font-semibold">Monto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {expensesInRange.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3"><Badge>{catLabel(e.category)}</Badge></td>
                    <td className="px-4 py-3 text-slate-800">{e.description}</td>
                    <td className="px-4 py-3 text-slate-600">{e.payment}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">−{cup(e.amount)}</td>
                    <td className="px-4 py-3"><button onClick={() => deleteExpense(e.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><TrashIcon className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar gasto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Fecha" type="date" value={form.date.slice(0, 10)} onChange={(v) => setForm({ ...form, date: v })} />
          <Select label="Categoría" value={form.category} onChange={(v) => setForm({ ...form, category: v as ExpenseCategory })} options={categories.map((c) => ({ value: c.value, label: c.label }))} />
          <Input label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} className="sm:col-span-2" />
          <NumberInput label="Monto (CUP)" min={0} value={form.amount} onChange={(n) => setForm({ ...form, amount: n })} />
          <Select label="Forma de pago" value={form.payment} onChange={(v) => setForm({ ...form, payment: v as PaymentMethod })} options={payOptions} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar gasto</Button>
        </div>
      </Modal>
    </div>
  );
}

function PLRow({ label, value, bold, accent, positive }: { label: string; value: number; bold?: boolean; accent?: boolean; positive?: boolean }) {
  const color = accent ? (value >= 0 ? "text-emerald-600" : "text-red-600") : positive ? "text-slate-900" : value < 0 ? "text-red-500" : "text-slate-900";
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-lg font-black" : "text-sm font-semibold"} ${color}`}>{cup(value)}</span>
    </div>
  );
}
