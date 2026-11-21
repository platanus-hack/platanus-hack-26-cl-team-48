# 0020. Memoria temporal en tablas de Supabase

- **Estado:** propuesta
- **Fecha:** 2026-11-21

## Contexto

La memoria del agente debe responder qué se construyó, cuándo, cómo, por quién y por qué (`docs/05-capa-agente.md` §5). Necesita entidades, relaciones con validez en el tiempo, episodios y búsqueda semántica de fichas de componente. El buscador del Feed ya usará pgvector en Supabase, y el tiempo del equipo es corto.

## Decisión

La memoria se guarda como tablas en Supabase (Postgres):

- `entities`: usuarios, agente, flujos, nodos, conversaciones, decisiones, propuestas, círculos.
- `edges`: relaciones entre entidades con `valid_from` y `valid_to` (creó, modificó, propuso, aceptó, rechazó, derivó de, conversó sobre).
- `episodes`: cada llamada a herramienta, mensaje de sala y propuesta aceptada o rechazada, con su marca de tiempo.
- `component_cards`: la ficha de componente en JSON, con su embedding en pgvector. Los embeddings los genera Voyage AI.

Graphiti queda como posible evolución futura.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Tablas en Supabase con pgvector (elegida) | Una sola base; RLS ya definida (ADR 0022); los embeddings compartidos con el buscador; sin servicio nuevo | Hay que escribir a mano las consultas temporales y la extracción de relaciones |
| Graphiti (grafo de conocimiento temporal, Apache-2.0) | Pensado para memoria de agentes; modelo temporal ya resuelto | Solo Python (el servicio es Node/TS); exige Neo4j, FalkorDB o Neptune, sin soporte de Postgres; Anthropic no ofrece embedder, así que igual se necesita otro proveedor |
| Sin memoria estructurada (solo historial de chat) | Nada que construir | No responde preguntas sobre el porqué de un cambio ni permite buscar componentes |

## Consecuencias

- Se evita operar una base de grafos aparte y un servicio en otro lenguaje.
- Las consultas de "qué era cierto en esta fecha" se hacen con filtros sobre `valid_from` y `valid_to`.
- La dependencia de Voyage AI (`VOYAGE_API_KEY`) se agrega al servicio, solo del lado del servidor.
- El formato de la ficha de componente se acuerda con Cantú, porque alimenta el buscador del Feed.
- Si el volumen o la complejidad de las relaciones lo justifican, se reevalúa Graphiti con otro ADR.
