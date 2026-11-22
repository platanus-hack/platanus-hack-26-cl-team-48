# 0026. Servidor MCP del motor

- **Estado:** aceptada (decisión del líder)
- **Fecha:** 2026-11-21
- **Relacionada con:** ADR 0019 (servicio del agente), 0021 (autorización), 0023 (flujos en Supabase), `docs/05-capa-agente.md` §4.

## Contexto

El agente (`apps/agent`) es cliente MCP y hasta hoy corre contra un MCP falso (`apps/agent/src/mcp/fake-*.ts`). Le faltaba el servidor real: leer flujos y nodos, editar borradores aislados, ejecutarlos y aplicarlos al flujo del usuario.

## Decisión

1. **Servicio nuevo `apps/mcp`** (`@nodomics/mcp`, Node/TypeScript), desplegado en Render como `nodomics-mcp`.
   - MCP por HTTP *streamable*, sin estado de sesión, en `POST /mcp`, y `GET /health`.
   - **Contrato:** los mismos nombres de herramientas y argumentos que el MCP falso, así el agente no cambia. `flows.get` devuelve el `Flow` real del protocolo. `flows.declare_as_node` responde "todavía no disponible".
2. **Identidad (ADR 0021).** Cada `tools/call` exige `Authorization: Bearer <JWT de Supabase>`.
   - El servicio verifica el token con Supabase Auth y lee y escribe con un cliente de Supabase con ese token, así que RLS decide.
   - No guarda secretos: solo la URL y la clave publicable de Supabase. `tools/list` no exige token, porque el agente lo pide sin identidad.
3. **Borradores en Supabase.** Tabla nueva `flow_drafts`, solo del dueño (RLS).
   - Guarda el `Flow` del borrador, el flujo de origen y la revisión base.
   - Sobreviven a reinicios, porque el usuario acepta minutos después.
4. **Revisión** = 12 hex del SHA-256 del flujo serializado. `flows.apply` falla si el flujo original cambió.
   - Aplicar escribe solo `document.flow` y `updatedAt` en `flows`, y conserva `files`, `node` y `published`.
   - El editor recalcula esos campos en su siguiente guardado.
5. **Núcleo puro** (`apps/mcp/src/flow-edit/`): operaciones sobre `Flow`, validación, diff con el formato de cambios del falso (`{id, kind, target, before, after}`) y aplicación parcial por `changeIds`. Los nodos de código viajan como manifiestos en `flow.customNodes`.
6. **Ejecución dentro del servicio.** Por ejecución se arma un coordinador con DuckDB (Node) y Pyodide, con el catálogo de `nodes-core`.
   - El código generado corre en el mismo proceso, que no tiene secretos.
   - Las muestras son de 20 filas como máximo.
7. **Dependencias permitidas** de `apps/mcp`: `protocol`, `coordinator`, `executor-duckdb-wasm`, `executor-pyodide`, `nodes-core`. Nada importa `apps/mcp`.
   - `executor-duckdb-wasm` exporta su apertura de DuckDB para Node.
   - Dependencias de runtime nuevas: `@modelcontextprotocol/sdk` (servidor) y `@supabase/supabase-js`, ya usadas en el repo.

8. **Se arma con Vite** (`vite build --ssr`, `apps/mcp/dist/start.js`), porque los paquetes del monorepo son TypeScript con importaciones solo de Vite (`?raw`). DuckDB-WASM, Pyodide y apache-arrow quedan fuera del bundle: leen sus archivos de `node_modules`.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Ejecutar en Render Sandboxes | Aislamiento fuerte | Más lento de construir; no probado |
| Solo SQL | Liviano, sin código arbitrario | El agente no puede probar nodos Python |
| Borradores en memoria | Sin migración | Se pierden si el servicio se duerme antes de aceptar |
| Cambiar el contrato al `Flow` real y adaptar el agente | Un solo modelo | Reescribe código del agente que ya funciona |

## Consecuencias

- El agente usa `MCP_URL=https://nodomics-mcp.onrender.com/mcp` y deja el modo demo.
- **Riesgo aceptado:** un editor abierto puede sobrescribir lo aplicado en su siguiente guardado, porque la web no escucha cambios en vivo. Se resuelve cuando la web se suscriba a cambios.
- **Plan gratis de Render:** 512 MB y el servicio se duerme. Si Python no cabe, se sube de plan.
- **Archivos subidos en el navegador** no existen en el servidor: esos nodos fallan al ejecutarse en el MCP.
