import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, NumberInput, Modal, Badge, EmptyState, Stat, SectionTitle } from "../components/ui";
import { PlusIcon, TrashIcon, EditIcon } from "../components/icons";
import { cup, monthKey, monthLabel, fmtDate } from "../lib/format";
import type { Employee } from "../lib/types";

const empty = { name: "", role: "", baseSalary: 0, commissionPct: 0, active: true };

export function Empleados() {
  const { data, saveEmployee, deleteEmployee, runPayroll, deletePayroll } = useStore();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [form, setForm] = useState<Omit<Employee, "id"> & { id?: string }>(empty);

  const totalBase = data.employees.filter((e) => e.active).reduce((a, e) => a + e.baseSalary, 0);
  const totalPaid = data.payrolls.reduce((a, p) => a + p.net, 0);
  const periods = useMemo(() => [...new Set(data.payrolls.map((p) => p.period))].sort().reverse(), [data.payrolls]);

  function openNew() { setForm(empty); setOpen(true); }
  function openEdit(e: Employee) { setForm(e); setOpen(true); }
  function submit() {
    if (!form.name.trim()) return;
    saveEmployee(form);
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Empleados activos" value={`${data.employees.filter((e) => e.active).length}`} />
        <Stat label="Nómina base mensual" value={cup(totalBase)} tone="blue" />
        <Stat label="Salarios pagados" value={cup(totalPaid)} tone="red" />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setPayOpen(true)}>Generar nómina</Button>
        <Button onClick={openNew}><PlusIcon className="h-4 w-4" /> Nuevo empleado</Button>
      </div>

      {data.employees.length === 0 ? (
        <EmptyState title="Sin empleados" hint="Registra tu equipo para gestionar salarios." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.employees.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{e.name}</p>
                  <p className="text-sm text-slate-500">{e.role}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><EditIcon className="h-4 w-4" /></button>
                  <button onClick={() => deleteEmployee(e.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Salario base</span><span className="font-semibold text-slate-900">{cup(e.baseSalary)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Comisión</span><span className="font-semibold text-slate-900">{e.commissionPct}%</span></div>
              </div>
              <div className="mt-3">{e.active ? <Badge color="green">Activo</Badge> : <Badge color="slate">Inactivo</Badge>}</div>
            </Card>
          ))}
        </div>
      )}

      {periods.length > 0 && (
        <Card className="p-5">
          <SectionTitle title="Historial de nómina" />
          <div className="space-y-4">
            {periods.map((period) => {
              const rows = data.payrolls.filter((p) => p.period === period);
              const total = rows.reduce((a, r) => a + r.net, 0);
              return (
                <div key={period}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold capitalize text-slate-800">{monthLabel(period)}</h3>
                    <span className="text-sm font-bold text-slate-900">{cup(total)}</span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2 font-semibold">Empleado</th>
                          <th className="px-3 py-2 text-right font-semibold">Base</th>
                          <th className="px-3 py-2 text-right font-semibold">Comisión</th>
                          <th className="px-3 py-2 text-right font-semibold">Bono</th>
                          <th className="px-3 py-2 text-right font-semibold">Deduc.</th>
                          <th className="px-3 py-2 text-right font-semibold">Neto</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2 font-medium text-slate-800">{r.employeeName}<span className="ml-2 text-xs text-slate-400">{fmtDate(r.date)}</span></td>
                            <td className="px-3 py-2 text-right text-slate-600">{cup(r.base)}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{cup(r.commission)}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{cup(r.bonus)}</td>
                            <td className="px-3 py-2 text-right text-red-500">−{cup(r.deductions)}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900">{cup(r.net)}</td>
                            <td className="px-3 py-2 text-right"><button onClick={() => deletePayroll(r.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><TrashIcon className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar empleado" : "Nuevo empleado"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} className="sm:col-span-2" />
          <Input label="Cargo" value={form.role} onChange={(v) => setForm({ ...form, role: v })} className="sm:col-span-2" />
          <NumberInput label="Salario base (CUP)" min={0} value={form.baseSalary} onChange={(n) => setForm({ ...form, baseSalary: n })} />
          <NumberInput label="Comisión (% ventas)" min={0} value={form.commissionPct} onChange={(n) => setForm({ ...form, commissionPct: n })} />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded accent-emerald-600" />
          Empleado activo
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </div>
      </Modal>

      {payOpen && <PayrollModal onClose={() => setPayOpen(false)} onRun={(period, rows) => { runPayroll(period, rows); setPayOpen(false); }} />}
    </div>
  );
}

function PayrollModal({ onClose, onRun }: { onClose: () => void; onRun: (period: string, rows: Array<{ employeeId: string; employeeName: string; base: number; commission: number; bonus: number; deductions: number; net: number }>) => void }) {
  const { data } = useStore();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const active = data.employees.filter((e) => e.active);

  const periodRevenue = useMemo(
    () => data.sales.filter((s) => monthKey(s.date) === period).reduce((a, s) => a + s.total, 0),
    [data.sales, period],
  );

  const [rows, setRows] = useState(() =>
    active.map((e) => ({
      employeeId: e.id,
      employeeName: e.name,
      base: e.baseSalary,
      commissionPct: e.commissionPct,
      bonus: 0,
      deductions: 0,
    })),
  );

  function commissionFor(pct: number) {
    return Math.round((periodRevenue * pct) / 100);
  }
  function update(id: string, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r) => (r.employeeId === id ? { ...r, ...patch } : r)));
  }
  const computed = rows.map((r) => {
    const commission = commissionFor(r.commissionPct);
    return { ...r, commission, net: r.base + commission + r.bonus - r.deductions };
  });
  const total = computed.reduce((a, r) => a + r.net, 0);

  function submit() {
    onRun(
      period,
      computed.map((r) => ({
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        base: r.base,
        commission: r.commission,
        bonus: r.bonus,
        deductions: r.deductions,
        net: r.net,
      })),
    );
  }

  return (
    <Modal open onClose={onClose} title="Generar nómina" wide>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Período" type="month" value={period} onChange={setPeriod} />
        <div className="flex items-end">
          <div className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
            Ventas del período: <strong className="text-slate-900">{cup(periodRevenue)}</strong> (base de comisión)
          </div>
        </div>
      </div>

      {active.length === 0 ? (
        <EmptyState title="No hay empleados activos" />
      ) : (
        <div className="space-y-3">
          {computed.map((r) => (
            <Card key={r.employeeId} className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-slate-800">{r.employeeName}</p>
                <span className="font-bold text-emerald-600">{cup(r.net)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <NumberInput label="Base" min={0} value={r.base} onChange={(n) => update(r.employeeId, { base: n })} />
                <div>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Comisión</span>
                  <div className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700">{cup(r.commission)}</div>
                </div>
                <NumberInput label="Bono" min={0} value={r.bonus} onChange={(n) => update(r.employeeId, { bonus: n })} />
                <NumberInput label="Deducción" min={0} value={r.deductions} onChange={(n) => update(r.employeeId, { deductions: n })} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
        <span className="font-semibold">Total a pagar</span>
        <span className="text-xl font-black">{cup(total)}</span>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={!active.length}>Confirmar nómina</Button>
      </div>
    </Modal>
  );
}
