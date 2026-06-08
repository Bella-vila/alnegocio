import { useMemo, useState } from "react";
import { usePlatform, isActive, daysLeft } from "./platformStore";
import { PLAN, HAS_BACKEND, pickPaymentCard } from "./config";
import { Card, Button, Select, Modal, Badge, Stat, SectionTitle, EmptyState } from "../components/ui";
import { cup, fmtDate } from "../lib/format";
import { cn } from "../utils/cn";
import type { PaymentMethod, Tenant } from "./types";

function labelMethod(m: PaymentMethod) {
  return m === "transferencia" ? "Transfermóvil" : "Efectivo";
}

export function Suscripcion({ tenant }: { tenant: Tenant }) {
  const { createRequest, cancelRequest, refresh } = usePlatform();
  const [payOpen, setPayOpen] = useState(false);
  const active = isActive(tenant);
  const dl = daysLeft(tenant);
  const pending = tenant.requests.find((r) => r.status === "pendiente" || r.status === "en_espera") ?? null;

  return (
    <div className="space-y-5">
      <Card className={cn("overflow-hidden", active ? "border-emerald-200" : "border-red-200")}>
        <div className={cn("px-6 py-5", active ? "bg-emerald-50" : "bg-red-50")}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tu suscripción</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">{PLAN.name}</h2>
              <p className="text-sm text-slate-500">{PLAN.tagline}</p>
            </div>
            <div className="text-right">
              {active ? <Badge color="green">Activa</Badge> : <Badge color="red">Vencida</Badge>}
              <p className="mt-2 text-3xl font-black text-slate-900">{cup(PLAN.monthly)}<span className="text-sm font-medium text-slate-400">/mes</span></p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          <Stat label="Vence el" value={fmtDate(tenant.paid_until)} tone={active ? "green" : "red"} />
          <Stat label="Días restantes" value={dl >= 0 ? `${dl} días` : `Vencida hace ${Math.abs(dl)} d.`} tone={dl > 5 ? "green" : dl >= 0 ? "amber" : "red"} />
          <Stat label="Cliente desde" value={fmtDate(tenant.created_at)} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-6 py-4">
          <Button onClick={() => setPayOpen(true)} disabled={!!pending}>Pagar / renovar suscripción</Button>
          <Button variant="outline" onClick={refresh}>Actualizar estado</Button>
        </div>
      </Card>

      {pending && (
        <Card className="border-amber-200 bg-amber-50/70 p-5">
          <Badge color="amber">En espera de aprobación</Badge>
          <h3 className="mt-2 text-lg font-black text-slate-900">Pago enviado · esperando confirmación del administrador</h3>
          <p className="mt-1 text-sm text-slate-600">
            Solicitud de <strong>{cup(pending.amount)}</strong> ({pending.months} mes/es) por <strong>{labelMethod(pending.method)}</strong>
            {pending.reference ? <> · transacción <strong>{pending.reference}</strong></> : null}.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            El administrador verificará el pago y aprobará tu suscripción. Cuando lo haga, pulsa <strong>“Actualizar estado”</strong> y tu acceso se renovará automáticamente.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>Actualizar estado</Button>
            <Button variant="danger" size="sm" onClick={() => cancelRequest(pending.id)}>Cancelar solicitud</Button>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <SectionTitle title="Qué incluye tu suscripción" />
        <ul className="grid gap-2 sm:grid-cols-2">
          {PLAN.features.map((f: string, i: number) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-600">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3"><h2 className="font-bold text-slate-900">Historial de pagos aprobados</h2></div>
        {tenant.invoices.length === 0 ? (
          <div className="p-6"><EmptyState title="Sin pagos aprobados" hint="Tus pagos aparecerán aquí una vez aprobados." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Meses</th>
                  <th className="px-4 py-3 font-semibold">Método</th>
                  <th className="px-4 py-3 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {tenant.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-600">{fmtDate(inv.date)}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.months}</td>
                    <td className="px-4 py-3"><Badge color="blue">{inv.method}</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{cup(inv.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {payOpen && (
        <PayModal
          onClose={() => setPayOpen(false)}
          onSubmit={async (i) => {
            const res = await createRequest(i);
            return res;
          }}
        />
      )}
    </div>
  );
}

function PayModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (i: { months: number; method: PaymentMethod; reference: string }) => Promise<{ ok: boolean; error?: string }>;
}) {
  // Tarjeta de cobro ROTATIVA: avanza un contador cada vez que se abre el pago,
  // así se reparte el cobro entre todas tus tarjetas.
  const card = useMemo(() => {
    const key = "alnegocio.cardRotation";
    const n = Number(localStorage.getItem(key) ?? "0");
    localStorage.setItem(key, String(n + 1));
    return pickPaymentCard(n);
  }, []);

  const [method, setMethod] = useState<PaymentMethod>("transferencia");
  const [months, setMonths] = useState(1);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const total = PLAN.monthly * months;
  const needsRef = method === "transferencia";
  const refMissing = needsRef && !reference.trim();

  async function submit() {
    if (refMissing) { setError("Ingresa el número de transacción."); return; }
    setBusy(true);
    setError("");
    const res = await onSubmit({ months, method, reference });
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Error"); return; }
    setDone(true);
  }

  if (done) {
    return (
      <Modal open onClose={onClose} title="Solicitud enviada">
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            ✓ Tu solicitud de <strong>{cup(total)}</strong> quedó <strong>en espera de aprobación</strong>.
          </div>
          <p className="text-sm text-slate-600">
            {HAS_BACKEND
              ? "El administrador recibió un correo con tu solicitud y un botón para aprobarla. Cuando la apruebe, pulsa “Actualizar estado”."
              : "Modo demo: la aprobación real ocurre en el servidor. Conecta Supabase para activarla."}
          </p>
          <Button onClick={onClose} className="w-full">Entendido</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Pagar suscripción">
      <div className="mb-4 rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">{PLAN.name}</p>
        <p className="text-2xl font-black text-slate-900">{cup(total)} <span className="text-sm font-medium text-slate-400">por {months} mes/es</span></p>
      </div>

      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Método de pago</span>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {([
          { id: "transferencia", label: "Transfermóvil" },
          { id: "efectivo", label: "Efectivo" },
        ] as const).map((m) => (
          <button key={m.id} onClick={() => setMethod(m.id)}
            className={cn("rounded-xl border px-3 py-2.5 text-sm font-semibold transition", method === m.id ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20" : "border-slate-300 text-slate-600 hover:border-slate-400")}>
            {m.label}
          </button>
        ))}
      </div>

      {method === "efectivo" ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Pagarás en <strong>efectivo</strong>. Al enviar, el administrador recibe tu solicitud; cuando confirme el cobro aprobará tu suscripción.
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">1) Transfiere a esta tarjeta:</p>
          <div className="mt-2 rounded-lg bg-white p-3">
            <p className="font-mono text-base font-black tracking-wider text-slate-900">{card.card}</p>
            <p className="mt-1 text-xs text-slate-600">A nombre de: <strong>{card.holder}</strong></p>
            {card.phone && <p className="text-xs text-slate-600">Tel. Transfermóvil: <strong>{card.phone}</strong></p>}
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(card.card.replace(/\s/g, ""))}
              className="mt-2 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Copiar número de tarjeta
            </button>
          </div>
          <p className="mt-2 font-bold">2) Escribe el número de transacción abajo.</p>
        </div>
      )}

      <Select label="Meses" value={String(months)} onChange={(v) => setMonths(Number(v))} options={[1, 2, 3, 6, 12].map((m) => ({ value: String(m), label: `${m} mes${m > 1 ? "es" : ""}` }))} />

      {needsRef && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Número de transacción (Transfermóvil)</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: 998127364521" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </label>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={busy || refMissing}>{busy ? "Enviando…" : "Enviar solicitud de pago"}</Button>
      </div>
    </Modal>
  );
}
