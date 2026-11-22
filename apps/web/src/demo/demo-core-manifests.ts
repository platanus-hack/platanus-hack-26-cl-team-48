import type { NodeManifest } from "@nodomics/protocol";

/* Copies of the engine's core manifests (packages/nodes-core), so the demo snapshots carry their catalog
 * without the interface importing the engine (CLAUDE.md §1.1). */

export const CORE_SOURCE_CSV_MANIFEST: NodeManifest = {
  id: "core.source.csv",
  version: "0.1.0",
  name: "Archivo",
  description: "Lee un archivo CSV, JSON, Parquet o de texto que subiste.",
  category: "Fuentes",
  icon: "file-spreadsheet",
  inputs: [],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      sourceId: { title: "Archivo", type: "string", "x-nodomics": { widget: "source" } },
    },
    required: ["sourceId"],
  },
  impl: { kind: "sql", template: "SELECT * FROM {{source sourceId}}" },
};

export const CORE_FILTER_MANIFEST: NodeManifest = {
  id: "core.filter",
  version: "0.1.0",
  name: "Filtrar",
  description: "Conserva las filas que cumplen una condición.",
  category: "Transformar",
  icon: "filter",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      column: { title: "Columna", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      op: { title: "Operador", enum: ["=", "!=", ">", "<", ">=", "<=", "contiene"], default: "=" },
      value: { title: "Valor", type: "string" },
    },
    required: ["column", "value"],
  },
  impl: {
    kind: "sql",
    template:
      "SELECT * FROM {{in}} WHERE {{#if (eq op 'contiene')}}CAST({{ident column}} AS VARCHAR) ILIKE {{lit (concat '%' value '%')}}{{else}}{{ident column}} {{op}} {{lit value}}{{/if}}",
  },
};

export const CORE_VIEW_BAR_MANIFEST: NodeManifest = {
  id: "core.view.bar",
  version: "0.1.0",
  name: "Gráfico de barras",
  description: "Compara un valor agregado entre categorías.",
  category: "Vistas",
  icon: "chart-column",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "chart" }],
  params: {
    type: "object",
    properties: {
      x: { title: "Eje X", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      y: {
        title: "Eje Y",
        type: "string",
        "x-nodomics": { widget: "column", of: "in", types: ["number"] },
      },
      aggregate: {
        title: "Agregación",
        oneOf: [
          { const: "sum", title: "Suma" },
          { const: "mean", title: "Promedio" },
          { const: "count", title: "Conteo" },
          { const: "min", title: "Mínimo" },
          { const: "max", title: "Máximo" },
        ],
        default: "sum",
      },
    },
    required: ["x", "y"],
  },
  impl: {
    kind: "view",
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: "bar",
      encoding: {
        x: { field: "{{x}}", type: "nominal" },
        y: { field: "{{y}}", type: "quantitative", aggregate: "{{aggregate}}" },
      },
    },
  },
};

export const CORE_JOIN_MANIFEST: NodeManifest = {
  id: "core.join",
  version: "0.1.0",
  name: "Unir tablas",
  description: "Une dos tablas por columnas que coinciden.",
  category: "Transformar",
  icon: "merge",
  inputs: [
    { id: "left", name: "Izquierda", type: "table" },
    { id: "right", name: "Derecha", type: "table" },
  ],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      leftColumn: {
        title: "Columna izquierda",
        type: "string",
        "x-nodomics": { widget: "column", of: "left" },
      },
      rightColumn: {
        title: "Columna derecha",
        type: "string",
        "x-nodomics": { widget: "column", of: "right" },
      },
      how: { title: "Tipo de unión", enum: ["INNER", "LEFT", "RIGHT", "FULL"], default: "INNER" },
    },
    required: ["leftColumn", "rightColumn"],
  },
  impl: {
    kind: "sql",
    template:
      "SELECT * FROM {{left}} AS l {{how}} JOIN {{right}} AS r ON l.{{ident leftColumn}} = r.{{ident rightColumn}}",
  },
};

export const CORE_CAST_MANIFEST: NodeManifest = {
  id: "core.cast",
  version: "0.1.0",
  name: "Convertir tipos",
  description:
    "Cambia el tipo de las columnas que se leyeron mal, como fechas o números guardados como texto.",
  category: "Transformar",
  icon: "arrow-right-left",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      conversions: {
        title: "Conversiones",
        type: "array",
        items: {
          type: "object",
          properties: {
            column: {
              title: "Columna",
              type: "string",
              "x-nodomics": { widget: "column", of: "in" },
            },
            to: {
              title: "Convertir a",
              oneOf: [
                { const: "number", title: "Número (1234.5)" },
                { const: "number-comma", title: "Número con coma decimal (1.234,5)" },
                { const: "text", title: "Texto" },
                { const: "date-iso", title: "Fecha (2024-12-31)" },
                { const: "date-dmy", title: "Fecha (31/12/2024)" },
                { const: "date-mdy", title: "Fecha (12/31/2024)" },
                { const: "datetime", title: "Fecha y hora" },
                { const: "bool", title: "Verdadero o falso" },
              ],
              default: "number",
            },
          },
          required: ["column", "to"],
        },
        default: [],
      },
    },
    required: ["conversions"],
  },
  impl: {
    kind: "sql",
    template:
      'SELECT *{{#if conversions}} REPLACE ({{#each conversions}}{{#unless @first}}, {{/unless}}{{#if (eq to "number")}}TRY_CAST({{ident column}} AS DOUBLE){{/if}}{{#if (eq to "number-comma")}}TRY_CAST(REPLACE(REPLACE(CAST({{ident column}} AS VARCHAR), \'.\', \'\'), \',\', \'.\') AS DOUBLE){{/if}}{{#if (eq to "text")}}CAST({{ident column}} AS VARCHAR){{/if}}{{#if (eq to "date-iso")}}TRY_CAST(CAST({{ident column}} AS VARCHAR) AS DATE){{/if}}{{#if (eq to "date-dmy")}}COALESCE(CAST(TRY_STRPTIME(CAST({{ident column}} AS VARCHAR), \'%d/%m/%Y\') AS DATE), TRY_CAST(CAST({{ident column}} AS VARCHAR) AS DATE)){{/if}}{{#if (eq to "date-mdy")}}COALESCE(CAST(TRY_STRPTIME(CAST({{ident column}} AS VARCHAR), \'%m/%d/%Y\') AS DATE), TRY_CAST(CAST({{ident column}} AS VARCHAR) AS DATE)){{/if}}{{#if (eq to "datetime")}}TRY_CAST({{ident column}} AS TIMESTAMP){{/if}}{{#if (eq to "bool")}}TRY_CAST({{ident column}} AS BOOLEAN){{/if}} AS {{ident column}}{{/each}}){{/if}} FROM {{in}}',
  },
};

export const CORE_FORMULA_MANIFEST: NodeManifest = {
  id: "core.formula",
  version: "0.1.0",
  name: "Columna calculada",
  description: "Agrega una columna que opera otra columna con una columna o un valor.",
  category: "Transformar",
  icon: "calculator",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      name: { title: "Nombre", type: "string", default: "resultado" },
      column: { title: "Columna", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      op: { title: "Operación", enum: ["+", "-", "*", "/"], default: "*" },
      otherColumn: {
        title: "Otra columna",
        type: "string",
        "x-nodomics": { widget: "column", of: "in" },
      },
      value: { title: "Valor", type: "number" },
    },
    required: ["name", "column", "op"],
  },
  impl: {
    kind: "sql",
    template:
      "SELECT *, {{ident column}} {{op}} {{#if otherColumn}}{{ident otherColumn}}{{else}}{{lit value}}{{/if}} AS {{ident name}} FROM {{in}}",
  },
};

export const CORE_GROUP_MANIFEST: NodeManifest = {
  id: "core.group",
  version: "0.1.0",
  name: "Agrupar",
  description: "Agrupa las filas y calcula agregaciones por grupo.",
  category: "Transformar",
  icon: "layers",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      groupBy: {
        title: "Agrupar por",
        type: "array",
        items: { title: "Columna", type: "string", "x-nodomics": { widget: "column", of: "in" } },
        default: [],
      },
      aggregations: {
        title: "Agregaciones",
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            column: {
              title: "Columna",
              type: "string",
              "x-nodomics": { widget: "column", of: "in" },
            },
            fn: { title: "Función", enum: ["SUM", "AVG", "MIN", "MAX", "COUNT"], default: "SUM" },
            name: { title: "Nombre", type: "string" },
          },
          required: ["column", "fn", "name"],
        },
      },
    },
    required: ["aggregations"],
  },
  impl: {
    kind: "sql",
    template:
      "SELECT {{#each groupBy}}{{ident this}}, {{/each}}{{#each aggregations}}{{#unless @first}}, {{/unless}}{{fn}}({{ident column}}) AS {{ident name}}{{/each}} FROM {{in}}{{#if groupBy}} GROUP BY {{#each groupBy}}{{#unless @first}}, {{/unless}}{{ident this}}{{/each}} ORDER BY {{#each groupBy}}{{#unless @first}}, {{/unless}}{{ident this}}{{/each}}{{/if}}",
  },
};

export const CORE_SORT_MANIFEST: NodeManifest = {
  id: "core.sort",
  version: "0.1.0",
  name: "Ordenar",
  description: "Ordena las filas por una columna.",
  category: "Transformar",
  icon: "arrow-up-down",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      column: { title: "Columna", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      direction: { title: "Dirección", enum: ["ASC", "DESC"], default: "ASC" },
    },
    required: ["column"],
  },
  impl: { kind: "sql", template: "SELECT * FROM {{in}} ORDER BY {{ident column}} {{direction}}" },
};

export const CORE_VIEW_LINE_MANIFEST: NodeManifest = {
  id: "core.view.line",
  version: "0.1.0",
  name: "Gráfico de líneas",
  description: "Muestra cómo cambia un valor a lo largo de una fecha, un número o una categoría.",
  category: "Vistas",
  icon: "chart-line",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "chart" }],
  params: {
    type: "object",
    properties: {
      x: {
        title: "Eje X",
        type: "string",
        "x-nodomics": { widget: "column", of: "in", types: ["date", "number", "text"] },
      },
      y: {
        title: "Eje Y",
        type: "string",
        "x-nodomics": { widget: "column", of: "in", types: ["number"] },
      },
      aggregate: {
        title: "Agregación",
        oneOf: [
          { const: "sum", title: "Suma" },
          { const: "mean", title: "Promedio" },
          { const: "count", title: "Conteo" },
          { const: "min", title: "Mínimo" },
          { const: "max", title: "Máximo" },
        ],
        default: "sum",
      },
      timeUnit: {
        title: "Agrupar fechas por",
        oneOf: [
          { const: null, title: "Sin agrupar" },
          { const: "yearmonthdate", title: "Día" },
          { const: "yearweek", title: "Semana" },
          { const: "yearmonth", title: "Mes" },
          { const: "yearquarter", title: "Trimestre" },
          { const: "year", title: "Año" },
        ],
        default: "yearmonth",
        "x-nodomics": { when: { param: "x", types: ["date"] } },
      },
      series: {
        title: "Series",
        type: "string",
        "x-nodomics": { widget: "column", of: "in", types: ["text", "bool"] },
      },
    },
    required: ["x", "y"],
  },
  impl: {
    kind: "view",
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "line", point: true },
      encoding: {
        x: {
          field: "{{x}}",
          type: "{{vegaType x}}",
          timeUnit: { unit: "{{timeUnit}}", utc: true },
        },
        y: { field: "{{y}}", type: "quantitative", aggregate: "{{aggregate}}" },
        color: { field: "{{series}}", type: "nominal" },
      },
    },
  },
};

export const CORE_VIEW_TABLE_MANIFEST: NodeManifest = {
  id: "core.view.table",
  version: "0.1.0",
  name: "Tabla",
  description: "Muestra las primeras filas de las columnas elegidas.",
  category: "Vistas",
  icon: "table-2",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "chart" }],
  params: {
    type: "object",
    properties: {
      columns: {
        title: "Columnas",
        type: "array",
        minItems: 1,
        items: { title: "Columna", type: "string", "x-nodomics": { widget: "column", of: "in" } },
      },
      rows: { title: "Filas", type: "integer", minimum: 1, maximum: 1000, default: 20 },
    },
    required: ["columns"],
  },
  impl: {
    kind: "view",
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      transform: [
        { window: [{ op: "row_number", as: "fila" }] },
        { filter: "datum.fila <= {{rows}}" },
        { fold: "{{columns}}", as: ["columna", "valor"] },
      ],
      encoding: {
        x: {
          field: "columna",
          type: "nominal",
          sort: "{{columns}}",
          bandPosition: 0,
          scale: { type: "band", paddingInner: 0, paddingOuter: 0 },
          axis: { orient: "top", title: null, labels: false, ticks: false },
        },
        y: {
          field: "fila",
          type: "ordinal",
          axis: {
            title: null,
            labels: false,
            ticks: false,
            domain: false,
            grid: true,
            bandPosition: 1,
          },
        },
      },
      layer: [
        {
          transform: [{ filter: "datum.fila == 1" }],
          mark: { type: "text", align: "left", dx: 8, dy: -12, fontWeight: "bold" },
          encoding: { y: { value: 0 }, text: { field: "columna" } },
        },
        { mark: { type: "text", align: "left", dx: 8 }, encoding: { text: { field: "valor" } } },
      ],
    },
  },
};

export const CORE_MANIFESTS: Readonly<Record<string, NodeManifest>> = {
  "core.source.csv": CORE_SOURCE_CSV_MANIFEST,
  "core.filter": CORE_FILTER_MANIFEST,
  "core.view.bar": CORE_VIEW_BAR_MANIFEST,
  "core.join": CORE_JOIN_MANIFEST,
  "core.cast": CORE_CAST_MANIFEST,
  "core.formula": CORE_FORMULA_MANIFEST,
  "core.group": CORE_GROUP_MANIFEST,
  "core.sort": CORE_SORT_MANIFEST,
  "core.view.line": CORE_VIEW_LINE_MANIFEST,
  "core.view.table": CORE_VIEW_TABLE_MANIFEST,
};
