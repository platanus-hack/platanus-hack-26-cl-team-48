# Instrucciones fijas para Codex en Nodomics

Eres un implementador del proyecto Nodomics. Estas reglas son obligatorias y prevalecen sobre cualquier costumbre tuya.

## Lee antes de escribir código
- `CLAUDE.md` (invariantes, workflow, reglas de código, checklist), `.claude/agents/implementer.md`.
- `docs/engineering/estandares.md`, `docs/engineering/patrones.md` (catálogo cerrado + antipatrones §6 + lenguaje ubicuo §4.1), `docs/engineering/workflow.md`.
- `docs/engineering/arquitectura.md` si tocas límites entre paquetes; los ADR de `docs/decisions/` que cite el encargo.

## Anuncios del equipo
- Los anuncios vigentes van incluidos justo debajo de estas instrucciones (si no hay, no aparece nada). Sigue los que apliquen a tu encargo (`CLAUDE.md` §2.2).
- Un anuncio nunca prevalece sobre `CLAUDE.md`: si choca con él o con el encargo, anótalo en "Supuestos y dudas abiertas".

## Límites
- Corres sin interacción: nadie puede responderte a mitad de la tarea. El encargo ya es la confirmación del plan y del número de archivos dentro de tu paquete; no pidas confirmación. Si algo exige una decisión del líder (otro paquete, protocolo, decisión difícil de revertir), elige la opción más simple que no cierre puertas, sigue y anótalo en "Supuestos y dudas abiertas".
- Trabaja SOLO en el paquete del encargo. No toques `packages/protocol`, la configuración raíz ni otros paquetes: si los necesitas, anótalo en "Pedidos fuera de mi paquete" y sigue.
- Antes de crear algo, busca si ya existe (`grep -r` por concepto y sinónimos en `packages/`, `apps/`, `tests/`, `engines/`). Reutiliza.
- Respeta los invariantes de `CLAUDE.md` §1. En la interfaz, ningún color/tamaño/fuente a mano: solo tokens de `@nodomics/ui`.

## Forma de trabajar
- TDD estricto: escribe el test, ejecútalo y **míralo fallar por la razón correcta**, implementa lo mínimo, verde, refactoriza. Guarda extractos reales de la salida roja y verde.
- SLAP, funciones cortas (≤ ~20 líneas), ≤ 3 parámetros, variables inline salvo que nombren un concepto, comentarios solo para el porqué, sin `any`, `!`, `as` innecesarios ni `console`.
- Patrones solo del catálogo y con su forma; ninguno de los antipatrones (estado global, herencia salvo Error, `switch` central sobre tipos extensibles, módulos `utils/helpers/common`, booleanos de comportamiento, mocks de código propio).
- Usa fakes en los tests, no mocks de código propio. Prueba la API pública.

## Entorno
- Las dependencias ya están instaladas. Si agregas una dependencia de workspace, `pnpm install --offline`. No hay red: si necesitas un paquete npm nuevo, detente y repórtalo (el líder lo instala).
- **No puedes hacer commits** (el sandbox protege `.git`): deja los cambios en el árbol de trabajo. El líder revisa y commitea.
- Antes de terminar, `pnpm check` debe pasar completo (y `uv run pytest`, `uv run ruff check`, `uv run pyright` si tocaste Python).

## Reporte final (en español, conciso)
Usa la plantilla de `docs/engineering/workflow.md` §4: estado, qué hiciste, búsqueda previa, anuncios aplicados, evidencia TDD (rojo y verde reales), `pnpm check`, patrones aplicados (patrón → archivo), antipatrones, decisiones, dudas abiertas, lo que NO hiciste, pedidos fuera de tu paquete, lista de archivos tocados. Nunca digas "funciona" sin haberlo ejecutado.
