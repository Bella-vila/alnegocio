export type PaymentMethod = "transferencia" | "efectivo";
export type RequestStatus = "pendiente" | "aprobada" | "en_espera" | "rechazada";

export type SubscriptionRequest = {
  id: string;
  created_at: string;
  months: number;
  amount: number;
  method: PaymentMethod;
  reference: string; // No. de transacción Transfermóvil
  status: RequestStatus;
  resolved_at: string | null;
};

export type Invoice = {
  id: string;
  date: string;
  months: number;
  amount: number;
  method: PaymentMethod;
};

// Perfil del negocio (dueño) tal como vive en el backend
export type Tenant = {
  id: string; // = auth user id
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  paid_until: string; // yyyy-mm-dd (fuente de verdad: servidor)
  created_at: string;
  requests: SubscriptionRequest[];
  invoices: Invoice[];
};

export type Role = "owner" | "admin" | "vendedor";

export type Member = {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export type SessionState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; tenant: Tenant; role: Role; memberName: string };
