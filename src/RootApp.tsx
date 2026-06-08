import { useState } from "react";
import { PlatformProvider, usePlatform, isActive, daysLeft } from "./platform/platformStore";
import { StoreProvider } from "./lib/store";
import { AuthScreens } from "./platform/AuthScreens";
import { Flyer } from "./platform/Flyer";
import { Suscripcion } from "./platform/Suscripcion";
import { PLAN } from "./platform/config";
import { Button } from "./components/ui";
import { StoreIcon } from "./components/icons";
import { fmtDate } from "./lib/format";
import TenantApp from "./App";
import type { Tenant } from "./platform/types";

function Router() {
  const { session } = usePlatform();
  const [showAuth, setShowAuth] = useState(false);

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
          Cargando…
        </div>
      </div>
    );
  }

  if (session.status === "signedOut") {
    // Primero el flyer/presentación; el botón lleva a iniciar sesión / registro
    return showAuth ? <AuthScreens /> : <Flyer onEnter={() => setShowAuth(true)} />;
  }

  // signedIn
  const tenant = session.tenant;
  if (!isActive(tenant)) {
    return <Paywall tenant={tenant} />;
  }
  return <TenantApp />;
}

function Paywall({ tenant }: { tenant: Tenant }) {
  const { logout } = usePlatform();
  const dl = daysLeft(tenant);

  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-100">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><StoreIcon className="h-5 w-5" /></div>
              <div>
                <p className="font-black tracking-tight text-slate-900">{tenant.business_name}</p>
                <p className="text-xs text-slate-400">{PLAN.name}</p>
              </div>
            </div>
            <Button variant="soft" onClick={logout}>Cerrar sesión</Button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h1 className="text-xl font-black text-slate-900">Tu suscripción está vencida</h1>
            <p className="mt-1 text-sm text-slate-600">
              Tu cuota venció el {fmtDate(tenant.paid_until)} (hace {Math.abs(dl)} días). Realiza el pago y, cuando el administrador
              lo apruebe, pulsa “Actualizar estado” para recuperar el acceso a todos los módulos.
            </p>
          </div>
          <Suscripcion tenant={tenant} />
        </main>
      </div>
    </StoreProvider>
  );
}

export default function RootApp() {
  return (
    <PlatformProvider>
      <Router />
    </PlatformProvider>
  );
}
