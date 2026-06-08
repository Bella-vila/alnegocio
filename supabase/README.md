# Backend seguro de GestorMIPYME (Supabase)

Con esto, la **aprobación de suscripciones se hace en el servidor**: el cliente
NUNCA puede activarse solo, y tú apruebas con **un clic real desde tu correo**.

## 1. Crear el proyecto
1. Entra a https://supabase.com y crea un proyecto gratis.
2. En **Project Settings → API** copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** (secreta, NO la pongas en el frontend)

## 2. Conectar el frontend
Edita `src/platform/config.ts` y pega tu URL y anon key, o define al construir:
```
VITE_SUPABASE_URL=...   VITE_SUPABASE_ANON_KEY=...
```

## 3. Crear las tablas
En **Supabase → SQL Editor**, pega y ejecuta el contenido de `schema.sql`.

## 4. Desplegar las Edge Functions
Instala el CLI: https://supabase.com/docs/guides/cli
```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy request-subscription
supabase functions deploy approve-subscription
```

## 5. Configurar los secretos del servidor
```bash
supabase secrets set APPROVE_SECRET="una-frase-larga-y-secreta-solo-tuya"
supabase secrets set ADMIN_EMAIL="todoenoro56@gmail.com"
# Para enviar el correo automático (crea cuenta gratis en resend.com):
supabase secrets set RESEND_API_KEY="re_xxx"
supabase secrets set FROM_EMAIL="GestorMIPYME <onboarding@resend.dev>"
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya están
disponibles automáticamente dentro de las funciones.

## Cómo funciona (seguro)
- El cliente paga y llama a `request-subscription` (con su sesión).
- La función guarda la solicitud y te manda un correo con botones
  **✅ APROBAR** / **⏳ DEJAR EN ESPERA**. Cada enlace lleva una **firma HMAC**
  hecha con `APPROVE_SECRET`, que solo vive en el servidor.
- Al tocar **APROBAR**, `approve-subscription` verifica la firma y actualiza
  `paid_until` con la **service_role** (que ignora RLS). El cliente no tiene esa
  key ni el secreto, por lo que **no puede renovarse sin tu aprobación**.
- El estado de la suscripción es la columna `paid_until` en la base de datos:
  la fuente de verdad está en el servidor, no en el navegador del cliente.

> Sin estos pasos, la app corre en **modo demo** (localStorage) para que puedas
> verla, pero la aprobación segura solo existe con el backend conectado.
