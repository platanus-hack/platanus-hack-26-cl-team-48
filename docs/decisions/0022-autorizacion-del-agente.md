# 0022. Autorización del agente

- **Estado:** propuesta
- **Fecha:** 2026-11-21

## Contexto

El agente ejecuta herramientas que leen y cambian datos de usuarios, y también corre dentro de salas donde otras personas lo invocan con `@agente`. Un modelo puede equivocarse o ser manipulado por texto de una sala o de un repositorio importado. La autorización no puede depender de lo que diga el prompt.

## Decisión

1. **Identidad:** cada petición lleva el JWT de Supabase del usuario. El servicio lo valida y deriva de él el contexto `{ userId, roomId?, flowId, forkId }` (ADR 0019).
2. **RLS:** las tablas de flujos, propuestas y salas tienen políticas RLS. El servicio consulta con el JWT del usuario, de modo que la base aplica las políticas.
3. **Service role acotada:** `SUPABASE_SERVICE_ROLE_KEY` se usa solo en operaciones de sistema acotadas (registrar episodios) y nunca a partir de datos que vengan de la salida del LLM.
4. **Bucles disparados desde una sala** corren con una lista cerrada de herramientas: leer, trabajar en el fork y proponer. Nunca aceptar ni aplicar.
5. **Aprobaciones:** cada aprobación guarda `{ userId, version }` tomados del JWT. Una propuesta se aplica solo cuando todos los participantes requeridos aprobaron la misma versión.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| JWT del usuario con RLS y service role acotada (elegida) | La base impone los permisos aunque falle el servicio o el modelo; auditable | Hay que escribir y probar las políticas; algunas operaciones de sistema igual necesitan la service role |
| Todo con service role y comprobaciones en el código del servicio | Más simple al inicio | Un error en el código o una inyección de instrucciones da acceso a todo |
| Cuenta de servicio del agente con permisos propios | Separa al agente de los usuarios | El agente actuaría con más poder que quien lo invoca; difícil de razonar en salas |

## Consecuencias

- Una herramienta que intente salir del contexto del JWT falla por RLS, no por una validación que alguien olvidó.
- Las sesiones de sala tienen menos poder que las del dueño del flujo: el agente propone, las personas deciden.
- Una aprobación de una versión vieja no cuenta tras un cambio de la propuesta.
- Hay que probar las políticas RLS con usuarios distintos, incluido uno sin acceso.
- El episodio que registra la service role guarda el `userId` del JWT, no uno que venga del modelo.
