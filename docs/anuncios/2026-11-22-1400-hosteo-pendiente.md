---
autor: sebas
fecha: 2026-11-22T14:00
para: todos
tipo: aviso
---
Los nodos de hosteo (ADR 0027 y 0028) ya están en `main`, pero **no están en producción ni probados contra Render real**. Alguien tiene que terminarlos.

**Qué hay:**

- **Protocolo:** nodos de recurso (`impl.kind: "resource"`) y tipos de puerto `repo` y `service`. El coordinador no los ejecuta: los marca `done`.
- **Nodos "Repo" y "Servicio"** (categoría Hosteo). Servicio: build Docker, Nativo o Estático, comandos, variables de entorno (con credenciales) y health check.
- **`apps/deploy`:** servicio nuevo con plan, apply, list y remove contra la API de Render. Usa el JWT de Supabase, cupos de 2 servicios por usuario y 20 en total, una lista blanca de campos y nunca guarda secretos. Está probado solo con fakes.
- **Web:** pestaña "Despliegue" en Parámetros del nodo Servicio, solo con sesión. Sin `VITE_DEPLOY_URL` dice "El hosteo no está disponible".
- **Supabase:** migración `20261122120000_deployments.sql`, con su test SQL.
- **`render.yaml`:** servicio `nodomics-deploy` y `VITE_DEPLOY_URL` en la web.

**Falta, en orden.** La revisión independiente no encontró fugas entre usuarios, pero sí hallazgos importantes que se integraron sin corregir, por falta de tiempo. Hay que resolverlos antes de activar el hosteo:

1. **Hallazgos importantes de la revisión** (`apps/deploy` y `apps/web/src/deploy`):
   - **Cupos con concurrencia.** Varios `apply` en paralelo se saltan los cupos y crean servicios de más en Render (`deploy-use-cases.ts`). Hace falta reservar o bloquear antes de crear.
   - **Servicio huérfano al guardar.** Si `provider.create` funciona y `deployments.save` falla, el servicio queda vivo en Render sin fila. Hay que compensar con `provider.remove`. Borrar un perfil (`on delete cascade`) tampoco borra sus servicios en Render.
   - **Cupo ocupado para siempre.** Si Render responde 404 al borrar, la fila no se borra nunca. Un 404 debería contar como borrado.
   - **No se puede redesplegar.** Con la especificación igual no hay forma de desplegar commits nuevos, reintentar un `failed` ni aplicar un secreto cambiado. Falta una acción "Redesplegar" (`POST /deploys`). Es una decisión de contrato.
   - **El panel no vuelve a pedir el plan** tras `PLAN_CHANGED` ni con "Actualizar estado", y el usuario queda atascado.
   - **La clave de servicio de Supabase da acceso a toda la base.** Conviene un rol de Postgres solo para `deployments`, o RPC `security definer`. Es una decisión de seguridad.
   - **El filtro de dueño no tiene test.** `supabase-flow-reader.ts` filtra por `owner_id`, y es lo que impide desplegar flujos públicos de otros, pero ningún test lo cubre.
2. **Hallazgos menores de la revisión:**
   - Los campos del plan aparecen con su clave cruda en inglés, y un mensaje dice "Repositorio" donde el nodo se llama "Repo".
   - Un `%` mal formado en `DELETE` da 500 en lugar de 400.
   - Cambiar entre Estático y Docker/Nativo se planea como `update`, pero Render no lo permite.
   - Las llamadas a Render no tienen timeout ni límite de frecuencia.
   - `canonicalJson` está triplicado; conviene moverlo a `protocol` con un ADR.
   - La URL del despliegue no se valida como `https:`.
3. **Infraestructura** (pídele a sebas las claves; nunca en el repo):
   - Crear una **cuenta de Render dedicada**, distinta de la que hostea Nodomics. De ahí salen `RENDER_API_KEY` y `RENDER_OWNER_ID`.
   - Aplicar la migración `deployments` en Supabase.
   - Crear `nodomics-deploy` desde `render.yaml` con `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RENDER_*` y `DEPLOY_ALLOWED_ORIGINS`.
   - Poner `VITE_DEPLOY_URL` en `nodomics-web`. Mientras no exista, el hosteo está apagado en producción.
4. **Prueba de punta a punta con Render real.** Hasta ahora solo hay fakes. Sin verificar contra Render: que acepte `plan` en el PATCH, el campo `suspended` y nombres con `--`.
5. **Lienzo:** Repo y Servicio muestran "Desactualizado", "Ejecuta el flujo para ver los datos" y "Ejecutar este nodo", como si fueran nodos de datos. Un recurso mal configurado termina en `done` al ejecutar; debería terminar en `error`.
6. **Otros:**
   - El formulario no oculta campos según el build.
   - Los iconos `git-branch` y `server` no tienen test.
   - El refresco cada 5 s del panel no tiene test, y una respuesta de `list` puede pisar el estado tras `apply`.

**Fuera del primer corte:** Nixpacks, dominios propios, bases de datos, conexiones entre servicios, repos privados, logs en vivo y desplegar desde el agente.

Ojo: trabajen en un worktree propio. Dos sesiones en el mismo clon se cambiaron la rama entre sí.
