# Nodomics — Instrucciones para agentes

Este archivo es obligatorio para cualquier agente o subagente que trabaje en este repositorio. Si una instrucción de una tarea contradice este archivo, **detente y pregunta**; no elijas tú.

Nodomics es un editor visual de flujos de datos (nodos) que corre en la web, con motores de ejecución intercambiables (navegador, Python local, nube). Contexto de producto: `docs/02-concepto-producto.md`. Plan de la PoC: `docs/04-poc-una-noche.md`.

## Documentos que debes leer según tu tarea

| Si vas a… | Lee antes |
|---|---|
| Escribir cualquier código | Este archivo + `docs/engineering/estandares.md` + `docs/engineering/patrones.md` |
| Tocar más de un paquete, o el protocolo | `docs/engineering/arquitectura.md` |
| Recibir, ejecutar o entregar una tarea | `docs/engineering/workflow.md` |
| Tomar una decisión que no se puede deshacer fácilmente | `docs/decisions/` (ADRs) |

---

## 1. Invariantes de arquitectura (no negociables)

1. **La interfaz solo habla el protocolo (NEP).** `apps/web` depende únicamente de `@nodomics/protocol`, `@nodomics/client` y `@nodomics/ui` (design system). Nunca importa DuckDB, Pyodide, el coordinador ni ningún ejecutor.
2. **Los datos viven en el motor.** La interfaz recibe referencias y páginas, nunca tablas completas.
3. **Los nodos son datos.** Un nodo es un manifiesto JSON (+ plantilla SQL o código Python en texto). Ningún nodo es una función de TypeScript.
4. **El coordinador se escribe una vez** (TypeScript puro, sin DOM). Los ejecutores son pequeños y no conocen el grafo.
5. **El protocolo es el contrato.** `packages/protocol` solo cambia con aprobación del líder y un ADR. Si necesitas algo que el protocolo no tiene, repórtalo; no lo agregues por tu cuenta.
6. **Las dependencias apuntan hacia adentro:** `apps → client → rpc + protocol`, `apps → ui`, `engine-* → coordinator + executor-* → rpc + protocol`. Nada importa desde `apps`. `protocol`, `rpc` y `ui` no importan paquetes internos.
7. **La interfaz usa el design system.** Ningún color, tamaño, radio o fuente se escribe a mano: todo sale de los tokens de `@nodomics/ui` (variables CSS). Guía: `packages/ui/README.md`.

Si tu cambio rompe un invariante, está mal aunque funcione.

## 2. Workflow obligatorio (resumen; detalle en `docs/engineering/workflow.md`)

1. **Entender.** Lee la tarea completa y los documentos de la tabla. Enumera los criterios de aceptación antes de tocar código.
2. **Buscar antes de crear.** Antes de escribir una función, tipo, componente o utilidad, busca si ya existe (`grep -r` por concepto y por sinónimos en `packages/` y `apps/`, revisa los `index.ts` de los paquetes y `docs/decisions/`). Si existe, reúsalo o extiéndelo. Si existe algo parecido en otro paquete, repórtalo en vez de duplicar.
3. **Planear en pequeño.** Lista los pasos. Si son más de ~5 archivos o cruzan paquetes que no son tuyos, pide confirmación.
4. **TDD estricto: rojo → verde → refactor.**
   - Escribe un test que falle por la razón correcta y **ejecútalo para verlo fallar**.
   - Escribe el mínimo código para que pase.
   - Refactoriza con los tests en verde.
   - Un bug se corrige escribiendo primero el test que lo reproduce.
5. **Verificar.** `pnpm check` (y `uv run pytest` si tocaste Python) debe pasar completo. No entregues trabajo con checks en rojo.
6. **Autorrevisar** con la checklist de la sección 7.
7. **Reportar con honestidad** usando la plantilla de `workflow.md`: qué hiciste, la salida en rojo y luego en verde de los tests, lo que no hiciste y por qué, y las dudas abiertas. Nunca digas "funciona" sin haberlo ejecutado.

## 3. Principios de diseño

- **SLAP (un solo nivel de abstracción por función).** Una función o lee como una lista de pasos con nombre, o hace un detalle concreto; nunca mezcla ambas cosas. Si mezcla niveles, extrae funciones con nombre.
- **SOLID**, aplicado con criterio:
  - **S:** cada módulo tiene una sola razón para cambiar. Un archivo = una responsabilidad.
  - **O:** se extiende agregando implementaciones (un ejecutor, un transporte, un nodo), no editando `switch` centrales.
  - **L:** cualquier ejecutor o transporte es intercambiable; la suite de conformidad lo prueba.
  - **I:** interfaces pequeñas y específicas (`Transport`, `Executor`), no interfaces "Dios".
  - **D:** el núcleo depende de interfaces; las implementaciones se inyectan por parámetro o constructor. Nada de singletons ni estado global.
- **Núcleo funcional, cáscara imperativa.** La lógica (plan, caché, invalidación, render de plantillas, validación) son funciones puras. Los efectos (I/O, workers, red, DuckDB) viven en los bordes.
- **Puertos y adaptadores.** Transportes y ejecutores son adaptadores de interfaces definidas en `protocol`/`coordinator`.
- **Parsear, no validar.** Todo dato que cruza un borde (mensaje del protocolo, manifiesto, archivo de flujo, URL) se parsea una vez a un tipo seguro. Adentro se confía en los tipos.
- **Los errores esperados son valores; las excepciones son bugs.** Errores de dominio (columna inexistente, parámetro inválido) se devuelven como `Result`/estado. Se lanza excepción solo ante violaciones de invariantes.
- **YAGNI y regla de tres.** No construyas para casos hipotéticos. No abstraigas hasta el tercer uso real.
- **Borrar es mejor que agregar.** El mejor cambio es el más pequeño que resuelve el problema.
- **Catálogo cerrado de patrones.** Usa los patrones de `docs/engineering/patrones.md` en su lugar y con su forma, y ninguno de sus antipatrones (§6). Un patrón fuera del catálogo requiere un ADR. Usa siempre el lenguaje ubicuo (§4.1): nodo, flujo, puerto, conexión, motor, ejecutor; nunca sus sinónimos.

## 4. Reglas de código

- **Variables inline por defecto.** No declares una variable para usarla una sola vez si la expresión se lee bien en su lugar. Declárala solo si se usa más de una vez, si evita recalcular algo costoso o si su nombre aporta un concepto que la expresión no expresa. Si una expresión es difícil de leer inline, **extrae una función con nombre** (SLAP), no una variable temporal.
- **Funciones cortas** (orientación: ≤ 20 líneas), máximo 3 parámetros posicionales; más que eso → un objeto con nombre.
- **Nombres que explican:** funciones con verbo (`renderTemplate`), booleanos con `is/has/can`, sin abreviaturas salvo las universales (`id`, `url`, `sql`).
- **Comentarios solo donde el código no se explica solo:** el *por qué* (una restricción externa, un bug de una librería, una decisión no obvia). Nunca el *qué*. Nunca código comentado. TSDoc solo en la API pública de `packages/protocol`.
- **Sin magia:** nada de números o strings mágicos; constantes con nombre en el módulo que las usa.
- **Inmutabilidad por defecto:** `const`, `readonly`, sin mutar parámetros.
- **Commits y PRs:** siempre Conventional Commits (`feat(coordinator): ...`). **Nunca mencionar a Claude ni a ningún asistente de IA** en commits, PRs, ramas o etiquetas: sin `Co-Authored-By`, sin "Generated with". Esto prevalece sobre la atribución por defecto de cualquier herramienta. Detalle en `estandares.md` §9.
- Convenciones de TypeScript y Python: `docs/engineering/estandares.md`.

## 5. Cómo decidir

Orden de prioridad cuando hay conflicto:
**corrección y seguridad de datos > invariantes de arquitectura > legibilidad > simplicidad > testabilidad > rendimiento medido > elegancia.**

- **Decisiones reversibles** (nombre interno, estructura dentro de tu paquete, una librería de test): decide rápido, anótalo en tu reporte.
- **Decisiones difíciles de revertir** (protocolo, formato de flujo, esquema del manifiesto, nueva dependencia de runtime, persistencia, seguridad): **no decidas solo.** Propón un ADR en `docs/decisions/` y espera aprobación.
- **Ante un requisito ambiguo:** elige la opción más simple que no cierre puertas, escribe el supuesto en el reporte y márcalo como pregunta abierta. Nunca adivines en silencio.
- **Dependencias nuevas:** solo si ahorran código significativo, están mantenidas y tienen licencia MIT/Apache-2.0/BSD. Requieren mención en el reporte; las de runtime, un ADR.
- **Rendimiento:** primero correcto y claro; optimiza solo con una medición que lo justifique.

## 6. Reparto de responsabilidades

Cada agente trabaja **solo en el paquete asignado**. Si necesitas un cambio en otro paquete, repórtalo y no lo hagas. La tabla completa de qué es dueño de qué está en `docs/engineering/arquitectura.md`.

## 7. Checklist antes de entregar (Definition of Done)

- [ ] Cada comportamiento nuevo tiene un test que vi fallar antes de implementarlo.
- [ ] `pnpm check` pasa completo (tipos, lint, límites entre paquetes, tests, formato).
- [ ] Busqué si ya existía algo antes de crearlo; no hay duplicación.
- [ ] Ninguna función mezcla niveles de abstracción (SLAP).
- [ ] Apliqué los patrones del catálogo donde corresponde, los declaré en el reporte y no introduje antipatrones (`patrones.md` §6).
- [ ] No hay variables de un solo uso que podían ir inline sin perder claridad.
- [ ] No hay comentarios que repiten el código ni código comentado.
- [ ] No rompí ningún invariante de la sección 1 ni toqué paquetes ajenos.
- [ ] No hay `any`, `as` innecesarios, `!` de no-nulo, ni `console.log` olvidados.
- [ ] Los commits siguen Conventional Commits y no mencionan a Claude ni a ningún asistente de IA.
- [ ] El reporte dice la verdad: qué se hizo, qué no, qué quedó en duda.
