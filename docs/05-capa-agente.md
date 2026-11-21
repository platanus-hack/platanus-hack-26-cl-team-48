# Capa de agente: diseño v0.1

**Responsable:** Gabriel (área Agente). **Coordina con:** Sebastián (motor de nodos y MCP) y Cantú (Feed).
**Estado:** borrador para discutir. Las decisiones difíciles de revertir (servicio nuevo, sandbox, persistencia de la memoria) se proponen como ADR antes de implementarlas (`CLAUDE.md` §5).

## 1. Principio

> **El agente puede pensar en cualquier lenguaje, pero solo entrega nodos y flujos.**

Cuando un usuario le pide al agente una herramienta, una función o un proyecto, el agente **lo construye con el motor de nodos**, usando las herramientas MCP. Si necesita lógica que no existe, escribe código (Python o SQL), lo prueba en el sandbox y lo **empaqueta como nodo** con su manifiesto. El usuario nunca recibe un script suelto: recibe nodos y flujos que se pueden ver, ejecutar, compartir y remixar.

## 2. Dónde vive cada cosa (propuesta)

| Pieza | Dónde | Por qué |
|---|---|---|
| Sitio web | Render, sitio estático (ya existe) | Sin cambios |
| **Servicio del agente** (bucle del agente, cliente MCP, claves de Anthropic y Render) | **Render, servicio web Node/TS** | Los bucles del agente duran minutos. Las Edge Functions de Supabase tienen límites de tiempo cortos. Las claves quedan solo en el servidor |
| **Sandbox** (fork del flujo, ejecución de flujos y de código generado) | **Render Sandboxes**, creadas por el servicio del agente | Aísla lo que hace el agente. Corre en la nube si el usuario no puede o no quiere correr en su equipo |
| **Servidor MCP del motor** | **En el servicio del agente**. Cada sesión queda atada a un usuario y un fork, y la ejecución se manda al sandbox con `exec` de un runner de comando | Render Sandboxes no expone puertos ni red privada (beta), así que el MCP no puede vivir dentro del sandbox |
| Usuarios, perfiles, flujos guardados, propuestas | Supabase (Postgres) | Lo define el equipo del motor |
| Tiempo real de la sala y `@agente` | Supabase Realtime | El agente se une a la sala como un participante más |
| Índice para el buscador (embeddings de las fichas de componente) | Supabase, pgvector | Lo comparten el buscador del Feed y la memoria del agente |
| Memoria temporal en grafo | Por decidir (ver §5) | |

```
Navegador ──@agente──▶ Supabase Realtime ──▶ Servicio del agente (Render)
                                               │  Claude (Anthropic)
                                               │  crea / usa
                                               ▼
                                         Render Sandbox
                                         ├─ fork del flujo del usuario
                                         ├─ motor sin interfaz + servidor MCP
                                         └─ ejecución de código de prueba
                                               │
                                     propuesta + Diff de Dominio
                                               ▼
                               Usuario acepta ──▶ el flujo original cambia
```

## 3. Ciclo del sandbox

1. **Fork.** El agente copia el flujo del usuario a un sandbox nuevo. El original no se toca.
2. **Construir.** El agente usa las herramientas MCP sobre el fork: agrega nodos, conecta, cambia parámetros y crea nodos de código.
3. **Probar.** Ejecuta el fork en el sandbox y lee resultados, esquemas y errores. Si algo falla, corrige y vuelve a probar.
4. **Proponer.** Calcula el diff estructural entre el fork y el original, y lo traduce a un **Diff de Dominio** (tarjetas en lenguaje del oficio).
5. **Decidir.** El usuario acepta o rechaza cambio por cambio. Lo aceptado se aplica al original. El sandbox se destruye.

Mientras el agente trabaja en el fork, los demás siguen usando el flujo original sin ver nada a medio hacer.

## 4. Herramientas MCP que necesita el agente (lista para Sebastián)

Todas operan **sobre un sandbox** (`sandboxId`), validan sus entradas contra el protocolo y devuelven los errores esperados como valores (`Result`), no como excepciones. Donde existe, se apoyan en un método del protocolo NEP.

### 4.1 Descubrir (solo lectura)
| Herramienta | Qué hace | Base en NEP |
|---|---|---|
| `nodes.list` | Catálogo de nodos disponibles: id, nombre, categoría, puertos y resumen | catálogo de `nodes-core` |
| `nodes.get_manifest` | Manifiesto completo de un nodo: puertos, parámetros (JSON Schema) e implementación | manifiesto |
| `flows.list` / `flows.get` | Flujos guardados del usuario o de la comunidad | Supabase |
| `components.search` | Búsqueda semántica de nodos y flujos por descripción | pgvector |

### 4.2 Sandbox
| Herramienta | Qué hace |
|---|---|
| `sandbox.fork` | Crea un sandbox con una copia del flujo y devuelve `sandboxId` |
| `sandbox.diff` | Diff estructural fork ↔ original: nodos agregados, quitados o cambiados, conexiones y parámetros (valor anterior y nuevo) |
| `sandbox.propose` | Convierte el diff en una propuesta pendiente para el usuario |
| `sandbox.discard` | Destruye el sandbox |

### 4.3 Construir y editar el flujo
| Herramienta | Qué hace | Base en NEP |
|---|---|---|
| `flow.get` | Flujo actual del fork en JSON | — |
| `flow.add_node` | Agrega un nodo por tipo, con parámetros iniciales | `flow.set` |
| `flow.remove_node` | Quita un nodo y sus conexiones | `flow.set` |
| `flow.connect` / `flow.disconnect` | Conecta o desconecta puertos, validando sus tipos | `flow.set` |
| `flow.set_param` | Cambia un parámetro, validado contra su JSON Schema | `flow.set` |
| `flow.apply_patch` | Aplica varios cambios de forma atómica: o entran todos o ninguno | `flow.set` |
| `flow.validate` | Valida el flujo completo sin ejecutarlo: tipos, parámetros, nodos mal configurados | `flow.set` |
| `flow.define_as_node` | Declara el flujo como nodo: nombre, entradas y parámetros expuestos (ADR 0016) | `flow.node` |

### 4.4 Crear nodos nuevos
| Herramienta | Qué hace |
|---|---|
| `node.create_code` | Crea un nodo de código (Python o SQL) con manifiesto: puertos, parámetros y código, según el contrato del ADR 0014 |
| `node.test` | Ejecuta el nodo con casos de prueba y devuelve resultados o errores |
| `node.publish` | Guarda el nodo en la librería del usuario (ADR 0009) |

### 4.5 Ejecutar e inspeccionar
| Herramienta | Qué hace | Base en NEP |
|---|---|---|
| `run.flow` | Ejecuta todo el fork o hasta ciertos nodos | `flow.run` |
| `run.status` | Estado de cada nodo y errores | `node.status`, `run.finished` |
| `data.sample` | Primeras filas de un resultado | `data.page` |
| `data.schema` | Columnas y tipos de un puerto sin ejecutar todo | `schema.infer` |
| `run.logs` | Salida y errores de los nodos Python | `run.log` |

### 4.6 Describir (para la memoria y el buscador)
| Herramienta | Qué hace |
|---|---|
| `component.describe` | Devuelve la **ficha de componente** (§5.1) de un nodo o flujo |

**Pregunta para Sebastián:** ¿qué motor corre sin interfaz dentro del sandbox? ¿El coordinador en Node con el ejecutor Python local, o algo más?

## 5. Memoria: story coding en grafo temporal

La memoria registra **qué se construyó, cuándo, cómo, por quién y por qué**: la construcción, las conversaciones con los agentes, entre usuarios y con la comunidad, y las características de cada componente.

**Grafo temporal**
- **Entidades:** usuario, agente, flujo, nodo, puerto, conversación, decisión, propuesta, círculo.
- **Relaciones con tiempo** (válida desde y hasta): *creó*, *modificó*, *conectó*, *propuso*, *aceptó*, *rechazó*, *derivó de*, *conversó sobre*.
- **Episodios:** cada llamada a una herramienta MCP, cada mensaje de la sala y cada propuesta aceptada o rechazada se registra como un episodio con su marca de tiempo.
- Permite responder preguntas como: *¿por qué este nodo usa 2 h y no 4 h?* → *porque Valeria lo corrigió el sábado a las 11:40, después de hablar con Diego en la sala.*

**Opción a evaluar:** Graphiti (grafo de conocimiento temporal de código abierto, pensado para memoria de agentes). Necesita su propia base de grafos, aparte de Postgres. Si no cabe en el tiempo, la alternativa es guardar entidades, relaciones y episodios como tablas en Supabase. Esto requiere un ADR.

### 5.1 Ficha de componente (JSON detallado)

Cada nodo y flujo tiene una ficha que se genera desde su manifiesto y su historia, y se vectoriza en pgvector para el buscador del Feed.

```json
{
  "id": "flow_cosecha_fresa_v2",
  "kind": "flow",
  "name": "Calculadora de cosecha (fresa)",
  "summary": "Estima la temperatura de la fruta al ingresar a cámara según la hora de cosecha",
  "inputs": [{ "name": "toneladas", "type": "value", "unit": "t" }],
  "outputs": [{ "name": "temperatura_fruta", "type": "value", "unit": "°C" }],
  "params": [{ "id": "ventana_cosecha", "title": "Ventana de cosecha", "value": 2, "unit": "h" }],
  "process": "Toma la temperatura ambiente por hora y aplica el modelo de calentamiento de la fruta",
  "connections": [{ "from": "clima.temperatura", "to": "modelo.ambiente" }],
  "assumptions": ["La fruta entra a la temperatura ambiente de la hora de cosecha"],
  "context": { "domain": "agronomía", "crop": "fresa", "region": "Zamora, Michoacán" },
  "lineage": { "parent": "flow_cosecha_arandano_v1", "author": "camila", "adapted_by": "valeria" },
  "history": [{ "at": "2026-11-22T11:40:00Z", "by": "valeria", "change": "ventana_cosecha 4 → 2 h" }]
}
```

El formato final de la ficha se acuerda con Cantú, porque alimenta el buscador del Feed.

## 6. `@agente` en la sala de trabajo

- En la sala en tiempo real, cualquiera escribe `@agente` seguido de su pedido.
- El agente recibe el contexto de la sala: participantes, flujo abierto y últimos mensajes.
- Responde en el chat de la sala y, si hay que cambiar el flujo, trabaja en un sandbox y deja una **propuesta** visible para todos.
- La misma vía sirve para el **mediador**: cuando se rompe un límite crítico en la mesa, el agente interviene solo.

## 7. Importar desde GitHub

Convierte un proyecto libre de GitHub en nodos reutilizables:
1. Clona el repo **dentro del sandbox**, nunca en el servidor del agente.
2. Analiza el código y detecta funciones con entradas y salidas claras.
3. Envuelve cada función como nodo de código, con su manifiesto (`node.create_code`).
4. Compone un flujo de ejemplo, lo prueba (`run.flow`) y genera las fichas.
5. Lo propone al usuario.

**Alcance:** es una extensión que usa las mismas herramientas. Entra en la demo solo si lo esencial ya funciona.

## 8. Orden de trabajo del área Agente

| Paso | Qué | Depende de |
|---|---|---|
| 1 | Servicio del agente en Render, con Claude y validación de salidas | — |
| 2 | Cliente MCP con un **MCP falso** que imita las herramientas de §4 | Contrato §4 acordado con Sebastián |
| 3 | Ciclo del sandbox: fork → construir → probar → proponer | MCP real de Sebastián, Render Sandboxes |
| 4 | Diff de Dominio a partir de `sandbox.diff` | Paso 3 |
| 5 | `@agente` en la sala y mediador | Sala de Sebastián |
| 6 | Fichas de componente y embeddings | Formato acordado con Cantú |
| 7 | Memoria temporal en grafo | ADR |
| 8 | Importar desde GitHub | Pasos 3 y 6 |

## 9. Preguntas abiertas

- **Sebastián:** ¿el contrato de §4 te sirve? ¿Qué motor corre sin interfaz en el sandbox? ¿Hace falta cambiar el protocolo (ADR) para `flow.apply_patch` o `sandbox.diff`?
- **Cantú:** ¿qué campos de la ficha (§5.1) necesita el buscador? ¿El agente de registro escribe el perfil en Supabase con algún formato que el agente deba leer?
- **Equipo:** ¿Graphiti o tablas en Supabase para la memoria? ¿Quién crea el proyecto de Supabase y comparte las claves?
