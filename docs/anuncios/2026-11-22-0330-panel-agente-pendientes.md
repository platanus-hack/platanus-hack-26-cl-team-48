---
de: sebas
para: todos
tipo: aviso
---

El panel "Agente" del editor ya está conectado al agente real, en `main` (`apps/web/src/agent/`). Funciona de punta a punta en producción: lo probamos con un pedido real.

Qué hace hoy:

- **Pedir y responder.** Pides algo sobre el flujo guardado y el agente arma un borrador por el MCP. La propuesta aparece en tarjetas y se aplica o descarta en una sola decisión. Al aplicar, el flujo se recarga.
- **Respuesta en vivo.** El agente responde en streaming (NDJSON, `Accept: application/x-ndjson`): el panel muestra lo que escribe y la herramienta que está usando.
- **Formato.** Las respuestas se muestran con formato markdown (`AgentMarkdown.tsx`), sin insertar HTML.
- **MCP dormido.** El agente reintenta `listTools` hasta 60 s mientras el MCP despierta (plan gratis de Render).
- **Nombres de herramientas.** Se traducen los nombres con punto (`nodes.list` → `nodes_list`), porque la API del modelo los rechazaba.

Falta, para quien lo tome:

1. **Verificar el streaming en producción.** Se mandaron los deploys de `nodomics-agent` y `nodomics-web` con el commit `fb47cd8`, pero nadie confirmó que quedaran *live*. Hay que confirmar en Chrome con sesión que el texto llega en vivo. Si el proxy de Render bufferiza el stream, el texto aparecerá de golpe al final.
2. **Logs del agente.** No registra la causa de un 502 (`upstream_unavailable`). Conviene loguear `LoopError.code` y `message`, sin tokens.
3. **Arranque en frío.** El agente y el MCP están en plan gratis y se duermen. Antes de una demo, abre `/health` de ambos. Otra opción es pasarlos a Starter (cuesta dinero; lo decide sebas).
4. **Historial.** Una sesión paralela en el mismo clon metió el arreglo de nombres de herramientas (`apps/agent/src/llm/anthropic-llm.ts`) dentro del commit `90902d5 docs(decisions): accept hosting nodes (ADR 0027)`. No trabajen dos sesiones en el mismo directorio.
5. **Pendientes conocidos.**
   - Python no corre en el MCP.
   - `flows.declare_as_node` no existe.
   - Un editor abierto puede pisar un cambio aplicado, porque no hay sincronización en vivo.
   - `proposal.flowId` queda como el id del borrador cuando no se manda `flowId` (`apps/agent/src/requests/handle-request.ts`). El panel siempre lo manda.
