---
name: nodomics-design
description: Úsalo al diseñar o revisar interfaces de Nodomics (el hub, la portada, tarjetas, estados vacíos, selector de tema) con el lenguaje del nudo.
---

# Sistema de diseño de Nodomics: entrada para agentes

Lee primero `README.md` de esta carpeta y luego `packages/ui/lenguaje-del-nudo.md`. Ahí está la fuente de verdad; esta carpeta solo la presenta.

## Cuándo usarlo

- Vas a crear o cambiar una pantalla, una tarjeta, un estado vacío o un título del hub o de la portada.
- Vas a revisar una pantalla antes de entregarla.

## Reglas

1. Solo tokens de `@nodomics/ui`: ningún color, tamaño, radio ni fuente escritos a mano.
2. Un solo acento, `--lineage-adapt`, y la palabra clave del título destacada con él.
3. Los íconos de una idea van en un chip sólido; los de un control, sin chip.
4. Newsreader solo en títulos grandes; IBM Plex Sans en todo lo demás.
5. Reglas finas (`--brand-rule`) en vez de cajas; `--brand-surface` solo para agrupar.
6. Sin datos inventados. Sin datos hay un estado vacío con una acción.
7. Revisa claro y oscuro, a 1280 y a 390 px. Un solo `h1`, foco visible, sin guiones largos.
8. Los textos van en `apps/web/src/messages.ts`.

## Dónde está cada cosa

- Tokens: `packages/ui/src/tokens.css` (`tokens.json` es su origen) y `packages/ui/src/fonts.css`.
- Componentes: `packages/ui/src/` (`KnotMark`, `LineageStrip`, `ThreadGlyph`, `Button`, `Input`, `HubCard`) y sus estilos en `components.css`.
- Piezas de la app: `apps/web/src/hub/` (`IconChip`, `Highlighted`, `EmptyPanel`, `HubThread`, `HubLegend`) y `apps/web/src/theme/ThemeSwitch.tsx`.
- Íconos: `packages/ui/src/icons.ts`.
- Muestras: `preview/index.html`.
