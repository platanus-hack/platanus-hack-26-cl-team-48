# 0001. La interfaz y el motor se comunican solo por un protocolo (NEP)

- **Estado:** aceptada

## Contexto

Nodomics debe ejecutar flujos en el navegador, en un motor Python local y, más adelante, en la nube, con la misma interfaz. Si la interfaz conoce detalles de un motor, cada motor nuevo obliga a cambiar la interfaz.

## Decisión

La interfaz se comunica con cualquier motor solo a través del Nodomics Engine Protocol (NEP): JSON-RPC 2.0 sobre un transporte intercambiable (Web Worker, WebSocket, memoria). Los datos permanecen en el motor; la interfaz recibe referencias y páginas. Detalle en `docs/04-poc-una-noche.md` §3 y §3.1.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| La interfaz llama directamente a DuckDB/Pyodide | Más rápido de escribir al inicio | Imposible cambiar de motor sin reescribir la interfaz |
| API REST por motor | Conocida | Sin eventos en tiempo real; no sirve para el Worker del navegador |
| Protocolo propio sobre JSON-RPC (elegida) | Mismo contrato para todos los motores; patrón probado (LSP, kernels de Jupyter); permite un motor falso para la interfaz | Hay que diseñar y versionar el protocolo |

## Consecuencias

- La interfaz se desarrolla y prueba contra `engine-mock`.
- Agregar un motor no toca la interfaz.
- El protocolo pasa a ser el contrato más importante del sistema y solo cambia con un ADR.
