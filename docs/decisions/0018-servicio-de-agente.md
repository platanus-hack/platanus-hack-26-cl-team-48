# 0018. Servicio del agente en Render

- **Estado:** propuesta
- **Fecha:** 2026-11-21

## Contexto

La capa de agente (`docs/05-capa-agente.md`) necesita un proceso que hable con Claude (API de Anthropic), exponga las herramientas MCP del motor, cree sandboxes y registre propuestas y memoria en Supabase. Ese proceso guarda secretos: `ANTHROPIC_API_KEY`, `RENDER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `VOYAGE_API_KEY`.

Un bucle de agente dura minutos: llama al modelo, ejecuta herramientas, espera al sandbox y vuelve a llamar al modelo. Hoy el sitio es estático en Render y no hay ningún proceso de servidor propio.

## Decisión

Se crea un servicio nuevo, `apps/agent` (Node/TypeScript), desplegado en Render como servicio web (`nodomics-agent`). Contiene el bucle del agente, el servidor MCP y todos los secretos. La interfaz le habla por HTTP con el JWT de Supabase del usuario; el servicio nunca confía en identidades que vengan del cuerpo de la petición.

Dependencias de runtime nuevas, justificadas por esta decisión (`CLAUDE.md` §5): `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, `@renderinc/sdk`, `@supabase/supabase-js`. `apps/agent` solo importa `@nodomics/protocol` entre los paquetes internos.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Servicio web Node/TS en Render (elegida) | Sin límite corto de tiempo; secretos en el servidor; mismo lenguaje y esquemas TypeBox que el resto del repo; ya usamos Render | Un servicio más que desplegar y vigilar |
| Supabase Edge Functions | Sin servidor propio; cerca de la base de datos | Límites de tiempo cortos frente a bucles de minutos; difícil mantener sesiones MCP y control de sandboxes |
| Llamar a Anthropic desde el navegador | Nada que desplegar | Expone las claves; no hay dónde aplicar límites de costo ni autorización |

## Consecuencias

- Los secretos viven solo en el servicio. Se leen del entorno y se validan al arrancar; si faltan, el servicio falla listando los nombres, sin mostrar valores.
- El servicio es un punto único de control para límites de costo, autorización y registro de episodios.
- Hay un servicio con estado en memoria (bucles en curso) que Render puede reiniciar: un bucle interrumpido se reporta como fallido y no deja sandboxes vivos (ver ADR 0019).
- Se agrega `apps/agent` a `docs/engineering/arquitectura.md` con Gabriel como dueño.
