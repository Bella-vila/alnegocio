import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Select, Modal, Badge, EmptyState, Stat } from "../components/ui";
import { PlusIcon, TrashIcon, SearchIcon } from "../components/icons";
import { cup, fmtDate } from "../lib/format";
import type { PurchaseItem, PaymentMethod } from "../lib/types";

const payOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mlc", label: "MLC / USD" },
];

export function Compras() {
  const { data, recordPurchase, deletePurchase } = useStore();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const totalSpent = data.purchases.reduce((a, p) => a + p.total, 0);
  const month = new Date().toISOString().slice(0, 7);
  const monthSpent = data.purchases.filter((p) => p.date.slice(0, 7) === month).reduce((a, p) => a + p.total, 0);
  const selected = data.purchases.find((p) => p.id === detail);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Compras registradas" value={`${data.purchases.length}`} />
        <Stat label="Gasto del mes" value={cup(monthSpent)} tone="red" />
        <Stat label="Gasto total en compras" value={cup(totalSpent)} tone="red" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><PlusIcon className="h-4 w-4" /> Nueva compra</Button>
      </div>

      <Card className="overflow-hidden">
        {data.purchases.length === 0 ? (
          <div className="p-6"><EmptyState title="Sin compras" hint="Registra las compras a proveedores para actualizar el inventario." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Proveedor</th>
                  <th className="px-4 py-3 font-semibold">Artículos</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((p) => (
                  <tr key={p.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50" onClick={() => setDetail(p.id)}>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(p.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.supplierName}</td>
                    <td className="px-4 py-3 text-slate-600">{p.items.length}</td>
                    <td className="px-4 py-3"><Badge color="blue">{p.payment}</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{cup(p.total)}</td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); deletePurchase(p.id); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><TrashIcon className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && <PurchaseModal onClose={() => setOpen(false)} onSubmit={(d) => { recordPurchase(d); setOpen(false); }} />}

      <Modal open={!!selected} onClose={() => setDetail(null)} title="Detalle de compra">
        {selected && (
          <div>
            <p className="text-sm text-slate-500">{fmtDate(selected.date)} · {selected.supplierName}</p>
            <div className="mt-3 space-y-2">
              {selected.items.map((it, i) => (
                <div key={i} className="flex justify-between border-b border-slate-100 pb-2 text-sm">
                  <span className="text-slate-700">{it.qty} × {it.name} ({cup(it.cost)})</span>
                  <span className="font-semibold text-slate-900">{cup(it.qty * it.cost)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-base font-bold text-slate-900"><span>Total</span><span>{cup(selected.total)}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PurchaseModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (d: { supplierId: string | null; supplierName: string; items: PurchaseItem[]; payment: PaymentMethod }) => void }) {
  const { data } = useStore();
  const suppliers = data.contacts.filter((c) => c.kind === "proveedor");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => data.products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30),
    [data.products, search],
  );
  const total = items.reduce((s, it) => s + it.qty * it.cost, 0);

  function add(id: string) {
    const p = data.products.find((x) => x.id === id);
    if (!p) return;
    setItems((prev) => {
      if (prev.find((it) => it.productId === id)) return prev;
      return [...prev, { productId: p.id, name: p.name, qty: 1, cost: p.cost }];
    });
  }
  function update(id: string, patch: Partial<PurchaseItem>) {
    setItems((prev) => prev.map((it) => (it.productId === id ? { ...it, ...patch } : it)));
  }
  function submit() {
    if (!items.length) return;
    const sup = suppliers.find((s) => s.id === supplierId);
    onSubmit({ supplierId: sup?.id ?? null, supplierName: sup?.name ?? "Proveedor", items, payment });
  }

  return (
    <Modal open onClose={onClose} title="Registrar compra" wide>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="relative mb-3">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => add(p.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-emerald-400 hover:bg-emerald-50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">Stock: {p.stock} · costo {cup(p.cost)}</p>
                </div>
                <PlusIcon className="h-4 w-4 text-emerald-600" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <Select label="Proveedor" value={supplierId} onChange={setSupplierId} options={suppliers.map((c) => ({ value: c.id, label: c.name }))} />
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3" style={{ minHeight: 120 }}>
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Agrega productos comprados</p>
            ) : (
              items.map((it) => (
                <div key={it.productId} className="rounded-lg bg-white px-2.5 py-2 shadow-sm">
                  <p className="mb-1.5 text-sm font-medium text-slate-800">{it.name}</p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Cant.</label>
                    <input type="number" min={1} value={it.qty} onChange={(e) => update(it.productId, { qty: Math.max(1, Number(e.target.value)) })} className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm" />
                    <label className="text-xs text-slate-500">Costo</label>
                    <input type="number" min={0} value={it.cost} onChange={(e) => update(it.productId, { cost: Number(e.target.value) })} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm" />
                    <span className="ml-auto text-sm font-bold text-slate-900">{cup(it.qty * it.cost)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Select label="Forma de pago" value={payment} onChange={(v) => setPayment(v as PaymentMethod)} options={payOptions} className="mt-3" />

          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
            <span className="font-semibold">Total compra</span>
            <span className="text-xl font-black">{cup(total)}</span>
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={submit} disabled={!items.length} className="flex-1">Guardar compra</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
