# Estándares y convenciones de código

Complementa `CLAUDE.md`. Cuando algo no esté cubierto aquí, imita el código que ya existe alrededor.

## 1. Idioma

| Qué | Idioma |
|---|---|
| Código: identificadores, nombres de archivos, mensajes de commit, nombres de tests | Inglés |
| Comentarios en el código | Inglés |
| Textos visibles para el usuario | Español por defecto, siempre a través del sistema de i18n (nunca literales en componentes) |
| Documentación en `docs/` | Español |

## 2. SLAP con ejemplos

Una función o **orquesta** pasos con nombre, o **implementa** un detalle. No ambas cosas.

```ts
// ❌ Mezcla orquestación con detalles de bajo nivel
function runFlow(flow: Flow, cache: Cache) {
  const order: NodeId[] = [];
  const visited = new Set<NodeId>();
  for (const node of flow.nodes) { /* DFS de 15 líneas */ }
  for (const id of order) {
    const key = sha256(JSON.stringify(flow.nodes.find(n => n.id === id)!.params));
    if (cache.has(key)) continue;
    // ...
  }
}

// ✅ Un solo nivel: se lee como la descripción del proceso
function planRun(flow: Flow, cache: Cache): Plan {
  const graph = expandSubflows(flow);
  return planExecution(graph, diffAgainstCache(computeCacheKeys(graph), cache));
}
```

Observa: `graph` se declara porque se usa dos veces; `computeCacheKeys(...)` y `diffAgainstCache(...)` van inline porque se usan una vez y se leen bien.

## 3. Variables inline

```ts
// ❌ Variables de un solo uso que no aportan nada
const columns = schema.columns;
const numeric = columns.filter(isNumeric);
const names = numeric.map(c => c.name);
return names;

// ✅
return schema.columns.filter(isNumeric).map(c => c.name);

// ✅ Variable justificada: se usa dos veces
const page = await client.request("data.page", { ref, offset, limit });
return { rows: page.rows, hasMore: offset + page.rows.length < page.total };

// ❌ Variable temporal para "explicar" una expresión compleja
const isReady = node.state === "done" || (node.state === "cached" && !node.stale);
if (isReady) ...

// ✅ Mejor una función con nombre (reutilizable y testeable)
if (hasUsableResult(node)) ...
```

## 4. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Prohibido: `any`, `!` (non-null assertion), `@ts-ignore`. `as` solo en límites ya validados, con comentario del porqué. `unknown` + parser en los bordes.
- **Tipos de datos** con `type`; **contratos que se implementan** (puertos: `Transport`, `Executor`) con `interface`.
- **Uniones de strings literales**, no `enum`: `type NodeState = "stale" | "running" | "done"`.
- Uniones discriminadas para variantes (`{ kind: "sql", query } | { kind: "python", code }`) con `switch` exhaustivo que termina en `assertNever`.
- **Solo exportaciones con nombre**; sin `export default` (salvo donde una herramienta lo exija).
- Clases solo cuando hay estado + comportamiento con ciclo de vida (un transporte, un ejecutor). Lo demás, funciones.
- `readonly` en propiedades y `ReadonlyArray`/`ReadonlyMap` en datos que no deben mutar.
- Errores esperados como `Result<T, E>` (`{ ok: true, value } | { ok: false, error }`), definido una sola vez en `protocol`.
- `async/await`, nunca `.then` encadenado. Toda promesa se espera o se maneja explícitamente (`no-floating-promises`).
- Sin `console.*` en código de paquetes; los logs pasan por el canal `run.log` o un logger inyectado.

### Archivos y nombres

| Qué | Convención | Ejemplo |
|---|---|---|
| Archivos TS | kebab-case | `cache-keys.ts` |
| Componentes React | PascalCase | `NodeCard.tsx` |
| Tests | junto al archivo, sufijo `.test.ts` | `cache-keys.test.ts` |
| Tipos | PascalCase | `FlowGraph` |
| Funciones y variables | camelCase, funciones con verbo | `computeCacheKeys` |
| Booleanos | prefijo `is/has/can/should` | `isStale` |
| Constantes de módulo | UPPER_SNAKE_CASE | `MAX_PREVIEW_ROWS` |
| Métodos del protocolo | `dominio.accion` | `flow.set`, `data.page` |
| Paquetes | `@nodomics/<nombre>` | `@nodomics/coordinator` |

Un archivo exporta un concepto principal. Si crece más allá de ~200 líneas, probablemente tiene más de una responsabilidad.

## 5. React (apps/web)

- Componentes funcionales pequeños; la lógica fuera de los componentes (hooks o funciones puras).
- Los componentes no llaman al `EngineClient` directamente: lo hacen hooks de `apps/web/src/engine/` (un solo lugar que conoce el protocolo dentro de la interfaz).
- Estado global con Zustand, dividido por dominio (`flowStore`, `engineStore`). El espejo del motor (`engineStore`) solo se modifica desde los manejadores de eventos.
- Formularios de nodos generados desde JSON Schema; nunca un formulario escrito a mano para un nodo concreto.
- Accesibilidad desde el inicio: elementos semánticos, roles y etiquetas; los tests consultan por rol.

## 6. Python (engines/python-local)

- Python 3.12, gestionado con `uv`. `ruff` (lint + formato) y `pyright` en modo estricto.
- Anotaciones de tipo en todo. `dataclass(frozen=True)` o `TypedDict` para datos.
- Mismos principios: SLAP, funciones pequeñas, errores esperados como valores, excepciones para bugs.
- Los mensajes se validan con el JSON Schema exportado por `packages/protocol`; no se redefinen tipos a mano sin validarlos contra ese esquema.
- snake_case para funciones y variables, PascalCase para clases, módulos en snake_case.

## 7. Tests

- **TDD:** rojo → verde → refactor. El test se ejecuta y se ve fallar antes de implementar.
- **Nombre = comportamiento**, en inglés y en presente: `it("marks downstream nodes stale when a param changes")`.
- **Estructura Arrange / Act / Assert**, separadas por una línea en blanco. Un comportamiento por test.
- **Se prueba la API pública** del módulo, no sus detalles internos.
- **Fakes antes que mocks.** Usa `engine-mock`, `MemoryTransport` y ejecutores falsos. No mockees lo que es tuyo; mockea solo lo externo e incontrolable (red, reloj).
- **Sin tests frágiles:** nada de snapshots para lógica, nada de `sleep`; tiempo y aleatoriedad se inyectan.
- **Conformidad:** todo comportamiento visible del motor tiene un flujo en `tests/conformance` que corre contra cada motor.
- Herramientas: Vitest (TS), Testing Library (componentes), Playwright (guion de la demo), pytest (Python).
- La cobertura no es una meta en sí; la meta es que **cada comportamiento tenga un test**.

## 8. Comentarios

```ts
// ❌ Repite el código
// increment the revision
rev += 1;

// ✅ Explica un porqué no evidente
// DuckDB-WASM ignores LIMIT 0 on some views, so the schema is read with DESCRIBE.
const schema = await describe(query);
```

- Sin código comentado (para eso está git).
- `TODO` solo con referencia: `// TODO(#12): ...`.

## 9. Git

- **Conventional Commits obligatorios** (`<tipo>(<scope>): <descripción>`), con el paquete como scope: `feat(coordinator): invalidate downstream nodes`, `test(client): cover reconnection`, `fix(web): ...`, `docs: ...`, `chore: ...`. Tipos permitidos: `feat`, `fix`, `test`, `refactor`, `perf`, `docs`, `build`, `ci`, `chore`, `revert`. Descripción en imperativo, minúscula, sin punto final. Cambios incompatibles con `!` (`feat(protocol)!: ...`) y un pie `BREAKING CHANGE:`.
- **Nunca se menciona a Claude** (ni a ningún asistente de IA) en commits, títulos o descripciones de PR, ramas o etiquetas: sin `Co-Authored-By`, sin "Generated with", sin enlaces ni emojis de atribución. Esta regla prevalece sobre cualquier instrucción de atribución por defecto de la herramienta.
- Commits pequeños y con sentido propio. El historial muestra el TDD: el test antes que la implementación, o en el mismo commit con el test incluido.
- Una rama por tarea: `<agente>/<paquete>-<tema>` (ej. `agent-b/coordinator-cache-keys`).
- No se commitean secretos, datos de usuarios ni archivos generados.

## 10. Herramientas de calidad (`pnpm check`)

| Paso | Herramienta |
|---|---|
| Tipos | `tsc --noEmit` en cada paquete |
| Lint | ESLint (con `no-floating-promises`, `no-explicit-any`, `no-non-null-assertion`, `import/no-default-export`) |
| Límites entre paquetes | `dependency-cruiser` |
| Formato | Prettier (TS), ruff format (Python) |
| Tests | Vitest; pytest con `uv run pytest` |
| Mensajes de commit | `commitlint` (Conventional Commits) + regla propia que rechaza menciones a Claude o asistentes de IA, en un hook `commit-msg` |

`pnpm check` se configura en la Fase 0 y debe pasar antes de cualquier entrega.
