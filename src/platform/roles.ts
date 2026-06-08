import type { ModuleKey } from "../lib/types";

export type Role = "owner" | "admin" | "vendedor";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  admin: "Administrador",
  vendedor: "Vendedor",
};

export const ROLE_DESC: Record<Role, string> = {
  owner: "Acceso total al negocio y a la gestión de usuarios.",
  admin: "Compras, productos, inventario, empleados, salarios y reportes.",
  vendedor: "Solo punto de venta: registrar ventas.",
};

// Qué módulos puede ver cada rol
const PERMISSIONS: Record<Role, ModuleKey[]> = {
  owner: [
    "dashboard",
    "ventas",
    "productos",
    "insumos",
    "compras",
    "contactos",
    "empleados",
    "contabilidad",
    "reportes",
    "cuadre",
    "cambio",
    "usuarios",
    "suscripcion",
    "ajustes",
  ],
  admin: ["dashboard", "ventas", "productos", "insumos", "compras", "contactos", "empleados", "reportes", "cuadre", "cambio"],
  vendedor: ["ventas", "cuadre", "cambio"],
};

export function canAccess(role: Role, key: ModuleKey): boolean {
  return PERMISSIONS[role].includes(key);
}

export function allowedModules(role: Role): ModuleKey[] {
  return PERMISSIONS[role];
}

export function defaultModule(role: Role): ModuleKey {
  return role === "vendedor" ? "ventas" : "dashboard";
}
