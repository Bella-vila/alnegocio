import type { AppData } from "./types";
import { monthKey } from "./format";

export function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(dd.toISOString().slice(0, 7));
  }
  return out;
}

export function inRange(iso: string, from?: string, to?: string): boolean {
  const t = iso.slice(0, 10);
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
}

export type Totals = {
  revenue: number; // ventas + suscripciones
  salesRevenue: number;
  subscriptionRevenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  payroll: number;
  tax: number;
  netProfit: number;
  salesCount: number;
};

export function computeTotals(data: AppData, from?: string, to?: string): Totals {
  const sales = data.sales.filter((s) => inRange(s.date, from, to));
  const salesRevenue = sales.reduce((s, x) => s + x.total, 0);
  const subscriptionRevenue = 0;
  const revenue = salesRevenue;
  const cogs = sales.reduce((s, x) => s + x.cogs, 0);
  const grossProfit = revenue - cogs;
  const expenses = data.expenses
    .filter((e) => inRange(e.date, from, to))
    .reduce((s, x) => s + x.amount, 0);
  const payroll = data.payrolls
    .filter((p) => inRange(p.date, from, to))
    .reduce((s, x) => s + x.net, 0);
  const tax = (revenue * data.business.taxRate) / 100;
  const netProfit = grossProfit - expenses - payroll - tax;
  return { revenue, salesRevenue, subscriptionRevenue, cogs, grossProfit, expenses, payroll, tax, netProfit, salesCount: sales.length };
}

export function monthlySeries(data: AppData, months: string[]) {
  return months.map((m) => {
    const sales = data.sales.filter((s) => monthKey(s.date) === m).reduce((a, s) => a + s.total, 0);
    const subs = 0;
    const expenses = data.expenses.filter((e) => monthKey(e.date) === m).reduce((a, e) => a + e.amount, 0);
    const payroll = data.payrolls.filter((p) => monthKey(p.date) === m).reduce((a, p) => a + p.net, 0);
    return { month: m, revenue: sales + subs, expenses: expenses + payroll };
  });
}

export function topProducts(data: AppData, from?: string, to?: string, limit = 5) {
  const map = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
  data.sales
    .filter((s) => inRange(s.date, from, to))
    .forEach((s) =>
      s.items.forEach((it) => {
        const cur = map.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0, profit: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.price;
        cur.profit += it.qty * (it.price - it.cost);
        map.set(it.productId, cur);
      }),
    );
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function inventoryValue(data: AppData) {
  const cost = data.products.reduce((s, p) => s + p.stock * p.cost, 0);
  const retail = data.products.reduce((s, p) => s + p.stock * p.price, 0);
  return { cost, retail, potential: retail - cost };
}

export function lowStock(data: AppData) {
  return data.products.filter((p) => p.stock <= p.minStock);
}
