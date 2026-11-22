# 0027. Nodos de hosteo: Repo y Servicio desplegados en Render

- **Estado:** aceptada (decisión del líder)
- **Fecha:** 2026-11-22
- **Relacionada con:** ADR 0002 (nodos como datos), 0017 (credenciales), 0023 (flujos en Supabase), 0026 (aislamiento del MCP).

## Contexto

Nodomics ya no es solo análisis: también se quieren armar y publicar apps. El usuario pidió un nodo de hosteo "tipo Render": elegir cómo se construye (Docker, runtime nativo, estático), con variables de entorno y dominio.

Los nodos de hoy calculan datos: el coordinador los re-ejecuta solo al cambiar un parámetro, cachea por contenido y corre en el navegador. Un despliegue es lo contrario: un efecto que cuesta plata, queda vivo, tiene estado propio y necesita un token que nunca puede estar en el navegador.

El líder decidió:

- Los servicios se crean en **una cuenta de Render de Nodomics**, no en la del usuario.
- El código que llama a Render vive en un **servicio nuevo, `apps/deploy`**, aislado del MCP.
- **Primer corte:** nodo Repo y nodo Servicio, con plan y "Desplegar" con confirmación. Dominio = el `*.onrender.com` que asigna Render.

Render ofrece Docker, runtimes nativos y sitios estáticos. **No ofrece Nixpacks** (eso es de Railway); queda fuera hasta que haya otro proveedor.

## Decisión

### 1. Nodos de recurso (cambio en `@nodomics/protocol`)

- `DataType` agrega `"repo"` (referencia a código) y `"service"` (un servicio desplegado).
- `NodeImpl` agrega `{ kind: "resource", resource: "repo" | "service" }`. Un nodo de recurso es datos como cualquier otro: su configuración son sus parámetros.
- **El coordinador no ejecuta nodos de recurso.** Los excluye del plan de ejecución, no pide ejecutor para ellos y no emite resultados. Un nodo de datos no puede conectarse a uno de recurso porque los tipos de puerto no coinciden.

### 2. Los dos nodos (en `nodes-core`, categoría "Hosteo")

**`core.deploy.repo`**: sin entradas; salida `repo`.

- `url`: repo público de GitHub (`https://github.com/<dueño>/<repo>`).
- `branch`: por defecto `main`.
- `rootDir`: carpeta del proyecto dentro del repo (opcional).

**`core.deploy.service`**: entrada `repo`; salida `service`.

- `build`: `docker` | `native` | `static`.
  - `docker`: `dockerfilePath`, `dockerContext`.
  - `native`: `runtime` (`node` | `python` | `go` | `ruby` | `rust` | `elixir`), `buildCommand`, `startCommand`.
  - `static`: `buildCommand`, `publishPath`.
- `env`: lista `{ name, value?, secret? }` con el widget `key-values`, igual que los encabezados de la fuente API.
- `healthCheckPath` (opcional).
- Sin plan ni región elegibles: siempre el plan gratis y una región fija.

### 3. El servicio `apps/deploy`

Es un servicio Node/TypeScript pequeño, desplegado como `nodomics-deploy`. Es el único proceso que conoce el token de Render.

- **`POST /plan { flowId, nodeId }`**: lee el flujo **guardado** del usuario desde Supabase (con su JWT, así que RLS decide), arma la especificación del servicio a partir del nodo Servicio y su Repo, la valida y la compara con el último despliegue. Responde `create | update | unchanged` y los campos que cambian.
- **`POST /apply { flowId, nodeId, planHash, secrets }`**: vuelve a calcular el plan; si `planHash` ya no coincide, falla. Si coincide, crea o actualiza el servicio en Render y lanza un despliegue.
- **`GET /deployments?flowId=`**: estado, URL y último despliegue de cada nodo Servicio del flujo. La interfaz lo consulta periódicamente mientras el panel está abierto.
- **`DELETE /deployments/:id`**: borra el servicio en Render.
- **Identidad:** cada llamada exige `Authorization: Bearer <JWT de Supabase>`, verificado con Supabase Auth, como en el MCP (ADR 0021, 0026).
- **Núcleo puro** (`apps/deploy/src/spec/`): flujo + nodo → especificación → validación → diff. La traducción a la API de Render es un adaptador detrás de un puerto `HostingProvider`, para agregar otro proveedor sin tocar el núcleo.

### 4. Seguridad y límites (porque la cuenta es de Nodomics)

- **Cuenta de Render dedicada**, distinta de la que hostea `nodomics-web`, `nodomics-agent` y `nodomics-mcp`. Un error o un abuso no puede tocar los servicios propios.
- **Lista blanca de campos:** el usuario solo controla los campos de la sección 2. Nombre del servicio, plan, región y auto-deploy los pone `apps/deploy` (`nd-<id corto del usuario>-<id del nodo>`).
- **Solo repos públicos de GitHub.** La URL se parsea; no se aceptan otros hosts.
- **Cupos:** como máximo 2 servicios por usuario y 20 en total. Al pasarlos, el plan responde con un error de dominio, no con una excepción.
- **Solo usuarios con sesión.** Sin sesión, el panel de despliegue no aparece, como "Agente" (anuncio de flujos en la cuenta).
- **Variables secretas:** las que llevan `secret: "<nombre>"` se resuelven en el navegador, desde las credenciales del usuario (ADR 0017), y viajan solo en el cuerpo de `apply`. `apps/deploy` se las pasa a Render y no las guarda. Las variables con `value` quedan en el flujo, y el formulario avisa que las ve cualquiera con quien se comparta o publique.
- **Tabla `deployments`** en Supabase: `owner`, `flow_id`, `node_id`, `provider_service_id`, `url`, `spec_hash`, `status` y fechas. El dueño solo puede leer sus filas (RLS). Solo `apps/deploy` escribe, con la clave de servicio, para que nadie apunte una fila al servicio de otro.

### 5. Interfaz (`apps/web`)

- Al seleccionar un nodo Servicio, el panel de la derecha muestra "Despliegue": estado, URL, el plan con lo que cambia y el botón **Desplegar**, que pide confirmación antes de llamar a `apply`. "Eliminar servicio" también confirma.
- Desplegar exige que el flujo esté guardado: `apps/deploy` lee el flujo guardado, no el que está en edición.
- La llamada a `apps/deploy` es un `fetch` en `apps/web`, como el del agente (`VITE_DEPLOY_URL`). Sin esa variable, el panel avisa que el hosteo no está disponible.
- Ejecutar el flujo no despliega nunca. Quitar un nodo Servicio del lienzo no borra el servicio: queda listado como huérfano en "Despliegue" hasta que el usuario lo borre.

### 6. Dependencias permitidas de `apps/deploy`

`protocol` (tipos y parseo del flujo) y `@supabase/supabase-js`, que ya está en el repo. Para Render basta `fetch` contra su API REST, sin SDK. Nada importa `apps/deploy`, y `apps/deploy` no importa el coordinador, ejecutores ni otras apps.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Token de Render de cada usuario | El costo y el abuso son del usuario; sin cupos | Más fricción para la demo; el líder eligió la cuenta de Nodomics |
| Herramientas `deploy.*` en `apps/mcp` | Un servicio menos; el agente podría desplegar | El MCP pasaría a tener un token de infraestructura en un proceso que ya mostró riesgo de fuga (ADR 0026) |
| Que el coordinador despliegue como un ejecutor más | Usa el mismo camino que los datos | El coordinador corre en el navegador, sin dónde guardar el token; re-ejecutar al cambiar un parámetro desplegaría sin querer |
| Nodo Build separado del Servicio | Reutilizar una imagen en varios servicios | Más protocolo (un tipo "imagen") y Render no separa build de servicio. YAGNI hasta que haga falta |
| Un solo nodo Servicio con la URL del repo como parámetro | Un nodo menos | Un repo con web y sitio estático se repetiría; el Repo como nodo deja ver de dónde sale cada servicio |
| `Docker Compose` como nodo | Lo que el usuario conoce | Varios Servicios conectados ya expresan un compose y se publican como subflujo |

## Consecuencias

- **Nodomics paga y responde** por lo que se hostee. Los cupos, la lista blanca y la cuenta dedicada son obligatorios, no opcionales.
- **El plan gratis de Render tiene horas mensuales compartidas** por toda la cuenta, y sus servicios se duermen sin tráfico. Con 20 servicios alcanza para una demo, no para uso real.
- **El protocolo distingue datos de recursos.** Futuros nodos de recurso (base de datos, dominio, Endpoint que publica un flujo como API) se agregan como nuevos `resource`, sin tocar el coordinador.
- **El estado del servicio no viaja por el NEP**, sino por `apps/deploy`. Si después se quiere en el motor, hará falta otro ADR.
- **Quedan fuera del primer corte:** Nixpacks, dominios propios, bases de datos, conexiones entre servicios como variables de entorno, repos privados, logs en vivo, borrado automático por antigüedad y desplegar desde el agente.
- **Trabajo por paquete:** `protocol` (tipos), `coordinator` (excluir recursos), `nodes-core` (dos manifiestos), `apps/deploy` (nuevo), `apps/web` (panel), una migración de Supabase y `render.yaml`. Cada parte con sus tests escritos por otro agente.
