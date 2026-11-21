# Capa de agente: diseño v0.2

**Responsable:** Gabriel (área Agente). Toma las decisiones de arquitectura de esta capa por delegación del líder.
**Coordina con:** Sebastián (MCP, escritura y ejecución de flujos, Hub) y Cantú (Feed).
**ADRs:** 0019 (servicio de agente), 0020 (memoria temporal) y 0021 (autorización). Se apoya en el ADR 0018 (Hub).

## 1. Principio

> **El agente puede pensar en cualquier lenguaje, pero solo entrega nodos y flujos.**

Cuando un usuario le pide al agente una herramienta, una función o un proyecto, el agente **lo construye con el motor de nodos** a través del MCP de Sebastián. Si necesita lógica que no existe, crea un nodo de código (Python o SQL) con su manifiesto. El usuario nunca recibe un script suelto: recibe nodos y flujos que se pueden ver, ejecutar, compartir y remixar.

## 2. Reparto de responsabilidades

| Pieza | Dueño | Dónde |
|---|---|---|
| **Servidor MCP** | Sebastián | Lo define él |
| **Herramienta de escritura** (crear, modificar y publicar flujos) | Sebastián | MCP |
| **Herramienta de ejecución** (solo lectura, corre en un sandbox) | Sebastián | MCP + sandbox |
| Publicaciones, versiones y perfiles | Sebastián (Hub, ADR 0018) | Supabase |
| **Servicio del agente**: bucle con Claude, cliente MCP, claves | **Gabriel** | Render, servicio web (`apps/agent`, ADR 0019) |
| **Propuestas y Diff de Dominio** | **Gabriel** | `apps/agent` |
| **Memoria temporal, fichas de componente y story coding** | **Gabriel** | `apps/agent` + Supabase (ADR 0020) |
| Autorización del agente | **Gabriel** (ADR 0021) | `apps/agent` |
| `@agente` en la sala y mediador | Gabriel | **Después**, cuando exista la sala |
| Feed, buscador y agente de registro | Cantú | — |

```
Usuario ──pedido──▶ Servicio del agente (Render, apps/agent)
                      │  Claude (Anthropic) · memoria · propuestas
                      │  cliente MCP, con la identidad del usuario
                      ▼
              MCP de Sebastián
              ├─ escritura: borrador del flujo, cambios, publicar
              └─ ejecución (solo lectura) ──▶ sandbox
                      │
              propuesta + Diff de Dominio ──▶ el usuario acepta ──▶ se aplica / publica
```

## 3. Ciclo de trabajo del agente

1. **Borrador.** El agente pide a la herramienta de escritura un **borrador** del flujo (una copia de trabajo que nadie más ve). El original no se toca.
2. **Construir.** Agrega nodos, conecta, cambia parámetros y crea nodos de código sobre el borrador.
3. **Probar.** Ejecuta el borrador con la herramienta de ejecución (solo lectura) y lee estados, esquemas, muestras y errores. Si algo falla, corrige y vuelve a probar.
4. **Proponer.** Pide el diff entre el borrador y el original, y lo traduce a un **Diff de Dominio** (tarjetas en lenguaje del oficio, con la razón de cada cambio).
5. **Decidir.** El usuario acepta o rechaza cambio por cambio. Lo aceptado se aplica al original o se publica, siempre con la identidad del usuario.

## 4. Lo que el agente necesita del MCP de Sebastián

**Requisitos generales**
- **R1. Identidad del usuario.** El agente llama al MCP en nombre de un usuario (su JWT de Supabase). Cada herramienta respeta los permisos de ese usuario, y ningún argumento puede cambiar de quién es la llamada.
- **R2. Borradores aislados.** Los cambios del agente ocurren sobre un borrador que nadie más ve, hasta que el usuario acepta.
- **R3. Errores como datos.** Si algo es inválido (nodo inexistente, puerto incompatible, parámetro fuera de rango, ciclo), la herramienta responde con un error legible y no cambia nada. Los cambios en lote son atómicos.
- **R4. Revisión del flujo.** Cada flujo y cada borrador tiene una revisión estable (por ejemplo, un hash). Aplicar un borrador falla si el original cambió mientras tanto.
- **R5. Ejecución acotada y sin escritura.** La herramienta de ejecución no puede modificar flujos ni publicar. Devuelve resultados con límites (por ejemplo, 20 filas y 64 KB por muestra) y permite pedir más páginas.
- **R6. Sin secretos en el sandbox.** El código generado por el agente corre en el sandbox sin acceso a las claves del servicio. Recomendación: Render Sandboxes (ya tenemos la clave con alcance solo para Sandboxes) o la opción que prefiera Sebastián.

**Herramientas que necesito** (los nombres son orientativos; Sebastián define los finales)

| Necesito… | Para qué | Escritura o ejecución |
|---|---|---|
| Listar los nodos disponibles y leer el manifiesto de uno (puertos, parámetros con JSON Schema y unidades) | Saber con qué piezas construir | Lectura |
| Leer un flujo y buscar flujos o nodos (propios, del Hub) | Partir de algo existente | Lectura |
| Crear un borrador desde un flujo, o uno vacío | R2 | Escritura |
| Agregar y quitar nodos, conectar y desconectar puertos, cambiar parámetros, aplicar varios cambios en lote | Construir | Escritura |
| Crear o actualizar un nodo de código (Python o SQL) con su manifiesto, que viaje dentro del flujo (`customNodes`) | Lógica nueva, siempre como nodo | Escritura |
| Declarar un flujo como nodo (entradas, parámetros expuestos; ADR 0016) | Entregar herramientas reutilizables | Escritura |
| Validar un flujo sin ejecutarlo | Corregir antes de probar | Lectura |
| **Diff entre el borrador y el original**: nodos, conexiones y parámetros (antes y después), y nodos de código | Diff de Dominio | Lectura |
| Aplicar un borrador (todo o solo algunos cambios) o publicarlo, con la identidad del usuario | Cuando el usuario acepta | Escritura |
| Descartar un borrador | Limpieza | Escritura |
| Ejecutar un flujo o borrador (todo o hasta ciertos nodos) y leer estados y errores por nodo | Probar | **Ejecución** |
| Leer una muestra paginada, el esquema de un puerto y los logs de nodos Python | Inspeccionar | **Ejecución** |

**El agente se adapta al contrato que defina Sebastián.** Mientras no exista, `apps/agent` trabaja contra un **MCP falso** que imita esta lista.

## 5. Memoria: story coding en grafo temporal

La memoria registra **qué se construyó, cuándo, cómo, por quién y por qué**: la construcción, las conversaciones con los agentes, entre usuarios y con la comunidad, y las características de cada componente.

- **Entidades:** usuario, agente, flujo, nodo, puerto, conversación, decisión, propuesta.
- **Relaciones con tiempo** (`valid_from`, `valid_to`): *creó*, *modificó*, *conectó*, *propuso*, *aceptó*, *rechazó*, *derivó de*, *conversó sobre*.
- **Episodios:** cada llamada del agente al MCP, cada mensaje y cada propuesta aceptada o rechazada, con su marca de tiempo.
- Permite responder: *¿por qué este nodo usa 2 h y no 4 h?* → *porque Valeria lo corrigió el sábado a las 11:40, después de hablar con Diego.*

Graphiti (grafo temporal de código abierto) queda como evolución futura: es solo Python y exige Neo4j o FalkorDB (ADR 0020).

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

El formato final se acuerda con Cantú, porque alimenta el buscador del Feed.

## 6. Después (cuando exista la sala)

- **`@agente` en la sala:** el agente responde en el chat y deja propuestas visibles para todos.
- **Mediador:** cuando se rompe un límite crítico en la mesa, el agente explica el conflicto a cada uno en su jerga y propone un acuerdo.
- **Importar desde GitHub:** convierte funciones de un repo en nodos de código, usando las mismas herramientas.
