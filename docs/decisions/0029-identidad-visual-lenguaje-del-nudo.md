# 0029. Identidad visual: lenguaje del nudo

- **Estado:** propuesta
- **Fecha:** 2026-11-22

## Contexto

La maqueta de referencia (`hub-antes-despues/index.html`, vista «Propuesta 1») plantea evolucionar la identidad visual del Hub de Nodomics hacia el concepto de "nudo" y "linaje": mostrar la hebra de quien originó una solución, las trenzas de quienes la adaptaron, los cortes en pruebas y los empalmes o reparaciones.

Actualmente, el Hub utiliza tipografía técnica uniforme (IBM Plex Sans) con títulos pequeños (13 px) o genéricos, carece de elementos visuales que narren la genealogía de un flujo de datos, y no dispone de tokens semánticos para representar linaje y marca sin interferir con los tokens funcionales existentes (estados de ejecución, tipos de datos, motores).

Se requiere incorporar una tipografía de títulos con mayor calidez y carácter editorial (Newsreader, licencia SIL OFL, la misma de IBM Plex), junto con una capa de tokens de marca y linaje (`lineage-*` y `brand-*`), manteniendo la tipografía de interfaz en IBM Plex Sans y sin alterar los tokens funcionales.

## Decisión

1. **Fuente de títulos:** Incorporar **Newsreader** (pesos 300 y 400, formato WOFF2, licencia SIL OFL) en `packages/ui/src/fonts/` y registrarla en `src/fonts.css`. La interfaz técnica del editor y la aplicación continúa usando IBM Plex Sans y Plex Mono.
2. **Capa de tokens de marca y linaje en `packages/ui/tokens.json`:**
   - `lineage-origin`: `#9ea1a8` (claro) / `#5d626e` (oscuro) — hebra de quien originó la solución.
   - `lineage-adapt`: `#2c3f9e` (claro) / `#8e9bf0` (oscuro) — hebra de quien adaptó (único acento de marca).
   - `lineage-knot`: `#181b24` (claro) / `#e8e9ec` (oscuro) — nudos y empalmes.
   - `lineage-attention`: `#b7791f` (claro) / `#d9b06a` (oscuro) — estado «se enreda» (conflicto o atención).
   - `brand-paper`: `#f6f6f4` (claro) / `#121418` (oscuro) — fondo base de portada / papel.
   - `brand-surface`: `#ffffff` (claro) / `#1a1d23` (oscuro) — fondo de tarjetas y componentes sobre papel.
   - `brand-rule`: `#e2e2de` (claro) / `#2a2e36` (oscuro) — reglas divisorias finas.
   - `text-display`: Newsreader 300, `clamp(2rem, 4vw, 3.1rem)`, interlineado 1.05, tracking -0.02em.
   - `text-display-sm`: Newsreader 400, 1.32rem, interlineado 1.2.
3. **Acento global:** Mantener por defecto `accent` en `#1f57c3` para no alterar contrastes en el lienzo y controles funcionales. Se abre la pregunta al líder sobre si `accent` debe unificarse a añil (`#2c3f9e`) en toda la app o conservarse diferenciado.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Mantener solo IBM Plex Sans | Cero dependencias y archivos de fuentes adicionales. | Carece del carácter editorial y la jerarquía que necesita la portada y los recorridos. |
| Reemplazar toda la interfaz con Newsreader o Geist | Unificación de familias. | Inadecuado para datos densos, tablas, números y lienzos técnicos donde IBM Plex destaca. |
| Cambiar `accent` inmediatamente a añil (#2c3f9e) | Mayor consistencia con el acento de linaje. | Riesgo de regresión visual en botones y estados funcionales del editor antes de evaluar contraste. |

## Consecuencias

- **Positivas:** Permite renderizar la portada, las tarjetas con línea de linaje y la leyenda de estados con fidelidad a la maqueta de diseño, con soporte claro y oscuro automático basado en tokens.
- **Invariantes respetados:** No se tocan los tokens funcionales (`status-*`, `type-*`, `engine-*`, `trust-*`, `ai-*`, `collab-*`). Ningún valor de estilo se escribe a mano en la aplicación.
- **Impacto de paquete:** Suma ~30–40 KB en archivos WOFF2 locales en `@nodomics/ui`, asegurando funcionamiento offline y sin peticiones externas.
