# 0019. Sandbox por `exec` y MCP en el servicio

- **Estado:** propuesta
- **Fecha:** 2026-11-21

## Contexto

El agente construye y prueba flujos sobre un fork, aislado del flujo del usuario. Render Sandboxes (beta pública) permite ejecutar comandos con `exec` (`bash -c`), pero no expone puertos ni red privada, y `terminate` borra el sistema de archivos. Por eso un servidor MCP dentro del sandbox no sería alcanzable, y nada que se quede solo en el disco del sandbox sobrevive.

También importa el costo y la seguridad: un sandbox vivo cuesta dinero y ejecuta código generado por un modelo.

## Decisión

1. **El MCP vive en el servicio del agente** (ADR 0018), no en el sandbox.
2. **Cada sesión MCP se ata a un contexto autorizado** `{ userId, roomId?, flowId, forkId }`, derivado del JWT de Supabase del usuario. Nunca se toma de los argumentos de una herramienta ni de texto del modelo.
3. **La ejecución se manda al sandbox con `exec`** de un runner de comando, `nodomics-run` (Task 0b, a cargo de Sebastián), que recibe el flujo y devuelve por stdout un `RunReport` JSON acotado: como máximo 20 filas y 64 KB por muestra. Una salida de más de 256 KB se rechaza. Más páginas se piden con otro `exec`.
4. **Ningún secreto del servicio entra al sandbox.** El sandbox recibe solo el flujo y los datos, sin variables de entorno del servicio.
5. **Límites de costo desde el inicio:** un sandbox vivo por usuario, plan `1c-2g`, runtime máximo de 30 min, idle de 5 min, `terminate` siempre en `finally` y limpieza periódica de sandboxes huérfanos.
6. **Persistir antes de terminar:** el flujo base, el flujo propuesto y los manifiestos de nodos de código se guardan en Supabase antes de `terminate`.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| MCP en el servicio y ejecución por `exec` (elegida) | Funciona con las restricciones de la beta; los secretos nunca entran al sandbox; autorización en un solo lugar | Cada ejecución paga el arranque del runner; la salida debe ser acotada y paginada |
| MCP dentro del sandbox | El MCP queda junto a los datos | Render Sandboxes no expone puertos ni red privada: es inalcanzable |
| Ejecutar en el propio servicio del agente | Sin sandbox ni costo extra | Código generado por el modelo corriendo junto a los secretos |
| Ejecutar en el navegador del usuario | Sin costo de nube | El agente no podría probar sin que el usuario tenga la pestaña abierta; los datos no viajan |

## Consecuencias

- El runner `nodomics-run` es el camino crítico del primer hito: sin él el agente no puede probar nada. Depende de Sebastián.
- El contrato `RunReport` se versiona con el protocolo del runner; un reporte que no cumple el esquema es un error, no un dato.
- La beta pública puede cambiar: el acceso al sandbox queda detrás de un puerto (`SandboxPort`) con un adaptador de Render y uno falso para pruebas.
- Un bucle que muere no deja gasto abierto gracias al idle de 5 min y a la limpieza de huérfanos.
- Los archivos locales del navegador (`sourceId` de sesión, ADR 0015) no viajan al sandbox; en esta versión el agente usa fuentes por URL o API (ADR 0017) o datos en línea.
