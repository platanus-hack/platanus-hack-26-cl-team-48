# Arquitectura de Nodomics

Este documento es la referencia técnica. El porqué de cada decisión está en `docs/decisions/` y el plan de la PoC en `docs/04-poc-una-noche.md` (sección 3.1: protocolo en detalle).

## 1. Idea central

> La interfaz no sabe dónde ni cómo se calcula nada. Solo habla un protocolo.

```
apps/web (interfaz)
   │  NEP: JSON-RPC 2.0 sobre un transporte (Worker, WebSocket, memoria)
   ▼
Motor = Coordinador + Ejecutores
   Coordinador: grafo, subflujos, plan, caché, plantillas, esquemas, despacho
   Ejecutores:  corren tareas ya resueltas (SQL, Python) y guardan resultados
```

Patrones que dan forma al sistema (catálogo completo, con criterios de verificación y antipatrones: `patrones.md`):

| Patrón | Dónde | Por qué |
|---|---|---|
| Protocolo como contrato (estilo LSP / kernels de Jupyter) | Interfaz ↔ motor | Cambiar de motor sin tocar la interfaz |
| Puertos y adaptadores | `Transport`, `Executor` | Agregar un motor = agregar un adaptador |
| Núcleo funcional, cáscara imperativa | `coordinator` | La lógica es pura y se prueba sin I/O |
| Composite | Flujo como nodo | Un subflujo se comporta como un nodo |
| Strategy | Elección de ejecutor por capacidades | El coordinador no conoce ejecutores concretos |
| Observer (eventos) | `node.status`, `node.result`, `run.log` | La interfaz refleja el estado del motor |
| Caché direccionada por contenido | Coordinador | Recalcular solo lo que cambió |
| Datos por referencia | Resultados | Motores remotos funcionan igual que el local |

## 2. Paquetes y responsabilidades

| Paquete | Es dueño de | Nunca hace |
|---|---|---|
| `packages/protocol` | Esquemas TypeBox (de los que salen tipos, validación y JSON Schema) de: mensajes NEP, protocolo de ejecutor, formato de flujo (`.nodo.json`), manifiesto de nodo, códigos de error. Parsers de esos tipos. Exporta JSON Schema | Lógica, I/O, dependencias de runtime (salvo el parser) |
| `packages/rpc` | Par JSON-RPC 2.0 genérico (peticiones, notificaciones, errores, cierre) y transportes (`MemoryTransport`, `WorkerTransport`, `WebSocketTransport`) | Conocer el NEP o cualquier tipo de Nodomics |
| `packages/client` | `EngineClient`: NEP tipado sobre `rpc`, validación de respuestas y eventos, reconexión | Conocer qué motor hay detrás; lógica de flujos |
| `packages/ui` | Design system: `tokens.json` (fuente de verdad), `tokens.css` generado, fuentes, `components.css` y componentes React de presentación | Importar paquetes del motor o del protocolo; lógica de negocio |
| `packages/coordinator` | Expansión de subflujos, orden topológico, claves de caché, invalidación, render de plantillas, `schema.infer`, despacho por capacidades, transferencia Arrow entre ejecutores, emisión de eventos. Implementa el lado servidor del NEP | DOM, APIs del navegador, importar ejecutores concretos |
| `packages/executor-duckdb-wasm` | Ejecutar SQL en DuckDB-WASM, guardar resultados, páginas, perfil, importar/exportar Arrow | Conocer el grafo, renderizar plantillas |
| `packages/executor-pyodide` | Ejecutar nodos Python en Pyodide con DataFrames | Igual que arriba |
| `packages/engine-browser` | Armar coordinador + ejecutores del navegador dentro de un Web Worker | Lógica propia (solo ensambla) |
| `packages/engine-mock` | Motor falso en memoria que cumple el NEP, para desarrollar y probar la interfaz | Usarse en producción |
| `packages/nodes-core` | Nodos oficiales como datos (`node.json`, `main.py`) y sus casos de prueba | Código TypeScript ejecutable por nodo |
| `apps/web` | Interfaz: lienzo, formularios generados por JSON Schema, vistas, estado de edición, compartir | Importar algo que no sea `protocol` o `client` |
| `apps/agent` | Bucle del agente, cliente MCP, propuestas y Diff de Dominio, memoria | Escribir flujos fuera de la herramienta de escritura del MCP; ejecutar código; importar `apps/web` ni paquetes de motor |
| `engines/python-local` | Ejecutor Python local por WebSocket (`duckdb`, `pandas`, `pyarrow`) | Lógica de grafo (en la PoC la hace el coordinador TS) |
| `tests/conformance` | Flujos de referencia que corren contra cada motor y comparan resultados | Probar detalles internos de un motor |

## 3. Reglas de dependencia

```
protocol, rpc  ←  client  ←  apps/web  →  ui
protocol, rpc  ←  coordinator  ←  engine-browser  →  executor-duckdb-wasm, executor-pyodide
protocol, rpc  ←  engine-mock
protocol       ←  apps/agent
protocol       ←  executor-*       (implementan la interfaz Executor definida en protocol)
```

- `protocol` no depende de ningún paquete interno.
- `apps/web` solo depende de `protocol`, `client` y `ui`.
- `rpc` y `ui` no dependen de ningún paquete interno.
- `coordinator` no depende de ningún ejecutor concreto: los recibe inyectados.
- Se importa un paquete solo por su `index.ts` público, nunca por rutas internas (`@nodomics/coordinator/src/...` está prohibido).
- `dependency-cruiser` hace cumplir estas reglas en `pnpm check`.

## 4. Modelo de estado

| Estado | Dueño | Fuente de verdad |
|---|---|---|
| Flujo en edición (nodos, conexiones, posiciones, parámetros) | Interfaz | Store de la interfaz; se envía al motor con `flow.set` y un `rev` creciente |
| Estado de ejecución (stale, running, done, error), resultados, caché | Motor | El motor; la interfaz mantiene un espejo alimentado solo por eventos |
| Archivos de datos | Motor | Registrados con `source.add`; la interfaz solo guarda el `sourceId` |
| Catálogo de nodos | Motor | `nodes.list`; la interfaz no trae nodos programados |

La interfaz descarta eventos con `rev` menor al actual.

## 5. Flujo de una ejecución dentro del coordinador

Cada paso es una función pura salvo el último:

1. `parseFlow(json) → Flow`
2. `expandSubflows(flow, registry) → FlatGraph`
3. `computeCacheKeys(graph) → Map<nodeId, key>` (hash de versión del nodo + parámetros + claves de entradas)
4. `diffAgainstCache(keys, cache) → { stale, cached }`
5. `planExecution(graph, stale, capabilities) → Task[]` (orden topológico + ejecutor elegido + SQL renderizado)
6. `runPlan(tasks, executors, emit)` ← único paso con efectos

## 6. Errores

- Errores del protocolo (método o parámetros inválidos) → error JSON-RPC.
- Errores de nodo → `node.status` con `state: "error"` y `{ code, message, hint?, detail? }`. Códigos en `packages/protocol` (`PARAM_REQUIRED`, `COLUMN_NOT_FOUND`, `PYTHON_EXCEPTION`, …).
- `message` y `hint` están escritos para el usuario final; `detail` es técnico.

## 7. Seguridad mínima

- Las plantillas SQL usan solo los ayudantes `ident` y `lit`; los parámetros se validan contra JSON Schema antes de renderizar.
- El ejecutor local escucha solo en `127.0.0.1`, verifica el origen y exige un token en `engine.hello`.
- Los archivos y credenciales del usuario nunca viajan dentro de un flujo compartido.
