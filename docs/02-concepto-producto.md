# Nodomics — Concepto de producto (v0.1)

## 1. Visión

> **Nodomics es el "GitHub + Figma" del análisis de datos: un lienzo visual y colaborativo donde cualquier persona, sepa programar o no, conecta fuentes de datos, las transforma y las visualiza con nodos, y donde la comunidad publica, reutiliza y mejora nodos y flujos.**

Frase corta: *"Análisis de datos que se arma como LEGO y se comparte como código."*

## 2. Problema

- La mayoría de quienes analizan datos (investigadores, marketing, salud, ONG, gobierno, docentes, finanzas) **no son programadores**. Usan Excel: análisis frágiles, no reproducibles, difíciles de auditar y de compartir.
- Las alternativas son **escritorio y difíciles** (KNIME, Orange), **caras y empresariales** (Alteryx, Dataiku, Observable), o **chat con IA no reproducible** (Julius, ChatGPT).
- El conocimiento analítico de cada área ("cómo se normaliza un qPCR", "cómo se calcula el churn", "cómo se limpia un censo") **se reinventa una y otra vez** porque no hay un lugar donde empaquetarlo y compartirlo.

## 3. Usuarios (personas)

Dos roles de creación, separados por **qué** construyen y no por cuánto saben de datos:

| Persona | Crea | Cómo | Rol en la comunidad |
|---|---|---|---|
| **Analista de dominio** (biólogo, marketer, contador; no programa) | **Flujos** | Conecta nodos en el lienzo, sin código | Publica flujos; usa y remixa flujos y nodos ajenos |
| **Técnico / desarrollador** (data scientist, programador) | **Nodos** | Programa nodos en Python/SQL/JS con el SDK | Publica nodos (el "mantenedor de paquetes") |
| **Docente / divulgador** | Flujos de ejemplo y plantillas | Lienzo | Publica plantillas y cursos |
| **Lector / stakeholder** | — | Ve resultados, mueve filtros en las vistas | Consumidor de tableros publicados |

Reglas clave:
- **Nodos y flujos son compartibles por igual** en el Hub: se publican, versionan, forkean y se les da estrella.
- **Un flujo puede usarse como nodo**: un analista que nunca programó puede publicar un "nodo" armando un flujo y declarando sus entradas y salidas. Así, el no técnico también aporta bloques reutilizables, no solo resultados.

El flywheel: **los técnicos crean nodos → los analistas los combinan en flujos → los flujos publicados se reutilizan como nodos más grandes → el uso genera visibilidad y pedidos ("falta un nodo que haga X") → más técnicos crean nodos.**

## 4. Conceptos núcleo

| Concepto | Qué es |
|---|---|
| **Fuente** | Nodo de entrada: CSV/Excel subido, Google Sheets, URL, APIs (REST), bases de datos (Postgres, MySQL, BigQuery…), datasets públicos (World Bank, INE, NCBI, Kaggle…). Las credenciales se guardan cifradas aparte (como n8n). |
| **Nodo** | Unidad de trabajo con **puertos tipados** de entrada y salida y parámetros con un formulario autogenerado. |
| **Puertos tipados** | `Tabla`, `Columna/Serie`, `Escalar`, `Texto`, `GeoTabla`, `Imagen`, `Modelo`, `Gráfico`. Los tipos permiten validar conexiones y sugerir el siguiente nodo. |
| **Nodo básico** | Filtrar, seleccionar columnas, unir (join), agrupar/resumir, pivotar, ordenar, limpiar nulos, convertir tipos, fórmula, fechas, deduplicar, muestreo, estadística descriptiva. |
| **Nodo programable** | Lo crea el técnico: código Python, SQL o JS con un manifiesto (puertos, parámetros). También existe un nodo de "código rápido" dentro del lienzo, con IA para escribirlo, que se puede **promover a nodo publicable**. |
| **Vista** | Nodo terminal visual: tabla interactiva, gráficos (barras, líneas, dispersión, mapa, heatmap…), KPI, texto/markdown. Varias vistas forman un **tablero/app**. |
| **Flujo** | Grafo de nodos. Se guarda en un formato abierto (`.nodo.json`) que registra la versión de cada nodo usado. |
| **Flujo como nodo** | Cualquier flujo con entradas y salidas declaradas se puede usar como un nodo dentro de otro flujo, igual que un nodo programado. Es la clave de la composición y la vía para que los no técnicos creen bloques reutilizables. |
| **Paquete** | Unidad publicable y versionada (semver): uno o más **nodos** y/o **flujos**, con autor, licencia, README, ejemplos y datos de prueba. En el Hub, nodos y flujos son ciudadanos de primera clase por igual. |
| **Hub** | Registro público estilo GitHub/npm: buscar, instalar, **forkear**, dar estrellas, comentar, abrir "propuestas de cambio" a un flujo ajeno. |

## 5. Lluvia de ideas

### Experiencia para no técnicos
- **Vista previa de datos en cada nodo**: haces clic en cualquier conexión y ves las filas que pasan por ahí. Nada de cajas negras.
- **"Explícame este nodo/flujo"**: la IA narra en lenguaje natural qué hace cada paso. Ideal para auditar y enseñar.
- **De pregunta a flujo**: "¿Cuál fue la venta promedio por región en 2025?" → la IA arma el flujo con nodos visibles y editables (no una respuesta opaca).
- **Sugerencia del siguiente nodo** según el tipo de dato de salida ("tienes una columna de fecha: ¿agrupar por mes?").
- **Modo plantilla**: abrir un flujo de la comunidad, que pida solo "sube tu archivo aquí" y mapee columnas con un asistente.
- **Detección de errores amable**: "la columna `fecha` tiene 12 valores que no parecen fechas: ¿qué hacemos?".
- **Vocabulario por profesión**: el mismo nodo puede aparecer como "Tabla dinámica" para quien viene de Excel.

### Comunidad (el foso defensivo)
- **Flujos incrustados en los resultados** (truco viral de ComfyUI): cada gráfico exportado (PNG/SVG/link) lleva su flujo. "Remixar este gráfico" abre el análisis completo. Un gráfico compartido en Twitter o en un paper se convierte en puerta de entrada.
- **Instalación automática de nodos faltantes** al abrir un flujo ajeno.
- **Forks y "pull requests" de flujos** con **diff visual** (nodos agregados en verde, eliminados en rojo, parámetros cambiados).
- **Colecciones por dominio**: Genómica, Marketing, Finanzas públicas, Epidemiología, Educación, Encuestas, Deportes…
- **Nodos verificados** (revisados, con tests y datos de ejemplo) frente a nodos comunitarios, con niveles de confianza visibles.
- **Perfiles de autor** con métricas de uso ("tu nodo se usó en 3.200 flujos") → reputación, que es el motor de GitHub.
- **Citabilidad científica**: DOI para flujos publicados (vía Zenodo) → los investigadores tienen incentivo para publicar.
- **Desafíos/datasets de la semana** para generar actividad.

### Colaboración
- Edición **multijugador en tiempo real** (cursores, comentarios anclados a nodos, menciones).
- **Historial de versiones** del flujo y de los datos ("¿qué cambió desde el informe del mes pasado?").
- **Publicar como app/tablero** con link público o privado; los lectores pueden mover filtros sin editar el flujo.

### Técnico / poder
- **Exportar a código** (Python/pandas o Polars, SQL) → sin vendor lock-in y puente hacia los técnicos.
- **Importar código → flujo** (más adelante).
- **Ejecución programada** (cron) y disparadores (cuando cambia la planilla) → aquí se parece a n8n.
- **Cache inteligente**: al cambiar un parámetro solo se recalcula lo que está aguas abajo.
- **Escala gradual**: datos chicos en el navegador; datos grandes en un worker en la nube; conexión al warehouse del cliente (empujar el SQL a la base).

### Ideas más arriesgadas
- **Nodos como API**: cualquier flujo publicado se puede llamar como endpoint.
- **Marketplace de nodos/flujos de pago** con reparto de ingresos para creadores expertos (por ejemplo, un pipeline validado de análisis clínico).
- **Modo aula**: el docente reparte un flujo, los alumnos lo completan y el docente ve el progreso de todos.
- **Nodos de datos públicos curados**: "INE Chile → población por comuna" listos para usar.

## 6. Diferenciación (posicionamiento)

```
                    Fácil para no técnicos
                            ▲
       Julius / chat IA     │      ★ Nodomics
       (no reproducible)    │   (visual + comunidad + web)
                            │
   Cerrado/caro ◄───────────┼───────────► Abierto/comunitario
                            │
   Alteryx, Dataiku,        │      KNIME, Orange, Galaxy
   Observable               │   (escritorio, curva de aprendizaje)
                            ▼
                    Para técnicos
```

Las tres apuestas de Nodomics:
1. **Web + multijugador** desde el día uno.
2. **Comunidad tipo GitHub/ComfyUI** como núcleo del producto, no como un añadido.
3. **El flujo es el artefacto**: reproducible, explicable por IA, remixable y exportable a código.

## 7. Nicho de entrada (beachhead)

"Para todas las áreas" es la visión correcta, pero lanzar para todas a la vez diluye el mensaje y deja vacía la comunidad. Candidatos, de mayor a menor recomendación:

1. **Investigación académica / ciencias (biología, salud, ciencias sociales)**: gran dolor con Excel, cultura de compartir (papers), incentivo de citabilidad, encaja con el nombre "-omics" y con el precedente de Galaxy. Las universidades sirven como canal.
2. **Educación** (cursos de estadística y análisis de datos): los docentes generan contenido y los alumnos son futuros usuarios. Orange demuestra que hay demanda.
3. **Pymes / marketing / operaciones**: mayor disposición a pagar, pero más competencia (Polymer, Julius, Looker Studio).

**Recomendación**: empezar con **ciencia y academia en español** (Latinoamérica + España), un mercado desatendido por herramientas en inglés, y expandir después.

## 8. MVP (primeros ~3 meses)

**Objetivo**: que una persona no técnica pueda subir un CSV, limpiarlo, agregarlo, graficarlo, publicarlo y que otra persona lo remixe.

Incluye:
- Lienzo web con nodos (arrastrar, conectar, vista previa por nodo).
- Fuentes: CSV/Excel, Google Sheets, URL.
- ~20 nodos básicos + 1 nodo de código (Python vía Pyodide o SQL vía DuckDB).
- ~6 vistas: tabla, barras, líneas, dispersión, histograma, KPI.
- Subflujo → nodo.
- Publicar un flujo con link y botón "Remixar" (fork).
- Hub mínimo: explorar, buscar, estrellas, perfil de autor.
- IA: "explica este flujo" y "genera el nodo de código".

No incluye todavía: tiempo real multijugador, ejecución programada, bases de datos, marketplace de pago ni exportación a código.

## 9. Arquitectura propuesta (borrador)

> Modelo de ejecución (web, pero todo local, en 3 niveles: navegador → motor local → nube): ver [03-ejecucion-local.md](03-ejecucion-local.md).

| Capa | Opción sugerida | Por qué |
|---|---|---|
| Lienzo | React + **React Flow (xyflow)** | Estándar de facto para editores de nodos web |
| Motor de datos (cliente) | **DuckDB-WASM** (SQL/tablas) + **Pyodide** (Python en el navegador) | Ejecución local: privacidad, cero costo de servidor, latencia baja. Observable usa el mismo enfoque |
| Motor de datos (servidor, fase 2) | Workers Python con **Polars/DuckDB** en contenedores aislados | Datos grandes, ejecución programada |
| Formato de datos entre nodos | **Apache Arrow** | Sin copias entre DuckDB, Polars y pandas |
| Gráficos | Vega-Lite / ECharts / Observable Plot | Especificación declarativa y serializable dentro del flujo |
| Formato de flujo | JSON abierto + versiones de nodos fijadas | Reproducibilidad (modelo ComfyUI) |
| Definición de nodo | Manifiesto (`nodo.yaml`: puertos, tipos, parámetros, UI) + código | El formulario se genera solo y es fácil crear nodos |
| Registry / Hub | Paquetes versionados respaldados en git; backend Postgres | Forks, diffs e historial casi gratis |
| Colaboración (fase 2) | CRDT (**Yjs**) | Edición multijugador |
| Seguridad del código comunitario | Sandbox WASM en el cliente; contenedores aislados en el servidor; escaneo y nodos verificados | El mayor riesgo técnico de un registry abierto |

Ejemplo de manifiesto de nodo:

```yaml
id: nodomics/estadistica.normalizar
version: 1.2.0
name: Normalizar columnas
category: Transformar
inputs:
  - { id: tabla, type: Tabla }
outputs:
  - { id: tabla, type: Tabla }
params:
  - { id: columnas, type: columnas_numericas, label: "Columnas a normalizar" }
  - { id: metodo, type: enum, options: [z-score, min-max], default: z-score }
runtime: python   # python | sql | js
entry: main.py
```

## 10. Modelo de negocio (hipótesis)

- **Gratis**: uso individual, flujos públicos, ejecución en el navegador.
- **Pro (≈10–20 USD/mes)**: flujos privados, ejecución en la nube, datos más grandes, ejecución programada, más IA.
- **Equipos/Instituciones**: espacios privados, SSO, Hub privado, gobierno de datos, soporte. Licencias de campus para universidades.
- **Marketplace** (fase 3): nodos y flujos de pago con comisión.
- **Open core**: el editor y el motor open source (genera confianza y contribuciones, como KNIME y n8n); el Hub y la nube como servicio.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| KNIME es gratis y maduro | No competir en número de nodos; competir en UX web, colaboración y comunidad |
| Arranque en frío de la comunidad (hub vacío) | Sembrar con 100+ flujos de calidad del nicho elegido; alianzas con docentes e investigadores |
| Seguridad del código de terceros | Sandbox, permisos explícitos, nodos verificados |
| Rendimiento en el navegador con datos grandes | Ejecución híbrida y *push-down* a la base de datos |
| La IA de chat "resuelve" el problema sin nodos | Posicionar la IA como generadora de flujos: el flujo aporta auditabilidad y reproducibilidad |
| Alcance demasiado amplio | Disciplina de nicho y MVP acotado |

## 12. Validación (antes de construir mucho)

1. **15–20 entrevistas** con analistas no técnicos del nicho: ¿cómo analizan hoy?, ¿qué repiten?, ¿comparten análisis?, ¿probaron KNIME u Orange y por qué lo dejaron?
2. **Prototipo clicable** (Figma o React Flow con datos falsos) y tests de usabilidad: ¿puede alguien sin conocimientos técnicos hacer un gráfico en menos de 5 minutos?
3. **Landing con lista de espera** dividida por área → mide qué nicho responde más.
4. **Prueba de concepto técnica**: DuckDB-WASM + Pyodide + React Flow ejecutando un flujo de 5 nodos con 1M filas en el navegador.

## 13. Hoja de ruta

| Fase | Contenido |
|---|---|
| **0 — Validación** (4–6 semanas) | Entrevistas, prototipo, landing, prueba de concepto técnica |
| **1 — MVP** (~3 meses) | Ver sección 8 |
| **2 — Colaboración** | Multijugador, comentarios, versiones, bases de datos, ejecución en la nube y programada, exportar a código |
| **3 — Ecosistema** | SDK de nodos, nodos verificados, DOIs, colecciones por dominio, apps/tableros publicables |
| **4 — Negocio** | Planes de equipo e institución, Hub privado, marketplace |

## 14. Preguntas abiertas para decidir

1. ¿Qué nicho inicial? (recomendación: ciencia y academia en español)
2. ¿Open source desde el inicio (open core) o cerrado hasta tener tracción?
3. ¿Ejecución en el navegador primero (barato y privado) o en servidor primero (más potente)?
4. ¿Qué lenguaje para nodos programables en el MVP: Python, SQL o ambos?
5. ¿Nombre de los artefactos? (¿"nodo" y "flujo", o algo propio de la marca, como "receta"?)
