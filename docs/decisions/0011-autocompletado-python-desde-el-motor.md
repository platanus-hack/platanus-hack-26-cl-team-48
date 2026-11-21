# 0011. Autocompletado de Python resuelto por el motor

- **Estado:** aceptada

## Contexto

El autocompletado útil depende del entorno donde corre el código: Pyodide en el navegador y Python local tienen paquetes y versiones distintos. La interfaz no puede importar esas librerías ni el ejecutor (invariantes 1 y 2), así que no puede saber por sí sola qué ofrece `pd.` o `plt.`. Hoy el motor ya informa la lista de paquetes en `engine.hello` (`Capabilities.pythonPackages`) y cada ejecutor la suya en `exec.hello`.

## Decisión

El autocompletado tiene dos capas que el editor (ADR 0010) combina:

1. **Local, sin cambios de protocolo:** palabras clave y builtins de Python; la firma de la función de entrada (`transform(inputs)`), los alias de entrada (`inputs["in"]`), las columnas de cada entrada (la interfaz ya conoce su esquema por `ResultRef.schema` o `schema.infer`) y los nombres de módulo tras `import`/`from`, sacados de `Capabilities.pythonPackages`.
2. **Del motor, con cambio de protocolo:**
   - NEP: petición `code.complete` `{ nodeId, code, line, column }` → `{ items: [{ label, kind, detail?, documentation? }] }`.
   - Ejecutor: petición `exec.complete` `{ code, line, column }` con el mismo resultado. El coordinador la envía al ejecutor que correría ese nodo (mismo despacho por capacidades), sin conocer Python.
   - Los ejecutores usan **Jedi** (MIT; análisis estático, no ejecuta el código): Pyodide lo carga con `loadPackage("jedi")` en la primera petición; `engines/python-local` lo agrega como dependencia.
   - `Capabilities` gana un campo opcional `codeCompletion: boolean`. Un motor sin él solo ofrece la capa local; motores viejos siguen siendo válidos.
   - La interfaz espera ~150 ms sin teclear antes de pedir, y descarta respuestas de peticiones superadas.
- **Paquetes del entorno:** `pythonPackages` pasa a listar lo que el ejecutor **puede importar**, no solo lo cargado. En Pyodide, el ejecutor carga bajo demanda los paquetes que el código importa (`loadPackagesFromImports`) antes de ejecutarlo; así `import matplotlib` funciona sin declararlo en el manifiesto.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Solo la capa local | Sin tocar el protocolo | No completa miembros de librerías (`pd.read_`, `plt.`), que es lo que se pidió |
| Language server (pyright/pylsp) por WebSocket | Completo: hover, firmas, diagnósticos | Un proceso más; no existe en el motor del navegador; mucho más que lo pedido |
| Índices estáticos de símbolos por librería en la interfaz | Funciona sin motor | Se desactualiza con cada versión; la interfaz tendría que conocer las librerías del motor |

## Consecuencias

Dos peticiones nuevas en el protocolo (NEP y ejecutor) y un campo opcional en `Capabilities`; ambos ejecutores Python implementan `exec.complete` y la suite de conformidad lo prueba. Jedi suma unos MB a Pyodide la primera vez que se pide un autocompletado. Firmas y documentación al pasar el cursor podrían agregarse después sobre la misma petición.
