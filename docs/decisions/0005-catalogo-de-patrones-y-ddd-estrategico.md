# 0005. Catálogo cerrado de patrones y DDD estratégico

- **Estado:** aceptada

## Contexto

Varios agentes escriben código en paralelo. Sin un acuerdo explícito sobre patrones, cada uno resuelve los mismos problemas de forma distinta, y el sistema pierde coherencia. Además, se evaluó si adoptar DDD.

## Decisión

- Se adopta un **catálogo cerrado de patrones** (`docs/engineering/patrones.md`): cada patrón con su lugar, su forma en este código y cómo se verifica. Usar un patrón fuera del catálogo requiere un ADR.
- Se prohíben antipatrones concretos; los automatizables se hacen cumplir con ESLint y `dependency-cruiser`.
- De DDD se adopta la parte **estratégica**: lenguaje ubicuo y contextos delimitados (Edición, Ejecución, Catálogo; Hub y Colaboración a futuro), con el protocolo como capa anticorrupción.
- La parte **táctica** (agregados, repositorios, servicios de dominio) queda diferida hasta que exista un backend con Hub, cuentas y colaboración.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Sin catálogo, criterio de cada agente | Flexible | Soluciones divergentes; revisión subjetiva |
| DDD completo desde el inicio | Modelo rico | Ceremonia sin beneficio en la PoC; choca con el núcleo funcional |
| Catálogo cerrado + DDD estratégico (elegida) | Coherencia verificable; vocabulario común | Requiere ADR para salir del catálogo |

## Consecuencias

- Implementadores declaran los patrones aplicados; revisores los verifican con criterios escritos.
- La revisión de "diseño" deja de ser opinión: un hallazgo apunta a una regla del catálogo.
