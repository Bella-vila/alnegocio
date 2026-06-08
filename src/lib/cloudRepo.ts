/**
 * Capa de sincronización con la nube (Supabase) para los datos del negocio.
 * - Si hay backend: lee/escribe en Supabase y escucha cambios en tiempo real.
 * - Si NO hay backend (modo demo): no hace nada (la app usa localStorage).
 *
 * Convierte entre el formato local (camelCase) y el de la BD (snake_case).
 */
import { supabase } from "../platform/supabaseClient";
import type {
  AppData,
  Category,
  Contact,
  Employee,
  Expense,
  Product,
  Purchase,
  Sale,
} from "./types";

export type CloudData = {
  categories: Category[];
  products: Product[];
  contacts: Contact[];
  sales: Sale[];
  purchases: Purchase[];
  employees: Employee[];
  expenses: Expense[];
};

/* ---------- Mapeos BD -> local ---------- */
function rowToProduct(r: Record<string, unknown>): Product {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    sku: (r.sku as string) ?? "",
    categoryId: (r.category_id as string) ?? "",
    unit: (r.unit as string) ?? "u",
    cost: Number(r.cost ?? 0),
    price: Number(r.price ?? 0),
    stock: Number(r.stock ?? 0),
    minStock: Number(r.min_stock ?? 0),
  };
}
function rowToCategory(r: Record<string, unknown>): Category {
  return { id: r.id as string, name: (r.name as string) ?? "" };
}
function rowToContact(r: Record<string, unknown>): Contact {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    kind: (r.kind as Contact["kind"]) ?? "cliente",
    phone: (r.phone as string) ?? "",
    note: (r.note as string) ?? "",
  };
}
function rowToSale(r: Record<string, unknown>): Sale {
  return {
    id: r.id as string,
    date: (r.date as string) ?? new Date().toISOString(),
    customerId: (r.customer_id as string) ?? null,
    customerName: (r.customer_name as string) ?? "",
    items: (r.items as Sale["items"]) ?? [],
    discount: Number(r.discount ?? 0),
    payment: (r.payment as Sale["payment"]) ?? "efectivo",
    subtotal: Number(r.subtotal ?? 0),
    total: Number(r.total ?? 0),
    cogs: Number(r.cogs ?? 0),
    profit: Number(r.profit ?? 0),
  };
}
function rowToPurchase(r: Record<string, unknown>): Purchase {
  return {
    id: r.id as string,
    date: (r.date as string) ?? new Date().toISOString(),
    supplierId: (r.supplier_id as string) ?? null,
    supplierName: (r.supplier_name as string) ?? "",
    items: (r.items as Purchase["items"]) ?? [],
    total: Number(r.total ?? 0),
    payment: (r.payment as Purchase["payment"]) ?? "efectivo",
  };
}
function rowToEmployee(r: Record<string, unknown>): Employee {
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    role: (r.role as string) ?? "",
    baseSalary: Number(r.base_salary ?? 0),
    commissionPct: Number(r.commission_pct ?? 0),
    active: Boolean(r.active),
  };
}
function rowToExpense(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    date: (r.date as string) ?? new Date().toISOString(),
    category: (r.category as Expense["category"]) ?? "otros",
    description: (r.description as string) ?? "",
    amount: Number(r.amount ?? 0),
    payment: (r.payment as Expense["payment"]) ?? "efectivo",
  };
}

/** Descarga TODOS los datos del negocio desde la nube. */
export async function fetchAll(): Promise<CloudData | null> {
  if (!supabase) return null;
  const [cats, prods, conts, sal, pur, emp, exp] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase.from("products").select("*"),
    supabase.from("contacts").select("*"),
    supabase.from("sales").select("*").order("date", { ascending: false }),
    supabase.from("purchases").select("*").order("date", { ascending: false }),
    supabase.from("employees").select("*"),
    supabase.from("expenses").select("*").order("date", { ascending: false }),
  ]);
  return {
    categories: (cats.data ?? []).map(rowToCategory),
    products: (prods.data ?? []).map(rowToProduct),
    contacts: (conts.data ?? []).map(rowToContact),
    sales: (sal.data ?? []).map(rowToSale),
    purchases: (pur.data ?? []).map(rowToPurchase),
    employees: (emp.data ?? []).map(rowToEmployee),
    expenses: (exp.data ?? []).map(rowToExpense),
  };
}

/* ---------- Escrituras en la nube (local -> BD) ---------- */
export async function upsertProduct(tenantId: string, p: Product) {
  if (!supabase) return;
  await supabase.from("products").upsert({
    id: p.id, tenant_id: tenantId, name: p.name, sku: p.sku, category_id: p.categoryId || null,
    unit: p.unit, cost: p.cost, price: p.price, stock: p.stock, min_stock: p.minStock, updated_at: new Date().toISOString(),
  });
}
export async function deleteRow(table: string, id: string) {
  if (!supabase) return;
  await supabase.from(table).delete().eq("id", id);
}
export async function upsertCategory(tenantId: string, c: Category) {
  if (!supabase) return;
  await supabase.from("categories").upsert({ id: c.id, tenant_id: tenantId, name: c.name });
}
export async function upsertContact(tenantId: string, c: Contact) {
  if (!supabase) return;
  await supabase.from("contacts").upsert({ id: c.id, tenant_id: tenantId, name: c.name, kind: c.kind, phone: c.phone, note: c.note });
}
export async function insertSale(tenantId: string, s: Sale, sellerId?: string, sellerName?: string) {
  if (!supabase) return;
  await supabase.from("sales").insert({
    id: s.id, tenant_id: tenantId, seller_id: sellerId ?? null, seller_name: sellerName ?? "",
    date: s.date, customer_id: s.customerId, customer_name: s.customerName, items: s.items,
    discount: s.discount, payment: s.payment, subtotal: s.subtotal, total: s.total, cogs: s.cogs, profit: s.profit,
  });
}
export async function insertPurchase(tenantId: string, p: Purchase) {
  if (!supabase) return;
  await supabase.from("purchases").insert({
    id: p.id, tenant_id: tenantId, date: p.date, supplier_id: p.supplierId, supplier_name: p.supplierName,
    items: p.items, total: p.total, payment: p.payment,
  });
}
export async function upsertEmployee(tenantId: string, e: Employee) {
  if (!supabase) return;
  await supabase.from("employees").upsert({
    id: e.id, tenant_id: tenantId, name: e.name, role: e.role, base_salary: e.baseSalary,
    commission_pct: e.commissionPct, active: e.active,
  });
}
export async function insertExpense(tenantId: string, e: Expense) {
  if (!supabase) return;
  await supabase.from("expenses").insert({
    id: e.id, tenant_id: tenantId, date: e.date, category: e.category, description: e.description, amount: e.amount, payment: e.payment,
  });
}

/** Suscripción en tiempo real: avisa cuando cualquier dato del negocio cambia. */
export function subscribeRealtime(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("negocio-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "purchases" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, onChange)
    .subscribe();
  return () => {
    supabase?.removeChannel(channel);
  };
}

export type { AppData };
