import { useState } from "react";
import { usePlatform } from "./platformStore";
import { PLAN, HAS_BACKEND } from "./config";
import { cup } from "../lib/format";
import { cn } from "../utils/cn";
import { InstallButton } from "./InstallButton";
import { BrandName } from "./Brand";

export function AuthScreens() {
  const { login, register } = usePlatform();
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="./icon-512.png" alt="AlNegocio" className="h-10 w-10 rounded-xl shadow-lg shadow-emerald-900/30" />
            <div>
              <p className="text-lg font-black tracking-tight"><BrandName accent="text-emerald-400" /></p>
              <p className="text-xs text-emerald-200/70">Software de gestión para negocios en Cuba</p>
            </div>
          </div>
          <div className="inline-flex rounded-xl bg-white/10 p-1 text-sm">
            <button onClick={() => setMode("login")} className={cn("rounded-lg px-4 py-2 font-semibold transition", mode === "login" ? "bg-white text-slate-900" : "text-white/80")}>Entrar</button>
            <button onClick={() => setMode("register")} className={cn("rounded-lg px-4 py-2 font-semibold transition", mode === "register" ? "bg-white text-slate-900" : "text-white/80")}>Registrarse</button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
Con <BrandName accent="text-emerald-400" /><br />administra tu negocio fácil.
            </h1>
            <p className="mt-4 max-w-md text-emerald-100/80">
              Ventas, inventario, compras, empleados y contabilidad en una sola app para cualquier negocio o emprendimiento en Cuba: cafeterías, restaurantes, dulcerías, tiendas y más.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-emerald-50/90">
              <li className="flex items-center gap-2"><Dot /> {TRIAL()} días de prueba gratis al registrarte</li>
              <li className="flex items-center gap-2"><Dot /> Una sola cuota de {cup(PLAN.monthly)} al mes</li>
              <li className="flex items-center gap-2"><Dot /> Aprobación de pagos segura desde el servidor</li>
            </ul>
            <div className="mt-6">
              <InstallButton />
            </div>
            {!HAS_BACKEND && (
              <p className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Modo demo (sin backend). Conecta Supabase en <code>src/platform/config.ts</code> para activar la aprobación segura real.
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
            {mode === "login" ? <LoginForm onLogin={login} goRegister={() => setMode("register")} /> : <RegisterForm onRegister={register} />}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-emerald-100/50">
          {HAS_BACKEND ? "Backend seguro conectado." : "Cuentas demo: cafe@correo.cu / 1234 · negocio@correo.cu / 1234"}
        </p>
      </div>
    </div>
  );
}

function TRIAL() {
  return 14;
}
function Dot() {
  return <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-black text-white">✓</span>;
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input {...props} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
    </label>
  );
}

function LoginForm({ onLogin, goRegister }: { onLogin: (e: string, p: string) => Promise<{ ok: boolean; error?: string }>; goRegister: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await onLogin(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Error");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-xl font-black">Inicia sesión</h2>
      <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@correo.cu" />
      <Field label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60">{busy ? "Entrando…" : "Entrar"}</button>
      <p className="text-center text-sm text-slate-500">¿No tienes cuenta? <button type="button" onClick={goRegister} className="font-semibold text-emerald-600">Regístrate</button></p>
    </form>
  );
}

function RegisterForm({ onRegister }: { onRegister: (i: { businessName: string; ownerName: string; email: string; phone: string; password: string }) => Promise<{ ok: boolean; error?: string }> }) {
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await onRegister({ businessName, ownerName, email, phone, password });
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Error");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-xl font-black">Crea tu cuenta</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre del negocio" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        <Field label="Tu nombre" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Field label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-sm font-bold text-slate-900">{PLAN.name}</p>
        <p className="text-xs text-slate-500">{PLAN.tagline}</p>
        <p className="mt-1 font-black text-emerald-600">{cup(PLAN.monthly)}<span className="text-[11px] font-medium text-slate-400">/mes</span></p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60">{busy ? "Creando…" : "Empezar prueba gratis de 14 días"}</button>
    </form>
  );
}
