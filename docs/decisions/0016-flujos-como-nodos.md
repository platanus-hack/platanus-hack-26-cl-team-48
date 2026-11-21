# 0016. Flujos que se usan como nodos

- **Estado:** aceptada

## Contexto

"Convertir en nodo" corta una selección del lienzo y la congela en un manifiesto `impl.kind = "flow"`. Tiene cuatro problemas:

- Los puertos salen de las conexiones que cruzan la selección, y los parámetros internos quedan fijos.
- No tiene nombre propio ni descripción.
- No se puede editar.
- No se puede probar por separado.

El usuario la descartó y pidió otra cosa: que un flujo guardado (ADR 0015) se pueda usar como nodo cuando contiene una fuente especial que lo define. Esa fuente declara el nombre del nodo y sus entradas (cuántas, nombre y tipo), y no exige columnas, porque no todo es una tabla. También pidió tipos de puerto más allá de `table` y parámetros desde el principio.

El coordinador ya expande nodos `impl.kind = "flow"` (`expand-subflows.ts`) con los nodos internos `flow.input` y `flow.output`. Todos los datos que pasan entre nodos son resultados tabulares (`ResultRef`).

## Decisión

1. **Nodo "Entrada de nodo"** (`flow.node`, `impl: { kind: "builtin", name: "flow.node" }`, categoría "Flujo"). Sus parámetros definen el nodo:
   - `name` (obligatorio) y `description`.
   - `inputs`: lista de `{ name, type }`, con `x-nodomics: { "widget": "ports" }`. Los tipos permitidos son `table`, `column`, `value`, `geo` y `any`. `image`, `model` y `chart` quedan fuera porque el motor no transporta esos datos entre nodos.
   - `params`: lista de `{ id, title, node, param }`, con `x-nodomics: { "widget": "node-params" }`. Cada elemento expone el parámetro `param` del nodo interno `node` como parámetro del nodo compuesto.
2. **Puertos que salen de los parámetros** (cambio en `@nodomics/protocol`).
   - Un parámetro con `widget: "ports"` declara puertos de paso: cada elemento da una salida y una entrada con el mismo id y tipo.
   - El id es `portIdOf(name)`, el nombre en minúsculas, sin acentos y con `_` en lugar de lo que no sea `[a-z0-9]`. El nombre original queda como `name` del puerto.
   - `nodePorts(manifest, params)` devuelve los puertos efectivos de un nodo. La interfaz y el coordinador lo usan en lugar de `manifest.inputs`/`outputs`.
   - `BuiltinImpl.name` agrega `"flow.node"`.
3. **Probar el flujo solo.** En el flujo que se edita, "Entrada de nodo" deja pasar lo que se conecte a cada entrada (datos de prueba). El coordinador ejecuta una copia por puerto (`SELECT * FROM <entrada>`). Sin datos de prueba la entrada falta (`INPUT_MISSING`, "Conecta la entrada …"), como en cualquier nodo.
4. **Salidas.** El nodo existente `flow.output` pasa a llamarse "Salida de nodo". Su parámetro `name` da el nombre del puerto, y el tipo del puerto es el de lo que se le conecte. En el flujo que se edita no hace nada.
5. **Del flujo al manifiesto** (función pura en la interfaz). Un flujo guardado con exactamente una "Entrada de nodo" y al menos una "Salida de nodo" da un `NodeManifest`:
   - `id: "mine.<id del flujo>"`, `category: "Mis nodos"`, nombre y descripción de la entrada.
   - **Puertos:** las entradas declaradas y las salidas encontradas.
   - **Parámetros:** el esquema de cada parámetro expuesto se copia del manifiesto del nodo interno, con su `title`. Su `default` es el valor actual en el flujo. Un `x-nodomics.of` que apunta a un puerto alimentado directamente por la entrada se traduce a ese puerto; si no, se quita la pista de columna.
   - **Grafo interno:** solo los nodos de los que dependen las salidas, sin cruzar la entrada; los datos de prueba y lo que no llega a una salida se descartan.
   - **Errores** (valores, no excepciones): falta nombre, no hay salidas, hay puertos repetidos, hay más de una entrada, o el flujo se usa a sí mismo.
   - **Versión:** `0.1.0`, que sube de parche cada vez que el manifiesto guardado cambia.
6. **Dentro de otro flujo.** El coordinador expande `flow.node` como el borde de entrada del compuesto, igual que `flow.input` pero con un puerto por entrada declarada. Antes de expandir aplica los parámetros expuestos: el valor que tiene el nodo compuesto reemplaza el del parámetro `param` del nodo interno `node`. Un valor ausente deja el del flujo.
7. **"Mis nodos"** se arma con los flujos guardados que dan un manifiesto válido, más los antiguos del ADR 0009.
   - Al agregar uno al lienzo se copia su manifiesto (y los nodos propios que use por dentro) en `flow.customNodes`, para que el flujo siga siendo autocontenido.
   - Si la biblioteca tiene una versión más nueva que la copiada, el panel del nodo ofrece "Actualizar a la versión x.y.z".
   - Editar el nodo es abrir su flujo.
   - El flujo abierto no se ofrece a sí mismo en la biblioteca, y la expansión ya rechaza ciclos (`CYCLE`).
8. **Se elimina "Convertir en nodo"** (`subgraph-cut.ts`, su acción y sus mensajes). `flow.input` sigue existiendo para que los nodos ya creados funcionen, pero no aparece en la biblioteca.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Mantener "Convertir en nodo" y agregarle nombre y edición | Menos trabajo | Los puertos siguen saliendo del corte; no hay dónde probar ni definir parámetros |
| Un nodo `flow.input` por entrada y la definición en otro lado | Puertos fijos en el manifiesto | El usuario pidió definir todo en una sola fuente; la definición quedaría repartida |
| Una pestaña de configuración del nodo | Espacio para todo | Otro lugar que aprender; el usuario prefirió la fuente |
| Transportar imágenes, modelos y gráficos entre nodos | Todos los tipos | Requiere un tipo de resultado nuevo en el protocolo y en cada ejecutor; queda para otro ADR |

## Consecuencias

- **Puertos dinámicos:** los puertos de un nodo pueden depender de sus parámetros; quien lea puertos debe usar `nodePorts`.
- **Tipos de puerto:** `column`, `value` y `geo` son contratos de conexión. Los datos siguen viajando como tablas (una columna, una fila y una columna, o una tabla con geometría) y el motor no verifica su forma.
- **Autocontenidos:** un flujo que usa nodos propios sigue siéndolo; actualizar un nodo propio es explícito.
- **ADR 0009:** queda en parte reemplazado: la biblioteca personal ya no crece; solo se lee.
