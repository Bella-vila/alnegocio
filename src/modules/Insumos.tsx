import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, NumberInput, Modal, Badge, EmptyState, Stat } from "../components/ui";
import { PlusIcon, TrashIcon, EditIcon, SearchIcon } from "../components/icons";
import { cup } from "../lib/format";
import type { Supply } from "../lib/types";

const empty = { name: "", unit: "lb", cost: 0, stock: 0, minStock: 0 };

export function Insumos() {
  const { data, saveSupply, deleteSupply } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Supply, "id"> & { id?: string }>(empty);

  const list = useMemo(
    () => data.supplies.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [data.supplies, query],
  );
  const invValue = data.supplies.reduce((a, s) => a + s.stock * s.cost, 0);

  function openNew() { setForm(empty); setOpen(true); }
  function openEdit(s: Supply) { setForm(s); setOpen(true); }
  function submit() {
    if (!form.name.trim()) return;
    saveSupply(form);
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Insumos" value={`${data.supplies.length}`} />
        <Stat label="Valor en almacén" value={cup(invValue)} tone="blue" />
        <Stat label="Bajo mínimo" value={`${data.supplies.filter((s) => s.stock <= s.minStock).length}`} tone="amber" />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar insumo…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <Button onClick={openNew}><PlusIcon className="h-4 w-4" /> Nuevo insumo</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <div className="p-6"><EmptyState title="Sin insumos" hint="Agrega materias primas (harina, huevos, azúcar…) para tus productos elaborados." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Insumo</th>
                  <th className="px-4 py-3 font-semibold">Unidad</th>
                  <th className="px-4 py-3 text-right font-semibold">Costo</th>
                  <th className="px-4 py-3 text-right font-semibold">Existencia</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{cup(s.cost)} / {s.unit}</td>
                    <td className="px-4 py-3 text-right">
                      {s.stock <= s.minStock ? <Badge color="amber">{s.stock} {s.unit}</Badge> : <span className="font-medium text-slate-700">{s.stock} {s.unit}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"><EditIcon className="h-4 w-4" /></button>
                        <button onClick={() => deleteSupply(s.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar insumo" : "Nuevo insumo"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} className="sm:col-span-2" />
          <Input label="Unidad (lb, u, L, kg…)" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
          <NumberInput label={`Costo por ${form.unit || "unidad"} (CUP)`} min={0} value={form.cost} onChange={(n) => setForm({ ...form, cost: n })} />
          <NumberInput label="Existencia" min={0} value={form.stock} onChange={(n) => setForm({ ...form, stock: n })} />
          <NumberInput label="Existencia mínima" min={0} value={form.minStock} onChange={(n) => setForm({ ...form, minStock: n })} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Guardar</Button>
        </div>
      </Modal>
    </div>
  );
}
