import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { HAS_BACKEND, PLAN, TRIAL_DAYS } from "./config";
import type { Invoice, Member, PaymentMethod, Role, SessionState, SubscriptionRequest, Tenant } from "./types";

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function uid(p = "") {
  return `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}
export function isActive(t: Tenant): boolean {
  return t.paid_until >= todayISO();
}
export function daysLeft(t: Tenant): number {
  const ms = new Date(t.paid_until + "T23:59:59").getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

type RegisterInput = { businessName: string; ownerName: string; email: string; phone: string; password: string };
type RequestInput = { months: number; method: PaymentMethod; reference: string };

type CreateUserInput = { name: string; email: string; password: string; role: Role };

type PlatformValue = {
  session: SessionState;
  backend: boolean;
  register: (i: RegisterInput) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  createRequest: (i: RequestInput) => Promise<{ ok: boolean; error?: string }>;
  cancelRequest: (id: string) => Promise<void>;
  // gestión de usuarios (solo dueño)
  listMembers: () => Promise<Member[]>;
  createUser: (i: CreateUserInput) => Promise<{ ok: boolean; error?: string }>;
  setMemberRole: (memberId: string, role: Role) => Promise<void>;
  setMemberActive: (memberId: string, active: boolean) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
};

const Ctx = createContext<PlatformValue | null>(null);

/* ================================================================== */
/*  DEMO BACKEND (localStorage) — simula el servidor cuando no hay      */
/*  Supabase configurado, para poder ver la app funcionando.           */
/* ================================================================== */
const DEMO_KEY = "mipyme.saas.demo.v1";
const DEMO_SESSION = "mipyme.saas.demo.session";

type DemoTenant = Tenant & { password: string; members?: Member[] };
type DemoDB = { tenants: DemoTenant[] };

function demoLoad(): DemoDB {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw) as DemoDB;
  } catch {
    /* ignore */
  }
  const seed: DemoDB = {
    tenants: [
      {
        id: "demo-1",
        password: "1234",
        business_name: "Cafetería La Esquina",
        owner_name: "Marta Espinosa",
        email: "cafe@correo.cu",
        phone: "+53 5 234 5678",
        paid_until: addDays(todayISO(), 12),
        created_at: new Date().toISOString(),
        requests: [],
        invoices: [{ id: "INV1", date: todayISO(), months: 1, amount: PLAN.monthly, method: "transferencia" }],
      },
      {
        id: "demo-2",
        password: "1234",
        business_name: "Restaurante El Buen Sabor",
        owner_name: "Lucía Méndez",
        email: "negocio@correo.cu",
        phone: "+53 7 555 0101",
        paid_until: addDays(todayISO(), -3), // vencida
        created_at: new Date().toISOString(),
        requests: [],
        invoices: [],
      },
    ],
  };
  localStorage.setItem(DEMO_KEY, JSON.stringify(seed));
  return seed;
}
function demoSave(db: DemoDB) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(db));
}
function stripPwd(t: Tenant & { password: string }): Tenant {
  const { password: _pw, ...rest } = t;
  void _pw;
  return rest;
}

/* ================================================================== */
/*  PROVIDER                                                            */
/* ================================================================== */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const tenantIdRef = useRef<string | null>(null);

  /* ---------- carga del perfil + rol del usuario ---------- */
  // Devuelve la sesión "signedIn" completa (tenant + rol + nombre) para el usuario dado.
  const loadSession = useCallback(async (userId: string): Promise<SessionState | null> => {
    if (HAS_BACKEND && supabase) {
      // 1) ¿a qué negocio pertenece y con qué rol?
      const { data: member } = await supabase
        .from("members")
        .select("tenant_id, role, name")
        .eq("user_id", userId)
        .single();
      if (!member) return null;
      const tenantId = member.tenant_id as string;
      const role = (member.role as Role) ?? "vendedor";
      const memberName = (member.name as string) ?? "";

      // 2) datos del negocio (suscripción)
      const { data: profile } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
      if (!profile) return null;
      const { data: requests } = await supabase
        .from("subscription_requests").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      const { data: invoices } = await supabase
        .from("invoices").select("*").eq("tenant_id", tenantId).order("date", { ascending: false });
      tenantIdRef.current = tenantId;
      return {
        status: "signedIn",
        role,
        memberName,
        tenant: {
          id: profile.id,
          business_name: profile.business_name,
          owner_name: profile.owner_name,
          email: profile.email,
          phone: profile.phone ?? "",
          paid_until: profile.paid_until,
          created_at: profile.created_at,
          requests: (requests ?? []) as SubscriptionRequest[],
          invoices: (invoices ?? []) as Invoice[],
        },
      };
    }
    // demo: el usuario es el dueño de su negocio
    const db = demoLoad();
    const t = db.tenants.find((x) => x.id === userId);
    if (!t) return null;
    tenantIdRef.current = t.id;
    return { status: "signedIn", role: "owner", memberName: t.owner_name, tenant: stripPwd(t) };
  }, []);

  const refresh = useCallback(async () => {
    const id = tenantIdRef.current;
    if (!id) return;
    // refresca por el id de usuario actual (auth) o el del negocio en demo
    const userId = HAS_BACKEND && supabase ? (await supabase.auth.getUser()).data.user?.id ?? id : id;
    const s = await loadSession(userId);
    if (s) setSession(s);
  }, [loadSession]);

  /* ---------- restaurar sesión al iniciar ---------- */
  useEffect(() => {
    (async () => {
      if (HAS_BACKEND && supabase) {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) {
          const s = await loadSession(user.id);
          setSession(s ?? { status: "signedOut" });
        } else {
          setSession({ status: "signedOut" });
        }
        supabase.auth.onAuthStateChange((_e, s) => {
          if (!s?.user) {
            tenantIdRef.current = null;
            setSession({ status: "signedOut" });
          }
        });
        return;
      }
      // demo: restaurar de localStorage
      const savedId = localStorage.getItem(DEMO_SESSION);
      if (savedId) {
        const s = await loadSession(savedId);
        setSession(s ?? { status: "signedOut" });
      } else {
        setSession({ status: "signedOut" });
      }
    })();
  }, [loadSession]);

  /* ---------- registro ---------- */
  const register = useCallback(
    async (i: RegisterInput) => {
      const email = i.email.trim().toLowerCase();
      if (!i.businessName.trim() || !i.ownerName.trim() || !email || i.password.length < 4) {
        return { ok: false, error: "Completa todos los campos (contraseña de 4+ caracteres)." };
      }
      if (HAS_BACKEND && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: i.password,
          options: { data: { business_name: i.businessName, owner_name: i.ownerName, phone: i.phone } },
        });
        if (error) return { ok: false, error: error.message };
        const user = data.user;
        if (!user) return { ok: false, error: "Revisa tu correo para confirmar la cuenta." };
        // el trigger en la BD crea el perfil + lo añade como miembro 'owner'
        const s = await loadSession(user.id);
        if (s) setSession(s);
        return { ok: true };
      }
      // demo
      const db = demoLoad();
      if (db.tenants.some((t) => t.email.toLowerCase() === email)) {
        return { ok: false, error: "Ya existe una cuenta con ese correo." };
      }
      const id = uid("demo-");
      const tenant: Tenant & { password: string } = {
        id,
        password: i.password,
        business_name: i.businessName.trim(),
        owner_name: i.ownerName.trim(),
        email,
        phone: i.phone.trim(),
        paid_until: addDays(todayISO(), TRIAL_DAYS),
        created_at: new Date().toISOString(),
        requests: [],
        invoices: [],
      };
      db.tenants.unshift(tenant);
      demoSave(db);
      tenantIdRef.current = id;
      localStorage.setItem(DEMO_SESSION, id);
      setSession({ status: "signedIn", role: "owner", memberName: tenant.owner_name, tenant: stripPwd(tenant) });
      return { ok: true };
    },
    [loadSession],
  );

  /* ---------- login ---------- */
  const login = useCallback(
    async (emailRaw: string, password: string) => {
      const email = emailRaw.trim().toLowerCase();
      if (HAS_BACKEND && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, error: "Correo o contraseña incorrectos." };
        const s = await loadSession(data.user.id);
        setSession(s ?? { status: "signedOut" });
        return { ok: true };
      }
      // demo
      const db = demoLoad();
      const t = db.tenants.find((x) => x.email.toLowerCase() === email && x.password === password);
      if (!t) return { ok: false, error: "Correo o contraseña incorrectos." };
      tenantIdRef.current = t.id;
      localStorage.setItem(DEMO_SESSION, t.id);
      setSession({ status: "signedIn", role: "owner", memberName: t.owner_name, tenant: stripPwd(t) });
      return { ok: true };
    },
    [loadSession],
  );

  /* ---------- logout ---------- */
  const logout = useCallback(async () => {
    if (HAS_BACKEND && supabase) await supabase.auth.signOut();
    else localStorage.removeItem(DEMO_SESSION);
    tenantIdRef.current = null;
    setSession({ status: "signedOut" });
  }, []);

  /* ---------- crear solicitud de pago ---------- */
  const createRequest = useCallback(
    async (i: RequestInput) => {
      const id = tenantIdRef.current;
      if (!id) return { ok: false, error: "Sesión expirada." };
      const amount = PLAN.monthly * i.months;

      if (HAS_BACKEND && supabase) {
        // La Edge Function valida, guarda la solicitud y te envía el correo
        // con el enlace de aprobación de un clic. El cliente NUNCA aprueba.
        const { error } = await supabase.functions.invoke("request-subscription", {
          body: { months: i.months, method: i.method, reference: i.reference, amount },
        });
        if (error) return { ok: false, error: error.message };
        await refresh();
        return { ok: true };
      }
      // demo: solo registra la solicitud como pendiente (no se auto-aprueba)
      const db = demoLoad();
      const t = db.tenants.find((x) => x.id === id);
      if (!t) return { ok: false, error: "No encontrado." };
      const req: SubscriptionRequest = {
        id: uid("REQ"),
        created_at: new Date().toISOString(),
        months: i.months,
        amount,
        method: i.method,
        reference: i.reference,
        status: "pendiente",
        resolved_at: null,
      };
      t.requests = [req, ...t.requests.filter((r) => r.status !== "pendiente")];
      demoSave(db);
      setSession({ status: "signedIn", role: "owner", memberName: t.owner_name, tenant: stripPwd(t) });
      return { ok: true };
    },
    [refresh],
  );

  const cancelRequest = useCallback(async (reqId: string) => {
    const id = tenantIdRef.current;
    if (!id) return;
    if (HAS_BACKEND && supabase) {
      await supabase.from("subscription_requests").delete().eq("id", reqId);
      await refresh();
      return;
    }
    const db = demoLoad();
    const t = db.tenants.find((x) => x.id === id);
    if (!t) return;
    t.requests = t.requests.filter((r) => r.id !== reqId);
    demoSave(db);
    setSession({ status: "signedIn", role: "owner", memberName: t.owner_name, tenant: stripPwd(t) });
  }, [refresh]);

  /* ---------- gestión de usuarios (solo dueño) ---------- */
  const listMembers = useCallback(async (): Promise<Member[]> => {
    const tid = tenantIdRef.current;
    if (!tid) return [];
    if (HAS_BACKEND && supabase) {
      const { data } = await supabase.from("members").select("*").eq("tenant_id", tid);
      return (data ?? []) as Member[];
    }
    // demo
    const db = demoLoad();
    const t = db.tenants.find((x) => x.id === tid);
    return (t?.members ?? []) as Member[];
  }, []);

  const createUser = useCallback(async (i: CreateUserInput) => {
    const tid = tenantIdRef.current;
    if (!tid) return { ok: false, error: "Sesión expirada." };
    const email = i.email.trim().toLowerCase();
    if (!i.name.trim() || !email || i.password.length < 4) {
      return { ok: false, error: "Completa nombre, correo y contraseña (4+ caracteres)." };
    }
    if (HAS_BACKEND && supabase) {
      // Crear el usuario requiere privilegios de admin -> Edge Function
      const { error } = await supabase.functions.invoke("create-user", {
        body: { name: i.name, email, password: i.password, role: i.role },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    // demo
    const db = demoLoad();
    const t = db.tenants.find((x) => x.id === tid);
    if (!t) return { ok: false, error: "Negocio no encontrado." };
    t.members = t.members ?? [];
    if (t.members.some((m) => m.email.toLowerCase() === email)) {
      return { ok: false, error: "Ya existe un usuario con ese correo." };
    }
    t.members.push({
      id: uid("m-"), tenant_id: tid, user_id: uid("u-"), name: i.name.trim(),
      email, role: i.role, active: true,
    });
    demoSave(db);
    return { ok: true };
  }, []);

  const setMemberRole = useCallback(async (memberId: string, role: Role) => {
    const tid = tenantIdRef.current;
    if (!tid) return;
    if (HAS_BACKEND && supabase) {
      await supabase.from("members").update({ role }).eq("id", memberId);
      return;
    }
    const db = demoLoad();
    const t = db.tenants.find((x) => x.id === tid);
    if (t?.members) {
      t.members = t.members.map((m) => (m.id === memberId ? { ...m, role } : m));
      demoSave(db);
    }
  }, []);

  const setMemberActive = useCallback(async (memberId: string, active: boolean) => {
    const tid = tenantIdRef.current;
    if (!tid) return;
    if (HAS_BACKEND && supabase) {
      await supabase.from("members").update({ active }).eq("id", memberId);
      return;
    }
    const db = demoLoad();
    const t = db.tenants.find((x) => x.id === tid);
    if (t?.members) {
      t.members = t.members.map((m) => (m.id === memberId ? { ...m, active } : m));
      demoSave(db);
    }
  }, []);

  const removeMember = useCallback(async (memberId: string) => {
    const tid = tenantIdRef.current;
    if (!tid) return;
    if (HAS_BACKEND && supabase) {
      await supabase.from("members").delete().eq("id", memberId);
      return;
    }
    const db = demoLoad();
    const t = db.tenants.find((x) => x.id === tid);
    if (t?.members) {
      t.members = t.members.filter((m) => m.id !== memberId);
      demoSave(db);
    }
  }, []);

  const value = useMemo<PlatformValue>(
    () => ({ session, backend: HAS_BACKEND, register, login, logout, refresh, createRequest, cancelRequest, listMembers, createUser, setMemberRole, setMemberActive, removeMember }),
    [session, register, login, logout, refresh, createRequest, cancelRequest],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatform(): PlatformValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlatform must be used within PlatformProvider");
  return v;
}
