import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, Input, NumberInput, Modal, Badge, EmptyState, Stat, SectionTitle } from "../components/ui";
import { cup, fmtDateTime } from "../lib/format";
import { cn } from "../utils/cn";
import type { Shift, ShiftCount } from "../lib/types";

export function Cuadre({ sellerId, sellerName, canManageAll }: { sellerId: string; sellerName: string; canManageAll: boolean }) {
  const { data, openShift, closeShift, deleteShift } = useStore();
  const [openModal, setOpenModal] = useState(false);
  const [closing, setClosing] = useState<Shift | null>(null);
  const [detail, setDetail] = useState<Shift | null>(null);

  // Turno abierto de este vendedor
  const myOpen = data.shifts.find((s) => s.status === "abierto" && s.sellerId === sellerId) ?? null;
  const history = canManageAll ? data.shifts : data.shifts.filter((s) => s.sellerId === sellerId);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle
          title="Cuadre de turno"
          subtitle="Al entrar o salir un vendedor, cuenten el efectivo y los productos para verificar que todo cuadre."
        />
        {myOpen ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge color="green">Turno abierto</Badge>
                <p className="mt-2 font-bold text-slate-900">{myOpen.sellerName}</p>
                <p className="text-sm text-slate-600">Abierto: {fmtDateTime(myOpen.openedAt)}</p>
                <p className="text-sm text-slate-600">Fondo de caja inicial: <strong>{cup(myOpen.openingCash)}</strong></p>
              </div>
              <Button onClick={() => setClosing(myOpen)}>Cerrar turno y cuadrar</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="font-semibold text-slate-800">No tienes un turno abierto</p>
            <p className="mt-1 text-sm text-slate-500">Abre tu turno al empezar, con el dinero que recibes en caja.</p>
            <Button className="mt-3" onClick={() => setOpenModal(true)}>Abrir turno</Button>
          </div>
        )}
      </Card>

      {/* Historial de cuadres */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold text-slate-900">{canManageAll ? "Historial de cuadres" : "Mis cuadres"}</h2>
        </div>
        {history.length === 0 ? (
          <div className="p-6"><EmptyState title="Sin cuadres aún" hint="Los turnos cerrados aparecerán aquí." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Vendedor</th>
                  <th className="px-4 py-3 font-semibold">Cierre</th>
                  <th className="px-4 py-3 text-right font-semibold">Esperado</th>
                  <th className="px-4 py-3 text-right font-semibold">Contado</th>
                  <th className="px-4 py-3 text-right font-semibold">Diferencia</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50" onClick={() => setDetail(s)}>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.sellerName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.status === "abierto" ? <Badge color="green">Abierto</Badge> : fmtDateTime(s.closedAt ?? "")}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{s.status === "cerrado" ? cup(s.expectedCash) : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{s.status === "cerrado" ? cup(s.countedCash) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "cerrado" ? <DiffBadge value={s.cashDiff} /> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {canManageAll && (
                        <button onClick={(e) => { e.stopPropagation(); deleteShift(s.id); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Eliminar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openModal && (
        <OpenShiftModal
          sellerName={sellerName}
          onClose={() => setOpenModal(false)}
          onOpen={(openingCash) => { openShift({ sellerId, sellerName, openingCash }); setOpenModal(false); }}
        />
      )}

      {closing && (
        <CloseShiftModal
          shift={closing}
          onClose={() => setClosing(null)}
          onConfirm={(input) => { closeShift(closing.id, input); setClosing(null); }}
        />
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalle del cuadre" wide>
        {detail && <ShiftDetail shift={detail} />}
      </Modal>
    </div>
  );
}

function DiffBadge({ value }: { value: number }) {
  if (value === 0) return <Badge color="green">Cuadra</Badge>;
  if (value > 0) return <Badge color="blue">Sobran {cup(value)}</Badge>;
  return <Badge color="red">Faltan {cup(Math.abs(value))}</Badge>;
}

function OpenShiftModal({ sellerName, onClose, onOpen }: { sellerName: string; onClose: () => void; onOpen: (cash: number) => void }) {
  const [cash, setCash] = useState(0);
  return (
    <Modal open onClose={onClose} title="Abrir turno">
      <p className="mb-4 text-sm text-slate-500">Vendedor: <strong>{sellerName}</strong></p>
      <NumberInput label="Fondo de caja inicial (CUP)" min={0} value={cash} onChange={(n) => setCash(n)} />
      <p className="mt-2 text-xs text-slate-400">Es el dinero en efectivo con el que empiezas la caja.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onOpen(cash)}>Abrir turno</Button>
      </div>
    </Modal>
  );
}

function CloseShiftModal({
  shift,
  onClose,
  onConfirm,
}: {
  shift: Shift;
  onClose: () => void;
  onConfirm: (input: { countedCash: number; productCounts: ShiftCount[]; note: string }) => void;
}) {
  const { data } = useStore();

  // Calcular ventas del turno y cantidades vendidas por producto
  const shiftSales = useMemo(() => data.sales.filter((s) => s.date >= shift.openedAt), [data.sales, shift.openedAt]);
  const cashSales = shiftSales.filter((s) => s.payment === "efectivo").reduce((a, s) => a + s.total, 0);
  const transferSales = shiftSales.filter((s) => s.payment !== "efectivo").reduce((a, s) => a + s.total, 0);
  const expectedCash = shift.openingCash + cashSales;

  const soldByProduct = useMemo(() => {
    const map = new Map<string, number>();
    shiftSales.forEach((s) => s.items.forEach((it) => map.set(it.productId, (map.get(it.productId) ?? 0) + it.qty)));
    return map;
  }, [shiftSales]);

  // Resumen: productos vendidos en el turno con cantidad e importe
  const soldSummary = useMemo(() => {
    const map = new Map<string, { id: string; name: string; qty: number; amount: number }>();
    shiftSales.forEach((s) =>
      s.items.forEach((it) => {
        const cur = map.get(it.productId) ?? { id: it.productId, name: it.name, qty: 0, amount: 0 };
        cur.qty += it.qty;
        cur.amount += it.qty * it.price;
        map.set(it.productId, cur);
      }),
    );
    return [...map.values()].sort((a, b) => b.amount - a.amount);
  }, [shiftSales]);

  // Productos a contar: los que se vendieron en el turno (o todos con stock)
  const productsToCount = useMemo(() => {
    const ids = new Set(soldByProduct.keys());
    return data.products.filter((p) => ids.has(p.id) || p.stock > 0);
  }, [data.products, soldByProduct]);

  const [countedCash, setCountedCash] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(productsToCount.map((p) => [p.id, p.stock])),
  );
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"cash" | "products">("cash");

  const cashDiff = countedCash - expectedCash;

  function confirm() {
    const productCounts: ShiftCount[] = productsToCount.map((p) => ({
      productId: p.id,
      name: p.name,
      expected: p.stock, // stock que el sistema cree que queda
      counted: counts[p.id] ?? 0,
      diff: (counts[p.id] ?? 0) - p.stock,
    }));
    onConfirm({ countedCash, productCounts, note });
  }

  return (
    <Modal open onClose={onClose} title="Cerrar turno y cuadrar" wide>
      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 text-sm">
        <button onClick={() => setStep("cash")} className={cn("rounded-lg px-4 py-2 font-semibold", step === "cash" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>1. Efectivo</button>
        <button onClick={() => setStep("products")} className={cn("rounded-lg px-4 py-2 font-semibold", step === "products" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>2. Productos</button>
      </div>

      {step === "cash" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Fondo inicial" value={cup(shift.openingCash)} />
            <Stat label="Ventas en efectivo" value={cup(cashSales)} tone="green" />
            <Stat label="Ventas por transferencia" value={cup(transferSales)} tone="blue" />
            <Stat label="Efectivo esperado" value={cup(expectedCash)} />
          </div>

          {/* Resumen de productos vendidos en el turno */}
          <div>
            <p className="mb-2 text-sm font-bold text-slate-900">Productos que vendiste en este turno</p>
            {soldSummary.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Aún no hay ventas en este turno.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 font-semibold">Producto</th>
                      <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                      <th className="px-3 py-2 text-right font-semibold">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldSummary.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 text-slate-800">{r.name}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-700">{r.qty}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">{cup(r.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-900">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{soldSummary.reduce((a, r) => a + r.qty, 0)}</td>
                      <td className="px-3 py-2 text-right font-black text-emerald-600">{cup(soldSummary.reduce((a, r) => a + r.amount, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <NumberInput label="Efectivo contado en caja (CUP)" min={0} value={countedCash} onChange={(n) => setCountedCash(n)} />
          <div className={cn("rounded-xl p-4 text-center font-bold", cashDiff === 0 ? "bg-emerald-50 text-emerald-700" : cashDiff > 0 ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-700")}>
            {cashDiff === 0 ? "✓ La caja cuadra perfectamente" : cashDiff > 0 ? `Sobran ${cup(cashDiff)} en caja` : `Faltan ${cup(Math.abs(cashDiff))} en caja`}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep("products")}>Siguiente: contar productos</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Cuenta físicamente cuántas unidades quedan de cada producto.</p>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {productsToCount.length === 0 ? (
              <EmptyState title="No hay productos para contar" />
            ) : (
              productsToCount.map((p) => {
                const counted = counts[p.id] ?? 0;
                const diff = counted - p.stock;
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-400">Sistema: {p.stock} {p.unit}{soldByProduct.get(p.id) ? ` · vendidos hoy: ${soldByProduct.get(p.id)}` : ""}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={counted}
                      onChange={(e) => setCounts((c) => ({ ...c, [p.id]: Number(e.target.value) }))}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-center text-sm"
                    />
                    <span className="w-24 text-right text-xs font-semibold">
                      {diff === 0 ? <span className="text-emerald-600">OK</span> : diff > 0 ? <span className="text-sky-600">+{diff}</span> : <span className="text-red-600">{diff}</span>}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <Input label="Nota (opcional)" value={note} onChange={setNote} placeholder="Ej: faltó 1 refresco, se rompió" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("cash")}>Atrás</Button>
            <Button onClick={confirm}>Confirmar cuadre y cerrar turno</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ShiftDetail({ shift }: { shift: Shift }) {
  const problems = shift.productCounts.filter((c) => c.diff !== 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Vendedor" value={shift.sellerName} />
        <Stat label="Ventas del turno" value={`${shift.salesCount}`} />
        <Stat label="Efectivo esperado" value={cup(shift.expectedCash)} />
        <Stat label="Efectivo contado" value={cup(shift.countedCash)} tone={shift.cashDiff === 0 ? "green" : "red"} />
      </div>
      <div className={cn("rounded-xl p-3 text-center font-bold", shift.cashDiff === 0 ? "bg-emerald-50 text-emerald-700" : shift.cashDiff > 0 ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-700")}>
        {shift.cashDiff === 0 ? "La caja cuadró" : shift.cashDiff > 0 ? `Sobraron ${cup(shift.cashDiff)}` : `Faltaron ${cup(Math.abs(shift.cashDiff))}`}
      </div>

      {shift.soldItems && shift.soldItems.length > 0 && (
        <div>
          <p className="mb-2 font-bold text-slate-900">Productos vendidos en el turno</p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Producto</th>
                  <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                  <th className="px-3 py-2 text-right font-semibold">Importe</th>
                </tr>
              </thead>
              <tbody>
                {shift.soldItems.map((r) => (
                  <tr key={r.productId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-800">{r.name}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700">{r.qty}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{cup(r.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-900">Total</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900">{shift.soldItems.reduce((a, r) => a + r.qty, 0)}</td>
                  <td className="px-3 py-2 text-right font-black text-emerald-600">{cup(shift.soldItems.reduce((a, r) => a + r.amount, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 font-bold text-slate-900">Conteo de productos</p>
        {problems.length === 0 ? (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">✓ Todos los productos cuadraron.</div>
        ) : (
          <div className="space-y-1.5">
            {problems.map((c) => (
              <div key={c.productId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{c.name}</span>
                <span className={c.diff < 0 ? "font-semibold text-red-600" : "font-semibold text-sky-600"}>
                  {c.diff < 0 ? `Faltan ${Math.abs(c.diff)}` : `Sobran ${c.diff}`} (sistema {c.expected}, contado {c.counted})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {shift.note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Nota: {shift.note}</p>}
    </div>
  );
}
