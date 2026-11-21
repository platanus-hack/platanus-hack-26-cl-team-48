# 0006. Fuentes cargadas en el ejecutor y plantillas SQL con Handlebars

- **Estado:** aceptada

## Contexto

Los nodos SQL son plantillas en texto (ADR 0002) que renderiza el coordinador. Hacía falta decidir el motor de plantillas y cómo un nodo fuente lee un archivo que el usuario subió, sin que la interfaz ni el flujo compartido contengan los datos.

## Decisión

1. **Plantillas:** el coordinador usa `handlebars` (MIT) con ayudantes propios y registrados de forma explícita: `ident` (identificador escapado), `lit` (literal escapado), `source` (tabla de una fuente), `eq` y `concat`. Los puertos de entrada se escriben como `{{in}}`, `{{left}}`, etc., y el coordinador los reemplaza por alias de tabla.
2. **Fuentes:** `source.add` registra la fuente en el motor; el coordinador la carga en el ejecutor con `exec.load` (bytes, URL o ruta local) y obtiene un `ResultRef`. Un nodo fuente es SQL normal: `SELECT * FROM {{source sourceId}}`. `source` se renderiza como un alias de entrada ligado a ese resultado, así que la fuente viaja entre ejecutores con el mismo mecanismo Arrow que cualquier resultado.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Renderizador propio | Sin dependencia | Bucles, condicionales y escapes que reescribir y probar |
| `handlebars` | Maduro, sin lógica arbitraria, también existe en Python | Una dependencia de runtime en el coordinador |
| Fuente como ayudante que lee rutas dentro del SQL | Simple en DuckDB | Cada ejecutor lee archivos a su manera; no sirve con bytes subidos |

## Consecuencias

- Los ejecutores no conocen plantillas ni fuentes: reciben SQL final y tablas por alias.
- Agregar un formato de fuente es agregar un valor a `SourceFormat` y soportarlo en `exec.load` de cada ejecutor.
