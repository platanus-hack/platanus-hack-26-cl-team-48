# Sistema de diseño de Nodomics

Nodomics es un editor de flujos reutilizables, hechos por expertos y asistidos por agentes, y un espacio de colaboración entre personas que conocen su oficio aunque no programen.

Esta carpeta explica la identidad visual y deja páginas de muestra para verla. La fuente de verdad sigue siendo `packages/ui`: los tokens, los componentes y las reglas viven allí, y aquí no se copian.

- Reglas y componentes: [`packages/ui/lenguaje-del-nudo.md`](../../packages/ui/lenguaje-del-nudo.md)
- Decisión: [ADR 0032, identidad visual y lenguaje del nudo](../decisions/0032-identidad-visual-lenguaje-del-nudo.md)
- Guía de tokens: [`packages/ui/README.md`](../../packages/ui/README.md)

## Fundamentos de contenido

- **Español claro y concreto**, de tú a tú. Se dice qué hace la herramienta y para quién, con las palabras de quien conoce el oficio.
- **Sin eslóganes.** Cada frase tiene que poder comprobarse con lo que la persona ve en pantalla.
- **Sin datos inventados.** No se muestran nombres, lugares ni cifras de ejemplo como si fueran reales. Si no hay datos, hay un estado vacío con una acción. Un ejemplo ilustrativo se rotula como tal.
- **Sin guiones largos** en los textos de la interfaz.
- Los verbos son de acción: «Entrar», «Nuevo flujo», «Completar perfil».
- Todos los textos de la app viven en `apps/web/src/messages.ts`.

## Fundamentos visuales

- **El hilo y el nudo.** Cada solución es un hilo; cada persona que la crea, adapta, prueba o repara deja un nudo. Los nudos se dibujan: son círculos perfectos sobre una línea recta.
- **Un solo acento: `--lineage-adapt`.** Marca, acciones, chips y palabra destacada comparten el mismo color. No hay un segundo acento en la misma página.
- **La palabra clave se destaca.** En cada título grande, la palabra que importa va en el acento y el resto en tinta.
- **Chips de ícono sólidos.** Los íconos que acompañan una idea van en un círculo relleno con el acento y el glifo en el color del fondo.
- **Tipografía.** Newsreader solo para títulos grandes; IBM Plex Sans para toda la interfaz. Los pesos y tamaños salen de `--text-*`.
- **Reglas finas en vez de cajas.** Las secciones se separan con `--brand-rule` en hairline. El fondo `--brand-surface` se usa solo cuando agrupa algo.
- **Claro y oscuro desde el principio.** Cada pantalla se revisa en ambos temas, en escritorio y a 390 px.
- **Movimiento como respuesta**, nunca decorativo, y apagado con `prefers-reduced-motion`.

## Iconografía

- Los íconos están en `packages/ui/src/icons.ts`: estilo de línea, trazo 2 sobre una caja de 24, licencia ISC.
- **Íconos de control** (botones, campos): van solos, sin chip.
- **Íconos de idea** (pasos del hilo, lo que se comparte, estados vacíos): van dentro de un chip sólido, de `--space-10` de diámetro con un glifo de `--space-5`, aunque esos dos tamaños se componen con `--space-8`, `--space-2`, `--space-4` y `--space-1`.
- Los seis estados del hilo (se cruza, se trenza, se enreda, se desenreda, se triza, se empalma) se dibujan con `ThreadGlyph`.

## Índice de archivos

```
README.md                 este documento
SKILL.md                  entrada corta para agentes
tokens.css                importa los tokens reales de packages/ui
assets/
  knot-mark.svg           el símbolo de la marca
  hilo-se-cruza.svg       los seis estados del hilo,
  hilo-se-trenza.svg      con colores en currentColor
  hilo-se-enreda.svg
  hilo-se-desenreda.svg
  hilo-se-triza.svg
  hilo-se-empalma.svg
preview/
  index.html              enlaces a todas las páginas
  colors-brand.html       neutros y colores de marca
  colors-lineage.html     los cuatro colores del hilo
  type.html               Newsreader e IBM Plex Sans
  iconography.html        chips, íconos de control y glifos
  thread.html             los seis estados y el hilo de tres nudos
  components-buttons.html botones
  components-cards.html   tarjeta de publicación con su línea de linaje
  components-empty-state.html  estado vacío
  theme-switch.html       selector Claro / Oscuro
  highlight-rule.html     la palabra destacada
```

Para verlas, sirve el repositorio desde su raíz (por ejemplo `python3 -m http.server`) y abre `docs/design-system/preview/index.html`.
