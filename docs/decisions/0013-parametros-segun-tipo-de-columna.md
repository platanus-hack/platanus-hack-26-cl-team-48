# 0013. Parámetros que dependen del tipo de columna

- **Estado:** aceptada

## Contexto

Los nodos eligen columnas con el widget `column`, que ofrece todas las columnas de la entrada sin importar su tipo. El gráfico de líneas (`core.view.line`) trata siempre el eje X como fecha y aplica siempre "Agrupar fechas por": con una columna de texto o número el gráfico sale mal, y la agrupación no se puede quitar porque un parámetro sin valor vuelve a su `default` (`applyParamDefaults`). El usuario pidió que las opciones se habiliten según el tipo de los campos y poder quitar las que no aplican.

Los tipos ya se conocen sin ejecutar: los detecta la fuente, `schema.infer` y `ResultRef.schema` los devuelven (`ColumnType`), y la interfaz los muestra en el selector de columnas. Cuando la detección falla (fechas o números guardados como texto), el nodo "Convertir tipos" (`core.cast`) los corrige.

## Decisión

Cuatro extensiones de `x-nodomics` en los parámetros del manifiesto, sin cambios en el NEP:

1. **Tipos aceptados.** El widget `column` acepta `types: ColumnType[]`.
   - El formulario muestra primero las columnas compatibles y las demás deshabilitadas, indicando su tipo.
   - Antes de ejecutar un nodo (y al pedir `data.view`), el coordinador compara cada columna elegida con el esquema de su entrada: si no existe devuelve `COLUMN_NOT_FOUND` y si su tipo no está en `types`, `TYPE_MISMATCH`, ambos con `param`. La interfaz muestra lo mismo en línea con el esquema que ya conoce, sin esperar a ejecutar.
2. **Parámetros condicionales.** `when: { "param": "<parámetro de columna>", "types": ColumnType[] }`: el parámetro solo aplica si la columna elegida en `param` es de uno de esos tipos. El formulario lo oculta si no aplica; el coordinador lo trata como no definido (no lo valida, no le aplica su `default` y no lo pasa a la plantilla).
3. **Quitar valores opcionales.**
   - Un parámetro opcional sin `default` con opciones (enum o columna) ofrece "Sin valor" ("Quitar" en las columnas).
   - Uno con `default` solo se puede quitar si su `oneOf` incluye `{ "const": null, "title": "…" }` (por ejemplo "Sin agrupar"); así un operador o una función con valor por defecto no se quedan vacíos por accidente.
   - Quitar guarda `null`, que `applyParamDefaults` respeta (no le aplica el `default`) y que el coordinador trata como no definido al validar y al renderizar.
4. **Plantillas de vista.**
   - Una propiedad cuyo valor usa un parámetro no definido (vacío, `null` u oculto) se omite. Un objeto que tenía parámetros y los perdió todos también se omite (así `"color": { "field": "{{color}}", "type": "nominal" }` desaparece si no hay serie).
   - Nuevo marcador `{{vegaType x}}`: el tipo Vega-Lite de la columna elegida en `x` según su `ColumnType`. `date` da `temporal`, `number` da `quantitative` y el resto `nominal`.

`core.view.line` y `core.view.bar` pasan a usarlas:
- **Eje X:** acepta fecha, número o texto.
- **Eje Y:** acepta número.
- **"Agrupar fechas por":** solo aparece si X es fecha, con "Sin agrupar" entre sus opciones.
- **Gráfico de líneas:** gana "Series" (columna de texto opcional) para dibujar una línea por grupo.

Los valores guardados siguen siendo válidos (mismos nombres y valores de parámetros), así que los flujos existentes se abren igual.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Solo el nodo "Convertir tipos", sin tipos en los parámetros | Ningún cambio de manifiesto | El gráfico sigue aceptando columnas que no puede dibujar y sigue sin poder quitar la agrupación |
| Convertir tipos dentro de cada nodo que recibe datos | Un nodo menos en el flujo | Cada nodo repite la conversión y los nodos intermedios siguen viendo el tipo equivocado |
| Condiciones generales (expresiones JSON Schema `if/then`) | Estándar | Difícil de leer y de llevar a la interfaz; los casos reales solo dependen del tipo de una columna |
| Un manifiesto distinto por tipo de eje (línea temporal, línea numérica) | Sin condiciones | Multiplica nodos y obliga al usuario a saber cuál elegir |

## Consecuencias

El formulario, la validación del coordinador y el relleno de vistas aprenden tres claves nuevas (`types`, `when`, `vegaType`) y el valor `null`; la guía de `nodes-core` las documenta. Los errores de tipo aparecen en el parámetro antes de ejecutar. Cada condición depende de un solo parámetro de columna; si un día hace falta combinar condiciones, se revisará en otro ADR.
