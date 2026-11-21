# Patrones de diseño de Nodomics

Este es el **catálogo cerrado** de patrones del proyecto. Todo código nuevo usa estos patrones donde corresponde y evita los antipatrones de la sección 6. Introducir un patrón que no está aquí, o usar uno fuera de su lugar, requiere un ADR.

Cada patrón dice: el problema que resuelve, dónde se usa, qué forma tiene en este código, y cómo se comprueba que se respetó (lo que mira el revisor).

---

## 1. Patrones de arquitectura

### 1.1 Protocolo como contrato

- **Problema:** cambiar de motor (navegador, Python local, nube) sin tocar la interfaz.
- **Dónde:** frontera interfaz ↔ motor (NEP) y coordinador ↔ ejecutor (protocolo de ejecutor).
- **Forma:** todo mensaje está definido en `@nodomics/protocol` con TypeBox. Los dos lados solo intercambian esos mensajes.
- **Se respeta si:** ningún tipo de un lado aparece en el otro salvo los de `protocol`; un cambio de comportamiento visible implica un cambio en `protocol` (con ADR) o ninguno.
- **Violación típica:** agregar un campo "temporal" a un mensaje sin pasar por `protocol`; que la interfaz dependa de un detalle de un motor concreto ("si es el motor local, entonces…").

### 1.2 Puertos y adaptadores (hexagonal)

- **Problema:** que el núcleo no dependa de tecnologías concretas (Worker, WebSocket, DuckDB, Pyodide).
- **Dónde:** `Transport` (puerto) con `MemoryTransport`, `WorkerTransport`, `WebSocketTransport` (adaptadores); `ExecutorPort` (puerto) con un adaptador por ejecutor.
- **Forma:** el puerto es una `interface` pequeña definida por quien la **usa** (el núcleo), no por quien la implementa. Los adaptadores viven en su propio archivo o paquete y se **inyectan**.
- **Se respeta si:** el núcleo importa la interfaz, nunca el adaptador; existe al menos un adaptador falso usado en tests.
- **Violación típica:** `import { createDuckDbExecutor } from ...` dentro del coordinador.

### 1.3 Núcleo funcional, cáscara imperativa

- **Problema:** lógica compleja (plan, caché, invalidación, plantillas) que se pueda probar sin I/O.
- **Dónde:** `coordinator` principalmente; también la lógica de estado de la interfaz.
- **Forma:** funciones puras `entrada → salida` que no leen reloj, red, archivos ni estado global. Un solo módulo "cáscara" por paquete hace los efectos y llama al núcleo.
- **Se respeta si:** los archivos del núcleo no importan nada con efectos y sus tests no necesitan fakes; los efectos se concentran en pocos archivos con nombre claro (`run-plan.ts`, `*-transport.ts`, `*.worker.ts`).
- **Violación típica:** una función de cálculo que además emite eventos o llama `Date.now()`.

### 1.4 Datos por referencia

- **Problema:** que un motor remoto funcione igual que uno local, sin mover tablas enteras.
- **Dónde:** resultados de nodos.
- **Forma:** el motor devuelve `ResultRef { id, rowCount, schema }`; los datos se piden por páginas (`data.page`), perfiles (`data.profile`) o vistas agregadas (`data.view`).
- **Se respeta si:** ningún mensaje hacia la interfaz lleva filas fuera de esas tres operaciones, y ninguna página supera 1000 filas.

### 1.5 Caché direccionada por contenido

- **Problema:** recalcular solo lo que cambió.
- **Dónde:** coordinador.
- **Forma:** `clave = hash(id y versión del nodo + parámetros normalizados + claves de sus entradas)`. Si la clave no cambió, el resultado se reutiliza.
- **Se respeta si:** la clave no depende de posiciones, etiquetas, ids de ejecución ni reloj; mover un nodo en el lienzo no invalida nada.

### 1.6 Parsear, no validar

- **Problema:** datos no confiables que se cuelan al interior y obligan a revisar en todos lados.
- **Dónde:** todo borde: mensajes recibidos, manifiestos, archivos `.nodo.json`, la URL de compartir, respuestas del ejecutor Python.
- **Forma:** `parse(Schema, unknown) → Result<Tipo, ValidationIssue[]>` una sola vez, en el borde. Adentro se usan tipos, sin `typeof` defensivos.
- **Se respeta si:** ningún `as` convierte `unknown` en un tipo de dominio sin pasar por `parse`.

### 1.7 Errores esperados como valores

- **Problema:** distinguir fallas de dominio (columna inexistente) de bugs.
- **Forma:** errores de dominio como `Result` o como estado (`node.status` con `error`); `throw` solo ante invariantes rotas. En RPC, `RpcError` solo para fallas de la petición.
- **Se respeta si:** no hay `try/catch` usado como control de flujo de casos normales.

---

## 2. Patrones de diseño (código)

### 2.1 Composite — flujo como nodo

- **Dónde:** un nodo con `impl.kind = "flow"` contiene un subgrafo con nodos `flow.input` y `flow.output`.
- **Forma:** el coordinador **expande** los subflujos (recursivamente) a un grafo plano antes de planificar. El resto del sistema no distingue nodos simples de compuestos.
- **Se respeta si:** ninguna función fuera de la expansión pregunta "¿es un subflujo?".

### 2.2 Strategy — elección de ejecutor

- **Dónde:** el coordinador decide qué ejecutor corre cada tarea.
- **Forma:** una función pura `selectExecutor(requirements, executors)` que compara los `requires` del nodo con las capacidades (`exec.hello`) de cada ejecutor inyectado.
- **Se respeta si:** no hay nombres de ejecutores concretos (`"pyodide"`, `"duckdb"`) en la lógica de selección.

### 2.3 Registro (tabla de despacho) en lugar de `switch` central

- **Dónde:** catálogo de nodos (`id → manifiesto`), compiladores por tipo de implementación (`sql`, `python`, `view`, `flow`, `builtin`), manejadores de métodos RPC.
- **Forma:** `Record<Clave, Manejador>` o `Map`. Agregar un caso = agregar una entrada, sin editar lógica existente. Cuando la clave es una unión cerrada del protocolo, se tipa como `Record<Union, ...>` para que TypeScript exija todas las entradas.
- **Se respeta si:** no hay `switch`/`if` encadenados sobre ids de nodo, nombres de ejecutor o métodos. (Un `switch` exhaustivo sobre una unión discriminada local, con `assertNever`, sí está permitido.)

### 2.4 Adapter

- **Dónde:** transportes (adaptan `postMessage` o `WebSocket` a `Transport`), ejecutores (adaptan DuckDB o Pyodide a `ExecutorPort`), hooks de `apps/web/src/engine/` (adaptan `EngineClient` a React).
- **Se respeta si:** el adaptador solo traduce; no contiene lógica de dominio.

### 2.5 Facade

- **Dónde:** `EngineClient` (oculta JSON-RPC y valida mensajes del NEP); `engine-browser` (ensambla coordinador + ejecutores detrás de un solo punto de entrada).
- **Se respeta si:** quien usa la fachada no necesita conocer lo que hay detrás para usarla.

### 2.6 Observer

- **Dónde:** eventos del NEP (`node.status`, `node.result`, `run.log`, `run.finished`) y logs del ejecutor.
- **Forma:** `on(evento, manejador)` devuelve una función para **desuscribirse**. No hay bus de eventos global.
- **Se respeta si:** toda suscripción tiene su desuscripción (en React, dentro del `useEffect` que la crea).

### 2.7 Command — edición del flujo en la interfaz

- **Dónde:** `flowStore` de `apps/web`.
- **Forma:** cada edición es un dato (`{ type: "node.add", ... }`) aplicado por una función pura `applyCommand(flow, command) → flow`. Deshacer y rehacer guardan comandos (o pares comando/inverso), no copias de estado sueltas.
- **Se respeta si:** los componentes no mutan el flujo directamente; solo despachan comandos.

### 2.8 Proyección de eventos (read model)

- **Dónde:** `engineStore` de `apps/web`.
- **Forma:** el estado del motor en la interfaz se construye **solo** aplicando eventos con una función pura `applyEvent(state, event) → state`, descartando eventos con `rev` viejo.
- **Se respeta si:** nada escribe en `engineStore` fuera de esa función.

### 2.9 Plantilla declarativa (intérprete acotado)

- **Dónde:** render de SQL y de especificaciones de vista en el coordinador.
- **Forma:** plantilla + ayudantes con nombre (`ident`, `lit`); parámetros validados contra JSON Schema **antes** de renderizar.
- **Se respeta si:** no se concatenan strings de SQL fuera de los ayudantes.

### 2.10 Fábricas con dependencias inyectadas

- **Dónde:** en todo el código.
- **Forma:** `createX(deps)` devuelve un objeto que cumple una interfaz. Las dependencias entran por parámetro. Las clases se reservan para adaptadores con ciclo de vida (un transporte, un ejecutor) y nunca heredan de otra clase salvo `Error`.
- **Se respeta si:** no hay `new` de dependencias dentro de la lógica que las usa, ni `extends` (salvo `Error`).

---

## 3. Interfaz (React)

| Patrón | Forma |
|---|---|
| Presentación separada de la lógica | `@nodomics/ui` solo tiene componentes de presentación (props → markup). La lógica vive en hooks y funciones puras de `apps/web`. |
| Un único punto que habla con el motor | Solo `apps/web/src/engine/` usa `EngineClient`. Los componentes usan hooks de ahí. |
| Estado mínimo, derivado con selectores | Se guarda lo mínimo (flujo, espejo del motor); lo demás se calcula con selectores, no se duplica en el store. |
| Formularios generados | Los formularios de nodo salen del JSON Schema del manifiesto; nunca uno escrito a mano por nodo. |

---

## 4. Diseño guiado por el dominio (estratégico)

Se adopta la **parte estratégica** de DDD. La táctica (agregados con clases, repositorios, servicios de dominio) queda **diferida** hasta que exista un backend con Hub, cuentas y colaboración (versiones, forks, permisos). Ver ADR 0005.

### 4.1 Lenguaje ubicuo

Estos términos se usan igual en la interfaz, la documentación, el código y las conversaciones. **No se usan sinónimos.**

| Término (interfaz, docs) | En código | Significa | Nunca decir |
|---|---|---|---|
| Nodo | `node`, `NodeManifest` (definición), `FlowNode` (instancia) | Bloque que recibe datos, hace una cosa y entrega un resultado | bloque, paso, componente, step |
| Flujo | `flow`, `Flow` | Grafo de nodos y conexiones | pipeline, workflow, receta |
| Puerto | `port`, `PortSpec` | Entrada o salida tipada de un nodo | pin, socket, handle |
| Conexión | `edge`, `FlowEdge` | Vínculo de un puerto de salida a uno de entrada | link, cable, arista (en la interfaz) |
| Tipo de dato | `DataType` | Lo que viaja por un puerto (tabla, columna…) | formato |
| Parámetro | `params` | Ajuste configurable de un nodo | opción, setting |
| Flujo como nodo | `impl.kind = "flow"` | Flujo usado como nodo | macro, grupo, subproceso |
| Fuente | `source` | Nodo que trae datos | input, origen |
| Vista | `view` | Nodo que muestra datos | gráfico (como término general), output |
| Motor | `engine` | Lo que ejecuta un flujo (coordinador + ejecutores) | backend, kernel, servidor |
| Ejecutor | `executor` | Componente que corre tareas resueltas | worker, runner |
| Ejecución | `run`, `runId` | Una corrida del flujo | job, proceso |
| Resultado | `ResultRef` | Referencia a los datos producidos por un puerto | output, dataset |
| Revisión | `rev` | Número de versión del flujo enviado al motor | versión (eso es otra cosa: la del nodo) |
| Manifiesto | `NodeManifest` | Definición de un tipo de nodo como datos | spec, config |
| Paquete | `package` (en el Hub) | Unidad publicable de nodos y flujos | plugin, librería |

### 4.2 Contextos delimitados

| Contexto | Dueño | Modelo propio | Traductor en la frontera |
|---|---|---|---|
| **Edición** | `apps/web` | Flujo en edición, comandos, selección, posiciones | `apps/web/src/engine/` traduce a mensajes NEP |
| **Ejecución** | Motor (`coordinator` + ejecutores) | Grafo plano, plan, caché, tareas, resultados | El NEP (servidor) y el protocolo de ejecutor |
| **Catálogo** | `nodes-core` + `nodes.list` | Manifiestos | `parse(NodeManifest, …)` al cargar |
| **Hub** (futuro) | Backend | Paquetes, versiones, forks, autores | API del Hub |
| **Colaboración** (futuro) | Backend | Presencia, comentarios, permisos | Capa de sincronización |

Cada contexto tiene su propio modelo; **el protocolo es la capa anticorrupción** entre ellos. Por ejemplo, la interfaz guarda posiciones de nodos que al motor no le importan, y el motor tiene grafos planos que la interfaz nunca ve.

---

## 5. Cómo elegir

1. ¿El problema ya tiene un patrón en este catálogo? Úsalo con la forma indicada.
2. ¿Lo resuelve una función simple? Entonces no hace falta patrón. **YAGNI gana**: un patrón sin el problema que resuelve es un antipatrón.
3. ¿Necesitas algo que no está en el catálogo? Detente y propón un ADR.

---

## 6. Antipatrones prohibidos

| Antipatrón | Por qué | Cómo se detecta |
|---|---|---|
| Estado global mutable o singleton | Oculta dependencias; rompe tests y la inyección | ESLint: `let` a nivel de módulo prohibido |
| Herencia de clases (salvo `Error`) | Acopla; preferimos composición | ESLint: `class … extends` prohibido salvo `Error` |
| `switch`/`if` central sobre tipos de nodo, ejecutores o métodos | Rompe Abierto/Cerrado | Revisión (§2.3) |
| Interfaces "Dios" (muchos métodos no relacionados) | Rompe segregación de interfaces | Revisión |
| Módulos cajón de sastre (`utils.ts`, `helpers.ts`, `common.ts`, `misc.ts`, `*-manager.ts`) | Sin responsabilidad única | `pnpm names` (parte de `pnpm check`) |
| Parámetros booleanos que cambian el comportamiento | Dos funciones disfrazadas de una | Revisión |
| Bus de eventos global | Flujo de datos invisible | Revisión (§2.6) |
| Mocks de código propio | Prueban la implementación, no el comportamiento | Revisión: usar fakes |
| Tipos del motor filtrados a la interfaz | Rompe el protocolo como contrato | `dependency-cruiser` |
| Abstracción prematura (genérico con un solo uso) | Complejidad sin beneficio | Revisión: regla de tres |
| Lógica de dominio en componentes React o en adaptadores | Mezcla capas | Revisión (§2.4, §3) |

---

## 7. Verificación

- **El implementador** declara en su reporte qué patrones del catálogo aplicó y dónde (archivo), y confirma que no introdujo antipatrones.
- **El revisor** comprueba cada patrón declarado con la línea "Se respeta si" de este documento, y busca activamente los antipatrones de la sección 6 en el diff.
- **Las herramientas** hacen cumplir lo automatizable: `dependency-cruiser` (fronteras), ESLint (estado global mutable, herencia) y `pnpm names` (módulos cajón de sastre).
- Un antipatrón o un patrón mal aplicado se reporta como hallazgo **Importante** (bloquea la integración salvo aceptación explícita del líder).
