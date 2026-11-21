# 0004. Paquetes `ui` y `rpc`, y esquemas del protocolo con TypeBox

- **Estado:** aceptada

## Contexto

1. El design system de Nodomics (tokens, fuentes, estilos y componentes de presentación) debe usarse en la interfaz, pero el invariante 1 solo permitía a `apps/web` depender de `protocol` y `client`.
2. JSON-RPC lo necesitan ambos lados: la interfaz (cliente del NEP), el motor (servidor del NEP) y el coordinador (cliente de los ejecutores, incluido el ejecutor Python por WebSocket).
3. El protocolo debe ofrecer tipos de TypeScript **y** JSON Schema para que el motor Python valide los mismos mensajes, sin mantener dos definiciones.

## Decisión

- `packages/ui` (`@nodomics/ui`): tokens, fuentes, CSS y componentes React de presentación. No depende de ningún paquete del motor ni del protocolo. `apps/web` puede depender de él.
- `packages/rpc` (`@nodomics/rpc`): par JSON-RPC 2.0 genérico y transportes (`MemoryTransport`, `WorkerTransport`, `WebSocketTransport`). No conoce el NEP ni depende de otros paquetes internos.
- `packages/protocol` define cada esquema una sola vez con **TypeBox**: de ahí salen los tipos (`Static<>`), la validación en tiempo de ejecución y el JSON Schema exportado para Python.
- TypeScript se fija en 6.0.x, porque `typescript-eslint` aún no soporta TypeScript 7.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Zod + generador de JSON Schema | Muy popular | El JSON Schema es una conversión con pérdidas; dos fuentes de verdad en la práctica |
| Tipos TS + JSON Schema escritos a mano | Sin dependencias | Dos definiciones que divergen |
| TypeBox (elegida) | El esquema ES JSON Schema y el tipo sale de él; validación rápida | Sintaxis menos conocida |
| JSON-RPC dentro de `client` | Un paquete menos | El motor tendría que depender del cliente de la interfaz |

## Consecuencias

- Invariante 1 actualizado: `apps/web` depende solo de `protocol`, `client` y `ui`.
- El Python local valida mensajes con el JSON Schema exportado por `protocol`.
