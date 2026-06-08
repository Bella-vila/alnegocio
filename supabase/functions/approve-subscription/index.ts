// ============================================================
//  Edge Function: approve-subscription
//  Es el destino del enlace de UN CLIC en tu correo.
//  Verifica la firma HMAC (que solo el servidor puede crear), y:
//   - action=approve  -> extiende paid_until y crea la factura
//   - action=wait     -> marca la solicitud "en_espera"
//  El cliente NO tiene el secreto, así que NO puede llamar esto válidamente.
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APPROVE_SECRET = Deno.env.get("APPROVE_SECRET")!;

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

function page(title: string, msg: string, color: string) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title}</title></head>
    <body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0">
      <div style="max-width:440px;margin:60px auto;background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.08)">
        <div style="font-size:46px">${color === "green" ? "✅" : color === "amber" ? "⏳" : "⚠️"}</div>
        <h1 style="font-size:20px;color:#0f172a">${title}</h1>
        <p style="color:#475569;font-size:14px">${msg}</p>
      </div>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function addMonths(base: string, months: number): string {
  const d = new Date(base + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const action = url.searchParams.get("action") ?? "";
    const token = url.searchParams.get("token") ?? "";

    if (!id || !token) return page("Enlace inválido", "Faltan parámetros.", "red");
    const expected = await sign(id);
    if (token !== expected) return page("No autorizado", "La firma del enlace no es válida.", "red");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: r } = await admin.from("subscription_requests").select("*").eq("id", id).single();
    if (!r) return page("No encontrada", "La solicitud no existe.", "red");

    if (r.status === "aprobada") return page("Ya aprobada", "Esta suscripción ya fue aprobada.", "green");

    if (action === "wait") {
      await admin.from("subscription_requests").update({ status: "en_espera" }).eq("id", id);
      return page("En espera", "La solicitud quedó marcada como pendiente de verificación.", "amber");
    }

    if (action === "approve") {
      const { data: tenant } = await admin.from("tenants").select("*").eq("id", r.tenant_id).single();
      if (!tenant) return page("Error", "Negocio no encontrado.", "red");
      const today = new Date().toISOString().slice(0, 10);
      const base = tenant.paid_until > today ? tenant.paid_until : today;
      const newPaidUntil = addMonths(base, r.months);

      await admin.from("tenants").update({ paid_until: newPaidUntil }).eq("id", r.tenant_id);
      await admin.from("invoices").insert({
        tenant_id: r.tenant_id,
        months: r.months,
        amount: r.amount,
        method: r.method,
      });
      await admin
        .from("subscription_requests")
        .update({ status: "aprobada", resolved_at: new Date().toISOString() })
        .eq("id", id);

      return page("Suscripción aprobada", `Se renovó hasta el ${newPaidUntil}. El cliente ya tiene acceso.`, "green");
    }

    return page("Acción desconocida", "No se reconoció la acción.", "red");
  } catch (e) {
    return page("Error", String((e as Error)?.message ?? e), "red");
  }
});
