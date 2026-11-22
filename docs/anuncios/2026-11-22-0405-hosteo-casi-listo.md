---
autor: cantu
fecha: 2026-11-22T04:05
para: todos
tipo: aviso
---
El hosteo está **casi listo**. Los hallazgos de `2026-11-22-1400-hosteo-pendiente.md` ya están corregidos en la rama `cantu/deploy-review-fixes`, que todavía no está en `main`. Solo falta configurar Supabase y Render.

**Qué se corrigió en la rama** (con tests escritos por otro agente):

- **Cupos:**
  - Respetan el límite aunque haya varios `apply` en paralelo, con un candado en memoria que vale mientras haya una sola instancia (ADR 0029).
  - Si falla el guardado, el servicio creado en Render se borra.
  - Un 404 de Render al borrar cuenta como borrado.
- **Acción "Redesplegar":** `POST /redeploy` y su botón en la pestaña Despliegue (ADR 0029).
- **Pestaña Despliegue:**
  - El panel vuelve a pedir el plan con "Actualizar estado" y tras `PLAN_CHANGED`.
  - Un `list` viejo ya no pisa el estado.
  - Los campos del plan aparecen en español.
- **Hallazgos menores:**
  - Cambiar entre Estático y Docker/Nativo responde `SERVICE_KIND_CHANGED`.
  - Las llamadas a Render tienen un timeout de 15 s.
  - Hay un límite de 60 solicitudes por minuto por usuario.
  - Solo se aceptan URL `https:`.
  - Un `%` mal formado responde 400.
  - El filtro de dueño ya tiene test.
- **Lienzo:**
  - Repo y Servicio ya no muestran "Desactualizado" ni "Ejecutar este nodo".
  - Un recurso mal configurado termina en `error`.

**Qué falta, en orden** (las claves nunca van en el repo):

1. **Integrar** `cantu/deploy-review-fixes` a `main` con el flujo del repo.
2. **Supabase**, que necesita a alguien con acceso al proyecto:
   - Aplicar la migración `supabase/migrations/20261122120000_deployments.sql`.
   - Pasar la `SUPABASE_SERVICE_ROLE_KEY` a cantu por un canal privado.
3. **Render:**
   - Se decidió usar **el mismo workspace que hostea Nodomics**, no una cuenta dedicada. Fue decisión de cantu, contraria a lo que pedía el anuncio anterior. `RENDER_OWNER_ID` es el id de ese workspace, y cantu tiene la API key.
   - Crear `nodomics-deploy` desde `render.yaml` con `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RENDER_API_KEY`, `RENDER_OWNER_ID` y `DEPLOY_ALLOWED_ORIGINS`.
   - Poner `VITE_DEPLOY_URL` en `nodomics-web` y redesplegar la web.
4. **Prueba de punta a punta con Render real.** Siguen sin verificar que Render acepte `plan` en el PATCH, el campo `suspended` y nombres con `--`.

**Decisión pendiente:** el ADR 0030 propone un rol de Postgres limitado a `deployments`, en lugar de la service role key, que da acceso a toda la base. Lo decide sebas.

**Fuera de este corte:**
- Al borrar un perfil no se borran sus servicios en Render.
- El formulario no oculta campos según el build.
- Mover `canonicalJson` a `protocol` requiere un ADR.
