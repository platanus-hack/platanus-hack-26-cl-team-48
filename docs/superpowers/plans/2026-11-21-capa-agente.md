# Capa de agente: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el servicio del agente que crea y modifica herramientas **solo como nodos y flujos**, trabajando sobre un fork en un sandbox, proponiendo cambios con Diff de Dominio, participando en la sala con `@agente` y recordando la construcción en una memoria temporal.

**Architecture:** Un servicio Node/TS nuevo (`apps/agent`) en Render contiene el bucle del agente (Claude), el servidor MCP y las claves. **El MCP vive en el servicio, no en el sandbox**, porque Render Sandboxes no expone puertos ni red privada en beta. Cada llamada a una herramienta queda atada a un usuario, una sala y un fork, y se autoriza fuera del prompt. La edición de flujos son funciones puras sobre los tipos de `@nodomics/protocol`, con una semántica compartida con la interfaz. La ejecución ocurre en Render Sandboxes **vía `exec`** de un **runner de comando** (coordinador en Node con ejecutores de Node) que devuelve JSON acotado por stdout. El flujo base, el flujo propuesto y los manifiestos se guardan en Supabase **antes** de terminar el sandbox, porque terminarlo borra su disco. Los datos, la sala, la memoria y los embeddings viven en Supabase, con RLS.

> **v2 (tras la revisión adversarial con Codex):** se agregaron el runner de comando (T0b), los ADRs de persistencia y autorización, revisiones con hash y aceptación transaccional, nodos de código en el diff, validadores separados, límites del sandbox desde el inicio y el MCP falso en la base.

**Tech Stack:** TypeScript (Node 24, pnpm), TypeBox, Vitest, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `@renderinc/sdk` (≥ 1.9.0), `@supabase/supabase-js`, Supabase Postgres + pgvector + Realtime, embeddings de Voyage AI.

**Spec:** `docs/05-capa-agente.md`

## Global Constraints

- Cumplir `CLAUDE.md`: los invariantes §1, TDD estricto (rojo → verde → refactor, viendo fallar el test), `pnpm check` en verde antes de cada entrega, y sincronizar y revisar choques antes de cada commit con push inmediato (§2.1).
- Commits con Conventional Commits y scope `agent` (`feat(agent): ...`). **Nunca mencionar a Claude, Codex ni a ningún asistente de IA** en commits, PRs, ramas o etiquetas.
- Ramas por tarea: `<quien>/agent-<tema>` (ej. `gabriel/agent-flow-edit`).
- **Codex no commitea.** Gabriel revisa el diff, corre `pnpm check` y commitea (`docs/engineering/workflow.md`).
- `packages/protocol` no se toca sin ADR y aprobación del líder. Si falta algo en el protocolo, se reporta.
- El agente **entrega solo nodos y flujos**. Puede generar código Python o SQL, pero solo dentro de un nodo de código (ADR 0014).
- Ningún secreto en el cliente ni en el repo. Las claves `ANTHROPIC_API_KEY`, `RENDER_API_KEY`, `RENDER_WORKSPACE_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `VOYAGE_API_KEY` se leen del entorno y se validan al arrancar.
- Todo lo que entra desde un borde (respuesta del LLM, stdout del sandbox, mensaje de la sala, repo importado) se **parsea** con TypeBox antes de usarse. Los errores esperados son valores `Result`.
- Las dependencias de runtime nuevas (las de arriba) se justifican en un ADR (`CLAUDE.md` §5).
- **Autorización fuera del prompt:** cada herramienta verifica usuario, sala, flujo, propuesta y fork antes de actuar. El servicio usa el JWT del usuario con RLS. La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en operaciones de sistema acotadas (registrar episodios) y nunca a partir de datos que vengan del LLM.
- **Ninguna clave del servicio entra al sandbox.** El sandbox recibe solo el flujo y los datos, sin variables de entorno del servicio.
- **Límites de costo desde el día uno:** máximo 1 sandbox vivo por usuario, plan `1c-2g`, runtime de 30 min, idle de 5 min, `terminate` en `finally` y una limpieza periódica de sandboxes huérfanos.
- **Fuentes de datos en el agente (v1):** solo fuentes por URL o API (ADR 0017) o datos en línea. Los archivos locales del navegador (`sourceId` de sesión, ADR 0015) no viajan al sandbox.

## Review Focus

1. **El LLM propone un nodo, puerto o parámetro inexistente**, o un valor fuera de rango: se rechaza con un error legible y el fork no cambia. Lo cubre la Tarea 3 (`applyPatch rejects unknown node type atomically`).
2. **El sandbox falla al crearse** (HTTP 429, timeout) **o queda vivo tras un error:** se reporta al usuario y siempre se llama a `terminate`. Lo cubre la Tarea 4 (`terminates sandbox when run throws`).
3. **El flujo original cambia mientras el agente trabaja en el fork:** la propuesta se marca `stale` y no se aplica a ciegas. Lo cubre la Tarea 6 (`marks proposal stale when base revision changed`).
4. **Aceptar solo algunos cambios deja un flujo inválido** (conexión colgando de un nodo rechazado): se rechazan los cambios dependientes y se valida el resultado. Lo cubre la Tarea 6 (`partial accept drops dependent connections`).
5. **Inyección de instrucciones** desde mensajes de la sala o desde un repo importado: ese contenido entra al prompt como dato delimitado, nunca como instrucción del sistema. Lo cubren las tareas 7 y 10 (`room text is passed as quoted data`).

---

## Reparto

| Responsable | Qué toma | Por qué |
|---|---|---|
| **Claude** (con Gabriel) | ADRs, bucle del agente con LLM, adaptador del sandbox, integración con Supabase, mediador, prompts, memoria e importación | Son piezas de integración y criterio, con efectos externos |
| **Codex** | Módulos puros y bien especificados: config, edición de flujos, servidor MCP, diff estructural, parser de menciones, ficha de componente | Tienen entradas y salidas exactas y se prueban sin I/O |
| **Gabriel** | Revisión, `pnpm check`, commits, coordinación con Sebastián y Cantú | Codex no commitea, y las decisiones de ADR son humanas |

## Estructura de archivos

```
apps/agent/src/
  config.ts            # variables de entorno validadas (T1)
  server.ts            # HTTP: /health, /mcp (T1, T5)
  contracts/           # TypeBox: Proposal, DomainCard, Conflict, ComponentCard (T0)
  llm/                 # LlmPort + adaptador Anthropic (T2)
  loop/agent-loop.ts   # bucle de herramientas con límites (T2)
  flow-edit/           # edición pura de flujos (T3)
  sandbox/             # SandboxPort, RenderSandbox, FakeSandbox, runner-protocol (T4)
  mcp/                 # registro de herramientas y servidor MCP (T5)
  proposals/           # diff estructural, Diff de Dominio, aceptación parcial (T6)
  room/                # menciones, @agente, mediador (T7)
  memory/              # ficha, episodios, grafo temporal, búsqueda, story (T8, T9)
  importer/            # importar desde GitHub (T10)
apps/agent/test/       # un test por módulo
supabase/migrations/   # propuestas, memoria, embeddings (T6, T8)
docs/decisions/0018..0020
```

---

## Etapa A: base

### Task 0: ADRs y contratos — **Claude**

**Files:** Create `docs/decisions/0018-servicio-de-agente.md`, `0019-sandbox-por-exec.md`, `0020-memoria-temporal-en-supabase.md` y `apps/agent/src/contracts/*.ts`. Test: `apps/agent/test/contracts.test.ts`.

**Interfaces (Produces):**
- `Proposal = { id, flowId, baseHash: string, proposedFlowRef: string, version: number, status: "pending"|"partially_accepted"|"accepted"|"rejected"|"stale", changes: ProposalChange[], approvals: { userId, version }[] }`. El `sandboxId` **no** forma parte de la propuesta: es efímero.
- `ProposalChange = { id, kind: "add_node"|"remove_node"|"connect"|"disconnect"|"set_param"|"add_custom_node"|"update_custom_node", target, before?, after?, reason: string, dependsOn: string[] }`. Los `*_custom_node` llevan el `NodeManifest` completo (`impl.python` o `impl.sql`) que viaja en `flow.customNodes`.
- `flowHash(flow): string`, un hash estable del JSON canónico del flujo.
- `DomainCard`, `Conflict`, `ComponentCard` y `parseProposal(json): Result<Proposal, Issue[]>`.

- [ ] **Step 1:** escribir los ADRs y actualizar `docs/engineering/arquitectura.md` (agregar `apps/agent` con Gabriel como dueño y sus reglas de dependencia):
  - **0018:** servicio del agente en Render.
  - **0019:** sandbox por `exec` y **MCP en el servicio**: cómo cada llamada se ata a un fork, quién puede invocar cada herramienta, límites y aislamiento de secretos.
  - **0020:** memoria en tablas de Supabase. Graphiti queda como evolución futura: es solo Python, exige Neo4j o FalkorDB y no trae embedder de Anthropic.
  - **0021 (con Sebastián):** persistencia y sincronización de flujos. Fuente de verdad: Supabase para los flujos compartidos o de sala, e IndexedDB (ADR 0015) para los personales. Puente para publicar e importar desde la interfaz. Revisión con `flowHash`.
  - **0022:** autorización. JWT de Supabase por usuario, políticas RLS para flujos, propuestas y salas, y uso acotado de la service role.
- [ ] **Step 2:** test `parseProposal rejects change without reason` → ver que falla.
- [ ] **Step 3:** implementar los esquemas → test en verde.
- [ ] **Step 4:** commits `docs(agent): add agent service, sandbox and memory adrs` y `feat(agent): add proposal and card contracts`.

**Criterio de éxito:** el líder aprueba los ADRs 0018 a 0022. Sebastián confirma §4 del spec y el ADR 0021, y Cantú confirma la ficha de componente. Se actualiza el spec §2: el MCP pasa al servicio.

### Task 0b: runner de comando — **Sebastián** (motor) + **Claude** (contrato)

Es el **camino crítico del Hito 1**. Hoy el coordinador solo se arma con ejecutores del navegador (Worker, DuckDB-WASM y Pyodide; `packages/engine-browser`). Hace falta una composición para Node:

**Files (en el paquete que defina Sebastián, por ejemplo `packages/engine-node`):** el coordinador con ejecutores de Node (DuckDB nativo y el Python local de `engines/python-local`) y una CLI `nodomics-run --flow flow.json --out report.json [--sample 20]`.

**Contrato `RunReport`:** `{ nodes: [{ id, state, error? }], schemas: { [nodeId]: columns[] }, samples: { [nodeId]: rows[] } }`, con como máximo 20 filas y 64 KB por muestra. Si el agente necesita más páginas, las pide con otro `exec` del tipo `nodomics-run page --ref ...`.

- [ ] Test de conformidad: el mismo flujo de referencia (`tests/conformance`) da los mismos resultados en el motor del navegador y en el runner.

**Criterio de éxito:** `nodomics-run` ejecuta un flujo real con una fuente por URL dentro de un Render Sandbox y escribe un `RunReport` válido.

### Task 1: esqueleto del servicio y configuración — **Codex**

**Files:** Create `apps/agent/package.json`, `src/config.ts`, `src/server.ts`. Modify `render.yaml` (servicio web `nodomics-agent`) y dependency-cruiser (`apps/agent` solo importa `@nodomics/protocol`). Test: `test/config.test.ts`, `test/server.test.ts`.

**Interfaces:** `loadConfig(env): Result<AgentConfig, ConfigError>` y `createServer(deps: ServerDeps)`.

- [ ] Tests `loadConfig fails listing every missing variable` y `GET /health returns 200 {status:"ok"}` → rojo → implementar → verde. `pnpm check` en verde.

**Criterio de éxito:** el servicio despliega en Render y `/health` responde. Sin claves, falla al arrancar con la lista de variables faltantes y sin mostrar ningún valor.

### Task 2: puerto del LLM y bucle del agente — **Claude**

**Files:** Create `src/llm/{llm-port,anthropic-llm}.ts` y `src/loop/agent-loop.ts`. Test: `test/agent-loop.test.ts`, con un `FakeLlm` guionizado.

**Interfaces:** `LlmPort.complete(req): Promise<Result<LlmTurn, LlmError>>` y `runAgentLoop({ llm, tools, goal, limits }): Promise<Result<LoopOutcome, LoopError>>`, con `limits = { maxSteps: 25, timeoutMs: 300_000 }`.

- [ ] Tests `stops after maxSteps with LoopError "max_steps"`, `feeds tool error back to llm as is_error tool_result` y `rejects tool call whose args fail schema` → rojo → verde.

**Criterio de éxito:** el bucle termina siempre, por límite de pasos o de tiempo, y los errores de las herramientas vuelven al LLM como datos. Con Claude real, un pedido simple responde en menos de 30 s.

### Task 3: edición pura de flujos — **Codex**

**Files:** Create `src/flow-edit/{apply-patch,validate}.ts` y una función por operación. Test: `test/flow-edit.test.ts`.

**Interfaces:**
- Consumes: `Flow`, `NodeManifest`, `nodePorts` y `parse` de `@nodomics/protocol`.
- Produces: `applyPatch(flow, ops: FlowOp[], catalog): Result<Flow, PatchError>`. `FlowOp` es la unión `add_node | remove_node | connect | disconnect | set_param | add_custom_node | update_custom_node`.
- **Validadores separados** (no basta `parse(Flow)`, que solo valida la forma): `validateParams(flow, catalog)` contra el JSON Schema de cada manifiesto, `validateConnections(flow, catalog)` con `nodePorts`, `any`, entradas `multi` y reemplazo de conexiones, `validateGraph(flow)` para detectar ciclos y nodos huérfanos, y `validateCustomNode(manifest)` según el contrato del ADR 0014.

- [ ] **Step 0 (coordinación):** la interfaz ya tiene esta semántica en `apps/web/src/flow/flow-edits.ts` y `apps/web/src/canvas/connect-ports.ts`. Como `apps/agent` no puede importar desde `apps`, con Sebastián (dueño de la interfaz) y la aprobación del líder **se extrae a un paquete compartido** (por ejemplo `packages/flow-ops`) que usen los dos. Si no se aprueba, se agregan pruebas de conformidad que corren los mismos casos contra ambas implementaciones.
- [ ] Tests `applyPatch rejects unknown node type atomically`, `connect follows web rules for any and multi inputs`, `set_param rejects value outside JSON Schema`, `validateGraph rejects cycles`, `add_custom_node keeps flow self-contained in customNodes` y `does not mutate input flow` → rojo → verde.

**Criterio de éxito:** una sola semántica de edición para la interfaz y el agente. Las operaciones son inmutables y atómicas, y un flujo con nodos de código creados por el agente se abre en la interfaz sin depender de nada externo.

---

## Etapa B: el agente construye en el sandbox

### Task 4: adaptador del sandbox — **Claude**

**Files:** Create `src/sandbox/{sandbox-port,render-sandbox,fake-sandbox,runner-protocol,fork}.ts`. Test: `test/sandbox.test.ts`.

**Interfaces:**
- `SandboxPort { create; writeFile(id, path, text); exec(id, cmd): Result<ExecOutput>; terminate(id) }`
- `forkFlow(port, flow): Result<Fork>` y `runFork(port, fork): Result<RunReport>`.
- `RunReport` sale del runner de T0b y se parsea con TypeBox, rechazando cualquier salida de más de 256 KB.
- `persistForkResult(fork): Result<{ baseHash, proposedFlowRef }>` guarda en Supabase el flujo base, el propuesto y los manifiestos **antes** de terminar el sandbox.

- [ ] Tests con `FakeSandbox`: `terminates sandbox when run throws`, `maps 429 to SandboxError "capacity"`, `rejects runner stdout that is not a valid RunReport`, `rejects oversized runner output`, `never passes service env vars to sandbox`, `refuses second live sandbox for same user` y `persists proposed flow before terminate` → rojo → verde.
- [ ] Prueba manual contra Render (plan `1c-2g`, runtime 30 min, idle 5 min): crear, escribir `flow.json`, ejecutar el runner y terminar.

**Criterio de éxito:** un flujo real corre en un sandbox de Render y devuelve su `RunReport` en menos de 60 s. Al listar los sandboxes después de las pruebas, no queda ninguno vivo. Hasta que exista el runner, se usa `FakeSandbox`.

### Task 5: servidor MCP — **Codex**

**Files:** Create `src/mcp/{tool-registry,mcp-server}.ts` y `src/mcp/tools/*.ts`. Test: `test/mcp.test.ts`.

**Interfaces:** las herramientas de §4 del spec, cada una con esquema TypeBox de entrada y salida, sobre T3 y T4. Transporte streamable HTTP en `/mcp`. Cada sesión MCP se crea con un **contexto autorizado** `{ userId, roomId?, flowId, forkId }`, que sale del JWT de Supabase y no de los argumentos. Cada herramienta declara qué recurso toca y se verifica contra ese contexto.

- [ ] Tests `every tool validates input before executing`, `flow tools only touch the bound fork, never the original`, `rejects request without valid user jwt`, `user A cannot touch fork or proposal of user B` y `tool args cannot override bound context ids` → rojo → verde.

**Criterio de éxito:** T2 y un cliente MCP externo listan y usan las herramientas. Cada herramienta tiene un test de éxito y uno de error.

### 🏁 Hito 1: "Hazme una calculadora de cosecha"
- [ ] El agente hace el fork, agrega y conecta nodos, crea un nodo de código si hace falta, lo ejecuta en el sandbox y termina con un flujo válido que corre.
- [ ] El flujo original no cambió y el sandbox quedó terminado.

---

## Etapa C: propuestas y colaboración

### Task 6: diff, Diff de Dominio y aceptación parcial — **Codex** (diff y aceptación) + **Claude** (razones)

**Files:** Create `src/proposals/{structural-diff,domain-cards,accept}.ts` y `supabase/migrations/0001_proposals.sql`. Test: `test/proposals.test.ts`.

**Interfaces:** `structuralDiff(base, fork): ProposalChange[]` (incluye los cambios de `customNodes`), `toDomainCards(changes, catalog): DomainCard[]` (con `title` y unidad del JSON Schema, nunca ids) y `acceptChanges(base, proposal, acceptedIds): Result<Flow, AcceptError>`. La escritura final es **compare-and-swap en una transacción**: solo se aplica si el `flowHash` guardado es igual al `baseHash` de la propuesta. Si no, la propuesta queda `stale`.

- [ ] Tests `partial accept drops dependent connections`, `marks proposal stale when base hash changed`, `two concurrent accepts: exactly one wins`, `accept works after sandbox was terminated`, `domain card shows param title and unit, not path` y `diff of identical flows is empty` → rojo → verde.
- [ ] Claude: la `reason` de cada cambio la genera el LLM, en 1 frase validada.

**Criterio de éxito:** la adaptación de arándano a fresa da tarjetas que un agrónomo entiende. Cualquier combinación de cambios aceptados deja un flujo válido.

### Task 7: `@agente` en la sala y mediador — **Codex** (parser) + **Claude** (orquestación)

**Files:** Create `src/room/{mention-parser,room-listener,mediator}.ts`. Test: `test/room.test.ts`.

**Interfaces:** `parseMention(text): { isForAgent, request }`, `onRoomMessage(msg, deps)` y `mediate(conflict, deps): Result<{ explanations: Record<UserId,string>, proposal: Proposal }>`. Consume el canal de Realtime de la sala (de Sebastián).

- **Permisos fuera del prompt:** un pedido que nace de un mensaje de sala corre con una **lista cerrada de herramientas**. Puede leer, trabajar en el fork y proponer, pero nunca aceptar ni aplicar. Citar el texto como dato ayuda, pero la protección real es esta lista.
- **Consentimiento verificable:** cada aprobación guarda `{ userId, version }`, el usuario sale del JWT y no del mensaje, y la propuesta se aplica solo si los dos participantes requeridos aprobaron **la misma `version`**.

- [ ] Tests `ignores messages without @agente`, `room-triggered loop cannot call accept or apply tools`, `mediator proposal only changes params exposed in the room`, `requires both users to approve the same version`, `approval with spoofed userId in message is ignored` y `edited message after approval invalidates nothing already approved` → rojo → verde.
- **Recorte explícito:** si a mitad del hackathon no está la integración con la sala de Sebastián, el mediador se demuestra desde un endpoint, con dos pantallas que leen la propuesta desde Supabase.

**Criterio de éxito:** en dos laptops, `@agente` responde en menos de 10 s. Con 12 t al mediodía, el mediador explica el conflicto a Valeria y a Diego, cada uno en su jerga, y propone cosechar a las 6:00. El cambio se aplica solo cuando aceptan los dos.

### 🏁 Hito 2: demo de la mesa
- [ ] El guion de `PROYECTO.md` §8 corre completo con el agente real, con respuesta de respaldo si el LLM falla.

---

## Etapa D: memoria, búsqueda y story coding

### Task 8: ficha de componente, episodios y embeddings — **Codex** (ficha) + **Claude** (almacenamiento)

**Files:** Create `src/memory/{component-card,episodes,temporal-graph,embeddings,search}.ts` y `supabase/migrations/0002_memory.sql`, con las tablas `entities`, `edges(src, dst, relation, valid_from, valid_to)`, `episodes(at, actor, kind, payload jsonb)` y `component_cards(card jsonb, embedding vector)`.

**Interfaces:** `buildComponentCard(flow, catalog, history): ComponentCard` (pura), `recordEpisode(e)`, `invalidateEdge(id, at)` y `searchComponents(query, k)`.

- [ ] Tests `card lists inputs, outputs and params with units`, `changing a param closes the old edge with valid_to and opens a new one` y `every mcp tool call records one episode` → rojo → verde.

**Criterio de éxito:** la búsqueda "calculadora de temperatura de fruta" pone la herramienta de fresa entre las 3 primeras. El buscador de Cantú usa la misma tabla.

### Task 9: story coding — **Claude**

**Files:** Create `src/memory/story.ts`. **Interfaces:** `explainWhy(componentId, question): Result<Story>`.

- [ ] Test `story cites existing episodes in chronological order` (con un LLM falso, cada afirmación referencia un `episode.id` real).

**Criterio de éxito:** "¿por qué la ventana es 2 h?" responde quién, cuándo y en qué conversación se decidió, sin inventar eventos.

---

## Etapa E: extras y endurecimiento

### Task 10: importar desde GitHub — **Claude** + **Codex**

Clonar el repo en el sandbox con `exec` (primero verificar que hay `git`; si no, descargar el tarball). Después detectar funciones, envolverlas con `node.create_code`, probarlas con `node.test` y generar la propuesta.

**Límites (deben estar antes de ejecutar código ajeno):** repo de máximo 20 MB, solo URLs `https://github.com/`, máximo 10 min, sin claves en el sandbox, y todo lo que venga del repo (stdout, archivos, README) es dato no confiable. El bucle del importador usa una lista cerrada de herramientas.
- [ ] Tests `repo content is treated as data, never as instructions` y `skips functions without testable inputs`.

**Criterio de éxito:** un repo pequeño se convierte en al menos 2 nodos que pasan sus pruebas. **Entra a la demo solo si los Hitos 1 y 2 están listos.**

### Task 11: endurecimiento — **Codex** (revisión adversarial) + **Claude** (correcciones)

- [ ] Máximo 1 sandbox vivo por usuario y un límite de pedidos por minuto.
- [ ] Revisión adversarial de claves, inyección de instrucciones, salida del sandbox y token del MCP.
- [ ] Demo ensayada 10 veces seguidas sin errores.

---

## Orden y paralelismo

```
T0 (ADRs) ─┬─ T1 (Codex) + MCP falso ─┐
           ├─ T3 (Codex, con Sebastián)┼─ T5 (Codex) ─┐
           ├─ T2 (Claude) ─────────────┘              ├─ Hito 1 ── T6 ── T7 ── Hito 2 ── T8 ── T9 ── T10 ── T11
           └─ T0b (Sebastián) ── T4 (Claude) ─────────┘
```

- **El MCP falso y los límites de costo van en la base:** T1 incluye un MCP falso que imita §4, así T2 y T5 avanzan sin el runner real.
- **T0b es el camino crítico.** Si se atrasa, el Hito 1 se demuestra con `FakeSandbox` y se avisa en el pitch.
- Cada hito es una **ruta vertical comprobable**: un pedido real entra, la herramienta se construye, se ejecuta y queda como propuesta.
- **Recorte si falta tiempo:** primero T10, después T9, después la búsqueda de T8. Del Hito 1 y el Hito 2 no se recorta nada.

## Dependencias externas

| De quién | Qué | Bloquea |
|---|---|---|
| Sebastián | **Runner de comando (T0b)**, ADR 0021 de persistencia y sincronización, extraer la edición de flujos a un paquete compartido (T3) y el canal de la sala | Hito 1, T3, T6, T7 |
| Líder | Aprobar los ADRs 0018 a 0022, `apps/agent` en la arquitectura y los paquetes nuevos | Todo |
| Cantú | Campos de la ficha de componente y perfil del agente de registro | T8 |
| Equipo | Proyecto de Supabase, claves y aprobación de los ADRs | T0, T6, T8 |
