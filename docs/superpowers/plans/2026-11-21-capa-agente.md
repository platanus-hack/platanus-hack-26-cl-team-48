# Capa de agente: plan de implementación (v3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el servicio del agente (`apps/agent`) que, en nombre de un usuario, construye herramientas **solo como nodos y flujos** a través del MCP de Sebastián, las prueba con la herramienta de ejecución, las propone con Diff de Dominio y recuerda la construcción en una memoria temporal.

**Architecture:** `apps/agent` es un servicio Node/TS en Render (ADR 0019). Es **cliente** del MCP de Sebastián, que expone una herramienta de escritura (borradores, cambios, publicar) y una de ejecución de solo lectura que corre en un sandbox. El bucle del agente usa Claude a través de un puerto `LlmPort`. Las propuestas, el Diff de Dominio y la memoria (ADR 0020) viven en `apps/agent`, con tablas en el mismo Supabase del Hub (ADR 0018). Toda llamada va con la identidad del usuario (ADR 0021).

**Tech Stack:** TypeScript (Node ≥ 24, pnpm), TypeBox, Vitest, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk` (cliente), Supabase Postgres + pgvector, embeddings de Voyage AI.

**Spec:** `docs/05-capa-agente.md`

> **Historial:** v2 incorporó la revisión adversarial de Codex. v3 reparte responsabilidades según el líder: el MCP, la escritura, la ejecución, el sandbox y la persistencia de flujos son de Sebastián. Por eso salen de este plan el runner, la edición de flujos, el adaptador de sandbox y el servidor MCP.

## Global Constraints

- Cumplir `CLAUDE.md` de `main`: los invariantes §1, TDD estricto (rojo → verde → refactor, viendo fallar el test), `pnpm check` en verde, y sincronizar y revisar choques antes de cada commit con push inmediato (§2.1). Los choques con ramas de otros los resuelve Sebastián: se le informan y no se tocan sus archivos.
- Commits con Conventional Commits y scope `agent`. **Nunca mencionar a ningún asistente de IA** en commits, PRs, ramas o etiquetas.
- Ramas por tarea: `gabriel/agent-<tema>`. Codex no commitea: Gabriel revisa el diff, corre `pnpm check` y commitea.
- `apps/agent` solo importa `@nodomics/protocol` (y `@nodomics/hub` si se usa su puerto). Nunca `apps/web` ni paquetes de motor.
- El agente **entrega solo nodos y flujos** y **nunca escribe flujos fuera de la herramienta de escritura** del MCP.
- Claves solo en el servidor: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `MCP_URL`. Se validan al arrancar y nunca aparecen en mensajes de error ni en logs.
- Todo lo que entra desde un borde (respuesta del LLM, respuesta del MCP, texto de usuarios o de la comunidad) se **parsea** con TypeBox. Los errores esperados son valores `Result`.

## Review Focus

1. **El LLM pide una herramienta inexistente o con args inválidos:** el bucle devuelve el error al LLM como dato, sin cortar ni ejecutar nada. Lo cubre la T2 (`rejects tool call whose args fail schema`).
2. **El MCP responde algo que no cumple su esquema, o se cae:** se reporta al usuario con un mensaje claro y el bucle termina sin dejar el borrador a medias como si estuviera listo. Lo cubre la T3 (`maps malformed mcp response to McpError`).
3. **El original cambió mientras el agente trabajaba:** la propuesta queda `stale` y no se aplica. Lo cubre la T4 (`marks proposal stale when base revision changed`).
4. **Aceptar solo algunos cambios deja un flujo inválido:** los cambios que dependen de uno rechazado también se rechazan. Lo cubre la T4 (`partial accept drops dependent changes`).
5. **Instrucciones escondidas** en el texto de un flujo, una publicación del Hub o un mensaje: se tratan como dato, y el bucle tiene una lista cerrada de herramientas según quién lo dispara. Lo cubre la T2 (`tool allowlist is enforced outside the prompt`).

---

## Reparto

| Responsable | Tareas |
|---|---|
| **Codex Sol** (implementa) | T1 (esqueleto), T3 (cliente MCP y MCP falso), T4 (diff y aceptación), T5 (ficha de componente) |
| **Sonnet** (implementa) | T2 (bucle del agente), T6 (memoria y episodios), T7 (story coding) |
| **Codex Terra** | Revisión adversarial en cada hito |
| **Claude (Opus)** | Revisión de cada tarea, `pnpm check`, commits, prompts del agente |

## Estructura de archivos

```
apps/agent/src/
  config.ts             # entorno validado (T1)
  server.ts             # HTTP: /health, /agent/requests (T1, T8)
  contracts/            # TypeBox: Proposal, DomainCard, ComponentCard (T1)
  llm/                  # LlmPort + adaptador Anthropic (T2)
  loop/                 # bucle con límites y lista cerrada de herramientas (T2)
  mcp/                  # McpPort, cliente real y MCP falso (T3)
  proposals/            # Diff de Dominio, aceptación parcial (T4)
  memory/               # ficha, episodios, grafo temporal, búsqueda, story (T5–T7)
apps/agent/test/
supabase/migrations/    # tablas del agente (T4, T6)
```

---

## Etapa A: base

### Task 1: esqueleto, configuración y contratos — **Codex Sol**

**Files:** `apps/agent/{package.json,tsconfig.json,vitest.config.ts}`, `src/config.ts`, `src/server.ts`, `src/contracts/*.ts`, y el registro del paquete en workspace, tsconfig y dependency-cruiser. Tests en `test/`.

**Interfaces (Produces):**
- `loadConfig(env): Result<AgentConfig, ConfigError>` y `createServer(deps)`.
- `Proposal = { id, flowId, draftId, baseRevision: string, version: number, status: "pending"|"partially_accepted"|"accepted"|"rejected"|"stale", changes: ProposalChange[] }`
- `ProposalChange = { id, kind: "add_node"|"remove_node"|"connect"|"disconnect"|"set_param"|"add_custom_node"|"update_custom_node", target, before?, after?, reason: string, dependsOn: string[] }`
- `DomainCard = { changeId, title, before?, after?, unit?, reason }` y `ComponentCard` (spec §5.1).

- [ ] Tests `loadConfig fails listing every missing variable`, `loadConfig error never contains secret values`, `GET /health returns 200 {status:"ok"}`, `unknown route returns 404` y `parseProposal rejects change without reason` → rojo → verde. `pnpm check` en verde.

**Criterio de éxito:** el paquete existe, pasa `pnpm check` y `/health` responde. Sin claves, falla al arrancar listando las variables que faltan, sin mostrar valores.

### Task 2: puerto del LLM y bucle del agente — **Sonnet**

**Files:** `src/llm/{llm-port,anthropic-llm}.ts`, `src/loop/{agent-loop,tool-allowlist}.ts`. Test: `test/agent-loop.test.ts`, con un `FakeLlm` guionizado.

**Interfaces:** `LlmPort.complete(req): Promise<Result<LlmTurn, LlmError>>` y `runAgentLoop({ llm, mcp, goal, allowlist, limits }): Promise<Result<LoopOutcome, LoopError>>`, con `limits = { maxSteps: 25, timeoutMs: 300_000 }`. Consume `McpPort` (T3). Mientras no exista, se usa un stub con la misma firma.

- [ ] Tests `stops after maxSteps with LoopError "max_steps"`, `feeds tool error back to llm as is_error tool_result`, `rejects tool call whose args fail schema` y `tool allowlist is enforced outside the prompt` → rojo → verde.

**Criterio de éxito:** el bucle siempre termina, devuelve los errores de las herramientas al LLM como datos y nunca llama una herramienta fuera de su lista. Con Claude real y el MCP falso, "hazme una calculadora de cosecha" termina en un borrador válido en menos de 2 minutos.

### Task 3: cliente MCP y MCP falso — **Codex Sol**

**Files:** `src/mcp/{mcp-port,mcp-client,fake-mcp}.ts`. Test: `test/mcp.test.ts`.

**Interfaces:** `McpPort { listTools(): Promise<Result<ToolDescriptor[], McpError>>; call(name, args, identity: UserIdentity): Promise<Result<unknown, McpError>> }`. El cliente real usa `@modelcontextprotocol/sdk` contra `MCP_URL` con el JWT del usuario. El falso imita las herramientas de spec §4, con borradores en memoria.

- [ ] Tests `fake mcp covers every capability in spec section 4`, `maps malformed mcp response to McpError`, `forwards user identity on every call` y `fake draft is isolated from original` → rojo → verde.

**Criterio de éxito:** el bucle (T2) funciona igual contra el MCP falso que contra el real. Cuando Sebastián publique su contrato, se adaptan solo los descriptores y el mapeo, sin tocar T2.

### 🏁 Hito 1: "Hazme una calculadora de cosecha" (con el MCP falso)
- [ ] Un pedido entra por `POST /agent/requests` y el agente crea un borrador, agrega y conecta nodos, crea un nodo de código si hace falta, lo "ejecuta" y termina con un borrador válido.
- [ ] Codex Terra hace la revisión adversarial antes de seguir.

---

## Etapa B: propuestas

### Task 4: Diff de Dominio y aceptación parcial — **Codex Sol** (puro) + **Claude** (razones)

**Files:** `src/proposals/{domain-cards,accept,proposal-store}.ts` y `supabase/migrations/<timestamp>_agent_proposals.sql` (con RLS: solo el dueño del flujo lee y decide). Test: `test/proposals.test.ts`.

**Interfaces:** `toDomainCards(diff, manifests): DomainCard[]` (con `title` y unidad del JSON Schema, nunca ids o rutas) y `selectChanges(proposal, acceptedIds): Result<ProposalChange[], AcceptError>` (agrega dependencias y rechaza lo que dependa de algo rechazado). La aplicación final la hace la herramienta de escritura de Sebastián, enviando `baseRevision` (R4).

- [ ] Tests `domain card shows param title and unit, not path`, `partial accept drops dependent changes`, `marks proposal stale when base revision changed` y `diff of identical flows yields no cards` → rojo → verde.
- [ ] Claude: la `reason` de cada cambio la genera el LLM, en 1 frase validada.

**Criterio de éxito:** adaptar arándano a fresa produce tarjetas que un agrónomo entiende, y cualquier selección de cambios es coherente.

### 🏁 Hito 2: propuesta de punta a punta (con el MCP real si ya existe)
- [ ] Pedido → borrador → prueba → propuesta con Diff de Dominio → el usuario acepta una parte → se aplica con la herramienta de escritura.

---

## Etapa C: memoria y story coding

### Task 5: ficha de componente — **Codex Sol**

**Files:** `src/memory/component-card.ts`. **Interfaces:** `buildComponentCard(flow, manifests, history): ComponentCard` (pura).
- [ ] Tests `card lists inputs, outputs and params with units`, `card includes lineage from hub version` → rojo → verde.

### Task 6: episodios, grafo temporal y búsqueda — **Sonnet**

**Files:** `src/memory/{episodes,temporal-graph,embeddings,search}.ts` y `supabase/migrations/<timestamp>_agent_memory.sql` (`entities`, `edges(valid_from, valid_to)`, `episodes`, `component_cards` con `vector`). Actores = ids de `profiles` del Hub.

**Interfaces:** `recordEpisode(e)`, `invalidateEdge(id, at)` y `searchComponents(query, k)`.
- [ ] Tests `every mcp call records one episode`, `changing a param closes the old edge and opens a new one` → rojo → verde.

**Criterio de éxito:** "calculadora de temperatura de fruta" encuentra la herramienta de fresa entre las 3 primeras.

### Task 7: story coding — **Sonnet**

**Files:** `src/memory/story.ts`. **Interfaces:** `explainWhy(componentId, question): Result<Story>`.
- [ ] Test `story cites existing episodes in chronological order` (con un LLM falso, toda afirmación referencia un episodio real).

**Criterio de éxito:** "¿por qué la ventana es 2 h?" responde quién, cuándo y en qué conversación, sin inventar eventos.

---

## Etapa D: después

- **T8:** `@agente` en la sala y mediador, cuando exista la sala.
- **T9:** importar desde GitHub.
- **T10:** endurecimiento, con límite de pedidos por usuario y revisión adversarial con Codex Terra.

## Orden

```
T1 (Codex Sol) ─┬─ T2 (Sonnet) ─┐
                └─ T3 (Codex Sol)┴─ Hito 1 ── T4 ── Hito 2 ── T5 ─┬─ T6 (Sonnet) ── T7
                                                                   └─ (paralelo)
```

## Dependencias externas

| De quién | Qué | Bloquea |
|---|---|---|
| Sebastián | Contrato del MCP (herramientas de escritura y ejecución, con R1 a R6) | Paso de MCP falso a real (Hito 2) |
| Cantú | Campos de la ficha de componente | T5 |
| Equipo | Claves de Supabase y la URL del MCP | Hito 2, T6 |
