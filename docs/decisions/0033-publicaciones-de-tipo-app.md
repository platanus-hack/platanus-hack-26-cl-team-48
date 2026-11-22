# 0033 — Publicaciones de tipo app

- **Estado:** aceptada
- **Fecha:** 2026-11-22

## Contexto

El hub publica dos tipos: `flow` y `node` (ADR 0018). La comunidad necesita un tercer nivel para las
soluciones completas de un proyecto: varias fuentes, procesamiento, alertas y varias vistas. Hoy esas
soluciones se publican como `flow` y no se distinguen de un flujo reutilizable de pocos pasos.

## Decisión

`publications.kind` acepta `app`, `flow` y `node`:

| Tipo | Qué es |
|---|---|
| `app` | Una solución completa para un proyecto, lista para adaptar |
| `flow` | Varios nodos encadenados que resuelven un paso reutilizable |
| `node` | La unidad mínima: una transformación |

Una `app` guarda lo mismo que un `flow` (un `Flow` y su snapshot). Solo cambia cómo se presenta y se busca.

## Consecuencias

- La migración `20261122130000_publications_app_kind.sql` amplía el check. No toca filas existentes.
- El front que lee el hub debe aceptar `app` **antes** de que exista la primera fila `app` en producción:
  `hub-rows.ts` rechaza cualquier otro valor.
- `PublicationKind` en `@nodomics/hub` pasa a `"app" | "flow" | "node"`.
