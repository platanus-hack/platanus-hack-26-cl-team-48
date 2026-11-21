# Nodomics — Investigación de mercado

> Precios y cifras provienen en parte de fuentes de terceros (blogs, reviews); tratarlos como indicativos.

## TL;DR

**Sí existe algo parecido, y desde hace 20 años.** La categoría se llama *visual analytics / visual data science workflow*. El líder open source es **KNIME** (2006), que ya tiene nodos, flujos-como-nodo ("components"), nodos de Python/R y un Hub comunitario para publicar nodos y flujos. Alteryx y Dataiku cubren el lado empresarial caro.

**Lo que NO existe bien resuelto** es la combinación de:

1. **Web-nativo y multijugador** (tipo Figma). KNIME, Orange y Alteryx son apps de escritorio pesadas.
2. **Una comunidad estilo GitHub/ComfyUI de verdad**: forks, versiones, dependencias, "instalar nodos faltantes" automáticamente, ranking, autoría. El Hub de KNIME es más un repositorio que una comunidad viva.
3. **UX pensada para no técnicos de cualquier área**. KNIME es potente pero los usuarios de negocio lo describen como "clunky" con curva de aprendizaje empinada.
4. **Precio accesible**. Alteryx arranca en miles de USD por usuario/año, Dataiku cobra decenas de miles al año, y Observable Canvases ronda los 900 USD/mes por equipo.

La oportunidad no está en "inventar el editor de nodos para datos", sino en **hacer para el análisis de datos lo que ComfyUI hizo para la IA generativa y Figma para el diseño**: web, colaborativo, comunitario y viral.

---

## Mapa del mercado

### 1. Plataformas de flujos visuales para datos (competencia directa)

| Producto | Modelo | Fortalezas | Debilidades / hueco |
|---|---|---|---|
| **KNIME Analytics Platform** | Open source (escritorio) + Hub/servidor pago | Miles de nodos; componentes (flujo como nodo); Python/R; Community Hub para publicar nodos y flujos; asistente IA K-AI | Escritorio (Eclipse/Java), pesado, UX anticuada; "clunky" para usuarios de negocio; Hub poco social |
| **Alteryx Designer / Alteryx One** | Comercial, cerrado | UX pulida, conectores, analítica espacial, gobernanza | Cliente solo Windows; muy caro (≈3–7k USD/usuario/año); visualización pobre (se combina con Tableau/Power BI); privatizada en 2024 por 4.400 M USD → presión de precios |
| **Dataiku** | Comercial (free edition limitada) | "Visual recipes" + código; muy completo para empresas | Precio enterprise (mediana reportada ≈160k USD/año); no orientado a individuos ni comunidad |
| **RapidMiner (Altair)** | Comercial | Fuerte en ML/AutoML | Caro, orientado a ML, poco comunitario |
| **Orange Data Mining** | Open source (escritorio) | Muy amigable, ideal para enseñanza; add-ons (texto, bioinformática, imagen, series de tiempo, geo, single-cell…) | Limitado para producción; escritorio; sin comunidad para compartir flujos |
| **Enso Analytics** | Motor Apache 2.0, IDE AGPL; binarios comerciales | Lenguaje visual + textual; dual (gráfico y código); co-fundador de Alteryx; ~7.4k ⭐ | Pivotó a nicho finanzas/contabilidad/RevOps; complejo |
| **Flowfile** | Open source (MIT), pequeño | ETL visual sobre Polars; exporta a Python puro; notebook bidireccional | Proyecto de una persona; sin comunidad ni visualización fuerte |
| **LoomFlow** | Open source, nuevo | Canvas DAG sobre Polars | Muy temprano |

### 2. Ciencia y bioinformática

| Producto | Notas |
|---|---|
| **Galaxy Project** | Sistema de flujos científicos web open source (v26.0, abr 2026). Editor visual, **Tool Shed** comunitario para herramientas, publicación de historias/flujos/visualizaciones. Muy fuerte en biología, pero UX pesada y centrado en herramientas CLI, no en tablas. **Es la prueba de que la comunidad científica adopta flujos compartibles.** |
| Node-RED, Ryven, Nodezator | Editores de nodos genéricos (IoT / Python). Útiles como referencia técnica, no como producto de datos. |

### 3. Canvas colaborativos de analítica (competencia indirecta, web)

| Producto | Notas |
|---|---|
| **Observable Canvases** (2025) | Pizarra infinita colaborativa con SQL, UI e IA; gráficos sin código; DuckDB-WASM; dashboards compartibles. Caro (~900 USD/mes equipo, según Capterra). Es lo más cercano en *espíritu* web/colaborativo. |
| **Count.co** | Canvas tipo whiteboard + SQL/Python, multijugador, agente IA. Orientado a equipos de datos con data warehouse. |
| **Einblick** | Canvas visual colaborativo de data science → **adquirido por Databricks** (2024). Señal de que la idea tiene valor, pero el producto desapareció. |
| **Hex, Deepnote** | Notebooks colaborativos (código primero). Para técnicos. |
| **Databricks Lakeflow Designer, Google BigQuery Data Canvas, Prophecy** | Canvas no-code dentro de plataformas de datos grandes. Atados a su ecosistema y a empresas. |

### 4. "Pregúntale a tus datos" con IA

Julius AI, Powerdrill, Polymer, Graphext, Amazon Canvas (Seller Central, 2026). Chat → gráfico. Resuelven el "no sé programar", pero **no son reproducibles, auditables ni componibles**: cada análisis es una conversación que se pierde. Esto es un argumento a favor de nodos: *la IA puede generar el flujo, pero el flujo es el artefacto que queda*.

### 5. Automatización general (n8n, Make, Zapier)

n8n es la referencia de UX que mencionas, pero **no sirve para análisis**: trabaja con ítems JSON y no con dataframes, la transformación se hace en JavaScript, las Data Tables tienen límites y no renderiza gráficos (hay que mandarlos a un frontend externo).

### 6. Analogía clave: ComfyUI

ComfyUI (nodos para IA generativa) es el mejor modelo de **comunidad**:
- **Registry** público de nodos con versiones, deprecación y métricas.
- **Manager** que detecta los nodos que faltan al abrir un flujo y los instala solo.
- El flujo es un JSON que guarda la versión de cada nodo → reproducible.
- Los flujos viajan **incrustados en las imágenes que generan** → arrastrar una imagen recrea el flujo. Esto lo hizo viral.

---

## Evidencia del problema ("los analistas no son técnicos")

- Un estudio piloto con investigadores de neurociencia (Newcastle) encontró que **ninguno tenía formación formal en hojas de cálculo, el 71% era autodidacta y solo el 20% hacía revisar sus planillas** (muestra pequeña, n=17).
- Excel sigue siendo la herramienta de análisis más usada en biología y casi no aparece en los planes de estudio (2026).
- Los grandes (Databricks, Google, Amazon, Alteryx) están lanzando canvas no-code para "analistas no técnicos". **Valida la demanda, pero todos apuntan a empresas.**

⚠️ Falta evidencia cuantitativa sólida del tamaño del segmento de no técnicos. Hay que validarla con entrevistas (ver doc de concepto).

---

## Conclusiones para Nodomics

1. **No competir con KNIME en cantidad de nodos**. Competir en experiencia (web, colaborativa, bonita), en comunidad y en distribución viral.
2. **El foso defensivo es la red de la comunidad** (nodos + flujos + autores), no el editor. Copiar un editor es fácil; copiar 10.000 flujos publicados no.
3. **"Para todas las áreas" es la visión, no el punto de partida**. Hace falta un nicho inicial (ver concepto).
4. **El hueco de precio es real**: entre "gratis pero de escritorio y feo" (KNIME, Orange) y "bonito pero de 900 USD/mes o más" (Observable, Alteryx, Dataiku).
5. **La IA es aliada, no competidora**: la IA genera y explica flujos, y el flujo garantiza que el resultado sea reproducible.

---

## Fuentes

- KNIME: [get started](https://KNIME.com/get-started), [Community Hub docs](https://docs.knime.com/chub/latest/), [KNIME 5.2 (K-AI, Python)](https://www.knime.com/blog/whats-new-knime-analytics-platform-52), [changelog 5.5](https://docs.knime.com/ap/5.11/changelogs/5.5/), [Linux Magazine](https://www.linux-magazine.com/index.php/Issues/2018/210/KNIME)
- Comparativas: [Alteryx vs RapidMiner vs KNIME](https://www.thebricks.com/resources/alteryx-vs-rapidminer-vs-knime), [KNIME alternatives 2025](https://www.getgalaxy.io/blog/knime-alternatives-2025), [Mammoth: KNIME alternatives 2026](https://mammoth.io/?p=14551), [PeerSpot Alteryx vs KNIME](https://www.peerspot.com/products/comparisons/alteryx_vs_knime), [G2 KNIME vs Orange](https://www.g2.com/compare/knime-analytics-platform-vs-orange)
- Alteryx: [TechCrunch take-private](https://techcrunch.com/2023/12/18/clearlake-and-insight-reach-4-4b-deal-to-take-software-maker-alteryx-private), [Constellation](https://www.constellationr.com/index%2ephp/insights/news/alteryx-goes-private-44-billion-deal-what-watch-next), [vendorbenchmark](https://vendorbenchmark.com/vendors/alteryx-pricing), [automationatlas](https://automationatlas.io/tools/alteryx/)
- Dataiku: [TheCTOClub review 2026](https://thectoclub.com/tools/dataiku-review), [ki-syndikat](https://www.ki-syndikat.de/tools/dataiku/)
- Orange: [Wikipedia](https://en.wikipedia.org/wiki/Orange_(software)), [eScience Center](https://blog.esciencecenter.nl/posts/2023-10-12---the-orange3-data-mining-platform-as-a-research-tool)
- Enso: [GitHub](https://github.com/enso-org/enso), [Crowdfund Insider](https://www.crowdfundinsider.com/2022/04/190045-enso-launches-to-make-complex-data-analysis-more-accessible/)
- Flowfile / LoomFlow: [PyPI Flowfile](https://pypi.org/project/Flowfile/), [dev.to arquitectura](https://dev.to/edwardvaneechoud/building-flowfile-architecting-a-visual-etl-tool-with-polars-576c), [LoomFlow Product Hunt](https://www.producthunt.com/p/loomflow-visual-polars-etl/loomflow-open-source-visual-etl)
- Galaxy: [Wikipedia](https://en.wikipedia.org/wiki/Galaxy_(computational_biology)), [NAR 2016](https://academic.oup.com/nar/article/44/W1/W3/2499339)
- ComfyUI: [Registry docs](https://docs.comfy.org/registry/), [Manager docs](https://docs.comfy.org/manager/overview), [lanzamiento del Registry](https://blog.comfy.org/p/launching-comfyui-registry?open=false), [BentoML guide](https://www.bentoml.com/blog/a-guide-to-comfyui-custom-nodes)
- Observable: [Canvases summer 2025](https://observablehq.com/blog/canvases-summer-release-2025), [2025 review](https://observablehq.com/blog/observable-2025-year-in-review), [Capterra](https://www.capterra.com/p/10032502/Observable/)
- Count: [docs](https://docs.count.co), [collaborative canvas](https://learn.count.co/docs/collaborative-experience)
- Einblick: [TechTarget](https://www.techtarget.com/searchbusinessanalytics/news/366568576/Databricks-acquisition-of-Einblick-enhances-GenAI-portfolio)
- Databricks Lakeflow Designer: [press release](https://www.databricks.com/company/newsroom/press-releases/databricks-unveils-lakeflow-designer-data-analysts-build-reliable), [docs](https://docs.databricks.com/aws/en/designer)
- IA / chat: [Julius alternatives](https://julius.ai/articles/julius-ai-alternatives), [Prophecy](https://www.prophecy.ai/blog/best-ai-agents-for-data-analysis), [Amazon Canvas](https://novadata.io/resources/news/amazon-seller-central-canvas-ai-visual-dashboard-2026), [Polymer](https://www.polymersearch.com/ai-dashboard-generator), [Graphext](https://www.thesilab.com/vendor-directory/graphext)
- n8n: [Data tables](https://docs.n8n.io/data/data-tables/), [transformar datos](https://docs.n8n.io/build/work-with-data/transform-data/approaches-for-transforming-data.md), [KDnuggets](https://www.kdnuggets.com/automate-data-quality-reports-with-n8n-from-csv-to-professional-analysis)
- Editores de nodos: [Nodezator](https://pypi.org/project/nodezator/1.3.13/), [Ryven](https://github.com/ikko/ryven-visual-workflow-python)
- Problema: [Spreadsheet risk in research (arXiv)](https://arxiv.org/pdf/1703.09785), [Excel en investigación biológica 2026](https://www.biotecnika.org/2026/10/microsoft-excel-in-biological-research/)
