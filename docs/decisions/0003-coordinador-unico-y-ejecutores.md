# 0003. Un coordinador único en TypeScript y ejecutores pequeños

- **Estado:** aceptada

## Contexto

La lógica de grafo (subflujos, orden, caché, invalidación, plantillas) es la parte más compleja del motor. Reescribirla en cada motor duplicaría bugs y comportamiento divergente.

## Decisión

El motor tiene dos capas: un **coordinador** escrito una sola vez en TypeScript puro (sin DOM, corre en Web Worker o en Node) y **ejecutores** que solo corren tareas resueltas mediante un protocolo interno simple. En la PoC, el motor Python local actúa solo como ejecutor y el coordinador sigue en el navegador.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Cada motor implementa todo el NEP | Motores autónomos | Lógica compleja duplicada en TS y Python |
| Coordinador único + ejecutores (elegida) | Lógica en un solo lugar; ejecutores nuevos baratos (~5 mensajes) | Para ejecutar sin navegador, el coordinador debe correr en Node junto al ejecutor |

## Consecuencias

- Un ejecutor nuevo (por ejemplo, R) es un adaptador pequeño.
- La suite de conformidad garantiza que todos los ejecutores producen los mismos resultados.
