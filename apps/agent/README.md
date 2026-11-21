# @nodomics/agent

Servicio HTTP del agente de Nodomics. Ejecuta el ciclo de asistencia sobre flujos mediante MCP y persistencia en Supabase.

## Variables de entorno

Configuración requerida para inicializar el servicio:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto HTTP local (opcional, por defecto 8787) |
| `ANTHROPIC_API_KEY` | Credencial para el modelo de lenguaje |
| `VOYAGE_API_KEY` | Credencial para generación de embeddings |
| `SUPABASE_URL` | URL HTTPS del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Llave anónima de Supabase |
| `MCP_URL` | URL HTTPS del servidor MCP del motor (o `fake` en desarrollo) |

## Ejecución en local

Requiere Node.js 24 o superior y pnpm.

1. Instalar dependencias desde la raíz del monorepo:

```bash
corepack enable && pnpm install --frozen-lockfile
```

2. Definir las variables de entorno en el shell o archivo local `.env`.

3. Iniciar el servicio directamente con Node:

```bash
node apps/agent/src/start.ts
```

4. Comprobar el estado del servicio:

```bash
apps/agent/scripts/smoke.sh http://localhost:8787
```

## Despliegue en Render

El servicio está configurado como `nodomics-agent` en `render.yaml`.

Dado que Render requiere acceso a repositorios propios (ver README raíz):

1. Sincroniza los commits a tu repositorio personal espejo:

```bash
git remote set-url --add --push origin https://github.com/<tu-usuario>/<tu-repo>.git
git push
```

2. En el panel de Render, crea un nuevo **Blueprint** apuntando a tu repositorio espejo.
3. Render detectará los servicios `nodomics-web` y `nodomics-agent`.
4. Asigna los valores reales de las variables marcadas con `sync: false` en la configuración del servicio `nodomics-agent`.
