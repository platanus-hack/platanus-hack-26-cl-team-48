# Nodomics — PoC de una noche (v2: interfaz y motor separados)

## Objetivo

Demostrar en **una noche (~6–8 h)** con agentes:

1. **Lienzo de nodos** que procesa datos reales, con vista previa en cada nodo.
2. **Nodos definidos como datos** (manifiesto + código), sin tocar la app.
3. **Flujo como nodo.**
4. **Compartir y remixar** por link.
5. **Interfaz y motor totalmente separados:** el mismo flujo corre en el navegador o en un motor Python local, cambiando solo un selector, sin cambiar una línea de la interfaz.

El punto 5 es el centro de esta versión.

---

## 1. Principio de arquitectura

> **La interfaz no sabe dónde ni cómo se calcula nada. Solo habla un protocolo.**

Es el mismo patrón que hizo exitosos a dos sistemas conocidos:
- **LSP (Language Server Protocol):** cualquier editor habla con cualquier analizador de lenguaje a través de un protocolo JSON-RPC.
- **Protocolo de kernels de Jupyter:** la misma interfaz de notebook ejecuta Python, R o Julia, en local o en un servidor.

Nodomics define su propio protocolo: el **Nodomics Engine Protocol (NEP)**.

```
┌──────────────────────────┐
│  Interfaz (apps/web)     │  React, lienzo, formularios, vistas
│  solo conoce: protocolo  │  ❌ no importa DuckDB, Pyodide ni nada del motor
└────────────┬─────────────┘
             │  NEP (JSON-RPC 2.0) sobre un "transporte"
             │  ├─ postMessage → Web Worker   (navegador)
             │  ├─ WebSocket   → localhost    (motor Python local)
             │  └─ WebSocket   → servidor     (nube, a futuro)
┌────────────┴─────────────┐
│  Motor                   │  cualquier implementación que cumpla el NEP
│  ┌────────────────────┐  │
│  │ Coordinador        │  │  grafo, subflujos, plan, caché, invalidación,
│  │                    │  │  plantillas, inferencia de esquema
│  └─────────┬──────────┘  │
│            │ Protocolo de ejecutor (interno, más simple)
│  ┌─────────┴──────────┐  │
│  │ Ejecutores         │  │  "corre este SQL", "corre este Python",
│  │ SQL · Python · …   │  │  guarda el resultado, entrega páginas
│  └────────────────────┘  │
└──────────────────────────┘
```

### Tres reglas que garantizan la separación

1. **Los datos viven en el motor; la interfaz solo recibe referencias y páginas.** La interfaz nunca tiene una tabla completa. Pide "las filas 0 a 100 del resultado del nodo n3" o "los datos de este gráfico, máximo 5.000 puntos". Por eso un motor remoto (local o nube) funciona igual que uno en el navegador.
2. **Los nodos son datos, no código de la interfaz.** Un nodo es un manifiesto JSON/YAML más plantillas SQL o código Python en texto. Cualquier motor, escrito en cualquier lenguaje, puede ejecutarlo. Corrige la v1, donde la plantilla SQL era una función de TypeScript que un motor Python no podía ejecutar.
3. **La separación la vigila una herramienta, no la disciplina.** Una regla de lint (`dependency-cruiser` o `eslint no-restricted-imports`) hace fallar la build si `apps/web` importa algo del motor.

---

## 2. Dos capas dentro del motor: coordinador y ejecutores

| Capa | Responsabilidad | Implementaciones |
|---|---|---|
| **Coordinador** | Recibe el flujo; expande subflujos; ordena el grafo; calcula claves de caché; decide qué recalcular; renderiza las plantillas SQL; infiere esquemas; decide qué ejecutor corre cada nodo; mueve datos entre ejecutores; emite eventos | **Una sola implementación en TypeScript puro** (sin DOM ni APIs del navegador), que corre en un Web Worker o en Node/Deno |
| **Ejecutor** | Ejecuta una tarea ya resuelta ("corre este SQL sobre estas tablas", "corre esta función Python sobre este DataFrame"), guarda el resultado bajo un id, entrega su esquema, sus páginas y su exportación en Arrow | DuckDB-WASM y Pyodide (navegador); DuckDB + CPython (motor local); lo mismo en la nube |

**Por qué dos capas:** la lógica difícil (grafo, caché, subflujos) se escribe **una sola vez**. Un ejecutor nuevo, por ejemplo uno en R, es pequeño: unas 200 líneas que implementan 5 mensajes.

**Combinaciones posibles con las mismas piezas:**

| Escenario | Coordinador | Ejecutores |
|---|---|---|
| Todo en el navegador (por defecto) | Worker | DuckDB-WASM + Pyodide |
| Motor Python local | Worker | DuckDB y CPython locales por WebSocket |
| Híbrido | Worker | SQL en el navegador, Python pesado local |
| Nube / ejecución programada | Node en el servidor | Ejecutores del servidor |
| Tests | Node | Ejecutores falsos o reales |

Para la interfaz, todo esto es "un motor". El NEP es idéntico en todos los casos.

---

## 3. Nodomics Engine Protocol (NEP) v0

**JSON-RPC 2.0**: peticiones con respuesta + notificaciones (eventos) del motor hacia la interfaz. Los mismos mensajes viajan por cualquier transporte.

### Ciclo de sesión

| Mensaje | Dirección | Para qué |
|---|---|---|
| `engine.hello` | UI → motor | Negociar la versión. Responde con las **capacidades**: `{ protocol: "0.1", engine: "browser", runtimes: ["sql","python"], pythonPackages: [...], limits: { memoryMB }, sources: ["upload","url","path"] }` |
| `nodes.list` | UI → motor | Catálogo de nodos disponibles (manifiestos). La biblioteca de la interfaz se arma con esto |
| `nodes.register` | UI → motor | Registrar nodos personalizados (los creados con "convertir en nodo") |

### Flujo y ejecución

| Mensaje | Dirección | Para qué |
|---|---|---|
| `flow.set` | UI → motor | Enviar el flujo completo (snapshot) con su número de revisión `rev`. Responde qué quedó desactualizado y qué está mal configurado, sin ejecutar. El motor calcula solo qué cambió comparando claves de caché. En la PoC se envía el flujo entero en cada cambio, con debounce; los parches quedan para después |
| `flow.run` | UI → motor | Ejecutar `{ targets?: nodeId[] }` (todo, o hasta ciertos nodos) → devuelve `runId` |
| `run.cancel` | UI → motor | Cancelar |
| `node.status` | motor → UI | Evento `{ rev, nodeId, state: "stale"\|"queued"\|"running"\|"done"\|"cached"\|"error"\|"cancelled", progress?, error?, executor }` |
| `node.result` | motor → UI | Evento `{ rev, nodeId, port, ref: { id, rowCount, schema } }`: una **referencia**, nunca los datos |
| `run.log` | motor → UI | Mensajes y salida estándar de nodos Python |
| `run.finished` | motor → UI | Resumen: tiempos, nodos ejecutados, nodos desde caché |

### Datos (siempre paginados)

| Mensaje | Para qué |
|---|---|
| `data.page` | `{ ref, offset, limit, sort? }` → `{ columns, rows }` en JSON. Alimenta el panel de vista previa |
| `data.profile` | `{ ref }` → estadísticas por columna (nulos, únicos, mín, máx, distribución) |
| `data.view` | `{ nodeId }` → especificación Vega-Lite + datos ya agregados o muestreados (máximo N puntos) |
| `schema.infer` | `{ nodeId, port }` → columnas y tipos **sin ejecutar todo**. El motor renderiza el SQL y corre `DESCRIBE` / `LIMIT 0`. Alimenta los desplegables de columnas |

### Archivos (fuentes)

| Mensaje | Para qué |
|---|---|
| `source.add` | `{ kind: "url" \| "upload" \| "path", ... }` → `sourceId`. En el navegador, `upload` recibe el `File` (transferible); en un motor remoto el archivo se sube por fragmentos o se indica su ruta local. La interfaz pregunta en `engine.hello` qué tipos acepta el motor |

**Versionado:** `engine.hello` lleva la versión del protocolo; si no coincide, la interfaz muestra "actualiza tu motor local". Los tipos se escriben en TypeScript y se exporta un **JSON Schema** para que el motor Python valide los mismos mensajes.

### Protocolo de ejecutor (interno, coordinador → ejecutor)

| Mensaje | Para qué |
|---|---|
| `exec.hello` | Capacidades del ejecutor (`runtimes`, paquetes, memoria) |
| `exec.run` | `{ taskId, kind: "sql", query, inputs: { alias: resultId } }` o `{ kind: "python", code, entry: "run", inputs, params }` → `{ resultId, schema, rowCount }` |
| `exec.page` / `exec.profile` | Igual que `data.page` / `data.profile`, sobre un `resultId` |
| `exec.export` / `exec.import` | Mover un resultado entre ejecutores en **Arrow IPC** (por ejemplo, de DuckDB a Python) |
| `exec.drop` | Liberar resultados que salieron de la caché |

La conversión entre ejecutores siempre usa Arrow: DuckDB, pandas, Polars y R lo leen sin copias costosas.

---

## 3.1 Protocolo en detalle

### Los dos tipos de mensaje

**Petición → respuesta.** La interfaz pide algo y espera la respuesta; el `id` las empareja.

```json
→ {"jsonrpc":"2.0", "id":7, "method":"data.page", "params":{"ref":"r_7f3a", "offset":0, "limit":100}}
← {"jsonrpc":"2.0", "id":7, "result":{"columns":[...], "rows":[...], "total":1000000}}
```

**Notificación (evento).** Sin `id` ni respuesta. El motor avisa lo que va pasando.

```json
← {"jsonrpc":"2.0", "method":"node.status", "params":{"rev":12, "nodeId":"n3", "state":"running", "progress":0.4}}
```

**Quién manda en qué:**
- La **interfaz** es dueña del flujo que se está editando.
- El **motor** es dueño del estado de ejecución: qué corrió, qué está desactualizado, dónde están los resultados.

La interfaz envía el flujo y el motor responde con estados. Ninguno pisa al otro.

### Una sesión completa

```
Interfaz                                   Motor
   │── engine.hello ──────────────────────▶│  1. conectar
   │◀───────────── capacidades ────────────│
   │── nodes.list ────────────────────────▶│  2. catálogo
   │◀───────────── manifiestos ────────────│
   │── source.add (archivo) ──────────────▶│  3. datos
   │◀───────────── sourceId ───────────────│
   │── flow.set (rev 12) ─────────────────▶│  4. el usuario armó el flujo
   │◀───────────── {stale:[n1,n2,n3]} ─────│
   │── schema.infer (n2) ─────────────────▶│  5. desplegable de columnas
   │◀───────────── columnas y tipos ───────│
   │── flow.run ──────────────────────────▶│  6. ejecutar
   │◀───────────── {runId:"run_5"} ────────│
   │◀ node.status n1 running ··············│     eventos mientras corre
   │◀ node.status n1 done ·················│
   │◀ node.result n1 → ref r_7f3a ·········│
   │◀ node.status n2 running ··············│
   │◀ ...                                  │
   │◀ run.finished ························│
   │── data.page (r_7f3a, 0..100) ────────▶│  7. vista previa
   │◀───────────── 100 filas ──────────────│
```

**1. Conectar.** La interfaz se presenta; el motor responde qué sabe hacer.

```json
→ engine.hello {"protocol":"0.1", "client":"web", "token":"…solo motores remotos…"}
← {"protocol":"0.1", "engine":"python-local", "runtimes":["sql","python"],
   "pythonPackages":["pandas","scikit-learn"], "limits":{"memoryMB":16000},
   "sources":["upload","url","path"]}
```

Si la versión no coincide, la interfaz muestra "actualiza tu motor". Las capacidades deciden qué ofrece la interfaz; por ejemplo, "elegir una ruta local" solo aparece si el motor acepta `path`.

**2. Catálogo.** `nodes.list` devuelve los manifiestos. La interfaz arma la biblioteca y los formularios con ellos; no trae ningún nodo programado dentro.

**3. Datos.** `source.add` registra un archivo y devuelve un `sourceId`. En el navegador se pasa el `File` directamente; en un motor remoto se sube por fragmentos o se indica su ruta. La interfaz no vuelve a tocar el archivo.

**4. Enviar el flujo.** En cada cambio, con debounce de ~300 ms, la interfaz envía el flujo completo con un número de revisión:

```json
→ flow.set {"rev":12, "flow":{"nodes":[...], "edges":[...]}}
← {"rev":12, "stale":["n2","n3"], "errors":[{"nodeId":"n3","code":"PARAM_REQUIRED","param":"column"}]}
```

El motor compara las claves de caché y responde qué quedó desactualizado y qué está mal configurado, **sin ejecutar nada**.

**5. Columnas sin ejecutar.** `schema.infer` llena el desplegable "Columna" apenas se conecta un nodo.

**6. Ejecutar.** `flow.run` responde al instante con un `runId`; el progreso llega como eventos. `node.result` trae **una referencia, no los datos**:

```json
← node.result {"rev":12, "nodeId":"n1", "port":"out",
               "ref":{"id":"r_7f3a", "rowCount":1000000,
                      "schema":[{"name":"monto","type":"double"}, ...]}}
```

**7. Ver datos.** La interfaz pide solo lo que muestra: filas paginadas (`data.page`), estadísticas (`data.profile`) o datos ya agregados de un gráfico (`data.view`, con un máximo de N puntos). Un millón de filas nunca cruza el protocolo.

### Cuando el usuario cambia algo

El usuario cambia el filtro de "Sur" a "Norte":

1. La interfaz envía `flow.set` con `rev: 13`.
2. El motor ve que solo cambió la clave de caché de n2, así que marca n2 y n3 como desactualizados. n1 sigue igual.
3. Si la ejecución automática está activa, la interfaz envía `flow.run`. Los eventos dicen `n1: cached`, `n2: running`, `n3: running`.

**La revisión evita mostrar resultados viejos.** Todos los eventos llevan `rev`. Si llegan eventos de la revisión 12 cuando la interfaz ya va en la 13, se descartan.

### Errores: dos niveles

- **Errores del protocolo** (método inexistente, parámetros inválidos): error JSON-RPC en la respuesta. Indican un bug.
- **Errores de un nodo** (columna inexistente, excepción en Python): **no** son errores de la petición. Llegan como estado del nodo, con un formato pensado para la interfaz:

```json
← node.status {"rev":13, "nodeId":"n4", "state":"error",
   "error":{"code":"PYTHON_EXCEPTION",
            "message":"La columna 'monto' no existe",
            "hint":"¿Quisiste decir 'Monto'?",
            "detail":"KeyError: 'monto'\n  File main.py, line 2…"}}
```

`message` y `hint` se muestran al usuario; `detail` va plegado para técnicos. El mismo error se ve igual venga del motor que venga.

Códigos de error de nodo iniciales: `PARAM_REQUIRED`, `PARAM_INVALID`, `INPUT_MISSING`, `TYPE_MISMATCH`, `COLUMN_NOT_FOUND`, `SQL_ERROR`, `PYTHON_EXCEPTION`, `RUNTIME_UNAVAILABLE`, `OUT_OF_MEMORY`, `SOURCE_UNREADABLE`, `CANCELLED`.

### Robustez

| Situación | Cómo se resuelve |
|---|---|
| Cancelar | `run.cancel {runId}` → los nodos pendientes quedan `cancelled` |
| Referencia vencida (la caché la liberó o el motor se reinició) | `data.page` responde `RESULT_EXPIRED` → la interfaz vuelve a ejecutar ese nodo |
| Se corta la conexión con el motor local | La interfaz reconecta y repite `hello` + `flow.set`; lo que el motor tenga en caché sigue sirviendo. Todas las operaciones son repetibles sin efectos secundarios |
| Cambiar de motor | Se cierra la sesión, se abre otra con el nuevo motor y se repite `hello` → `flow.set` → `flow.run` |
| Salida de Python (`print`) | Eventos `run.log`, que se muestran en la consola del nodo |
| Seguridad del motor remoto | Token en `hello`; el motor rechaza cualquier mensaje antes de un `hello` válido |

### Transportes

| Motor | Transporte | Detalle |
|---|---|---|
| Navegador | `postMessage` a un Web Worker | Puede pasar objetos `File` sin copiarlos |
| Python local | WebSocket a `127.0.0.1` | Mensajes de texto JSON |
| Nube | WebSocket a un servidor | Lo mismo, con autenticación de cuenta |
| Tests | En memoria | El motor falso responde en el mismo proceso |

La interfaz usa un solo objeto, `EngineClient`, con `client.request("flow.run", …)` y `client.on("node.status", …)`, sin saber cuál de los cuatro transportes hay detrás.

---

## 4. Nodos como datos

Un paquete de nodos es una carpeta. Funciona igual en cualquier motor:

```
nodes/core/filter/
  node.json
```

```json
{
  "id": "core.filter",
  "version": "0.1.0",
  "name": "Filtrar",
  "category": "Transformar",
  "inputs":  [{ "id": "in",  "type": "table" }],
  "outputs": [{ "id": "out", "type": "table" }],
  "params": {
    "type": "object",
    "properties": {
      "column": { "type": "string", "x-nodomics": { "widget": "column", "of": "in" } },
      "op":     { "enum": ["=", "!=", ">", "<", ">=", "<=", "contiene"], "default": "=" },
      "value":  { "type": "string" }
    },
    "required": ["column", "value"]
  },
  "impl": {
    "kind": "sql",
    "template": "SELECT * FROM {{in}} WHERE {{#if (eq op 'contiene')}}CAST({{ident column}} AS VARCHAR) ILIKE {{lit (concat '%' value '%')}}{{else}}{{ident column}} {{op}} {{lit value}}{{/if}}"
  }
}
```

- **Parámetros = JSON Schema** (estándar). El formulario se genera con él; `x-nodomics.widget` indica controles especiales (selector de columnas, editor de código, constructor de condiciones).
- **Plantillas SQL declarativas** (sintaxis tipo Handlebars, con ayudantes `ident` y `lit` que escapan identificadores y valores). Las renderiza **el coordinador**; los ejecutores reciben SQL final. La validación de `op` contra el `enum` evita inyección.
- **Nodos Python:** `"impl": { "kind": "python", "file": "main.py", "entry": "run" }`, con `def run(inputs: dict[str, DataFrame], params: dict) -> dict[str, DataFrame]`.
- **Vistas:** `"impl": { "kind": "view", "vegaLite": { ... } }`, con la plantilla de la especificación. El coordinador la llena y pide al ejecutor los datos agregados.
- **Flujo como nodo:** `"impl": { "kind": "flow", "flow": { ...grafo con nodos Entrada/Salida... } }`. El coordinador lo expande antes de planificar.
- **Requisitos para elegir dónde corre:** `"requires": { "runtime": "python", "packages": ["scikit-learn"], "network": false }`. El coordinador lo compara con las capacidades de cada ejecutor.

---

## 5. Estructura del monorepo

```
packages/
  protocol/            ← CONTRATO. Tipos NEP + protocolo de ejecutor + formato de flujo
                         + esquema del manifiesto. Exporta JSON Schema. Sin dependencias.
  client/              ← EngineClient: JSON-RPC + transportes (WorkerTransport, WebSocketTransport)
  coordinator/         ← TS puro: grafo, expansión, plan, caché, plantillas, despacho
  executor-duckdb-wasm/
  executor-pyodide/
  engine-browser/      ← arma coordinador + ejecutores del navegador dentro de un Web Worker
  engine-mock/         ← motor falso en memoria: la UI se desarrolla y prueba sin motor real
  nodes-core/          ← ~15 nodos como carpetas de datos (node.json, main.py)
apps/
  web/                 ← la interfaz. Solo depende de protocol + client
engines/
  python-local/        ← paquete Python: servidor WebSocket que implementa el NEP
                         (reutiliza el coordinador TS vía Node, o implementa solo el protocolo
                          de ejecutor y deja el coordinador en el Worker del navegador)
tests/
  conformance/         ← los mismos flujos JSON corren contra cada motor y comparan resultados
public/datasets/
```

### Cómo se conecta el motor Python local en la PoC

La opción más barata para la noche es usar el motor local **solo como ejecutor**: el coordinador sigue en el Worker del navegador y despacha las tareas por WebSocket a un ejecutor Python (`duckdb` + `pandas` + `pyarrow`, unas 200–300 líneas con `websockets` o FastAPI). Así no se reescribe el coordinador en Python, y se demuestra igual que el mismo flujo corre en otro motor.

Más adelante, para la ejecución programada sin navegador, el coordinador TS corre en Node junto al ejecutor (empaquetado en la app de un clic). No se reescribe nada.

Seguridad mínima del ejecutor local, incluso en la PoC: escuchar solo en `127.0.0.1`, aceptar solo el origen de la app y exigir un token que se imprime al arrancar y se pega una vez en la interfaz.

---

## 6. Guion de la demo (criterio de "terminado")

1. Abrir la app → dataset de ejemplo "ventas" o arrastrar un CSV → nodo fuente con vista previa.
2. Filtrar → Agrupar → Gráfico de barras, con vista previa en cada paso y columnas en los desplegables **antes de ejecutar** (`schema.infer`).
3. Nodo Python con z-score.
4. Seleccionar dos nodos → "Convertir en nodo" → reutilizarlo en otro flujo.
5. Compartir por link → abrir en incógnito → mismo flujo, ejecutado.
6. Exportar e importar `.nodo.json`.
7. 1M de filas: filtro + agrupación en menos de 3 s en el navegador.
8. **Selector de motor: "Navegador" → "Python local"**. Se ejecuta el mismo flujo y da el mismo resultado; el indicador de cada nodo muestra dónde corrió.
9. **La suite de conformidad pasa contra los tres motores** (mock, navegador, Python local).

## Fuera de alcance

Cuentas, backend, Hub real, multijugador, nube, IA, Excel, bases de datos, ejecución programada, parches incrementales del flujo (se envía el snapshot completo), streaming de resultados grandes.

## 7. Stack

| Pieza | Elección |
|---|---|
| Monorepo | **pnpm workspaces** (+ `uv` para el paquete Python) |
| App | Vite + React + TypeScript |
| Lienzo | @xyflow/react |
| Estado de la UI | Zustand. Guarda el flujo que se edita y un espejo del estado del motor que llega por eventos |
| RPC | JSON-RPC 2.0 propio, mínimo (~150 líneas), o `vscode-jsonrpc` |
| Formularios | JSON Schema → `@rjsf/core`, con widgets propios para columna y código |
| Plantillas | Handlebars (existe en JS; en Python no hace falta porque el coordinador es TS) |
| Navegador | `@duckdb/duckdb-wasm`, Pyodide (con `pyarrow` para Arrow) |
| Motor local | Python 3.12, `duckdb`, `pandas`, `pyarrow`, `websockets` |
| Gráficos | Vega-Lite + `vega-embed` |
| Compartir | `lz-string` en el hash de la URL |
| Límites entre capas | `dependency-cruiser` en CI |
| Tests | Vitest (coordinador, conformidad), pytest (ejecutor Python), Playwright (guion) |

---

## 8. Plan de la noche

La ventaja de esta arquitectura es que **el contrato permite paralelizar de verdad**: la UI se construye contra el motor falso mientras otros construyen el motor real.

### Fase 0 — Contrato (líder, ~1 h, secuencial)
1. Monorepo con pnpm y regla de dependencias (`apps/web` → solo `protocol` + `client`).
2. `packages/protocol`: tipos del NEP, del protocolo de ejecutor, del formato de flujo y del manifiesto, más la exportación a JSON Schema.
3. `packages/client` con `WorkerTransport` y `engine-mock` funcionando: responde `hello`, `nodes.list`, `flow.run` (con eventos falsos) y `data.page` (con datos inventados).
4. **Prueba de humo del mayor riesgo técnico:** DuckDB-WASM y Pyodide cargan dentro de un Worker con Vite.
5. Tres nodos de referencia en `nodes-core` (fuente CSV, filtro, Python) y tres flujos de conformidad en `tests/conformance`.
6. Commit. **`packages/protocol` queda congelado**: cualquier cambio pasa por el líder.

### Fase 1 — En paralelo (5 agentes, ~2–3 h)

| Agente | Paquete | Entrega | Verifica contra |
|---|---|---|---|
| **A — Interfaz** | `apps/web` | Lienzo, biblioteca desde `nodes.list`, formularios desde JSON Schema, vista previa paginada, estados por nodo desde eventos, selector de motor, compartir, importar/exportar, "convertir en nodo" (corte del grafo en la UI → `nodes.register`) | `engine-mock` |
| **B — Coordinador** | `coordinator` | Expansión de subflujos, orden topológico, claves de caché (hash de versión + parámetros + entradas), invalidación aguas abajo, renderizado de plantillas, `schema.infer`, despacho por capacidades, transferencia Arrow entre ejecutores, eventos | Ejecutores falsos en Vitest |
| **C — Ejecutores del navegador** | `executor-duckdb-wasm`, `executor-pyodide`, `engine-browser` | Protocolo de ejecutor completo; Arrow DuckDB ↔ pandas; armado del motor del navegador en el Worker | Tests del protocolo de ejecutor |
| **D — Ejecutor Python local** | `engines/python-local` | Servidor WebSocket en 127.0.0.1 con token; mismo protocolo de ejecutor con `duckdb` + CPython; `WebSocketTransport` | pytest + los mismos tests del protocolo de ejecutor |
| **E — Nodos y conformidad** | `nodes-core`, `tests/conformance` | ~15 nodos (fuentes, transformaciones, SQL libre, Python, 6 vistas, Entrada/Salida) con sus casos de prueba; suite que corre cada flujo contra cada motor y compara resultados | Coordinador real cuando esté listo; antes, validación de manifiestos |

### Fase 2 — Integración (líder, ~1 h)
- La UI cambia de `engine-mock` a `engine-browser`. **No debería cambiar código de la UI**, solo la configuración. Si cambia, es una fuga del contrato y se corrige en el protocolo.
- Conectar el ejecutor Python local por el selector de motor.

### Fase 3 — Verificación (~1 h)
- Suite de conformidad × 3 motores.
- Playwright recorre el guion completo (pasos 1–8).
- `dependency-cruiser` confirma que no hay imports prohibidos.

### Si sobra tiempo
1. Ejecución híbrida: SQL en el navegador y Python en el motor local, en el mismo flujo.
2. "Explícame este flujo" con la Claude API.
3. Coordinador en Node + ejecutor Python en un solo proceso (`npx nodomics-engine`), sin navegador.

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| El protocolo queda mal diseñado y obliga a cambios en paralelo | Fase 0 con el motor falso ya respondiendo; congelar el protocolo; cambios solo vía el líder |
| Configurar Workers con DuckDB/Pyodide en Vite | Prueba de humo en la Fase 0 antes de lanzar agentes |
| Arrow entre DuckDB-WASM y Pyodide | Si se traba, usar CSV como plan B solo dentro de `engine-browser`; el protocolo no cambia |
| Diferencias de resultado entre motores (tipos, decimales, orden) | Conformidad con orden explícito y tolerancia numérica; tipos normalizados en el esquema del protocolo |
| El navegador pide permiso para conectar a localhost (Chrome 142+) | Explicarlo en la UI del selector de motor; en desarrollo, aceptar una vez |
| Inyección en plantillas SQL | `ident` y `lit` obligatorios, validación de parámetros contra JSON Schema antes de renderizar |
| Python ajeno ejecutando en el motor local | En la PoC solo nodos propios; permisos y sandbox quedan para después |
