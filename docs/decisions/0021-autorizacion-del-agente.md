# 0021. Autorización del agente

- **Estado:** aceptada (decidido por el responsable de la capa de agente por delegación del líder)
- **Fecha:** 2026-11-21

## Contexto

El agente ejecuta herramientas que leen y cambian datos de usuarios, y corre en salas donde otras personas lo invocan con `@agente`. Un modelo puede equivocarse o ser manipulado por texto de una sala o de un repositorio importado. La autorización no puede depender del prompt.

## Decisión

1. **El agente actúa en nombre de un usuario**, con el JWT de Supabase de ese usuario. El servicio lo valida y deriva la identidad de él, nunca de argumentos de herramientas ni de texto del modelo.
2. **Las escrituras de flujos** pasan por la herramienta de escritura del MCP de Sebastián, con la identidad del usuario. El agente nunca usa la service role para escribir flujos. La base aplica RLS (ADR 0018 del hub).
3. **Los bucles disparados desde una sala** usan una lista cerrada de herramientas: leer, ejecutar y proponer. Nunca publicar ni aceptar.
4. **La herramienta de ejecución es de solo lectura por diseño** (decisión de Sebastián): no tiene permisos de escritura.
5. **El contenido inyectable es dato:** mensajes de sala, repositorios importados y salidas de herramientas entran al prompt delimitados como datos, nunca como instrucciones.
6. **Aprobaciones:** guardan `{ userId, version }` tomados del JWT. Una propuesta se aplica solo cuando todos los participantes requeridos aprobaron la misma versión.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| JWT del usuario con RLS (elegida) | La base impone los permisos aunque falle el servicio o el modelo; auditable | Hay que probar las políticas con usuarios distintos |
| Service role con comprobaciones en el código | Más simple al inicio | Un error o una inyección de instrucciones da acceso a todo |
| Cuenta de servicio del agente | Separa al agente de los usuarios | El agente tendría más poder que quien lo invoca |

## Consecuencias

- Una herramienta que intente salir de los permisos del usuario falla por RLS, no por una validación olvidada.
- Las salas dan menos poder que el dueño del flujo: el agente propone, las personas deciden.
- Una aprobación de una versión vieja no cuenta tras un cambio de la propuesta.
- El agente depende de que el MCP tome la identidad del JWT; se acuerda con Sebastián.
