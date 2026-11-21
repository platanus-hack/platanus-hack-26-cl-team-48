# 0010. Editor de código de los nodos con CodeMirror 6

- **Estado:** aceptada

## Contexto

El parámetro de código de un nodo (`x-nodomics.widget: "code"`, hoy solo Python) se edita en un `<textarea>`: sin resaltado, sin indentación automática, sin autocompletado y sin marcar la línea de un error. El panel de parámetros mide `--panel-min` de ancho, poco para escribir más de una función corta. Se pide un editor "más completo", con autocompletado de las librerías del entorno (ADR 0011) y salidas gráficas (ADR 0012).

## Decisión

La interfaz edita código con **CodeMirror 6** (MIT): `@codemirror/state`, `view`, `commands`, `language`, `lang-python`, `autocomplete` y `lint`.

- **Dónde vive:** un adaptador en `apps/web/src/form/widgets/code-editor/`; `CodeWidget` sigue siendo el widget del formulario y delega en él. No va a `@nodomics/ui` hasta que haya un segundo consumidor (regla de tres).
- **Carga diferida:** se importa con `import()` la primera vez que se muestra un widget de código, para no agrandar la carga inicial. Mientras carga se ve el `<textarea>` actual, que también queda como respaldo si la carga falla.
- **Tokens:** el tema se escribe con `EditorView.theme` usando solo variables CSS de `@nodomics/ui` (colores, fuente mono, radios); el resaltado usa los colores de tipo y tinta. `design-tokens.test.ts` lo vigila como al resto.
- **Editor ampliado:** un botón "Ampliar editor" abre el mismo editor en una superficie flotante grande sobre el lienzo (como la vista previa maximizada), con el código sincronizado; Escape la cierra y devuelve el foco.
- **Errores en el código:** cuando el motor devuelve un `NodeError` de Python, una función pura extrae del `detail` (traceback) las líneas del archivo `<code>` (el nombre con que el nodo "Código Python" compila el código del usuario) y el editor las marca con `@codemirror/lint`.
- **Accesibilidad:** el editor conserva su nombre accesible (el título del parámetro); Tab indenta y Escape seguido de Tab sale del editor (modo de foco de CodeMirror), y se explica en una pista visible.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Monaco (MIT) | El editor de VS Code, completo | ~2–3 MB, requiere workers propios, flojo en pantallas pequeñas y difícil de tematizar con variables CSS |
| `<textarea>` con resaltado superpuesto | Sin dependencias | No resuelve autocompletado, lint ni indentación; mucho código propio |
| Ace (BSD) | Maduro | API antigua, peor accesibilidad y tematización que CodeMirror 6 |

## Consecuencias

Nueva dependencia de runtime en `apps/web` (~150 kB gzip, cargados solo al editar código). El autocompletado (ADR 0011) y el marcado de errores se enchufan como extensiones de CodeMirror sin tocar el resto del formulario. Si un día otro paquete necesita el editor, se mueve a `@nodomics/ui` con su tema.
