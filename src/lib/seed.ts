import type { AppData, Sale, Purchase, Payroll, Expense, SaleItem } from "./types";

function isoDaysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
}

export function buildSeed(): AppData {
  const categories = [
    { id: "c1", name: "Alimentos" },
    { id: "c2", name: "Bebidas" },
    { id: "c3", name: "Aseo" },
    { id: "c4", name: "Hogar" },
    { id: "c5", name: "Repostería" },
  ];

  // Insumos / materias primas (para negocios de elaboración)
  const supplies = [
    { id: "in1", name: "Harina", unit: "lb", cost: 120, stock: 50, minStock: 10 },
    { id: "in2", name: "Huevos", unit: "u", cost: 25, stock: 120, minStock: 30 },
    { id: "in3", name: "Azúcar", unit: "lb", cost: 90, stock: 40, minStock: 10 },
    { id: "in4", name: "Mantequilla", unit: "lb", cost: 400, stock: 12, minStock: 4 },
  ];

  const products = [
    { id: "p1", name: "Aceite vegetal 1L", sku: "ACE-1L", categoryId: "c1", unit: "u", cost: 480, price: 650, stock: 42, minStock: 10 },
    { id: "p2", name: "Arroz (lb)", sku: "ARR-LB", categoryId: "c1", unit: "lb", cost: 95, price: 140, stock: 180, minStock: 40 },
    { id: "p3", name: "Frijoles negros (lb)", sku: "FRI-LB", categoryId: "c1", unit: "lb", cost: 130, price: 190, stock: 70, minStock: 20 },
    { id: "p4", name: "Refresco lata", sku: "REF-LT", categoryId: "c2", unit: "u", cost: 110, price: 180, stock: 96, minStock: 24 },
    { id: "p5", name: "Cerveza nacional", sku: "CER-NA", categoryId: "c2", unit: "u", cost: 150, price: 250, stock: 60, minStock: 24 },
    { id: "p6", name: "Agua 1.5L", sku: "AGU-15", categoryId: "c2", unit: "u", cost: 70, price: 120, stock: 8, minStock: 20 },
    { id: "p7", name: "Jabon de bano", sku: "JAB-BA", categoryId: "c3", unit: "u", cost: 90, price: 150, stock: 55, minStock: 15 },
    { id: "p8", name: "Detergente 1kg", sku: "DET-1K", categoryId: "c3", unit: "u", cost: 320, price: 470, stock: 30, minStock: 8 },
    { id: "p9", name: "Papel sanitario x4", sku: "PAP-X4", categoryId: "c3", unit: "paq", cost: 240, price: 360, stock: 24, minStock: 10 },
    { id: "p10", name: "Bombillo LED", sku: "BOM-LED", categoryId: "c4", unit: "u", cost: 210, price: 340, stock: 5, minStock: 12 },
    {
      id: "p11",
      name: "Cake de chocolate",
      sku: "CAKE-CH",
      categoryId: "c5",
      unit: "u",
      // costo calculado de la receta + mano de obra: 120 + 4*25 + 0.5*90 + 0.25*400 = 365 (+150 extra)
      cost: 515,
      price: 2500,
      stock: 6,
      minStock: 2,
      kind: "elaborado" as const,
      laborCost: 150,
      recipe: [
        { supplyId: "in1", name: "Harina", unit: "lb", qty: 1, cost: 120 },
        { supplyId: "in2", name: "Huevos", unit: "u", qty: 4, cost: 25 },
        { supplyId: "in3", name: "Azúcar", unit: "lb", qty: 0.5, cost: 90 },
        { supplyId: "in4", name: "Mantequilla", unit: "lb", qty: 0.25, cost: 400 },
      ],
    },
  ];

  const contacts = [
    { id: "cl1", name: "Cliente al detalle", kind: "cliente" as const, phone: "", note: "Venta de mostrador" },
    { id: "cl2", name: "Cafeteria La Esquina", kind: "cliente" as const, phone: "+53 5 234 5678", note: "Compra mayorista" },
    { id: "cl3", name: "Yanet Perez", kind: "cliente" as const, phone: "+53 5 876 1122", note: "" },
    { id: "pr1", name: "Mayorista Habana", kind: "proveedor" as const, phone: "+53 7 555 0101", note: "Alimentos y bebidas" },
    { id: "pr2", name: "Distribuidora Centro", kind: "proveedor" as const, phone: "+53 5 444 0202", note: "Aseo e higiene" },
  ];

  const employees = [
    { id: "e1", name: "Marlon Diaz", role: "Dependiente", baseSalary: 12000, commissionPct: 2, active: true },
    { id: "e2", name: "Adriana Gomez", role: "Cajera", baseSalary: 11000, commissionPct: 1.5, active: true },
    { id: "e3", name: "Ruben Sosa", role: "Almacenero", baseSalary: 10000, commissionPct: 0, active: true },
  ];

  const saleCustomers = contacts.filter((c) => c.kind === "cliente");
  const payments: Array<Sale["payment"]> = ["efectivo", "efectivo", "transferencia", "mlc"];
  const sales: Sale[] = [];

  for (let i = 0; i < 28; i++) {
    const day = Math.floor(Math.random() * 45);
    const nItems = 1 + Math.floor(Math.random() * 3);
    const items: SaleItem[] = [];
    let subtotal = 0;
    let cogs = 0;
    const used = new Set<string>();
    for (let j = 0; j < nItems; j++) {
      const p = products[Math.floor(Math.random() * products.length)];
      if (used.has(p.id)) continue;
      used.add(p.id);
      const qty = 1 + Math.floor(Math.random() * 5);
      items.push({ productId: p.id, name: p.name, qty, price: p.price, cost: p.cost });
      subtotal += qty * p.price;
      cogs += qty * p.cost;
    }
    if (!items.length) continue;
    const discount = Math.random() < 0.2 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal - discount;
    const cust = saleCustomers[Math.floor(Math.random() * saleCustomers.length)];
    sales.push({
      id: `S${1000 + i}`,
      date: isoDaysAgo(day),
      customerId: cust.id,
      customerName: cust.name,
      items,
      discount,
      payment: payments[Math.floor(Math.random() * payments.length)],
      subtotal,
      total,
      cogs,
      profit: total - cogs,
    });
  }
  sales.sort((a, b) => (a.date < b.date ? 1 : -1));

  const purchases: Purchase[] = [
    {
      id: "PC1",
      date: isoDaysAgo(40),
      supplierId: "pr1",
      supplierName: "Mayorista Habana",
      items: [
        { productId: "p2", name: "Arroz (lb)", qty: 200, cost: 95 },
        { productId: "p3", name: "Frijoles negros (lb)", qty: 80, cost: 130 },
      ],
      total: 200 * 95 + 80 * 130,
      payment: "transferencia",
    },
    {
      id: "PC2",
      date: isoDaysAgo(18),
      supplierId: "pr2",
      supplierName: "Distribuidora Centro",
      items: [
        { productId: "p8", name: "Detergente 1kg", qty: 40, cost: 320 },
        { productId: "p9", name: "Papel sanitario x4", qty: 30, cost: 240 },
      ],
      total: 40 * 320 + 30 * 240,
      payment: "efectivo",
    },
  ];

  const payrolls: Payroll[] = [];

  const expenses: Expense[] = [
    { id: "ex1", date: isoDaysAgo(30), category: "alquiler", description: "Alquiler del local", amount: 25000, payment: "transferencia" },
    { id: "ex2", date: isoDaysAgo(22), category: "servicios", description: "Electricidad", amount: 6800, payment: "efectivo" },
    { id: "ex3", date: isoDaysAgo(12), category: "transporte", description: "Flete de mercancia", amount: 4500, payment: "efectivo" },
    { id: "ex4", date: isoDaysAgo(5), category: "impuestos", description: "Pago ONAT mensual", amount: 9000, payment: "transferencia" },
  ];

  return {
    business: {
      name: "Mi Negocio",
      owner: "Propietario",
      taxRate: 35,
      currency: "CUP",
      usdBuy: 400,
      eurBuy: 430,
      usdPay: 420,
      eurPay: 450,
    },
    categories,
    products,
    supplies,
    contacts,
    sales,
    purchases,
    employees,
    payrolls,
    expenses,
    shifts: [],
  };
}
