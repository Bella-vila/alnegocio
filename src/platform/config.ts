/**
 * Configuración de conexión a Supabase (el backend).
 *
 * PARA ACTIVAR EL BACKEND REAL:
 * 1. Crea un proyecto gratis en https://supabase.com
 * 2. Copia la URL del proyecto y la "anon public key" (Project Settings → API)
 * 3. Pégalas abajo (o defínelas como variables de entorno VITE_SUPABASE_URL /
 *    VITE_SUPABASE_ANON_KEY al construir).
 *
 * Mientras estén vacías, la app funciona en MODO DEMO (datos locales en el
 * navegador) para que puedas verla; pero la aprobación segura de pagos SOLO
 * funciona con el backend real conectado.
 */

const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

// 👉 PASO RÁPIDO: pega aquí tus claves de Supabase (entre las comillas).
//    Las encuentras en: Supabase → Project Settings → API
const MANUAL_SUPABASE_URL = ""; // ej: "https://abcd1234.supabase.co"
const MANUAL_SUPABASE_ANON_KEY = ""; // ej: "eyJhbGciOi..."

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? MANUAL_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? MANUAL_SUPABASE_ANON_KEY ?? "";

export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// ============================================================
//  💰 PRECIO Y DATOS DE PAGO
//  Para cambiar el precio en el futuro: edita "monthly" y reconstruye.
//  (Si usas el backend, además ejecuta: supabase secrets set PLAN_PRICE="6000")
// ============================================================
export const PLAN = {
  id: "negocio",
  name: "Plan Negocio",
  tagline: "Para cualquier negocio o emprendimiento en Cuba",
  monthly: 2500, // 👈 CAMBIA AQUÍ EL PRECIO MENSUAL EN CUP
  features: [
    "Punto de venta rápido (POS) y control de ventas",
    "Productos, inventario y compras a proveedores",
    "Empleados, salarios y nómina",
    "Contabilidad y estado de resultados",
    "Clientes, proveedores y créditos",
    "Reportes avanzados y exportación CSV",
  ],
} as const;

// 👇 TARJETAS DE COBRO. Agrega varias y la app las irá ALTERNANDO
// automáticamente cada vez que alguien va a pagar, para repartir los cobros
// y que ninguna tarjeta llegue rápido a su límite.
export const PAYMENT_CARDS = [
  { card: "9205 9598 7377 9962", holder: "AlNegocio", phone: "55513981" },
  { card: "9205 9598 7499 9858", holder: "AlNegocio", phone: "55513981" },
  // Agrega más tarjetas aquí cuando quieras…
];

// Elige una tarjeta de forma rotatoria. Si recibe un "índice" (ej. # de cobros
// hechos), reparte equitativamente; si no, elige una al azar.
export function pickPaymentCard(rotation?: number) {
  if (PAYMENT_CARDS.length === 0) {
    return { card: "—", holder: "—", phone: "" };
  }
  const i = typeof rotation === "number" ? rotation % PAYMENT_CARDS.length : Math.floor(Math.random() * PAYMENT_CARDS.length);
  return PAYMENT_CARDS[i];
}

// Compatibilidad: primera tarjeta como valor por defecto.
export const PAYMENT_INFO = {
  ...PAYMENT_CARDS[0],
  note: "Tras transferir, escribe el número de la transacción al enviar la solicitud.",
};

export const TRIAL_DAYS = 14;
