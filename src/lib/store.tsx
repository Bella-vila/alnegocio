import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  AppData,
  Business,
  Category,
  Contact,
  Employee,
  Expense,
  Payroll,
  Product,
  Purchase,
  PurchaseItem,
  Sale,
  SaleItem,
  Shift,
  ShiftCount,
  Supply,
} from "./types";
import { buildSeed } from "./seed";
import { todayISO, uid } from "./format";

import * as cloud from "./cloudRepo";

const STORAGE_KEY = "mipyme.cuba.data.v2";

// Contexto de sincronización en la nube (se activa tras iniciar sesión con backend)
type CloudCtx = { enabled: boolean; tenantId: string; sellerId: string; sellerName: string };
const NO_CLOUD: CloudCtx = { enabled: false, tenantId: "", sellerId: "", sellerName: "" };

function load(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      const seed = buildSeed();
      // merge defaults to tolerar datos viejos; garantiza que existan los campos nuevos
      return {
        ...seed,
        ...parsed,
        business: { ...seed.business, ...(parsed.business ?? {}) },
        supplies: parsed.supplies ?? seed.supplies,
        shifts: parsed.shifts ?? [],
      } as AppData;
    }
  } catch {
    /* ignore */
  }
  return buildSeed();
}

type SaleDraft = {
  customerId: string | null;
  customerName: string;
  items: SaleItem[];
  discount: number;
  payment: Sale["payment"];
};

type PurchaseDraft = {
  supplierId: string | null;
  supplierName: string;
  items: PurchaseItem[];
  payment: Purchase["payment"];
};

type StoreValue = {
  data: AppData;
  // business
  updateBusiness: (b: Partial<Business>) => void;
  // categories
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  // products
  saveProduct: (p: Omit<Product, "id"> & { id?: string }) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  // insumos (materias primas)
  saveSupply: (s: Omit<Supply, "id"> & { id?: string }) => void;
  deleteSupply: (id: string) => void;
  // contacts
  saveContact: (c: Omit<Contact, "id"> & { id?: string }) => void;
  deleteContact: (id: string) => void;
  // sales
  recordSale: (draft: SaleDraft) => void;
  deleteSale: (id: string) => void;
  // purchases
  recordPurchase: (draft: PurchaseDraft) => void;
  deletePurchase: (id: string) => void;
  // employees
  saveEmployee: (e: Omit<Employee, "id"> & { id?: string }) => void;
  deleteEmployee: (id: string) => void;
  // payroll
  runPayroll: (period: string, rows: Array<Omit<Payroll, "id" | "date" | "period">>) => void;
  deletePayroll: (id: string) => void;
  // expenses
  saveExpense: (e: Omit<Expense, "id"> & { id?: string }) => void;
  deleteExpense: (id: string) => void;
  // cuadre / cierre de turno
  openShift: (input: { sellerId: string; sellerName: string; openingCash: number }) => void;
  closeShift: (id: string, input: { countedCash: number; productCounts: ShiftCount[]; note: string }) => void;
  deleteShift: (id: string) => void;
  // nube / sincronización
  cloudEnabled: boolean;
  syncing: boolean;
  enableCloud: (ctx: { tenantId: string; sellerId: string; sellerName: string }) => void;
  disableCloud: () => void;
  // global
  resetData: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => load());
  const [cloudCtx, setCloudCtx] = useState<CloudCtx>(NO_CLOUD);
  const [syncing, setSyncing] = useState(false);
  const cloudRef = useRef<CloudCtx>(NO_CLOUD);
  cloudRef.current = cloudCtx;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Mezcla los datos de la nube dentro del estado local (conserva business/payrolls locales)
  const applyCloud = useCallback((c: cloud.CloudData) => {
    setData((d) => ({
      ...d,
      categories: c.categories,
      products: c.products,
      contacts: c.contacts,
      sales: c.sales,
      purchases: c.purchases,
      employees: c.employees,
      expenses: c.expenses,
    }));
  }, []);

  const pullFromCloud = useCallback(async () => {
    if (!cloudRef.current.enabled) return;
    setSyncing(true);
    try {
      const c = await cloud.fetchAll();
      if (c) applyCloud(c);
    } finally {
      setSyncing(false);
    }
  }, [applyCloud]);

  // Activar nube: descarga inicial + tiempo real
  const enableCloud = useCallback(
    (ctx: { tenantId: string; sellerId: string; sellerName: string }) => {
      setCloudCtx({ enabled: true, ...ctx });
    },
    [],
  );
  const disableCloud = useCallback(() => setCloudCtx(NO_CLOUD), []);

  useEffect(() => {
    if (!cloudCtx.enabled) return;
    let unsub = () => {};
    (async () => {
      await pullFromCloud();
      unsub = cloud.subscribeRealtime(() => {
        void pullFromCloud();
      });
    })();
    return () => unsub();
  }, [cloudCtx.enabled, pullFromCloud]);

  // Helper: ejecuta una escritura en la nube si está activa (offline = se ignora silenciosamente)
  const mirror = useCallback((fn: (tenantId: string, ctx: CloudCtx) => Promise<void>) => {
    const ctx = cloudRef.current;
    if (!ctx.enabled) return;
    fn(ctx.tenantId, ctx).catch(() => {
      /* sin conexión: el cambio queda local y se reflejará al recargar con red */
    });
  }, []);

  const updateBusiness = useCallback((b: Partial<Business>) => {
    setData((d) => ({ ...d, business: { ...d.business, ...b } }));
  }, []);

  const addCategory = useCallback((name: string) => {
    const cat = { id: uid("c"), name } as Category;
    setData((d) => ({ ...d, categories: [...d.categories, cat] }));
    mirror((t) => cloud.upsertCategory(t, cat));
  }, [mirror]);

  const deleteCategory = useCallback((id: string) => {
    setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
    mirror(() => cloud.deleteRow("categories", id));
  }, [mirror]);

  const saveProduct = useCallback((p: Omit<Product, "id"> & { id?: string }) => {
    const prod = { ...p, id: p.id ?? uid("p") } as Product;
    setData((d) => {
      if (p.id) {
        return { ...d, products: d.products.map((x) => (x.id === p.id ? prod : x)) };
      }
      return { ...d, products: [...d.products, prod] };
    });
    mirror((t) => cloud.upsertProduct(t, prod));
  }, [mirror]);

  const deleteProduct = useCallback((id: string) => {
    setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));
    mirror(() => cloud.deleteRow("products", id));
  }, [mirror]);

  const adjustStock = useCallback((id: string, delta: number) => {
    setData((d) => {
      const products = d.products.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
      const changed = products.find((p) => p.id === id);
      if (changed) mirror((t) => cloud.upsertProduct(t, changed));
      return { ...d, products };
    });
  }, [mirror]);

  // ---- Insumos (materias primas) ----
  const saveSupply = useCallback((s: Omit<Supply, "id"> & { id?: string }) => {
    setData((d) => {
      if (s.id) {
        return { ...d, supplies: d.supplies.map((x) => (x.id === s.id ? ({ ...x, ...s } as Supply) : x)) };
      }
      return { ...d, supplies: [...d.supplies, { ...s, id: uid("in") } as Supply] };
    });
  }, []);

  const deleteSupply = useCallback((id: string) => {
    setData((d) => ({ ...d, supplies: d.supplies.filter((s) => s.id !== id) }));
  }, []);

  const saveContact = useCallback((c: Omit<Contact, "id"> & { id?: string }) => {
    const contact = { ...c, id: c.id ?? uid("ct") } as Contact;
    setData((d) => {
      if (c.id) {
        return { ...d, contacts: d.contacts.map((x) => (x.id === c.id ? contact : x)) };
      }
      return { ...d, contacts: [...d.contacts, contact] };
    });
    mirror((t) => cloud.upsertContact(t, contact));
  }, [mirror]);

  const deleteContact = useCallback((id: string) => {
    setData((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== id) }));
    mirror(() => cloud.deleteRow("contacts", id));
  }, [mirror]);

  const recordSale = useCallback((draft: SaleDraft) => {
    const subtotal = draft.items.reduce((s, it) => s + it.qty * it.price, 0);
    const cogs = draft.items.reduce((s, it) => s + it.qty * it.cost, 0);
    const total = Math.max(0, subtotal - draft.discount);
    const sale: Sale = {
      id: uid("S"),
      date: todayISO(),
      customerId: draft.customerId,
      customerName: draft.customerName,
      items: draft.items,
      discount: draft.discount,
      payment: draft.payment,
      subtotal,
      total,
      cogs,
      profit: total - cogs,
    };
    setData((d) => {
      const products = d.products.map((p) => {
        const sold = draft.items.find((it) => it.productId === p.id);
        return sold ? { ...p, stock: Math.max(0, p.stock - sold.qty) } : p;
      });
      // mirror: registrar venta + actualizar stock de cada producto vendido
      mirror(async (t, ctx) => {
        await cloud.insertSale(t, sale, ctx.sellerId, ctx.sellerName);
        for (const it of draft.items) {
          const np = products.find((p) => p.id === it.productId);
          if (np) await cloud.upsertProduct(t, np);
        }
      });
      return { ...d, sales: [sale, ...d.sales], products };
    });
  }, [mirror]);

  const deleteSale = useCallback((id: string) => {
    setData((d) => {
      const sale = d.sales.find((s) => s.id === id);
      if (!sale) return d;
      // restock
      const products = d.products.map((p) => {
        const it = sale.items.find((i) => i.productId === p.id);
        return it ? { ...p, stock: p.stock + it.qty } : p;
      });
      mirror(async (t) => {
        await cloud.deleteRow("sales", id);
        for (const it of sale.items) {
          const np = products.find((p) => p.id === it.productId);
          if (np) await cloud.upsertProduct(t, np);
        }
      });
      return { ...d, sales: d.sales.filter((s) => s.id !== id), products };
    });
  }, [mirror]);

  const recordPurchase = useCallback((draft: PurchaseDraft) => {
    const total = draft.items.reduce((s, it) => s + it.qty * it.cost, 0);
    const purchase: Purchase = {
      id: uid("PC"),
      date: todayISO(),
      supplierId: draft.supplierId,
      supplierName: draft.supplierName,
      items: draft.items,
      total,
      payment: draft.payment,
    };
    setData((d) => {
      const products = d.products.map((p) => {
        const it = draft.items.find((i) => i.productId === p.id);
        return it ? { ...p, stock: p.stock + it.qty, cost: it.cost } : p;
      });
      mirror(async (t) => {
        await cloud.insertPurchase(t, purchase);
        for (const it of draft.items) {
          const np = products.find((p) => p.id === it.productId);
          if (np) await cloud.upsertProduct(t, np);
        }
      });
      return { ...d, purchases: [purchase, ...d.purchases], products };
    });
  }, []);

  const deletePurchase = useCallback((id: string) => {
    setData((d) => {
      const pur = d.purchases.find((p) => p.id === id);
      if (!pur) return d;
      const products = d.products.map((p) => {
        const it = pur.items.find((i) => i.productId === p.id);
        return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p;
      });
      mirror(async (t) => {
        await cloud.deleteRow("purchases", id);
        for (const it of pur.items) {
          const np = products.find((p) => p.id === it.productId);
          if (np) await cloud.upsertProduct(t, np);
        }
      });
      return { ...d, purchases: d.purchases.filter((p) => p.id !== id), products };
    });
  }, [mirror]);

  const saveEmployee = useCallback((e: Omit<Employee, "id"> & { id?: string }) => {
    const emp = { ...e, id: e.id ?? uid("e") } as Employee;
    setData((d) => {
      if (e.id) {
        return { ...d, employees: d.employees.map((x) => (x.id === e.id ? emp : x)) };
      }
      return { ...d, employees: [...d.employees, emp] };
    });
    mirror((t) => cloud.upsertEmployee(t, emp));
  }, [mirror]);

  const deleteEmployee = useCallback((id: string) => {
    setData((d) => ({ ...d, employees: d.employees.filter((e) => e.id !== id) }));
    mirror(() => cloud.deleteRow("employees", id));
  }, [mirror]);

  const runPayroll = useCallback((period: string, rows: Array<Omit<Payroll, "id" | "date" | "period">>) => {
    setData((d) => {
      const cleaned = d.payrolls.filter((p) => p.period !== period);
      const newRows: Payroll[] = rows.map((r) => ({
        ...r,
        id: uid("PY"),
        date: todayISO(),
        period,
      }));
      return { ...d, payrolls: [...newRows, ...cleaned] };
    });
  }, []);

  const deletePayroll = useCallback((id: string) => {
    setData((d) => ({ ...d, payrolls: d.payrolls.filter((p) => p.id !== id) }));
  }, []);

  const saveExpense = useCallback((e: Omit<Expense, "id"> & { id?: string }) => {
    const exp = { ...e, id: e.id ?? uid("ex") } as Expense;
    setData((d) => {
      if (e.id) {
        return { ...d, expenses: d.expenses.map((x) => (x.id === e.id ? exp : x)) };
      }
      return { ...d, expenses: [exp, ...d.expenses] };
    });
    mirror((t) => cloud.insertExpense(t, exp));
  }, [mirror]);

  const deleteExpense = useCallback((id: string) => {
    setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) }));
    mirror(() => cloud.deleteRow("expenses", id));
  }, [mirror]);

  // ---- Cuadre / cierre de turno ----
  const openShift = useCallback((input: { sellerId: string; sellerName: string; openingCash: number }) => {
    setData((d) => {
      // si ya hay un turno abierto del mismo vendedor, no duplicar
      if (d.shifts.some((s) => s.status === "abierto" && s.sellerId === input.sellerId)) return d;
      const shift: Shift = {
        id: uid("CQ"),
        status: "abierto",
        sellerId: input.sellerId,
        sellerName: input.sellerName,
        openedAt: todayISO(),
        closedAt: null,
        openingCash: input.openingCash,
        cashSalesExpected: 0,
        transferSales: 0,
        expectedCash: input.openingCash,
        countedCash: 0,
        cashDiff: 0,
        salesCount: 0,
        productCounts: [],
        soldItems: [],
        note: "",
      };
      return { ...d, shifts: [shift, ...d.shifts] };
    });
  }, []);

  const closeShift = useCallback(
    (id: string, input: { countedCash: number; productCounts: ShiftCount[]; note: string }) => {
      setData((d) => {
        const shift = d.shifts.find((s) => s.id === id);
        if (!shift || shift.status === "cerrado") return d;
        // Ventas hechas durante el turno (desde openedAt hasta ahora)
        const since = shift.openedAt;
        const shiftSales = d.sales.filter((s) => s.date >= since);
        const cashSales = shiftSales.filter((s) => s.payment === "efectivo").reduce((a, s) => a + s.total, 0);
        const transferSales = shiftSales.filter((s) => s.payment !== "efectivo").reduce((a, s) => a + s.total, 0);
        const expectedCash = shift.openingCash + cashSales;
        const counts = input.productCounts.map((c) => ({ ...c, diff: c.counted - c.expected }));
        // resumen de productos vendidos en el turno
        const soldMap = new Map<string, { productId: string; name: string; qty: number; amount: number }>();
        shiftSales.forEach((s) =>
          s.items.forEach((it) => {
            const cur = soldMap.get(it.productId) ?? { productId: it.productId, name: it.name, qty: 0, amount: 0 };
            cur.qty += it.qty;
            cur.amount += it.qty * it.price;
            soldMap.set(it.productId, cur);
          }),
        );
        const soldItems = [...soldMap.values()].sort((a, b) => b.amount - a.amount);
        const closed: Shift = {
          ...shift,
          status: "cerrado",
          closedAt: todayISO(),
          cashSalesExpected: cashSales,
          transferSales,
          expectedCash,
          countedCash: input.countedCash,
          cashDiff: input.countedCash - expectedCash,
          salesCount: shiftSales.length,
          productCounts: counts,
          soldItems,
          note: input.note,
        };
        return { ...d, shifts: d.shifts.map((s) => (s.id === id ? closed : s)) };
      });
    },
    [],
  );

  const deleteShift = useCallback((id: string) => {
    setData((d) => ({ ...d, shifts: d.shifts.filter((s) => s.id !== id) }));
  }, []);

  const resetData = useCallback(() => {
    setData(buildSeed());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      updateBusiness,
      addCategory,
      deleteCategory,
      saveProduct,
      deleteProduct,
      adjustStock,
      saveSupply,
      deleteSupply,
      saveContact,
      deleteContact,
      recordSale,
      deleteSale,
      recordPurchase,
      deletePurchase,
      saveEmployee,
      deleteEmployee,
      runPayroll,
      deletePayroll,
      saveExpense,
      deleteExpense,
      openShift,
      closeShift,
      deleteShift,
      cloudEnabled: cloudCtx.enabled,
      syncing,
      enableCloud,
      disableCloud,
      resetData,
    }),
    [
      data,
      cloudCtx.enabled,
      syncing,
      enableCloud,
      disableCloud,
      updateBusiness,
      addCategory,
      deleteCategory,
      saveProduct,
      deleteProduct,
      adjustStock,
      saveSupply,
      deleteSupply,
      saveContact,
      deleteContact,
      recordSale,
      deleteSale,
      recordPurchase,
      deletePurchase,
      saveEmployee,
      deleteEmployee,
      runPayroll,
      deletePayroll,
      saveExpense,
      deleteExpense,
      resetData,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
