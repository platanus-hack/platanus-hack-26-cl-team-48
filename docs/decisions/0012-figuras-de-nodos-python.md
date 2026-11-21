# 0012. Figuras de los nodos Python como vistas

- **Estado:** aceptada

## Contexto

Quien escribe Python para analizar datos espera que `plt.show()` (matplotlib, seaborn, pandas `.plot()`) muestre el gráfico, como en un notebook. Hoy un nodo Python solo puede devolver un `dict` de DataFrames: las figuras se pierden. Las referencias de resultado (`ResultRef`) describen solo tablas, y el invariante 2 pide que los datos vivan en el motor y la interfaz reciba referencias.

## Decisión

Un nodo Python puede producir, además de sus salidas, **figuras**: salidas de visualización que se muestran en el nodo y en el panel, pero que no son puertos ni fluyen a otros nodos (como las salidas de una celda de notebook).

- **Captura en los ejecutores:** antes de ejecutar el código se fija el backend `Agg` de matplotlib y se reemplaza `matplotlib.pyplot.show` por una función que guarda cada figura abierta como PNG (densidad 2×) y la cierra. Al terminar se guardan también las figuras que quedaron abiertas. Se guardan en el almacén de resultados del ejecutor, con un límite de figuras por nodo.
- **Protocolo:**
  - `DisplayRef = { id, mime: "image/png", width, height, title? }` (`title` sale del título de la figura y se usa como texto alternativo).
  - Ejecutor: el resultado correcto de `exec.run` gana `displays?: DisplayRef[]`; nueva petición `exec.display { displayId }` → `{ mime, bytes }`; `exec.drop` también libera figuras.
  - NEP: nueva notificación `node.display { rev, runId, nodeId, displays }`, emitida junto a `node.result` (y repetida para nodos en caché); nueva petición `data.display { ref }` → `{ mime, bytes }`.
  - El coordinador guarda las figuras en la entrada de caché del nodo, como sus salidas.
- **Interfaz:** un nodo con figuras muestra la primera en el nodo (modo "En nodos") y todas en la pestaña "Gráfico" del panel, como `<img>` con texto alternativo; nunca se insertan como HTML.
- **Otras librerías:** `mime` deja la puerta abierta. Altair (`application/vnd.vegalite.v5+json`) podría reutilizar la vista de gráficos existente; Plotly (HTML con scripts) queda fuera por seguridad.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| La figura como puerto de salida de tipo `image` | `DataType` ya tiene `image`; se podría conectar | `ResultRef` y toda la interfaz asumen tablas; obliga a devolver la figura en vez de `plt.show()`; no hay nodos que consuman imágenes |
| Imagen en base64 dentro de la notificación | Una sola notificación | Rompe "los datos viven en el motor"; mensajes de cientos de kB por figura |
| SVG en vez de PNG | Nítido a cualquier zoom | Un scatter grande produce SVG de varios MB; se puede agregar como `mime` opcional después |

## Consecuencias

El protocolo gana `DisplayRef`, dos peticiones y una notificación; ambos ejecutores Python capturan figuras y la suite de conformidad lo prueba con un flujo de referencia (`plt.show()` → una figura PNG). En Pyodide, matplotlib se carga bajo demanda (ADR 0011). Las figuras no son reutilizables por otros nodos; si se necesita, se evaluará el puerto `image` en otro ADR.
