import { useState } from "react";
import { useStore } from "../lib/store";
import { Card, Button, NumberInput, SectionTitle } from "../components/ui";
import { cup } from "../lib/format";
import { cn } from "../utils/cn";

/**
 * Tasa de cambio USD/EUR con DOS valores por moneda:
 *  - COMPRA: a cómo el negocio compra la divisa (más baja).
 *  - PAGO:   a cómo el negocio la acepta cuando el cliente paga.
 * El dueño (canEdit) las fija; vendedores y administradores solo las ven.
 */
export function Cambio({ canEdit }: { canEdit: boolean }) {
  const { data, updateBusiness } = useStore();
  const b = data.business;
  const [usdBuy, setUsdBuy] = useState(b.usdBuy);
  const [eurBuy, setEurBuy] = useState(b.eurBuy);
  const [usdPay, setUsdPay] = useState(b.usdPay);
  const [eurPay, setEurPay] = useState(b.eurPay);
  const [saved, setSaved] = useState(false);

  function save() {
    updateBusiness({ usdBuy, eurBuy, usdPay, eurPay });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Tarjetas con las tasas actuales */}
      <div className="grid gap-3 sm:grid-cols-2">
        <RateCard flag="🇺🇸" name="Dólar (USD)" buy={b.usdBuy} pay={b.usdPay} />
        <RateCard flag="🇪🇺" name="Euro (EUR)" buy={b.eurBuy} pay={b.eurPay} />
      </div>

      {/* Explicación */}
      <Card className="border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-sm text-emerald-900">
          <strong>Compra:</strong> a cómo el negocio compra la divisa al cliente.{" "}
          <strong>Pago:</strong> a cómo se acepta esa divisa cuando un cliente paga con ella.
          {!canEdit && " Estas tasas las fija el dueño."}
        </p>
      </Card>

      {/* Editar (solo dueño) */}
      {canEdit && (
        <Card className="p-5">
          <SectionTitle title="Fijar tasas" subtitle="Define cuántos CUP vale cada divisa al comprar y al aceptarla como pago." />
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">🇺🇸 Dólar (USD)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberInput label="Compra · 1 USD = ? CUP" min={0} value={usdBuy} onChange={setUsdBuy} />
                <NumberInput label="Pago · 1 USD = ? CUP" min={0} value={usdPay} onChange={setUsdPay} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">🇪🇺 Euro (EUR)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberInput label="Compra · 1 EUR = ? CUP" min={0} value={eurBuy} onChange={setEurBuy} />
                <NumberInput label="Pago · 1 EUR = ? CUP" min={0} value={eurPay} onChange={setEurPay} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save}>Guardar tasas</Button>
            {saved && <span className="text-sm font-semibold text-emerald-600">✓ Guardado</span>}
          </div>
        </Card>
      )}

      {/* Calculadora */}
      <Calculator
        usdBuy={b.usdBuy}
        eurBuy={b.eurBuy}
        usdPay={b.usdPay}
        eurPay={b.eurPay}
      />
    </div>
  );
}

function RateCard({ flag, name, buy, pay }: { flag: string; name: string; buy: number; pay: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{flag}</span>
        <p className="font-bold text-slate-900">{name}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Compra</p>
          <p className="mt-1 text-xl font-black text-amber-700">{cup(buy)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pago</p>
          <p className="mt-1 text-xl font-black text-emerald-700">{cup(pay)}</p>
        </div>
      </div>
    </Card>
  );
}

function Calculator({ usdBuy, eurBuy, usdPay, eurPay }: { usdBuy: number; eurBuy: number; usdPay: number; eurPay: number }) {
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const [mode, setMode] = useState<"pay" | "buy">("pay");

  const rate =
    currency === "USD" ? (mode === "pay" ? usdPay : usdBuy) : mode === "pay" ? eurPay : eurBuy;
  const result = amount * rate;

  return (
    <Card className="p-5">
      <SectionTitle title="Calculadora" subtitle="Convierte divisa a CUP según compra o pago" />
      <div className="flex flex-wrap items-end gap-3">
        <NumberInput label="Monto" min={0} value={amount} onChange={setAmount} className="flex-1" />
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Moneda</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {(["USD", "EUR"] as const).map((c) => (
              <button key={c} onClick={() => setCurrency(c)} className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", currency === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-1">
        <button onClick={() => setMode("pay")} className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", mode === "pay" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500")}>
          Cliente paga con divisa
        </button>
        <button onClick={() => setMode("buy")} className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", mode === "buy" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500")}>
          Comprar divisa
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-center text-white">
        <p className="text-sm text-slate-300">{amount || 0} {currency} = </p>
        <p className={cn("mt-1 text-3xl font-black", mode === "pay" ? "text-emerald-400" : "text-amber-400")}>{cup(result)}</p>
        <p className="mt-1 text-xs text-slate-400">
          {mode === "pay" ? "aceptas como pago" : "pagas al comprar"} · 1 {currency} = {cup(rate)}
        </p>
      </div>
    </Card>
  );
}
