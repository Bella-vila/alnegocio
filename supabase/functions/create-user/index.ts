// ============================================================
//  Edge Function: create-user
//  Permite que el DUEÑO (owner) cree cuentas de vendedor/administrador
//  para SU negocio. Crea el usuario en Auth (con la service_role) y lo
//  añade a la tabla members con el rol indicado.
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "No autenticado" }, 401);

    // Identificar al solicitante con su JWT
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sesión inválida" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verificar que quien llama es OWNER de su negocio
    const { data: me } = await admin.from("members").select("tenant_id, role").eq("user_id", user.id).single();
    if (!me || me.role !== "owner") return json({ error: "Solo el dueño puede crear usuarios." }, 403);

    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) return json({ error: "Datos incompletos" }, 400);
    if (!["vendedor", "admin"].includes(role)) return json({ error: "Rol inválido" }, 400);
    if (String(password).length < 4) return json({ error: "Contraseña muy corta" }, 400);

    // Crear el usuario de Auth (confirmado, para que pueda entrar de inmediato)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "No se pudo crear el usuario" }, 400);
    }

    // Vincularlo al negocio con su rol
    const { error: memErr } = await admin.from("members").insert({
      tenant_id: me.tenant_id,
      user_id: created.user.id,
      name,
      role,
      active: true,
    });
    if (memErr) {
      // revertir el usuario si falla la vinculación
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: memErr.message }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
