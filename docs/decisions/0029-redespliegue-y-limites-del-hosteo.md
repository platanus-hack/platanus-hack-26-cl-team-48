# 0029. Redespliegue y límites del hosteo

- **Estado:** aceptada
- **Fecha:** 2026-11-22
- **Amplía a:** ADR 0027 §4 y §5.
- **Reemplaza en parte a:** ADR 0027 §4, en el punto de la cuenta de Render dedicada (§6 de esta decisión). El resto sigue vigente.

## Contexto

La revisión independiente de los nodos de hosteo (anuncio `2026-11-22-1400-hosteo-pendiente.md`) dejó hallazgos que cambian el contrato de `apps/deploy`:

- Con la especificación sin cambios no hay forma de desplegar commits nuevos, reintentar un despliegue `failed` ni aplicar un secreto cambiado.
- Cambiar un Servicio entre Estático y Docker/Nativo se planea como `update`, pero Render no permite cambiar el tipo de un servicio existente (`static_site` ↔ `web_service`).
- Las llamadas a Render no tienen timeout, y nada limita cuántas solicitudes hace un usuario.
- Varios `apply` en paralelo se saltan los cupos de 2 servicios por usuario y 20 en total.

## Decisión

1. **Acción "Redesplegar": `POST /redeploy`** con `{ flowId, nodeId, secrets? }`. Solo vale si el nodo ya tiene un despliegue y el plan actual es `unchanged`; si la especificación cambió responde `PLAN_CHANGED` (hay que usar `apply`). Vuelve a mandar las variables de entorno con los secretos actuales y pide un deploy nuevo a Render (`POST /services/{id}/deploys`), que construye el último commit de la rama. Deja el estado en `deploying`. La pestaña Despliegue muestra el botón "Redesplegar", con confirmación.
2. **Código `SERVICE_KIND_CHANGED` (HTTP 409).** Si el servicio desplegado es Estático y el nodo pide Docker/Nativo, o al revés, `plan` y `apply` responden este error. El usuario elimina el servicio y vuelve a desplegar. No se hace un reemplazo automático (borrar y crear) para no cambiar la URL ni ocupar cupo sin que el usuario lo vea.
3. **Límite de frecuencia por usuario: código `RATE_LIMITED` (HTTP 429).** `apps/deploy` cuenta las solicitudes autenticadas de cada usuario en una ventana fija, en memoria. Por defecto, 60 por minuto: el refresco cada 5 s de la pestaña usa 12. `/health` y `OPTIONS` no cuentan.
4. **Timeout de las llamadas a Render**, por defecto 15 s. Una llamada vencida es un `PROVIDER_ERROR`.
5. **Cupos con concurrencia: candado en proceso.** `apply` y `remove` se ejecutan de a uno dentro de `apps/deploy`, así el chequeo de cupo, la creación en Render y el guardado no se intercalan. Vale mientras `nodomics-deploy` corra en **una sola instancia**; si se escala, hay que reemplazarlo por una reserva en la base (ver alternativas).

6. **Mismo workspace de Render que Nodomics** (decisión de cantu, 2026-11-22). Los servicios de los usuarios y `nodomics-deploy` viven en el workspace que hostea `nodomics-web`, `nodomics-agent` y `nodomics-mcp`; ya no se exige una cuenta dedicada. Lo que limita el daño: `apps/deploy` solo actualiza, consulta o borra servicios cuyo id guardó él mismo en `deployments`, nunca por nombre ni listando la cuenta, y los nombres de los servicios de usuarios empiezan con `nd-` (ADR 0028 §4).

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Redesplegar dentro de `apply` cuando el plan es `unchanged` | Sin ruta nueva | Un clic en "Desplegar" sin cambios dispararía un build; mezcla dos intenciones |
| Reemplazo automático al cambiar Estático ↔ Docker/Nativo | Menos pasos para el usuario | Cambia la URL y borra el servicio sin que el usuario lo pida |
| Cupos con una función o trigger en Postgres | Funciona con varias instancias | Migración y reserva de filas antes de crear en Render; más trabajo para un servicio que corre en una instancia |
| Cuenta de Render dedicada (ADR 0027 §4) | Un error o una key filtrada no toca la producción; las horas gratis no se comparten | Hoy solo hay acceso al workspace de Nodomics; frena la puesta en marcha |
| Límite de frecuencia en el proxy de Render | Sin código | El plan gratis no lo ofrece |

## Consecuencias

- El protocolo de `apps/deploy` gana una ruta y dos códigos de error; la web los conoce (`apps/web/src/deploy`).
- El límite de frecuencia y el candado viven en memoria: se reinician con cada deploy de `nodomics-deploy`, y no sirven con más de una instancia.
- Los servicios de usuarios comparten con la producción las horas gratis del workspace y la misma API key: una fuga de `RENDER_API_KEY` expone también `nodomics-web`, `nodomics-agent` y `nodomics-mcp`. Si el hosteo pasa de la demo, conviene volver a una cuenta dedicada.
- Redesplegar consume minutos de build del plan gratis de Render, igual que desplegar.
