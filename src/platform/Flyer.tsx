import { BrandName } from "./Brand";
import { PLAN, PAYMENT_INFO } from "./config";
import { cup } from "../lib/format";

/**
 * Flyer / página de presentación de AlNegocio.
 * Pensada para mostrar o compartir como anuncio. Diseño llamativo.
 */
export function Flyer({ onEnter }: { onEnter?: () => void }) {
  const benefits = [
    { icon: "🛒", title: "Punto de venta rápido", desc: "Vende en segundos y controla cada peso." },
    { icon: "📦", title: "Inventario y productos", desc: "Sabe siempre qué tienes y qué se vende más." },
    { icon: "💰", title: "Ganancias claras", desc: "Ingresos, gastos y ganancia neta al instante." },
    { icon: "👥", title: "Controla a tu equipo", desc: "Vendedores y administradores con permisos." },
    { icon: "⚖️", title: "Cuadre de caja", desc: "Sin faltantes de dinero ni de mercancía." },
    { icon: "📡", title: "Funciona sin internet", desc: "Sigue vendiendo aunque se vaya la conexión." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-5 py-12">
        {/* Encabezado / marca */}
        <div className="flex flex-col items-center text-center animate-[fadeUp_.6s_ease-out]">
          <img src="./icon-512.png" alt="AlNegocio" className="h-24 w-24 rounded-3xl shadow-2xl shadow-emerald-500/30" />
          <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-6xl">
            <BrandName accent="text-emerald-400" />
          </h1>
          <p className="mt-3 max-w-md text-lg text-emerald-100/80">
            Tu negocio bajo control, <span className="font-bold text-white">desde tu teléfono.</span>
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
            🇨🇺 Para cafeterías, restaurantes, dulcerías, tiendas y cualquier negocio
          </span>
        </div>

        {/* Ventajas */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:border-emerald-400/40 hover:bg-white/10"
              style={{ animation: `fadeUp .5s ease-out ${i * 0.08 + 0.2}s both` }}
            >
              <span className="text-3xl">{b.icon}</span>
              <div>
                <p className="font-bold">{b.title}</p>
                <p className="text-sm text-emerald-100/70">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Frase de impacto */}
        <div className="mt-12 rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10">
          <p className="text-xl font-bold leading-relaxed sm:text-2xl">
            “Un negocio ordenado <span className="text-emerald-400">vende más</span> y <span className="text-emerald-400">pierde menos</span>.”
          </p>
          <p className="mt-2 text-sm text-emerald-100/60">Deja la libreta. Toma el control con AlNegocio.</p>
        </div>

        {/* Precio + CTA */}
        <div className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-7 text-center shadow-2xl shadow-emerald-500/20">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-50/80">Empieza hoy</p>
          <p className="mt-1 text-4xl font-black">14 días GRATIS</p>
          <p className="mt-2 text-emerald-50">
            Luego, una sola cuota de <span className="font-black">{cup(PLAN.monthly)}/mes</span>.
          </p>
          <p className="mt-1 text-xs text-emerald-50/70">Pago fácil por Transfermóvil o efectivo.</p>
          {onEnter && (
            <button
              onClick={onEnter}
              className="mt-5 w-full rounded-2xl bg-white px-6 py-4 text-lg font-black text-emerald-700 shadow-lg transition hover:bg-emerald-50 sm:w-auto sm:px-12"
            >
              Probar AlNegocio ahora →
            </button>
          )}
        </div>

        {/* Pie */}
        <p className="mt-8 text-center text-xs text-emerald-100/40">
          AlNegocio · Ventas, inventario, contabilidad y equipo en una sola app · {PAYMENT_INFO.holder ? "" : ""}Moneda CUP
        </p>
      </div>
    </div>
  );
}
