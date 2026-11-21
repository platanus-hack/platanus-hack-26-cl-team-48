# 0017. Fuente de datos API y formato de texto

- **Estado:** aceptada

## Contexto

El usuario pidió dos cosas:

- **Fuente API:** leer datos de una API además de archivos.
- **Formato `txt`:** aceptar texto plano en el protocolo y en la API.

Hoy `SourceFormat` es `csv | parquet | json`. El formato se deduce de la extensión (`sourceFormatOf`), y cada ejecutor (DuckDB-wasm, Pyodide, Python local) lo lee en `exec.load`. El coordinador corre en el navegador para todos los motores; el ejecutor local se conecta a él.

Una API necesita encabezados (a menudo con credenciales) y extraer los registros de una respuesta JSON anidada. Las credenciales no deben quedar en el flujo, que se exporta y se comparte.

## Decisión

1. **Formato `txt`** (cambio en `@nodomics/protocol`): `SourceFormat` agrega `"txt"` y la extensión `.txt` lo selecciona. Los tres ejecutores lo leen con la misma regla:
   - Si la primera línea contiene un separador, se lee como CSV con encabezado y ese separador. Se prueban, en este orden, tabulador, `;`, `|` y `,`, y gana el primero que aparece.
   - Si no, cada línea es una fila de una única columna de texto, `texto`. Se descarta la línea vacía final.
2. **Nodo "API"** (`core.source.api`, categoría "Fuentes"):
   - **Parámetros:** `url` (obligatoria), `query` y `headers` (listas `{ name, value?, secret? }` con `x-nodomics: { "widget": "key-values" }`), `format` (`json` por defecto, o `csv` o `txt`) y `records` (ruta opcional dentro del JSON, como `data.items`).
   - **Plantilla:** `SELECT * FROM {{request url query=query headers=headers format=format records=records}}`.
3. **El coordinador hace la petición.**
   - El helper `request` registra la petición como una fuente cuyo id deriva del hash de la petición.
   - Al ejecutar, el coordinador la pide con un `fetch` inyectado (`CoordinatorDeps.fetch`), sin DOM. Con `records`, extrae el arreglo de esa ruta del JSON; si no es un arreglo, el nodo da `SOURCE_UNREADABLE` con la ruta.
   - Los bytes se cargan con `exec.load` (`location: bytes`) en el ejecutor SQL.
   - La misma petición se reutiliza durante la sesión del motor; cambiar un parámetro hace una petición nueva.
4. **Credenciales.** Un elemento de `headers` o `query` puede llevar `secret: "<nombre>"` en lugar de `value`.
   - Las credenciales se guardan en el almacén `secrets` del navegador (ADR 0015), en "Mis flujos › Credenciales".
   - La interfaz pone el valor justo antes de mandar el flujo al motor (`flow.set`). El flujo guardado, exportado o compartido solo lleva el nombre.
   - Si la credencial no existe, el campo lo avisa y el motor recibe el elemento sin valor, así que la API responderá que no está autorizado.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Que cada ejecutor haga la petición (`location: url` con encabezados) | Sin pasar bytes por el coordinador | Tres implementaciones de peticiones y de rutas JSON; las credenciales viajarían a cada ejecutor |
| Que la interfaz haga la petición y suba los bytes | El motor no sabe de APIs | Rompe "los datos viven en el motor" y no se puede reproducir desde el flujo |
| `txt` siempre como una línea por fila | Regla más simple | El usuario esperaba que un `.txt` tabulado se lea como tabla |
| Credenciales cifradas con una contraseña | Más seguras en el disco | Pedir una contraseña en cada sesión; para la PoC se acepta guardarlas sin cifrar en el navegador del usuario |

## Consecuencias

- **CORS:** las peticiones salen del navegador, así que una API sin CORS no se puede leer, con ningún motor. El nodo lo muestra como error con esa pista.
- **Sin cifrar:** las credenciales quedan sin cifrar en IndexedDB del navegador del usuario. Nunca entran en el flujo.
- **Volver a pedir:** dentro de una sesión no se repite la petición; para traer datos nuevos se recarga o se cambia un parámetro.
- **Mismo `txt` en todos:** los tres ejecutores aprenden `txt` con una regla común que la suite de conformidad verifica.
