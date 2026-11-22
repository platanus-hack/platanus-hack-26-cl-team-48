# Nodomics — Presentación: narrativa y demos

> Documento de trabajo para el pitch de Platanus Hack 26. Contiene la narrativa, los cinco casos de uso con su guion de demo y lo que falta preparar para cada uno.
> Para el pitch, las demos son **animaciones que simulan Nodomics** (presentación en `artifact`), no la app en vivo. Este documento sigue marcando qué existe y qué falta, para saber qué se puede mostrar después en la app real.
> Cada caso marca qué **ya existe** en el producto y qué **hay que preparar** (datos, seeds o funcionalidad). No mostremos en vivo nada marcado como "falta" sin haberlo construido antes.

---

## 1. La narrativa en una línea

> **Las personas que saben qué herramienta hace falta no saben construirla, y las que saben construirla no saben que hace falta. Nodomics las conecta a través de las herramientas mismas.**

## 2. El problema (≈ 45 s)

Tres frases, una por diapositiva:

1. **Hay una desconexión entre quienes saben hacer herramientas y quienes las necesitan.** La ingeniera civil sabe exactamente qué índice necesita; el programador sabe hacerlo, pero nunca se van a cruzar.
2. **Los expertos de nicho no programan.** Su conocimiento (cómo se mide la resiliencia de una comunidad, cuándo se pudre una fresa, cómo se normaliza una serie) queda en planillas, tesis y cabezas.
3. **Hoy se crean más herramientas que nunca, y nadie se entera.** Con la IA, cualquiera hace un script en una tarde. Terminan en un repo de GitHub, en un anexo de una tesis o en un notebook olvidado. La persona que lo necesita al otro lado del mundo, o en la facultad de al lado, vuelve a empezar desde cero.

Frase de cierre del problema:

> *El problema ya no es construir herramientas. Es que la herramienta correcta encuentre a la persona correcta.*

## 3. Qué es Nodomics (≈ 30 s)

**Nodomics es un lienzo visual donde las herramientas son nodos que cualquiera puede ver, ejecutar, adaptar y combinar, y una red que lleva cada herramienta a quien la necesita.**

Las piezas del producto que hacen que eso funcione:

| Pieza | Qué hace | Estado |
|---|---|---|
| **Lienzo de nodos** | Las herramientas son nodos conectados. Se ve qué entra y qué sale de cada paso; nada es una caja negra. Corre en el navegador (DuckDB + Python con Pyodide). | Existe |
| **Flujo como nodo** | Cualquier flujo con entradas y salidas se usa como un nodo dentro de otro (ADR 0016). Un no programador también crea bloques reutilizables. | Existe |
| **Importador** | El agente toma un script de GitHub, lo convierte en nodos y **demuestra que da el mismo resultado que el original** (estado `verified`), con su procedencia (repo, commit, licencia). | Existe (agente + sandbox) |
| **Hub** | Publicar, versionar, previsualizar e instalar flujos y nodos (ADR 0018, 0024). | Existe |
| **Feed por complementariedad** | Cada perfil tiene un vector de lo que **ofrece** y otro de lo que **busca**. El feed cruza lo que tú buscas con lo que otros ofrecen y con las herramientas publicadas. *Colaborar no es parecerse* (ADR 0022). Perfil armado desde tu CV. | Existe |
| **Mapa de personas** | Mapa de afinidad de perfiles y herramientas, con líneas entre complementos. | Existe |
| **Linaje** | Cada herramienta muestra quién la originó y quién la adaptó (lenguaje del nudo, ADR 0029). | Existe (básico: origen / adaptación) |
| **Agente que habla tu oficio** | Construye y modifica flujos por ti a través del MCP del motor, y te propone los cambios como un **Diff de Dominio** que aceptas o rechazas uno por uno. | Existe |
| **Hosteo** | Un flujo se publica como servicio en la web con los nodos Repo y Servicio (ADR 0027). | Existe (en cierre) |
| **Perfil vivo** | "Lo que busca" se construye solo con tus conversaciones y lo que construyes; un agente lo actualiza cada tanto y agrega mejoras de otras áreas, para que el feed no te encierre con gente de tus mismos problemas. | **Falta** (hoy la ficha sale del CV) |
| Notificaciones de uso | "Alguien usó tu herramienta en su proyecto." | **Falta** |
| Edición en vivo (sala) | Varias personas en el mismo flujo a la vez. | **Falta** |

## 4. El ciclo que muestran las demos

Cada caso muestra un eslabón distinto del mismo ciclo, para no repetir la misma demo cinco veces:

```
   descubrir ──▶ entender ──▶ adaptar ──▶ combinar ──▶ conectar ──▶ publicar
      (1)          (1)          (3)        (2)(5)       (1)(4)        (5)
```

| # | Caso | Eslabón protagonista | Pieza clave de Nodomics |
|---|---|---|---|
| 1 | Seguridad hídrica: ingeniero civil + antropóloga | **Descubrir** algo fuera de tu disciplina | Perfil vivo + feed + flujo como nodo + linaje |
| 2 | Clase de series temporales | **Combinar** y comparar métodos | Lienzo multijugador + nodos de código |
| 3 | Agrónomo México → agrónomo Chile | **Adaptar** a otro contexto | Agente + Diff de Dominio + fork |
| 4 | Teoría sin código ↔ código sin teoría | **Conectar** personas complementarias | Vectores ofrece/busca + mapa |
| 5 | De herramientas sueltas a un servicio público | **Publicar** para quien no usa Nodomics | Flujo como nodo + hosteo |

---

## 5. Los casos

### Caso 1 — Índice de seguridad hídrica: lo que un ingeniero no sabía que existía

**Personajes**
- **Diego**, ingeniero civil hidráulico. Arma un índice de seguridad hídrica comunal para un gobierno regional.
- **Jazmín**, antropóloga. Hace un año construyó en Nodomics un **flujo** de índice de resiliencia comunitaria (redes de apoyo, pobreza multidimensional, organización vecinal) con datos de la CASEN, y lo publicó en el Hub.

**Antes de Nodomics.** Diego sabe calcular oferta y demanda de agua, pero el índice moderno exige dimensiones sociales: resiliencia, pobreza, capacidad de adaptación. No es su área, y ni siquiera sabe que le faltan. Si busca algo, busca lo que ya conoce ("caudal", "demanda hídrica") y encuentra a otros ingenieros con el mismo problema. El flujo de Jazmín nunca aparece en esas búsquedas.

**El perfil que se escribe solo.** La pieza clave del caso es la parte del perfil de Diego que dice **lo que busca**:
- **No la llena él.** Se construye sola a partir de sus conversaciones con el agente y de lo que va construyendo en el lienzo.
- **Un agente la actualiza cada tanto**, y de forma proactiva agrega cosas **fuera de su área** que mejorarían su trabajo: al ver que Diego arma un índice territorial con solo variables físicas, añade *"dimensiones sociales de vulnerabilidad: resiliencia comunitaria, pobreza multidimensional"*.
- **Por qué importa:** si el feed solo usara lo que Diego ya sabe, le recomendaría flujos de gente con sus mismos problemas. Este agente es lo que rompe la burbuja y le muestra lo que no sabía que necesitaba.

**Guion de la demo**
1. **El flujo de Diego.** Abrimos su lienzo: fuente con caudales y consumo por comuna, nodos de oferta/demanda y un índice parcial con solo la dimensión física. El gráfico muestra comunas "seguras" que en la realidad no lo son.
2. **El perfil se actualiza.** Aparece un aviso discreto: *"Agregamos a lo que buscas: dimensiones sociales de vulnerabilidad"*, con la razón ("tu índice territorial no tiene variables sociales"). Diego lo acepta con un clic.
3. **El feed lo encuentra.** En "Para ti" aparece el flujo de Jazmín: *"Índice de resiliencia comunitaria (CASEN)"*, con su autora, cuántas veces se ha usado y su linaje. Diego nunca lo buscó.
4. **Entender antes de usar.** Diego abre la vista previa: ve el flujo de Jazmín nodo por nodo (pobreza → redes de apoyo → organización → ponderación) y las filas que pasan por cada conexión. No necesita saber antropología ni programar.
5. **Integrar y modificar.** Lo agrega a su flujo como un nodo (flujo como nodo), lo conecta por la columna `comuna` y cambia una ponderación. El gráfico se recalcula al instante: dos comunas cambian de categoría.
6. **El linaje.** En su flujo, el nodo muestra la hebra de Jazmín (origen) y la de Diego (adaptación).
7. **El cierre humano.** A Jazmín le llega la notificación: *"Diego usó tu índice de resiliencia en 'Seguridad hídrica Región de Coquimbo'"*. Ve el perfil de Diego y el uso que le dio, y le escribe. Una antropóloga y un ingeniero que nunca se habrían cruzado ahora trabajan juntos.

**El momento "wow":** el paso 2 seguido del 3. El sistema notó lo que a Diego le faltaba antes que él, y la respuesta ya existía, hecha por alguien de otra disciplina.

**Por qué Nodomics es clave:** sin el perfil que se actualiza solo, Diego vive en la burbuja de su disciplina; sin el lienzo, no podría confiar en una herramienta de un área que no entiende; sin el flujo como nodo, no podría integrarla sin rehacerla; sin el linaje y la notificación, Jazmín nunca se entera de que su trabajo sirvió.

**Preparación**
- [ ] Flujo de Jazmín publicado en el Hub con datos de ejemplo por comuna.
- [ ] Seeds: perfil de Diego y de Jazmín, flujo de Diego con datos de comunas.
- [ ] **Falta:** el agente que actualiza "lo que busca" a partir de conversaciones y flujos. Hoy la ficha sale del CV (agente de registro, ADR 0022) y se edita a mano.
- [ ] **Falta:** notificación de uso al autor.
- [ ] Revisar que el linaje del nodo instalado muestre a Jazmín como origen.

---

### Caso 2 — Clase de series temporales: cinco métodos, un solo lienzo

**Personajes**
- **Profesor Martín**, curso de series temporales.
- **Cinco alumnos**, cada uno implementó un método distinto para la misma tarea: normalizar y suavizar la demanda eléctrica horaria (z-score, min-max, escalado robusto con mediana/IQR, diferenciación + log, media móvil).

**Antes de Nodomics.** Cada alumno entrega un notebook distinto, con sus propias rutas y versiones. Comparar significa que el profesor corra cinco notebooks y arme a mano un gráfico. En clase no se compara nada en vivo; se ven capturas.

**Guion de la demo**
1. **El proyecto de la clase.** Martín abre un flujo: fuente con la serie de demanda, un nodo que separa entrenamiento y prueba, y al final un gráfico de líneas y una tabla de métricas vacías.
2. **Los alumnos entran.** Comparte el proyecto con el curso. Cada alumno agrega su método como un **nodo de código Python** con su nombre y lo conecta a la misma fuente.
3. **Todos en el lienzo a la vez.** Se ven los cursores de los alumnos moviéndose por el canvas, cada uno con su color y su nombre, arrastrando su nodo y conectándolo. Es el momento visual del caso.
4. **Comparación en vivo.** Todas las salidas llegan al mismo gráfico de líneas y a una tabla (error, estabilidad, sensibilidad a outliers). Cuando un alumno cambia un parámetro (la ventana de la media móvil), solo se recalcula su rama: la caché del motor hace que la comparación sea inmediata.
5. **Discusión con datos.** El profesor inyecta un outlier en la fuente. En vivo se ve que el z-score se rompe y el escalado robusto no. La lección la da el gráfico.
6. **El mejor método queda.** El nodo ganador se publica en el Hub como *"Normalización robusta para series de demanda"*, con el alumno como autor. El próximo semestre otro curso parte desde ahí, y el alumno tiene su primera herramienta publicada y usada.

**El momento "wow":** los pasos 3 y 5. Cinco cursores en el mismo lienzo, y cinco métodos de cinco personas responden al mismo cambio en el mismo segundo.

**Por qué Nodomics es clave:** el lienzo pone las cinco implementaciones lado a lado con las mismas entradas (comparación justa por construcción); los nodos de código dejan escribir Python sin instalar nada; y publicar convierte una tarea de curso en una herramienta reutilizable con autor.

**Preparación**
- [ ] Serie de demanda horaria (CSV) y cinco nodos Python ya escritos (`core.python.zscore` ya existe como base).
- [ ] Flujo de la clase con la comparación armada.
- [ ] **Falta: la edición en vivo** (varias personas en el mismo flujo). Opciones, de más segura a más ambiciosa:
  - **A (recomendada para el hackathon):** cada alumno publica su nodo en el Hub con la etiqueta `serie-temporal-2026`; el profesor los instala en vivo desde el Hub y los conecta. Es "en tiempo real" vía Hub, con lo que ya existe.
  - **B:** sala mínima con Supabase Realtime que sincronice el flujo entre navegadores. Requiere ADR (es estado compartido y persistencia).
- [ ] Para la demo en el escenario: dos o tres laptops del equipo actuando como alumnos.

---

### Caso 3 — Del clasificador de fresas de Michoacán al de arándanos del Maule

**Personajes**
- **Valeria**, agrónoma en Zamora, Michoacán. Hizo un clasificador de calidad de exportación de fresa: calibre, color, firmeza, °Brix y temperatura de pulpa → categoría (Exportación / Nacional / Industria / Descarte).
- **Mateo**, agrónomo en el Valle del Maule. Quiere lo mismo para su arándano. (Perfil `mateo_agrolab` ya existe en los seeds.)

**Antes de Nodomics.** Valeria tiene una planilla con fórmulas o un script. Aunque Mateo la encontrara, los umbrales son de fresa, los nombres de las columnas son otros y no sabría qué cambiar sin romperla.

**Guion de la demo**
1. **Mateo busca en su idioma.** En el buscador del feed escribe *"clasificar calidad de exportación de berries"*. Aparece el clasificador de Valeria y su perfil.
2. **Remixar.** Abre el flujo como copia propia. El original no se toca; el linaje ya marca a Valeria como origen.
3. **El agente adapta.** Mateo le pide en su jerga: *"adáptalo a arándano Duke para exportación a EE.UU."*. El agente trabaja sobre un borrador, lo ejecuta y devuelve un **Diff de Dominio**: tarjetas en lenguaje agronómico, cada una con su razón:
   - calibre mínimo: 25 mm → 12 mm *(el arándano se clasifica por diámetro, no por peso)*;
   - °Brix mínimo: 7 → 10 *(estándar de exportación para arándano)*;
   - se elimina el criterio de color de cáliz *(no aplica a arándano)*;
   - temperatura máxima de pulpa a la recepción: 20 °C → 18 °C.
4. **Mateo decide.** Acepta tres, rechaza una y corrige un valor a mano. Corre el flujo con su lote: la tabla y el gráfico muestran el porcentaje de fruta por categoría.
5. **La red se beneficia.** Mateo publica su versión. En el Hub se ven las dos hebras (fresa en Michoacán, arándano en Maule) y quien llegue con frambuesa parte de la más cercana. Valeria ve que su herramienta ya cruzó la frontera.

**El momento "wow":** el paso 3. El agente no responde con texto: modifica la herramienta y explica cada cambio en el idioma del agrónomo, y el humano decide.

**Por qué Nodomics es clave:** adaptar no es copiar; el Diff de Dominio hace visible qué conocimiento cambia entre un cultivo y otro, y el fork con linaje conserva el crédito del original.

**Preparación**
- [ ] Flujo "Clasificador de calidad de fresa" de Valeria (nodos SQL o fórmula con umbrales como parámetros) con un lote de ejemplo.
- [ ] Lote de arándanos de Mateo.
- [ ] Ensayar el pedido al agente varias veces y fijar el texto exacto que mejor resulta; tener grabado un respaldo por si la red falla.
- [ ] Los seeds ya traen la cadena de frío Maule vs Michoacán; reusar a Mateo y la estética de esos flujos.

---

### Caso 4 — Teoría sin código, código sin teoría

**Personajes**
- **Dr. Rodrigo**, médico veterinario en Los Lagos (hoy `dr_hugo_ganado` en los seeds; renombrar). Conoce a fondo cómo se contagia la brucelosis entre predios: movimientos de ganado, ferias, distancia. Tiene el modelo en papel. No programa.
- **Tomás**, analista de datos en una startup de Valparaíso (`tomas_saas`). Programa modelos de churn y cohortes todo el día. No sabe nada de ganado, pero en su perfil **busca** "problemas reales fuera del software donde aplicar modelos".

**Antes de Nodomics: no saben lo que no saben.** Rodrigo no sabe que su modelo en papel se puede convertir en una herramienta que corra con sus datos, ni que existen modelos de contagio en redes. Tomás no sabe que su modelo de churn (clientes que "contagian" su baja a otros) es, matemáticamente, casi el mismo problema que la brucelosis entre predios. Ninguno de los dos buscaría al otro, porque no saben que lo que necesitan existe. Y aunque buscaran, la búsqueda por similitud junta a los parecidos: a Rodrigo le recomendaría otros veterinarios, a Tomás otros analistas.

**Guion de la demo**
1. **El mapa de personas.** Mostramos el mapa del feed: los perfiles se agrupan por disciplina. Rodrigo y Tomás están en extremos opuestos.
2. **La línea que los une.** Se encienden las líneas de complementariedad: el vector **busca** de Rodrigo ("alguien que convierta mi modelo de contagio en una herramienta") se cruza con el vector **ofrece** de Tomás ("modelos de propagación y redes, Python"). Una línea atraviesa el mapa de lado a lado.
3. **El perfil se armó solo.** Rodrigo nunca llenó un formulario largo: subió su CV y el agente de registro propuso su ficha (lo que ofrece, lo que busca, profundidad por dominio).
4. **Colaboran a través de la herramienta.** Tomás escribe un nodo Python: modelo de contagio en red entre predios (SIR sobre el grafo de movimientos). Lo publica. Rodrigo lo instala y lo combina en el lienzo con sus datos de movimientos del SAG, sin tocar código: filtra por temporada, une con la ubicación de los predios, visualiza el riesgo por predio.
5. **El resultado.** Un mapa de riesgo que ninguno de los dos podía hacer solo: Rodrigo aportó qué modelar y con qué datos; Tomás, cómo.

**El momento "wow":** el paso 2. La línea que cruza el mapa de punta a punta. *Colaborar no es parecerse.*

**Por qué Nodomics es clave:** el feed empareja lo que uno busca con lo que el otro ofrece, no a los parecidos; y la colaboración ocurre sobre un artefacto concreto (un nodo que uno programa y el otro combina) en vez de reuniones y correos.

**Preparación**
- [ ] Ajustar las fichas de Rodrigo y Tomás en los seeds para que el emparejamiento salga claro en el mapa.
- [ ] Nodo Python del modelo de contagio y datos sintéticos de movimientos entre predios.
- [ ] Verificar que el mapa de personas dibuje la línea de emparejamiento entre ambos.

---

### Caso 5 — De tres herramientas de nicho a un servicio para toda la comuna

**Personajes**
- **Ana**, planificadora territorial en la Municipalidad de Coquimbo (`ana_coquimbo`). Tiene que priorizar dónde invertir en mitigación de calor extremo. Usa Nodomics, pero no programa.
- Los autores de las piezas que va a reusar: **Ignacio** (hoy `rodrigo_geodatos`; renombrar, malla H3 con población del Censo y calidad del aire), **Camila** (`camila_cesfam`, pacientes crónicos por sector), y el índice de resiliencia de **Jazmín** (caso 1).
- Los destinatarios: el concejo municipal y los vecinos, que **nunca van a abrir Nodomics**.

**Antes de Nodomics.** Ana pediría una consultoría o un desarrollo a TI que tarda meses. El resultado sería un PDF estático que nadie actualiza.

**Guion de la demo**
1. **Ana le pide al agente.** *"Quiero priorizar los barrios de Coquimbo donde el calor es más peligroso para adultos mayores y enfermos crónicos."* El agente busca en el Hub y propone un flujo armado con herramientas ya publicadas: la malla H3 de Ignacio, el cruce de crónicos de Camila y el índice de resiliencia de Jazmín.
2. **Ana revisa la propuesta.** Cada pieza muestra su autor y su linaje. Acepta el flujo, ajusta el peso de la población mayor de 65 años y ve el resultado: un ranking de hexágonos y un gráfico.
3. **Publicar como servicio.** Agrega los nodos de hosteo (Repo → Servicio), elige el plan y aprieta "Desplegar". Nodomics publica el tablero en una URL pública.
4. **La herramienta sale de Nodomics.** Abrimos la URL en un celular: el concejo y los vecinos ven el ranking actualizado sin cuenta ni lienzo.
5. **Los créditos viajan.** Ignacio, Camila y Jazmín aparecen como autores de las piezas en el linaje del flujo. Tres herramientas de nicho, hechas por personas que no se conocen, sostienen una política pública.

**El momento "wow":** el paso 4. Del pedido en lenguaje natural a un servicio público en el celular, construido con herramientas de tres desconocidos.

**Por qué Nodomics es clave:** el flujo como nodo permite componer herramientas ajenas sin entenderlas por dentro; el agente las encuentra por ti; el hosteo lleva el resultado a quien no usa Nodomics. Es el final del ciclo: la red de nichos produce algo para todos.

**Preparación**
- [ ] Publicar en el Hub las tres piezas con datos de Coquimbo (sintéticos o públicos: Censo, SINCA).
- [ ] Ensayar el pedido al agente y fijar el texto.
- [ ] Hosteo: confirmar que el despliegue en Render funciona de punta a punta (anuncio `2026-11-22-1400-hosteo-pendiente.md`). El despliegue tarda; dejar uno ya desplegado y mostrar el botón, no la espera.

---

## 6. Casos de reserva

Por si alguno de los cinco no está listo, o para la ronda de preguntas:

- **El arreglo que viaja.** El *Filtro de sensores resiliente* (ya en los seeds) promediaba nulos como cero y daba falsas alertas de helada. Alguien lo repara, publica la versión nueva, y todos los flujos que lo usan ven "Actualizar a 1.1.0". Muestra el valor de que las herramientas sean compartidas y versionadas.
- **El paper que se puede remixar.** Lucía (`lucia_qpcr`) publica la normalización de su qPCR junto a su paper. Un revisor abre el flujo, corre los datos y prueba otro gen de referencia. Reproducibilidad científica en un clic.
- **El almacén de barrio.** Don Pepe (`don_pepe_almacen`) usa el flujo de compras colectivas de Francisca (`fran_retail`) para comprar junto a otros almaceneros. El no técnico más extremo usando una herramienta hecha por una experta.

## 7. Estructura sugerida del pitch

| Bloque | Tiempo | Formato |
|---|---|---|
| Problema | 45 s | 3 diapositivas, una frase cada una |
| Qué es Nodomics | 30 s | Una diapositiva con el ciclo |
| Caso 1 (seguridad hídrica) | 90 s | **En vivo**: es el que mejor cuenta el problema completo |
| Caso 3 (agrónomos) | 60 s | **En vivo**: luce el agente y el Diff de Dominio |
| Casos 2, 4 y 5 | 30 s cada uno | Video corto o capturas, enfocados en su momento "wow" |
| Cierre | 20 s | La frase de cierre |

Si el tiempo es más corto, quedarse con los casos 1 y 3 en vivo y nombrar los otros tres en una diapositiva.

**Frase de cierre**

> *Cada día alguien, en algún lugar, construye la herramienta que tú necesitas. Nodomics hace que te enteres, que la entiendas, que la hagas tuya, y que esa persona sepa que te sirvió.*

## 8. Lo que falta construir para que las demos sean reales

Ordenado por impacto en el pitch:

1. **Perfil vivo** (caso 1): agente que actualiza "lo que busca" desde conversaciones y flujos, con sugerencias fuera del área.
2. **Notificación de uso** (caso 1, paso 7): registrar cuándo alguien instala una publicación ajena y avisar al autor. Toca `hub` y la web.
3. **Seeds y datos de cada caso**: perfiles, flujos y datasets de Diego, Jazmín, Valeria, la clase, Rodrigo/Tomás y Ana.
4. **Linaje con nombres**: que la hebra muestre quién originó y quién adaptó, no solo si hubo adaptación.
5. **Edición en vivo** (caso 2): solo si sobra tiempo; la opción A vía Hub funciona sin esto.
6. **Ensayos grabados** de las partes que dependen del agente o de la red, como respaldo.
