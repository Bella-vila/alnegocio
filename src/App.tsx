import { useEffect, useState, type ReactNode } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { usePlatform, daysLeft, isActive } from "./platform/platformStore";
import { cn } from "./utils/cn";
import {
  DashboardIcon,
  SalesIcon,
  ProductsIcon,
  PurchaseIcon,
  ContactsIcon,
  AccountUsersIcon,
  EmployeesIcon,
  AccountingIcon,
  ReportsIcon,
  SettingsIcon,
  StoreIcon,
  WalletIcon,
  BalanceIcon,
  ExchangeIcon,
  SupplyIcon,
} from "./components/icons";
import { Dashboard } from "./modules/Dashboard";
import { Ventas } from "./modules/Ventas";
import { Productos } from "./modules/Productos";
import { Compras } from "./modules/Compras";
import { Contactos } from "./modules/Contactos";
import { Empleados } from "./modules/Empleados";
import { Contabilidad } from "./modules/Contabilidad";
import { Reportes } from "./modules/Reportes";
import { Ajustes } from "./modules/Ajustes";
import { Usuarios } from "./modules/Usuarios";
import { Cuadre } from "./modules/Cuadre";
import { Cambio } from "./modules/Cambio";
import { Insumos } from "./modules/Insumos";
import { Suscripcion } from "./platform/Suscripcion";
import { canAccess, defaultModule, ROLE_LABEL, type Role } from "./platform/roles";
import { buildNotifications } from "./lib/notifications";
import { NotificationsBell } from "./components/NotificationsBell";
import type { ModuleKey } from "./lib/types";

const nav: Array<{ key: ModuleKey; label: string; Icon: (p: { className?: string }) => ReactNode }> = [
  { key: "dashboard", label: "Resumen", Icon: DashboardIcon },
  { key: "ventas", label: "Ventas", Icon: SalesIcon },
  { key: "productos", label: "Productos", Icon: ProductsIcon },
  { key: "insumos", label: "Insumos", Icon: SupplyIcon },
  { key: "compras", label: "Compras", Icon: PurchaseIcon },
  { key: "contactos", label: "Clientes y proveedores", Icon: ContactsIcon },
  { key: "empleados", label: "Empleados y salarios", Icon: EmployeesIcon },
  { key: "contabilidad", label: "Contabilidad", Icon: AccountingIcon },
  { key: "reportes", label: "Reportes", Icon: ReportsIcon },
  { key: "cuadre", label: "Cuadre de turno", Icon: BalanceIcon },
  { key: "cambio", label: "Tasa de cambio", Icon: ExchangeIcon },
  { key: "usuarios", label: "Usuarios y permisos", Icon: AccountUsersIcon },
  { key: "suscripcion", label: "Mi suscripción", Icon: WalletIcon },
  { key: "ajustes", label: "Ajustes", Icon: SettingsIcon },
];

const titles: Record<ModuleKey, string> = {
  dashboard: "Resumen general",
  ventas: "Control de ventas",
  productos: "Productos e inventario",
  insumos: "Insumos y materias primas",
  compras: "Compras a proveedores",
  contactos: "Clientes y proveedores",
  empleados: "Empleados y salarios",
  contabilidad: "Contabilidad y finanzas",
  reportes: "Reportes y análisis",
  cuadre: "Cuadre de turno",
  cambio: "Tasa de cambio (USD / EUR)",
  usuarios: "Usuarios y permisos",
  suscripcion: "Mi suscripción",
  ajustes: "Ajustes",
};

function Shell() {
  const { data, cloudEnabled, syncing, enableCloud } = useStore();
  const { session, logout, backend } = usePlatform();
  const role: Role = session.status === "signedIn" ? session.role : "owner";
  const memberName = session.status === "signedIn" ? session.memberName : "";
  const [active, setActive] = useState<ModuleKey>(() => defaultModule(role));
  const [menuOpen, setMenuOpen] = useState(false);

  function go(m: ModuleKey) {
    setActive(m);
    setMenuOpen(false);
  }

  const tenant = session.status === "signedIn" ? session.tenant : null;
  const visibleNav = nav.filter((n) => canAccess(role, n.key));

  // Si el módulo activo no está permitido para el rol, ir al inicial del rol
  useEffect(() => {
    if (!canAccess(role, active)) setActive(defaultModule(role));
  }, [role, active]);

  // Activar sincronización en la nube cuando hay backend y sesión
  useEffect(() => {
    if (backend && tenant && !cloudEnabled) {
      enableCloud({ tenantId: tenant.id, sellerId: tenant.id, sellerName: memberName || tenant.owner_name });
    }
  }, [backend, tenant, cloudEnabled, enableCloud, memberName]);
  const dl = tenant ? daysLeft(tenant) : 0;
  const status = tenant ? (isActive(tenant) ? "activa" : "vencida") : "activa";
  const businessName = tenant?.business_name ?? data.business.name;

  // Notificaciones (si están activadas en ajustes)
  const notifsEnabled = data.business.notifications !== false;
  const notifs = notifsEnabled ? buildNotifications(data, { daysToExpire: tenant ? dl : null }) : [];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <StoreIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-slate-900">{businessName}</p>
            <p className="text-xs text-slate-400">{ROLE_LABEL[role]}{memberName ? ` · ${memberName}` : ""}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNav.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => go(key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                active === key ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
              {key === "suscripcion" && status !== "activa" && (
                <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          {tenant && (
            <button onClick={() => go("suscripcion")} className={cn("mb-2 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold", status === "activa" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
              {status === "activa" ? `Suscripción activa · ${dl} días` : "Suscripción vencida"}
            </button>
          )}
          <button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100">Cerrar sesión</button>
        </div>
      </aside>

      {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
          <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">{titles[active]}</h1>
          {tenant && status !== "activa" && (
            <button onClick={() => go("suscripcion")} className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              Renueva tu suscripción
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {cloudEnabled && (
              <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:flex ${syncing ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
                <span className={`h-2 w-2 rounded-full ${syncing ? "animate-pulse bg-amber-500" : "bg-sky-500"}`} />
                {syncing ? "Sincronizando…" : "En la nube"}
              </span>
            )}
            {notifsEnabled && <NotificationsBell notifs={notifs} />}
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline">
              {new Date().toLocaleDateString("es-CU", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {active === "dashboard" && <Dashboard go={go} />}
          {active === "ventas" && <Ventas />}
          {active === "productos" && <Productos />}
          {active === "insumos" && <Insumos />}
          {active === "compras" && <Compras />}
          {active === "contactos" && <Contactos />}
          {active === "empleados" && <Empleados />}
          {active === "contabilidad" && <Contabilidad />}
          {active === "reportes" && <Reportes />}
          {active === "cuadre" && (
            <Cuadre
              sellerId={tenant?.id ?? "local"}
              sellerName={memberName || tenant?.owner_name || "Vendedor"}
              canManageAll={role !== "vendedor"}
            />
          )}
          {active === "cambio" && <Cambio canEdit={role === "owner"} />}
          {active === "usuarios" && <Usuarios />}
          {active === "suscripcion" && tenant && <Suscripcion tenant={tenant} />}
          {active === "ajustes" && <Ajustes />}
        </main>
      </div>
    </div>
  );
}

export default function TenantApp() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
