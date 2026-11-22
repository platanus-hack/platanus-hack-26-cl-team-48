# Nodomics por dentro

Referencia para quien revisa el repositorio por primera vez. Describe el código de `origin/main` en `ee9de48`. Las observaciones sobre producción se atribuyen a pruebas documentadas por el equipo.

## Qué se construye

Nodomics combina una red para encontrar personas y herramientas con un editor donde el trabajo compartido se puede ejecutar, adaptar y volver a publicar. El usuario puede ser quien usa una solución completa, quien aporta una sola transformación o quien conecta herramientas de varias disciplinas. Por ejemplo, un especialista en agua puede buscar una forma de incorporar condiciones sociales a un análisis territorial. El feed le ayuda a encontrar a alguien que ofrece ese conocimiento. El hub distribuye la herramienta. El editor permite probar su lógica y el agente propone cambios sobre un borrador. Son subsistemas distintos incluso cuando forman parte de un mismo recorrido.

El repositorio incluye [casos de uso por disciplina](../casos-de-uso/README.md), desde agronomía, educación y energía hasta veterinaria y comercios, [flujos de demostración](../../apps/web/src/demo) y una [migración del catálogo](../../supabase/migrations/20261122210000_seed_production_catalog.sql). Un caso narrado expresa una necesidad; un flujo sembrado permite inspeccionar un ejemplo. Para afirmar que un recorrido está disponible a usuarios reales también hay que verificar el servicio, los datos y la configuración que utiliza.

## Mapa de ejecución

```mermaid
flowchart TD
    UI["Web · hub, perfiles y editor"] -->|sesión, flujos y publicaciones| DB["Supabase · Auth, Postgres y RLS"]
    UI -->|NEP sobre JSON-RPC| B["Worker · coordinador y ejecutores"]
    B -->|opcional vía WebSocket| P["Ejecutor Python local"]
    UI -->|HTTP| A["Agente · solicitudes, feed y propuestas"]
    A -->|MCP con identidad de usuario| M["Servidor MCP · catálogo, borradores y ejecución"]
    M --> DB
    A --> DB
    A -->|importación opcional| S["Render Sandbox · trabajo temporal"]
    S -->|proxy MCP con token de trabajo| A
    UI -->|plan, aplicar y consultar| D["Servicio de despliegue"]
    D --> DB
    D --> R["Render · servicio del usuario"]
```

El [punto de composición web](../../apps/web/src/main.tsx) elige las dependencias según URL, sesión y entorno. Para analizar una función, sigue primero esa selección. La misma pantalla puede usar un adaptador en memoria, un servicio HTTP o Supabase. Las reglas de desarrollo y dependencias están en [AGENTS.md](../../AGENTS.md), la [arquitectura](arquitectura.md) y los [ADR](../decisions).

## Conceptos que se parecen y se guardan por separado

| Entidad | Qué representa y dónde seguirla |
| --- | --- |
| Manifiesto de nodo | Define tipo, versión, parámetros, puertos e implementación. El [catálogo oficial](../../packages/nodes-core/nodes) incluye fuentes CSV y API, transformaciones, SQL, Python, vistas, composición y recursos de hosteo. |
| Instancia y flujo | Una instancia tiene identificador, tipo, versión, parámetros y posición. Una conexión enlaza el puerto de una instancia con el de otra. El documento `.nodo.json` usa el formato `nodomics/flow@0` y puede llevar manifiestos propios. [Grafo](../../packages/protocol/src/graph.ts) · [Formato de flujo](../../packages/protocol/src/flow.ts) |
| Resultado de ejecución | El motor conserva los resultados. La web recibe referencias y solicita páginas, perfiles o figuras. Una vista del lienzo y un archivo fuente pertenecen a ámbitos de estado diferentes. [Coordinador](../../packages/coordinator/src) |
| Flujo privado y publicación | El propietario edita su flujo guardado. Publicar crea una versión pública y conserva una referencia en el documento privado para indicar si hay cambios pendientes. Una publicación admite versiones sucesivas. [ADR del hub](../decisions/0024-hub-principal-y-estado-de-publicacion.md) |
| App, flujo y nodo publicados | `app` identifica una solución completa para un proyecto; `flow`, una secuencia reutilizable; `node`, una pieza. Una publicación `app` usa la misma representación de flujo e instantánea que `flow`. El hosteo de un servicio tiene su propio ciclo. [ADR 0033](../decisions/0033-publicaciones-de-tipo-app.md) |
| Borrador MCP y propuesta | El borrador es el grafo privado editable. La propuesta es la decisión pendiente sobre diferencias concretas, con propietario, revisión y versión. [Solicitud](../../apps/agent/src/requests/handle-request.ts) · [Decisión](../../apps/agent/src/proposals/decide.ts) |

## Recorridos para leer el código

### 1. Abrir, ejecutar y componer un flujo

La raíz abre el hub. El editor admite `/editor?new` y `/editor?flow=<id>`. Las publicaciones tienen ruta `/hub/<handle>/<slug>` y los perfiles `/u/<handle>`. Los enlaces antiguos con `/#flow=` siguen abriendo el editor. El arranque también contempla un flujo compartido por URL y trabajo pendiente tras iniciar sesión. [Rutas](../../apps/web/src/routing/routes.ts) · [Arranque y guardado](../../apps/web/src/main.tsx)

La interfaz usa el cliente NEP. El coordinador expande subflujos, ordena dependencias, determina qué resultados de la caché siguen vigentes y asigna tareas según las capacidades de cada ejecutor. Los eventos llevan la revisión del flujo para que la web pueda descartar resultados anteriores a la edición actual. En navegador se usan DuckDB-WASM para SQL y Pyodide para Python. El modo Python local conserva el coordinador y conecta un ejecutor mediante WebSocket. El registro también ofrece un motor simulado. [Cliente](../../packages/client/src) · [Planificación](../../packages/coordinator/src/plan-execution.ts) · [Registro de motores](../../apps/web/src/engine-registry.ts) · [Ejecutor local](../../engines/python-local/README.md)

Una herramienta compuesta puede exponer solo determinados parámetros y puertos como un nodo reutilizable. El recorrido se puede seguir en la [biblioteca del editor](../../apps/web/src/library) y la [expansión de subflujos](../../packages/coordinator/src/expand-subflows.ts).

### 2. Publicar, explorar y reutilizar

El adaptador del hub elige Supabase cuando están configuradas su URL y su clave publicable. En local puede crear una cuenta de prueba y un catálogo en memoria. El editor combina almacenamiento en la cuenta y biblioteca local. [Selección del hub](../../apps/web/src/hub/create-app-hub.ts) · [Persistencia y versiones](../../packages/hub/src)

Una publicación contiene una instantánea de los manifiestos utilizados y, si se incluye el estado, muestras paginadas, perfiles, vistas o figuras. Esto permite mostrar una previsualización sin iniciar el motor. Ver una tabla en una publicación demuestra que puede leerse la instantánea. Para demostrar reproducibilidad hay que abrir una copia, proporcionarle las fuentes necesarias y ejecutarla de nuevo. [Grabación y reproducción de instantáneas](../../apps/web/src/hub/snapshot-replay.ts)

El hub permite explorar por tipo y etiquetas, visitar perfiles y abrir copias. El lenguaje visual del hilo comunica el origen de una publicación. [Linaje del hub](../../apps/web/src/hub/hub-lineage.ts) · [Sistema de diseño](../design-system/README.md)

### 3. Encontrar personas y explicar decisiones

El perfil público del hub y la ficha de colaboración del feed tienen funciones distintas. La ficha describe, entre otras cosas, **qué ofrece y qué busca** la persona. El servicio genera representaciones vectoriales de esos textos. Para sugerir colaboradores parte de lo que el usuario busca y consulta las ofertas de otros perfiles; por eso un resultado de otra disciplina puede ser relevante. El feed dispone de registro asistido, búsqueda, mapa y recomendaciones. La ruta de registro admite la carga de un CV con un límite de cuerpo específico, comprobado en la [prueba del registro](../../apps/agent/test/registration-body-limit.test.ts). La lectura de una ficha por handle está habilitada para visitantes; guardar la ficha es una operación autenticada. Sin URL de agente el feed de la web usa fichas de demostración. [Contrato de perfil](../../packages/profile/src) · [Servicio](../../apps/agent/src/feed/feed-service.ts) · [Rutas y visibilidad](../../apps/agent/src/feed/feed-routes.ts) · [Adaptadores web](../../apps/web/src/feed/create-app-feed.ts)

El agente también registra episodios de uso de herramientas y decisiones sobre propuestas. La memoria representa relaciones con intervalos de validez, indexa contenido y da soporte a la búsqueda y a las explicaciones sobre un componente. Para averiguar por qué se tomó una decisión, sigue la evidencia por identidad, componente y momento; para averiguar quién publicó una versión, parte del hub. [Memoria](../../apps/agent/src/memory) · [Ruta de explicación](../../apps/agent/src/http/routes/why.ts)

### 4. Del lenguaje natural a un cambio aceptado

1. El panel web obtiene el token de sesión y envía la solicitud al agente configurado. Puede consumir eventos de progreso. [Panel y cliente HTTP](../../apps/web/src/agent)
2. El servicio resuelve la identidad, limita solicitudes, interpreta el objetivo e inicia el bucle con herramientas permitidas. El modelo consulta el catálogo, crea un borrador, lo modifica y puede pedir su ejecución. El bucle tiene límites de pasos y tiempo. [Bucle](../../apps/agent/src/loop/agent-loop.ts) · [Lista permitida](../../apps/agent/src/requests/allowlists.ts)
3. El MCP valida los argumentos y usa almacenes asociados al usuario. Una edición por lote puede construir varias operaciones sobre el borrador. La ejecución SQL se delega a un worker que el servicio puede terminar al alcanzar los 60 segundos. [Herramientas](../../apps/mcp/src/tools.ts) · [Arranque del MCP](../../apps/mcp/src/start.ts) · [Worker real](../../apps/mcp/src/runner-worker.ts)
4. El agente convierte el diff en tarjetas de cambios. Al decidir, el servicio comprueba propietario, versión esperada y revisión de origen. Aplica los cambios seleccionados a través de MCP y guarda el estado de la propuesta. [Construcción de propuestas](../../apps/agent/src/proposals/build-proposal.ts) · [Decisiones](../../apps/agent/src/proposals/decide.ts) · [Persistencia al aplicar](../../apps/mcp/src/tools-apply.ts)

### 5. Importar una funcionalidad desde GitHub

`import.from_github` es una herramienta del agente. Recibe la necesidad y opcionalmente repositorio y referencia. El servicio la registra cuando tiene configuración para Render Sandbox y una clave dedicada para el agente del sandbox. Durante el trabajo, un proxy limita el acceso MCP mediante un token temporal asociado al usuario. El entorno externo necesita poder alcanzar la URL del agente y disponer del script de importación. [Registro condicional](../../apps/agent/src/requests/wiring.ts) · [Adaptador Render](../../apps/agent/src/sandbox/render-sandbox.ts) · [Script](../../apps/agent/sandbox/run-import.sh)

El resultado incluye repositorio, SHA de commit, rutas, licencia si se conoce, correspondencia con nodos, casos de prueba y partes fuera de alcance. El servicio compara las filas esperadas y observadas **declaradas en el reporte del sandbox**. Distingue `verified`, `partial`, `unverified` e `incompatible`. La etiqueta «comprobado por el agente en el sandbox» identifica el origen de esa comparación. [Esquema del reporte](../../apps/agent/src/import/import-report.ts) · [Decisión del estado](../../apps/agent/src/import/import-status.ts) · [Pruebas](../../apps/agent/test/import-tool.test.ts)

### 6. Desplegar un servicio para personas fuera de Nodomics

Los nodos `core.deploy.repo` y `core.deploy.service` describen recursos. El servicio de despliegue lee el flujo guardado bajo la identidad del usuario, calcula un plan y requiere su huella al aplicar. El proveedor gestiona Render y guarda el estado de los despliegues en Supabase. La API cubre consulta, actualización, redespliegue y eliminación. Hay límites por usuario y globales. Las credenciales del proveedor pertenecen al backend. Publicar una ficha de tipo app y aprovisionar infraestructura son operaciones separadas. [Servicio de despliegue](../../apps/deploy/README.md) · [Casos de uso](../../apps/deploy/src/deploy-use-cases.ts) · [Especificación de recursos](../../apps/deploy/src/spec)

El equipo documentó una prueba contra Render y Supabase con un sitio estático: creación, actualización, redespliegue y borrado. [Informe del equipo](../anuncios/2026-11-22-1530-hosteo-activo.md)

## Arquitectura de seguridad por entorno

| Operación | Qué la contiene | Alcance de la protección |
| --- | --- | --- |
| Proponer cambios | Borrador privado asociado al usuario y a la revisión de origen | Aísla el estado de edición. Aplicar la selección requiere una decisión del usuario. |
| Probar un flujo vía MCP | Worker de Node para SQL, terminable a los 60 segundos | Los mensajes de ejecución llevan el flujo y sus argumentos. El worker corre en un hilo del proceso MCP. [Worker](../../apps/mcp/src/worker-runner.ts) |
| Importar código externo | Render Sandbox efímero con duración predeterminada de diez minutos | Recibe un token temporal de trabajo y una clave dedicada para el modelo. El proxy conserva el JWT del usuario del lado del servidor y restringe las herramientas disponibles. La aplicación de cambios se gestiona por la ruta de decisión del usuario. El importador revoca el token al terminar e intenta cerrar el sandbox. [Proxy](../../apps/agent/src/sandbox/mcp-proxy-route.ts) · [Permisos](../../apps/agent/src/sandbox/proxy-allowlist.ts) · [Ciclo de vida](../../apps/agent/src/import/import-tool.ts) |
| Desplegar una aplicación | Servicio de despliegue autenticado que opera sobre el flujo guardado y el proveedor de hosteo | Antes de aplicar, vuelve a calcular el plan y compara su huella. Comprueba permisos de acceso, secretos requeridos y cuotas. El servicio desplegado tiene su propio ciclo de vida y puede seguir activo cuando termina la sesión del usuario. [Implementación](../../apps/deploy/src/deploy-use-cases.ts) |

Para evaluar una garantía de seguridad, identifica el entorno y la identidad que la hacen cumplir. La prueba de sitio estático citada arriba acredita el recorrido funcional de hosteo. La revisión del código del sandbox acredita el diseño y los controles implementados.

## Cómo se explica una decisión al profesional

Hay tres preguntas con fuentes de evidencia distintas:

1. **¿Qué hace este paso?** El manifiesto describe el nodo, los puertos y los parámetros; la instancia conserva sus valores y las conexiones muestran qué pasos alimenta. El usuario puede seguir un dato desde la entrada hasta la salida e inspeccionar una muestra del resultado. Para un nodo de código, entender su propósito y comprobar su comportamiento siguen siendo tareas distintas. [Manifiestos](../../packages/protocol/src/manifest.ts) · [Catálogo](../../packages/nodes-core/nodes)
2. **¿Qué quiere cambiar el agente y por qué?** La propuesta parte del diff del borrador. Cada tarjeta identifica el cambio, conserva los valores anterior y propuesto cuando existen y muestra una razón redactada por el agente o un texto de respaldo. La persona selecciona cambios o descarta la propuesta. [Tarjetas](../../apps/agent/src/proposals/domain-cards.ts) · [Razones](../../apps/agent/src/proposals/reasons.ts) · [Panel de decisión](../../apps/web/src/agent/AgentProposal.tsx)
3. **¿Por qué se hizo así anteriormente?** La ruta de explicación de componentes recupera episodios del actor y relaciones vigentes. Filtra el texto generado para conservar frases con referencias a episodios disponibles. Una explicación histórica describe decisiones registradas; la corrección del resultado se comprueba ejecutando casos representativos. [Explicación histórica](../../apps/agent/src/memory/story.ts)

Por ejemplo, ante un filtro que descarta mediciones vacías, el grafo permite localizar el paso, la tarjeta permite revisar la regla propuesta y una muestra con cero y un valor ausente permite comprobar si se conserva el cero. Cada evidencia responde una pregunta diferente.

## Cómo reproducir una revisión

Desde la raíz, con Node.js 24 o superior y pnpm 10.28.1, ejecuta `pnpm install --frozen-lockfile` y `pnpm dev`. Este último inicia la web y el catálogo en desarrollo. Los procesos de agente, MCP y despliegue se configuran por separado. Para verificar el recorrido que te interesa, consulta los [valores públicos de la web](../../apps/web/.env.example), las guías de [agente](../../apps/agent/README.md), [MCP](../../apps/mcp/README.md) y [despliegue](../../apps/deploy/README.md), el [blueprint](../../render.yaml) y las [migraciones SQL](../../supabase/migrations). Para conocer las capacidades activas del proceso prevalece el código de arranque de esa revisión.

| Pregunta de revisión | Comprobación que aporta evidencia |
| --- | --- |
| ¿El cambio respeta tipos, dependencias y pruebas del monorepo? | `pnpm check` ejecuta tipos, lint, reglas de dependencia y nombres, formato y Vitest. Las etapas se definen en [package.json](../../package.json). |
| ¿Un nodo conserva sus resultados al cambiar de motor? | Revisa su manifiesto y sus casos en el catálogo, las [pruebas de conformidad de motores](../../tests/conformance/README.md) y la [conformidad de ejecutores](../../tests/executor-conformance). |
| ¿Se puede recorrer la interacción en la web? | `pnpm e2e` usa Playwright en una suite separada. Consulta sus requisitos de Chromium, red y ejecutor Python local. [Guía E2E](../../tests/e2e/README.md) |
| ¿El usuario puede leer o modificar ese registro? | Contrasta el adaptador seleccionado, la identidad que llega al backend, la migración y las [pruebas SQL](../../supabase/tests). |
| ¿Qué evidencia existe de producción? | Distingue pruebas unitarias, integraciones con dobles, ejecución local real y ensayos contra servicios externos. Los [anuncios](../anuncios) indican qué comprobó el equipo y cuándo. |

## Casos para explorar la arquitectura

La [presentación del proyecto](../presentacion.md) ilustra cómo combinar estas piezas en educación, agronomía, gestión del agua y servicios comunales. Para rastrear un caso, parte del actor y la herramienta que usa, sigue la ruta hasta el adaptador que se instancia y localiza la prueba que ejerce esa operación.
