# @nodomics/conformance

Arnés privado de Vitest para motores NEP. Lee los manifiestos de `coreNodes` y los
archivos `cases.json` del checkout; requiere ejecutar las pruebas desde el monorepo.

Desde un archivo `.test.ts` del paquete de un motor:

```ts
import { defineConformanceSuite } from "@nodomics/conformance";
import { startEngine } from "./start-engine.ts";

defineConformanceSuite({ name: "mi motor", startEngine });
```

`startEngine` devuelve un transporte nuevo (o una promesa) por test. El arnés conecta,
registra el catálogo oficial y cierra el cliente en `finally`. Cada sesión usa revisión
1; las llamadas directas a `runCase` y `runReferenceFlow` requieren igualmente un
cliente conectado en una sesión nueva con el catálogo disponible.

Para los casos API, `startEngine(responses)` recibe el mapa opcional de respuestas
del caso. Usa `createResponseFetch(responses)` (exportado por este paquete) como
`BrowserEngineOptions.fetch`, tanto con ejecutores del navegador como con Python
local. El simulador responde únicamente a las URLs completas declaradas, con estado
200 por defecto y 404 para las ausentes. Las llamadas directas a `runCase` requieren
crear previamente el motor con las respuestas del caso.

`skip` admite ids de nodo, el nombre completo `<id>: <nombre del caso>` y nombres
`reference:ventas-filter-group`, `reference:source-zscore` y
`reference:subflow-filter-group`. No omite casos implícitamente.

`runCase` devuelve los valores obtenidos por puerto; la suite compara tablas por
posición, nombres y tipos de columna y celdas (tolerancia relativa por defecto `1e-9`).
No convierte valores numéricos de salida: texto en una columna numérica falla.
Solo equipara fechas ISO de día y de medianoche cuando el tipo esperado es `date`.
`runCase` también rechaza directamente las tablas que difieren del resultado esperado. Los puertos chart no esperan
`node.result` (las vistas se calculan bajo demanda): tras `run.finished` se consulta la
especificación con `data.view`, que incluye `data.values`, y se compara estructuralmente.
Las fuentes auxiliares y entradas se suben como CSV UTF-8. Los resultados se leen en
páginas de hasta 1000 filas. Los errores de configuración, nodo, ejecución y resultados
faltantes hacen fallar el test. `runTimeoutMs` configura la espera de `run.finished` y el timeout de cada test de
Vitest (por defecto 30000 ms), tanto para casos de nodo como para flujos de referencia.
Las llamadas directas admiten `runCase(client, manifest, { ...testCase, runTimeoutMs })`
y `runReferenceFlow(client, reference, { runTimeoutMs })`.
Cada página debe declarar un total igual a `ResultRef.rowCount`.
Los campos CSV vacíos se citan para conservar las filas de un solo nulo.

Los flujos de referencia tienen resultados en `*.expected.json`. El de Python sube
`*.sources.json`; los otros dos utilizan la muestra `ventas` del catálogo actual.
El mock solo tiene una prueba de humo; la prueba del registro de la suite selecciona
un caso contra un motor falso que responde mediante NEP.

## Limitación de la muestra oficial

El caso de `core.source.sample` incluye una tabla sintética bajo `sources.sample.ventas`.
Se sube esa tabla, pero `source.add` asigna el `sourceId` y no permite registrar el alias
`sample.ventas`, que está fijado en la plantilla del manifiesto. El arnés conserva la
semántica oficial: no sustituye la implementación del nodo ni convierte una muestra
en un nodo CSV. Ese caso puede fallar por datos contra un motor que ya tenga su propia
muestra. Hace falta acordar cómo proporcionar muestras de prueba por NEP; mientras
tanto, un consumidor puede declarar `skip: ["core.source.sample"]` explícitamente.
