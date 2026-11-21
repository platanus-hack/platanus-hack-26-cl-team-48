# 0021. Persistencia y sincronización de flujos

- **Estado:** propuesta (requiere acuerdo con Sebastián, dueño de la interfaz y del motor)
- **Fecha:** 2026-11-21

## Contexto

Hoy los flujos viven en el IndexedDB del navegador (ADR 0015) y los nodos propios son locales (ADR 0009). El agente corre en un servidor y trabaja con flujos de los que depende más de una persona (salas, propuestas), así que necesita leerlos y escribir propuestas en un lugar común. Además, si el flujo original cambia mientras el agente trabaja en un fork, hay que detectarlo y no pisar nada.

Esta decisión toca la interfaz y el motor, que son de Sebastián. No se implementa nada sin su acuerdo.

## Decisión

Propuesta, sujeta a acuerdo:

1. **Supabase es la fuente de verdad de los flujos compartidos o de sala.** Los flujos personales siguen en IndexedDB (ADR 0015).
2. **Puente de publicar e importar** desde la interfaz: "publicar" copia un flujo local a Supabase; "importar" trae uno de Supabase a IndexedDB. El agente solo opera sobre flujos publicados.
3. **Revisión por `flowHash`:** hash estable del JSON canónico del flujo. Cada propuesta guarda el `baseHash` sobre el que se hizo.
4. **Aceptar es un compare-and-swap en una transacción:** el flujo se actualiza solo si su hash actual sigue siendo el `baseHash` de la propuesta. Si cambió, la propuesta pasa a `stale` y no se aplica a ciegas.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Supabase para lo compartido, IndexedDB para lo personal (elegida) | No cambia el flujo personal actual; el agente tiene dónde leer y escribir | Dos lugares donde vive un flujo; hace falta el puente |
| Todo en Supabase | Una sola fuente de verdad | Cambia el ADR 0015; exige cuenta para usar el editor; más trabajo en la interfaz |
| Todo local y que el navegador envíe el flujo al agente en cada petición | Sin persistencia nueva | No hay propuestas duraderas ni salas; el agente no puede detectar cambios del original |
| Sincronización en tiempo real tipo CRDT | Edición simultánea sin conflictos | Muy grande para el plazo; el protocolo usa `rev` y no está pensado para eso |

## Consecuencias

- El agente no toca el IndexedDB de nadie; solo ve lo publicado.
- Un flujo publicado puede divergir de su copia local; el puente debe mostrar esa diferencia al usuario.
- `flowHash` exige una serialización canónica (claves ordenadas, sin campos volátiles como posiciones, si se acuerda así con Sebastián). Es una decisión abierta.
- Requiere tablas y RLS en Supabase (ADR 0022).
- Preguntas para Sebastián: qué campos entran al hash, dónde va el botón de publicar, y si `rev` de NEP y `flowHash` conviven.
