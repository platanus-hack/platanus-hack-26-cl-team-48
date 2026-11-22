# @nodomics/deploy

Servicio que despliega los nodos Servicio de un flujo guardado en la cuenta de Render de Nodomics (ADR 0027). Es el único proceso que conoce el token de Render.

## Variables de entorno

| Variable | Obligatoria | Qué es |
|---|---|---|
| `SUPABASE_URL` | sí (`https://`) | Proyecto de Supabase |
| `SUPABASE_ANON_KEY` | sí | Clave pública: verifica el JWT y lee el flujo con RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | sí | Escribe la tabla `deployments` (solo este servicio escribe) |
| `RENDER_API_KEY` | sí | Token de la cuenta de Render dedicada al hosteo |
| `RENDER_OWNER_ID` | sí | Workspace de Render donde se crean los servicios |
| `DEPLOY_ALLOWED_ORIGINS` | no | Orígenes con CORS, separados por comas (vacío = ninguno) |
| `PORT` | no | Puerto HTTP, por defecto `8791` |

Si falta o es inválida alguna, el proceso dice cuáles (nunca sus valores) y sale con código 1.

## Correr

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
RENDER_API_KEY=... RENDER_OWNER_ID=... DEPLOY_ALLOWED_ORIGINS=http://localhost:5173 \
pnpm --filter @nodomics/deploy start
curl http://localhost:8791/health
```

Requiere la migración `supabase/migrations/20261122120000_deployments.sql`.

## API

Todas las rutas salvo `/health` exigen `Authorization: Bearer <JWT de Supabase>`.

- `GET /health`
- `POST /plan { flowId, nodeId }` → `{ ok, plan }`
- `POST /apply { flowId, nodeId, planHash, secrets? }` → `{ ok, deployment }`; `secrets` se indexa por el nombre de la credencial y nunca se guarda.
- `GET /deployments?flowId=` → `{ ok, deployments }`
- `DELETE /deployments/<id>` → `{ ok }`

Límites: 2 servicios por usuario y 20 en total; cuerpos de hasta 64 KB.
