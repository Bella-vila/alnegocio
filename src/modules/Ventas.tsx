import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Select, Input, Modal, Badge, EmptyState, Stat } from "../components/ui";
import { PlusIcon, TrashIcon, SearchIcon } from "../components/icons";
import { cup, fmtDateTime } from "../lib/format";
import { computeTotals } from "../lib/analytics";
import type { SaleItem, PaymentMethod } from "../lib/types";

const payOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mlc", label: "MLC / USD" },
];

export function Ventas() {
  const { data, recordSale, deleteSale } = useStore();
  const [pos, setPos] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const totals = computeTotals(data);
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = data.sales.filter((s) => s.date.slice(0, 10) === today);
  const todayRevenue = todaySales.reduce((a, s) => a + s.total, 0);
  const selectedSale = data.sales.find((s) => s.id === detail);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas hoy" value={`${todaySales.length}`} />
        <Stat label="Ingreso hoy" value={cup(todayRevenue)} tone="green" />
        <Stat label="Ingreso total" value={cup(totals.revenue)} tone="blue" />
        <Stat label="Ganancia bruta" value={cup(totals.grossProfit)} tone="green" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setPos(true)}><PlusIcon className="h-4 w-4" /> Nueva venta</Button>
      </div>

      <Card className="overflow-hidden">
        {data.sales.length === 0 ? (
          <div className="p-6"><EmptyState title="Sin ventas" hint="Registra tu primera venta con el botón Nueva venta." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Ganancia</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((s) => (
                  <tr key={s.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50" onClick={() => setDetail(s.id)}>
                    <td className="px-4 py-3 text-slate-600">{fmtDateTime(s.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.customerName}</td>
                    <td className="px-4 py-3"><Badge color="blue">{s.payment}</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{cup(s.total)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{cup(s.profit)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSale(s.id); }}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pos && <POSModal onClose={() => setPos(false)} onSubmit={(d) => { recordSale(d); setPos(false); }} />}

      <Modal open={!!selectedSale} onClose={() => setDetail(null)} title="Detalle de venta">
        {selectedSale && (
          <div>
            <p className="text-sm text-slate-500">{fmtDateTime(selectedSale.date)} · {selectedSale.customerName}</p>
            <div className="mt-3 space-y-2">
              {selectedSale.items.map((it, i) => (
                <div key={i} className="flex justify-between border-b border-slate-100 pb-2 text-sm">
                  <span className="text-slate-700">{it.qty} × {it.name}</span>
                  <span className="font-semibold text-slate-900">{cup(it.qty * it.price)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{cup(selectedSale.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Descuento</span><span>−{cup(selectedSale.discount)}</span></div>
              <div className="flex justify-between text-base font-bold text-slate-900"><span>Total</span><span>{cup(selectedSale.total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Ganancia</span><span>{cup(selectedSale.profit)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function POSModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (d: { customerId: string | null; customerName: string; items: SaleItem[]; discount: number; payment: PaymentMethod }) => void }) {
  const { data } = useStore();
  const customers = data.contacts.filter((c) => c.kind === "cliente");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => data.products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 30),
    [data.products, search],
  );

  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const total = Math.max(0, subtotal - discount);
  const profit = total - items.reduce((s, it) => s + it.qty * it.cost, 0);

  function add(productId: string) {
    const p = data.products.find((x) => x.id === productId);
    if (!p) return;
    setItems((prev) => {
      const ex = prev.find((it) => it.productId === productId);
      if (ex) return prev.map((it) => (it.productId === productId ? { ...it, qty: it.qty + 1 } : it));
      return [...prev, { productId: p.id, name: p.name, qty: 1, price: p.price, cost: p.cost }];
    });
  }
  function setQty(id: string, qty: number) {
    setItems((prev) => prev.map((it) => (it.productId === id ? { ...it, qty: Math.max(1, qty) } : it)));
  }
  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.productId !== id));
  }
  function submit() {
    if (!items.length) return;
    const cust = customers.find((c) => c.id === customerId);
    onSubmit({ customerId: cust?.id ?? null, customerName: cust?.name ?? "Cliente", items, discount, payment });
  }

  return (
    <Modal open onClose={onClose} title="Punto de venta" wide>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="relative mb-3">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p.id)}
                disabled={p.stock <= 0}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-40"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">Stock: {p.stock} {p.unit}</p>
                </div>
                <span className="text-sm font-bold text-slate-900">{cup(p.price)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <Select label="Cliente" value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3" style={{ minHeight: 120 }}>
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Agrega productos al carrito</p>
            ) : (
              items.map((it) => (
                <div key={it.productId} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{it.name}</p>
                    <p className="text-xs text-slate-400">{cup(it.price)} c/u</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => setQty(it.productId, Number(e.target.value))}
                    className="w-14 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                  />
                  <span className="w-20 text-right text-sm font-bold text-slate-900">{cup(it.qty * it.price)}</span>
                  <button onClick={() => remove(it.productId)} className="rounded-lg p-1 text-red-500 hover:bg-red-50"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Descuento (CUP)" type="number" min={0} value={discount} onChange={(v) => setDiscount(Number(v))} />
            <Select label="Pago" value={payment} onChange={(v) => setPayment(v as PaymentMethod)} options={payOptions} />
          </div>

          <div className="mt-3 space-y-1 rounded-xl bg-slate-900 p-4 text-white">
            <div className="flex justify-between text-sm text-slate-300"><span>Subtotal</span><span>{cup(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-slate-300"><span>Descuento</span><span>−{cup(discount)}</span></div>
            <div className="flex justify-between text-xl font-black"><span>Total</span><span>{cup(total)}</span></div>
            <div className="flex justify-between text-sm text-emerald-400"><span>Ganancia</span><span>{cup(profit)}</span></div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={submit} disabled={!items.length} className="flex-1">Cobrar venta</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
