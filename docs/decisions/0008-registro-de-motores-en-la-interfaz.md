# 0008. Registro de motores: la interfaz arranca motores por URL de Worker

- **Estado:** aceptada

## Contexto

La interfaz debe poder elegir motor (simulado, navegador, Python local) sin importar código de ningún motor (invariante 1). Un motor del navegador corre en un Web Worker, y alguien tiene que decir qué script carga ese Worker.

## Decisión

Un único archivo de composición, `apps/web/src/engine-registry.ts`, lista los motores disponibles. Para los motores en Worker importa **solo la URL** del punto de entrada (`import url from "@nodomics/engine-mock/worker?worker&url"`), nunca su código; el resto de la interfaz recibe un `Transport` por `@nodomics/client`. Los motores remotos se describen por URL de WebSocket. dependency-cruiser permite esa única excepción y la prohíbe en cualquier otro archivo.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Importar el motor en la interfaz | Simple | Rompe el invariante 1; el motor correría en el hilo de la interfaz |
| URL del Worker por variable de entorno | Cero imports | Configuración frágil y difícil de probar |
| Paquete "shell" aparte que compone | Separación total | Un paquete más para un archivo |

## Consecuencias

Cada paquete `engine-*` que corre en el navegador expone `./worker`. Agregar un motor es agregar una entrada al registro.
