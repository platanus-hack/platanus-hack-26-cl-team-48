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

### Producción

El servicio detecta producción cuando `RENDER=true` (Render lo define solo) o `NODE_ENV=production`. En producción rechaza arrancar con piezas falsas:

| Variable | Valor en producción |
|---|---|
| `AGENT_MEMORY` | `supabase`. Es obligatoria: sin definir o con `fake` el servicio no arranca |
| `MCP_URL` | URL HTTPS real; `fake` se rechaza |
| `AGENT_DEV_IDENTITY` | No debe ser `1`: se rechaza siempre en producción, incluso en modo demo |
| `AGENT_ALLOWED_ORIGINS` | Orígenes permitidos por CORS, separados por comas |

Los errores de configuración nombran la variable, nunca su valor.

### Modo demo

`AGENT_ALLOW_FAKES=1` (exactamente `1`) permite en producción `MCP_URL=fake` y la memoria falsa (`AGENT_MEMORY=fake` o sin definir). Es un modo explícito para demostraciones: los datos no se persisten. No habilita la identidad de desarrollo.

### Límites de uso

Los pedidos se limitan por usuario autenticado, no por el encabezado: 6 por minuto en `/agent/requests` y 60 por minuto en las demás rutas. Un token inválido responde 401 y no consume cupo. Los registros de acceso incluyen solo método, ruta (sin query) y estado.

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
