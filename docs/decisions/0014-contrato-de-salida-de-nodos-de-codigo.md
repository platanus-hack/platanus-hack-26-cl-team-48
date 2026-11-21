# 0014. Contrato de salida de los nodos de código

- **Estado:** aceptada

## Contexto

El nodo "Código Python" (`core.python.custom`) devuelve lo que el código del usuario quiera. Dos problemas:

- **Columnas desconocidas antes de ejecutar:** sus columnas no se conocen hasta ejecutarlo. `schema.infer` responde "Ejecuta el flujo para conocer las columnas" para él y para todo lo que viene después, así que los selectores de columna de los nodos siguientes quedan vacíos.
- **Errores lejos de su origen:** si el código devuelve una tabla sin la columna que los nodos siguientes esperan, o no dibuja el gráfico que debía, el error aparece lejos (en otro nodo) o no aparece.

El usuario pidió que los nodos de código declaren lo que reciben y devuelven y que haya un error en línea si no se cumple.

## Decisión

Un nodo puede declarar, con parámetros, un **contrato de salida** que el coordinador usa para inferir y verificar, sin depender del lenguaje:

1. **Columnas de salida.** Un parámetro con `x-nodomics: { "widget": "port-schema", "port": "<puerto>" }` es una lista de `{ name, type: ColumnType }`.
   - **Al inferir:** si la lista no está vacía, `schema.infer` responde con ella para ese puerto sin ejecutar. Para los nodos SQL que siguen se compone una tabla vacía con esas columnas (`SELECT CAST(NULL AS <tipo>) AS "<nombre>" … LIMIT 0`), así la inferencia sigue por todo el flujo.
   - **Al ejecutar:** el coordinador compara el `ResultRef.schema` devuelto con lo declarado. Si falta una columna da `COLUMN_NOT_FOUND`; si el tipo difiere, `TYPE_MISMATCH`. En ambos casos el mensaje dice qué columna y qué se esperaba, lleva `param` apuntando al parámetro del contrato, el nodo queda en error y su resultado no se guarda en caché. Las columnas extra se permiten.
2. **Gráfico obligatorio.** Un parámetro booleano con `x-nodomics: { "widget": "switch", "requires": "display" }`: si vale `true` y la ejecución no produjo ninguna figura (ADR 0012), el nodo termina con `TYPE_MISMATCH` ("El código no mostró ningún gráfico; llama a plt.show()").
3. **`core.python.custom` los adopta.**
   - Agrega "Columnas de salida" (opcional, vacío por defecto) y "Debe mostrar un gráfico" (falso por defecto).
   - El formulario ofrece "Copiar del último resultado" para llenar las columnas desde la ejecución anterior.
   - Las entradas ya están tipadas por su esquema: el editor ya completa sus columnas (ADR 0011), así que no se declaran.

Los errores llegan como cualquier `NodeError`: en el nodo, en el parámetro del contrato y en la pestaña de error. No cambia el NEP ni los ejecutores.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Anotaciones de tipo en el código (`-> pd.DataFrame`, pandera) | Vive junto al código | Python no permite saber las columnas sin ejecutar; requiere librerías y es específico de Python |
| Verificar dentro de `main.py` del nodo | Sin tocar el coordinador | Cada lenguaje repetiría la conversión de dtypes a `ColumnType`; no ayuda a inferir sin ejecutar |
| Inferir ejecutando el código sobre una muestra vacía | Automático | Ejecuta código arbitrario al editar; muchos códigos fallan o cambian con tablas vacías |
| Puertos de entrada y salida configurables por el usuario | Más flexible | Cambia el formato del flujo; es otro problema y puede venir después sobre este contrato |

## Consecuencias

- **Coordinador:** gana una verificación tras cada tarea y una fuente más para inferir esquemas, ambas genéricas: sirven para cualquier nodo cuyo manifiesto declare el contrato, no solo Python.
- **Contrato opcional:** sin contrato, todo funciona como hoy.
- **Errores tempranos:** el error aparece en el nodo que no cumple, no en el siguiente.
- **Dos verdades:** si el usuario cambia el código y olvida el contrato, verá el error de inmediato, que es el comportamiento buscado.
