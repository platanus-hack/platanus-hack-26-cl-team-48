# Workflow de desarrollo y calidad

Este proceso existe para que el trabajo de varios agentes en paralelo termine siendo **un solo sistema coherente** y para que cada instrucción de `CLAUDE.md` se cumpla de forma verificable, no por confianza.

## 1. Roles

| Rol | Quién | Responsabilidades | No hace |
|---|---|---|---|
| **Líder** | La sesión principal | Divide el trabajo, escribe los encargos, es dueño de `packages/protocol` y de los ADRs, integra, corre las puertas de calidad finales, decide en conflictos | Implementar dentro del paquete de otro agente mientras ese agente trabaja |
| **Implementador** | Subagente, uno por paquete | Implementa su encargo con TDD dentro de su paquete y reporta | Tocar otros paquetes o el protocolo; aprobarse a sí mismo |
| **Autor de tests** | Subagente independiente (`.claude/agents/test-writer.md`) | Escribe los tests de un encargo a partir de sus criterios y de la API pública, sin ver la implementación | Implementar; leer o adaptar los tests al código existente; escribir tests para su propio código |
| **Revisor** | Subagente independiente (`.claude/agents/reviewer.md`) | Revisa el cambio contra los estándares y verifica con comandos; reporta hallazgos | Editar código; revisar su propio trabajo |

Un agente nunca revisa su propio trabajo ni escribe los tests de lo que él mismo implementa.

### Implementadores y revisores de dos familias de modelos

Para repartir el consumo y obtener revisiones sin sesgo, el trabajo se reparte entre subagentes de Claude y Codex (`codex exec`):

| Trabajo | Implementa | Revisa |
|---|---|---|
| Diseño de interfaz o decisiones de arquitectura | Subagente de Claude | Codex (`scripts/codex/review.sh`) |
| Paquetes con criterios cerrados, correcciones de revisión | Codex (`scripts/codex/implement.sh` + `scripts/codex/preamble.md`) | Subagente revisor de Claude |

- La revisión siempre la hace la otra familia de modelos.
- Codex recibe siempre `scripts/codex/preamble.md` antes del encargo; el encargo usa la plantilla de §3.
- Codex no puede commitear: el líder revisa el diff, corre `pnpm check` y commitea.

## 2. Ciclo de una tarea

```
Encargo → Entender → Buscar lo existente → Plan → Tests del autor de tests
       → TDD del implementador (rojo → verde → refactor)
       → pnpm check → Autorrevisión → Reporte → Revisión independiente
       → Correcciones → Integración por el líder → Puertas finales
```

| Paso | Qué se exige | Cómo se verifica |
|---|---|---|
| Entender | Criterios de aceptación listados en el plan | Aparecen en el reporte |
| Buscar lo existente | `grep` por concepto y sinónimos en `packages/`, `apps/`, `docs/decisions/` | El reporte lista qué se buscó y qué se reutilizó |
| Plan | Pasos y archivos a tocar | Si toca otros paquetes, se detiene y pregunta |
| Tests | Los escribe el autor de tests desde los criterios, sin ver la implementación | El reporte nombra qué agente los escribió |
| TDD | Test visto en rojo antes de implementar; el implementador no edita tests ajenos | El reporte incluye la salida en rojo y luego en verde |
| `pnpm check` | Todo en verde | El revisor lo vuelve a ejecutar |
| Autorrevisión | Checklist de `CLAUDE.md` §7 | Marcada en el reporte |
| Revisión | Hallazgos verificados | Informe del revisor |
| Integración | Ramas unidas sin romper otras | El líder corre las puertas finales |

## 3. Plantilla de encargo (líder → implementador)

Todo encargo usa esta forma. Un encargo que no la cumple se devuelve al líder.

```markdown
## Encargo: <título corto>

**Paquete:** <paquete único donde se trabaja>
**Rama:** <agente>/<paquete>-<tema>

**Objetivo:** <qué debe existir al terminar, en una o dos frases>

**Criterios de aceptación:**
- [ ] <comportamiento observable y verificable>
- [ ] ...

**Contexto que debes leer:** <archivos y secciones concretas>
**Ya existe y debes reutilizar:** <tipos, funciones, fakes>
**Fuera de alcance:** <lo que no se hace en esta tarea>
**Si necesitas cambiar el protocolo u otro paquete:** detente y repórtalo.
```

## 4. Plantilla de reporte (implementador → líder)

```markdown
## Reporte: <título del encargo>

**Estado:** terminado | terminado con dudas | bloqueado

**Qué hice:** <lista breve de comportamientos implementados>

**Búsqueda previa:** <qué busqué, qué encontré, qué reutilicé>

**Evidencia TDD:** (tests escritos por: <agente>)
- Rojo: <comando + extracto de la salida del test fallando>
- Verde: <comando + extracto de la salida pasando>

**`pnpm check`:** <resultado completo resumido>

**Patrones aplicados (`patrones.md`):** <patrón → archivo donde se aplica; "ninguno" si no corresponde>
**Antipatrones:** <confirmo que no introduje ninguno de `patrones.md` §6, o explico la excepción>

**Decisiones que tomé:** <decisión → razón (reversibles)>
**Supuestos y dudas abiertas:** <lo que no estaba claro y cómo lo resolví provisoriamente>
**Lo que NO hice y por qué:** <...>
**Pedidos fuera de mi paquete:** <cambios necesarios en el protocolo u otros paquetes>

**Checklist (CLAUDE.md §7):** [x] ... (todas marcadas o explicada la excepción)
```

Un reporte que dice "funciona" sin evidencia ejecutada se considera no entregado.

## 5. Revisión independiente

El revisor recibe **el diff y el encargo, no la conclusión del implementador**, para no sesgarse.

Revisa, en este orden:
1. **Invariantes de arquitectura** (`CLAUDE.md` §1) y límites de paquete.
2. **Corrección:** ¿cumple cada criterio de aceptación? ¿Hay casos borde sin cubrir?
3. **Tests:** ¿cada comportamiento tiene test? ¿Prueban la API pública? ¿Usan fakes en vez de mocks propios?
4. **Duplicación:** ¿ya existía algo que hacía lo mismo?
5. **Patrones:** cada patrón declarado cumple su criterio "Se respeta si" de `patrones.md`; donde el problema tenía un patrón del catálogo, se usó; no hay antipatrones de `patrones.md` §6; se usa el lenguaje ubicuo (§4.1).
6. **Diseño:** SLAP, SOLID, funciones pequeñas, variables inline, nombres.
7. **Comentarios** innecesarios o código comentado.
8. **Verificación:** ejecuta `pnpm check` él mismo.

Cada hallazgo se clasifica:

| Severidad | Significa | Bloquea la integración |
|---|---|---|
| **Bloqueante** | Rompe un invariante, un criterio de aceptación o un check | Sí |
| **Importante** | Viola un estándar o un patrón (SLAP, antipatrón, patrón mal aplicado, duplicación, test faltante) | Sí, salvo que el líder lo acepte explícitamente |
| **Menor** | Mejora de nombre, estilo | No; se anota |

Un hallazgo solo se reporta si el revisor puede señalar el archivo y la línea y explicar el problema concreto. Las opiniones vagas no son hallazgos.

## 6. Puertas de calidad (las corre el líder)

| Puerta | Cuándo | Qué |
|---|---|---|
| G1 | Cada entrega | `pnpm check` + `uv run pytest` en verde |
| G2 | Cada entrega | Revisión independiente sin bloqueantes ni importantes abiertos |
| G3 | Al integrar ramas | `pnpm check` en la rama integrada + suite de conformidad contra todos los motores disponibles |
| G4 | Hito de la PoC | Playwright recorre el guion de la demo completo |

Nada se integra con una puerta en rojo. Si una puerta se salta, se dice explícitamente en el reporte final y por qué.

## 7. Trabajo en paralelo

- Cada implementador trabaja en su propio **worktree** y rama.
- Un agente = un paquete. Las carpetas no se comparten.
- `packages/protocol` está **congelado** después de la Fase 0. Un cambio requiere:
  1. Que un implementador lo pida en su reporte.
  2. Que el líder lo evalúe y, si es difícil de revertir, escriba un ADR.
  3. Que el líder lo aplique y avise a todos los agentes afectados.
- Si dos agentes necesitan la misma utilidad, el líder decide dónde vive; nadie la duplica "mientras tanto".

## 8. Escalar y desacuerdos

Detente y escala al líder cuando:
- Una instrucción del encargo contradice `CLAUDE.md` o un ADR.
- Necesitas tocar otro paquete o el protocolo.
- Un criterio de aceptación es ambiguo y las opciones llevan a resultados distintos.
- Una decisión es difícil de revertir (ver `CLAUDE.md` §5).
- Llevas tres intentos fallidos con el mismo problema.

Si el revisor y el implementador no están de acuerdo, ambos exponen su argumento en una línea y el líder decide aplicando el orden de prioridades de `CLAUDE.md` §5.

## 9. Registro de decisiones (ADR)

Las decisiones difíciles de revertir se registran en `docs/decisions/NNNN-titulo.md` con la plantilla `docs/decisions/0000-plantilla.md`. Un ADR aceptado no se edita; si cambia la decisión, se escribe uno nuevo que lo reemplaza.
