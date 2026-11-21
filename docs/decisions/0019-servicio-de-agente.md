# 0019. Servicio del agente en Render

- **Estado:** aceptada (decidido por el responsable de la capa de agente por delegación del líder)
- **Fecha:** 2026-11-21

## Contexto

La capa de agente (`docs/05-capa-agente.md`) necesita un proceso que hable con Claude (API de Anthropic) y use las herramientas del MCP que construye Sebastián: una herramienta de escritura para crear, modificar y publicar flujos, y otra de ejecución, de solo lectura, que corre flujos en un sandbox. Ese proceso guarda secretos (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`) y sus bucles duran minutos.

El ADR 0018 (hub de flujos y nodos) decidió que el hub no tiene servidor propio: vive en Supabase. Esa decisión vale para el hub. El agente es otra cosa: no puede guardar sus claves en el navegador ni en el hub, y un bucle de minutos no cabe en los límites de tiempo de las Edge Functions de Supabase. El sitio estático sigue igual.

## Decisión

Se crea un servicio nuevo, `apps/agent` (Node/TypeScript), desplegado en Render como servicio web (`nodomics-agent`). Contiene el bucle del agente (Claude), la lógica de propuestas y Diff de Dominio, la memoria (ADR 0020) y los secretos. Es **cliente MCP** del MCP de Sebastián: no implementa el servidor MCP, ni la edición de flujos, ni el runner, ni el sandbox, ni la persistencia de flujos.

La interfaz le habla por HTTP con el JWT de Supabase del usuario (ADR 0021). Entre los paquetes internos, `apps/agent` solo importa `@nodomics/protocol`.

Dependencias de runtime nuevas (`CLAUDE.md` §5): `@anthropic-ai/sdk` y `@modelcontextprotocol/sdk` (cliente).

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Servicio web Node/TS en Render (elegida) | Sin límite corto de tiempo; secretos en el servidor; mismo lenguaje y esquemas TypeBox; ya usamos Render | Un servicio más que desplegar y vigilar |
| Supabase Edge Functions | Sin servidor propio, coherente con el ADR 0018 | Límites de tiempo cortos frente a bucles de minutos; difícil sostener una sesión MCP larga |
| Llamar a Anthropic desde el navegador | Nada que desplegar | Expone las claves; no hay dónde aplicar límites de costo |

## Consecuencias

- Las claves viven solo en el servicio, se leen del entorno y se validan al arrancar; si faltan, falla listando los nombres sin mostrar valores.
- Un reinicio de Render interrumpe los bucles en curso; se reportan como fallidos. El sandbox y su limpieza son responsabilidad del MCP de Sebastián.
- El servicio depende del contrato de herramientas del MCP; hasta que exista, se desarrolla contra un MCP falso.
- Se agrega `apps/agent` a `docs/engineering/arquitectura.md`.
