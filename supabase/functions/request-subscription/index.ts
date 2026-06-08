// ============================================================
//  Edge Function: request-subscription
//  El cliente (autenticado) envía su solicitud de pago.
//  Esta función la guarda y te envía un CORREO con dos botones:
//    ✅ APROBAR  (enlace de 1 clic que activa la suscripción)
//    ⏳ DEJAR EN ESPERA
//  El cliente NUNCA puede aprobar: solo el enlace firmado lo hace.
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "todoenoro56@gmail.com";
const APPROVE_SECRET = Deno.env.get("APPROVE_SECRET")!; // secreto del servidor
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""; // opcional, para enviar correo
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "AlNegocio <onboarding@resend.dev>";
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Firma HMAC-SHA256 (token de aprobación imposible de falsificar por el cliente)
async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APPROVE_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "No autenticado" }, 401);

    // Cliente con el JWT del usuario para identificarlo
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sesión inválida" }, 401);

    const { months, method, reference } = await req.json();
    if (!months) return json({ error: "Datos incompletos" }, 400);

    // El PRECIO lo decide el SERVIDOR (no el cliente), leído del secreto PLAN_PRICE.
    // Para cambiarlo: supabase secrets set PLAN_PRICE="6000"
    const PLAN_PRICE = Number(Deno.env.get("PLAN_PRICE") ?? "2500");
    const amount = PLAN_PRICE * Number(months);

    // Cliente admin (service_role) para escribir saltando RLS
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: tenant } = await admin.from("tenants").select("*").eq("id", user.id).single();
    if (!tenant) return json({ error: "Negocio no encontrado" }, 404);

    const { data: reqRow, error } = await admin
      .from("subscription_requests")
      .insert({ tenant_id: user.id, months, amount, method, reference: reference ?? "", status: "pendiente" })
      .select()
      .single();
    if (error) return json({ error: error.message }, 400);

    // Token firmado para el enlace de aprobación (1 clic)
    const token = await sign(reqRow.id);
    const approveUrl = `${FUNCTIONS_BASE}/approve-subscription?id=${reqRow.id}&action=approve&token=${token}`;
    const waitUrl = `${FUNCTIONS_BASE}/approve-subscription?id=${reqRow.id}&action=wait&token=${token}`;

    await sendAdminEmail(tenant, reqRow, approveUrl, waitUrl);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function sendAdminEmail(
  tenant: Record<string, unknown>,
  r: Record<string, unknown>,
  approveUrl: string,
  waitUrl: string,
) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#059669;color:#fff;padding:16px 20px"><h2 style="margin:0;font-size:18px">Nueva solicitud de suscripción</h2></div>
    <div style="padding:20px;color:#0f172a;font-size:14px;line-height:1.6">
      <p><b>Negocio:</b> ${tenant.business_name}<br/>
      <b>Dueño:</b> ${tenant.owner_name}<br/>
      <b>Correo:</b> ${tenant.email}<br/>
      <b>Teléfono:</b> ${tenant.phone || "—"}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0"/>
      <p><b>Monto:</b> $${r.amount} CUP (${r.months} mes/es)<br/>
      <b>Método:</b> ${r.method}<br/>
      <b>No. de transacción:</b> ${r.reference || "—"}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0"/>
      <p style="margin:16px 0 10px">Verifica el pago y elige:</p>
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr>
        <td style="padding-right:6px;width:50%"><a href="${approveUrl}" style="display:block;text-align:center;background:#059669;color:#fff;text-decoration:none;font-weight:bold;padding:14px;border-radius:10px">✅ APROBAR</a></td>
        <td style="padding-left:6px;width:50%"><a href="${waitUrl}" style="display:block;text-align:center;background:#f59e0b;color:#fff;text-decoration:none;font-weight:bold;padding:14px;border-radius:10px">⏳ DEJAR EN ESPERA</a></td>
      </tr></table>
    </div>
  </div>`;

  if (!RESEND_API_KEY) {
    console.log("Sin RESEND_API_KEY. Aprobar:", approveUrl);
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject: `Suscripción · ${tenant.business_name}`, html }),
  });
}
