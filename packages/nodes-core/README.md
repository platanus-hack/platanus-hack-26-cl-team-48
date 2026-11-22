# @nodomics/nodes-core

Nodos oficiales de Nodomics definidos como datos (ADR 0002). Ningún nodo es código TypeScript: el paquete solo exporta el catálogo ya parseado (`coreNodes`) y las URLs de los conjuntos de datos de ejemplo (`sampleDatasets`).

## Crear un nodo

1. Crea la carpeta `nodes/<id>/` (el nombre de la carpeta es el `id` del nodo).
2. Escribe `node.json` con la forma de `NodeManifest` (`packages/protocol/src/manifest.ts`). Los textos visibles (nombre, categoría, títulos de parámetros) van en español.
3. Si el nodo es Python, escribe el código en `main.py` y deja `impl` como `{ "kind": "python", "entry": "run" }`, **sin** `code`: el generador lo incrusta.
4. Escribe `cases.json` con al menos un caso. No llevan casos los nodos `builtin` ni los de recurso (`resource`, ADR 0027), porque nunca se ejecutan.
5. Regenera el catálogo: `pnpm --filter @nodomics/nodes-core generate`.
6. `pnpm check`.

`src/catalog.generated.json` **se commitea** (excepción a la regla general de no commitear archivos generados): así el catálogo se importa en el navegador y en Node sin leer el disco. Un test falla si no coincide con lo que genera el script desde `nodes/`.

## Parámetros

JSON Schema estándar. Los controles especiales se declaran con `x-nodomics.widget`:

| Widget | Uso |
|---|---|
| `column` + `of: "<puerto>"` | Elegir una columna de la tabla que llega por ese puerto. Con `types: ["date", "number"]` solo acepta esos tipos de columna (ADR 0013) |
| `switch` | Interruptor para un `boolean` (el mismo que se usa sin `x-nodomics`) |
| `port-schema` + `port: "<salida>"` | Lista de `{ name, type }`: las columnas que la salida debe tener. El motor las usa para inferir sin ejecutar y verifica el resultado (ADR 0014) |
| `key-values` | Lista de objetos `{ name, value?, secret? }`: pares de consulta o encabezados; `secret` nombra una credencial (ADR 0017) |
| `ports` | Lista de `{ name, type }` que declara puertos de paso (ADR 0016) |
| `node-params` | Lista de `{ id, title, node, param }` de parámetros expuestos (ADR 0016) |
| `source` | Elegir una fuente registrada en el motor |
| `code` + `language` | Editor de código (`sql`, `python`) |

Claves de `x-nodomics` que no eligen widget:

- `when: { "param": "<parámetro de columna>", "types": [...] }`: el parámetro solo aplica si la columna elegida en `param` es de uno de esos tipos. Si no aplica, el formulario lo oculta y el motor lo ignora.
- `requires: "display"` (en un `switch`): si vale `true`, el nodo falla cuando no muestra ninguna figura.

Un parámetro opcional sin `default` se puede dejar "Sin valor". Uno con `default` solo si su `oneOf` incluye `{ "const": null, "title": "…" }`. Quitar un valor lo guarda como `null`, y el motor lo trata como no definido.

## Plantillas SQL

Las renderiza el coordinador con Handlebars (ADR 0006). Reglas, verificadas por `src/template-safety.ts` sobre todo el catálogo:

- Para imprimir un parámetro libre, siempre `{{ident x}}` (identificador) o `{{lit x}}` (literal). Fuentes con `{{source x}}`. Peticiones API con `{{request url query=query headers=headers format=format records=records}}`: el coordinador pide la URL con los pares de consulta y encabezados, extrae la ruta opcional `records` del JSON y carga los bytes en el ejecutor. `format` admite `json` (por defecto), `csv` y `txt`.
- Sin ayudante solo se imprimen puertos de entrada (`{{in}}`, `{{left}}`…) y parámetros restringidos por `enum` (operadores, direcciones, funciones de agregación).
- `eq` y `concat` solo dentro de subexpresiones; bloques solo `if`, `unless` y `each`; nunca `{{{triple}}}`.
- Única excepción: `core.sql`, cuya consulta es SQL libre por diseño. Se envuelve en `WITH entrada AS (SELECT * FROM {{in}}) {{query}}`, así que la consulta del usuario lee la tabla `entrada`.
- No nombres un parámetro igual que un puerto de entrada.

## Plantillas de vista

`impl.spec` es una especificación Vega-Lite sin datos.

- Un string que es exactamente `"{{param}}"` se reemplaza por el valor del parámetro con su tipo (por ejemplo, un array); un `{{param}}` dentro de un texto se reemplaza como texto.
- `"{{vegaType param}}"` da el tipo Vega-Lite de la columna elegida en `param`: `temporal` si es fecha, `quantitative` si es número y `nominal` en otro caso.
- Una propiedad que usa un parámetro sin valor se omite. Un objeto que pierde así todos sus parámetros y solo conserva valores simples también se omite, por ejemplo `"color": { "field": "{{series}}", "type": "nominal" }` sin serie.

## Casos (`cases.json`)

Datos para la suite de conformidad; aquí solo se valida su forma (`src/case-shape.ts`).

```json
{
  "cases": [
    {
      "name": "keeps the first rows",
      "params": { "n": 2 },
      "inputs": { "in": { "columns": [{ "name": "x", "type": "number" }], "rows": [[1], [2], [3]] } },
      "sources": {},
      "expected": { "out": { "columns": [{ "name": "x", "type": "number" }], "rows": [[1], [2]] } }
    }
  ]
}
```

- `inputs` tiene una tabla por puerto de entrada; `expected`, un valor por puerto de salida: una tabla para puertos `table` y la especificación ya rellenada para puertos `chart`.
- `sources` (opcional) da la tabla de cada fuente por su id (`sample.ventas` para el ejemplo).
- `responses` (opcional) es un mapa de URL completa a `{ status?: number, body: <JSON o string> }`. La suite inyecta un `fetch` simulado al crear el motor: responde con ese cuerpo y estado (`200` por defecto), o `404` si no encuentra la URL, incluidos sus parámetros de consulta. No usa la red.
- El orden de las filas cuenta: si la consulta no lo fija, ordena en la plantilla o usa un caso con un resultado determinista.

## Datos de ejemplo

`datasets/ventas.csv`: 200 filas deterministas (`fecha`, `region`, `producto`, `unidades`, `precio`), expuesto como `sampleDatasets["sample.ventas"]` y leído por `core.source.sample`.
