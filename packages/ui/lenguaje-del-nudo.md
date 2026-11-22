# Lenguaje del nudo

Esta es la identidad visual del Hub (ADR 0032, todavía como propuesta). Complementa este README: aquí se explica cómo se combinan los tokens y los componentes para que la interfaz se vea propia y no genérica.

## La idea

Cada solución es un hilo. Alguien la crea, otras personas la adaptan, la prueban y la mejoran, y cada paso queda como un nudo en ese hilo. Los nudos se dibujan, no se describen.

## Reglas

1. **Un solo acento.** El color de acción y de marca es `--lineage-adapt`. No hay un segundo color de acento en la misma página.
2. **La palabra clave se destaca.** En cada título grande, la palabra que importa va en el color de acento y el resto en `--ink`. Usa `Highlighted`; nunca HTML en los mensajes.
3. **Íconos en chip sólido.** Los íconos que acompañan a una idea (los pasos del hilo, lo que se comparte, los estados vacíos) van dentro de un círculo relleno con el acento y el glifo en el color del fondo. Usa `IconChip`. Los íconos de controles (botones, campos) siguen sin chip.
4. **Títulos con Newsreader y la interfaz con IBM Plex Sans.** `--font-display` solo se usa en títulos grandes (`--text-display`, `--text-display-sm`). Todo lo demás va con `--font-sans`.
5. **Separar con reglas finas, no con cajas.** Las secciones y las tarjetas del Hub se separan con `--brand-rule` en hairline. Las cajas con fondo (`--brand-surface`) se usan solo cuando agrupan algo, como el recorrido o los tiles de lo que se comparte.
6. **Nada inventado.** No se muestran nombres, lugares ni cifras de ejemplo como si fueran datos reales. Si no hay datos, se muestra un estado vacío con una acción.
7. **Claro y oscuro desde el principio.** Toda pantalla se revisa en ambos temas. La persona elige el tema con `ThemeSwitch`, y su elección se comparte con el editor.
8. **Movimiento solo como respuesta.** Las transiciones responden a pasar el mouse, presionar o cambiar de tema, y se apagan con `prefers-reduced-motion`.

## Tokens de marca y linaje

| Token | Uso |
|---|---|
| `--brand-paper` | Papel de marca. Las piezas que dibujan halos usan `--nd-glyph-halo`, que cada contexto ajusta a su fondo real. |
| `--brand-surface` | Fondo de bandas y cajas que agrupan, como el hilo de la portada, los tiles y el recorrido. |
| `--brand-rule` | Reglas finas entre secciones y tarjetas. |
| `--lineage-origin` | Tramo del hilo de quien creó la solución. |
| `--lineage-adapt` | Acento único. Se usa en el tramo adaptado, en los chips, en la palabra destacada y en las acciones. |
| `--lineage-knot` | El nudo donde el hilo cambia de manos. |
| `--lineage-attention` | Se usa solo cuando algo pide atención, como un choque o una prueba fallida. |
| `--font-display` | Newsreader 300/400, solo para títulos. |

Cada pieza que dibuja un cruce de hilos lee `--nd-glyph-halo`. Fíjalo al fondo real del contexto (barra, banda o tarjeta) para que el cruce no deje una mancha.

## Componentes

**En `@nodomics/ui`:**

| Componente | Para qué |
|---|---|
| `KnotMark` | El símbolo de la marca, en la barra superior. |
| `LineageStrip` | La línea de linaje de una tarjeta. Por ahora solo muestra el origen, porque el Hub todavía no guarda adaptaciones. |
| `ThreadGlyph` | Los seis estados del hilo de la leyenda: se cruza, se trenza, se enreda, se desenreda, se triza y se empalma. |

**En `apps/web`:** son piezas de la app; se suben a `@nodomics/ui` cuando haya un tercer uso.

| Componente | Para qué |
|---|---|
| `IconChip` (`hub/IconChip.tsx`) | Ícono dentro de un chip sólido con el acento. |
| `Highlighted` (`hub/Highlighted.tsx`) | Título con la palabra clave en el color de acento. |
| `EmptyPanel` (`hub/EmptyPanel.tsx`) | Estado vacío con chip, una línea y una acción. |
| `HubThread` (`hub/HubThread.tsx`) | El hilo de la portada: tres nudos alineados con sus títulos, dibujados solo con CSS. |
| `HubLegend` (`hub/HubLegend.tsx`) | Leyenda de los estados del hilo, dentro de «Para ti». |
| `ThemeSwitch` (`theme/ThemeSwitch.tsx`) | Selector «Claro / Oscuro» de la barra. |

## Estructura del Hub

**Sin sesión: la portada.**

- Título con la palabra destacada, subtítulo y buscador.
- Las publicaciones recientes, o los resultados de la búsqueda.
- El hilo de tres nudos.
- «Qué puedes compartir».
- Banda de cierre con «Entrar».

**Con sesión: el Hub de la persona.**

- Pestañas «Para ti», «Mis flujos» y «Personas», más la acción «Abrir editor».
- En «Para ti», una columna de filtros: Explorar, Tipo y Etiquetas. En el celular pasa a ser una fila.

## Antes de entregar una pantalla

- [ ] Se usan solo tokens, sin colores, `px` de tipografía ni fuentes escritas a mano.
- [ ] Hay un solo acento y la palabra clave destacada en el título.
- [ ] La página tiene un solo `h1`, foco visible y `aria-hidden` en lo decorativo.
- [ ] Se revisó en claro y en oscuro, en escritorio y a 390 px.
- [ ] No hay datos inventados, y los estados vacíos llevan una acción.
- [ ] No hay guiones largos en los textos, y todos los textos están en `messages.ts`.
