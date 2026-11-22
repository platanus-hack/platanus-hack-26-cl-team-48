# Cómo leer el hilo de cada solución
### La gramática comunitaria de Minga

En **Minga**, las soluciones no son archivos estáticos ni repositorios fríos: son **hilos vivos de conocimiento** que viajan entre personas, territorios y disciplinas.

---

## 🧵 Las 6 Conexiones del Hilo

| Estado | Significado en Minga | Equivalente en desarrollo tradicional | Qué ve el usuario |
| :--- | :--- | :--- | :--- |
| **Se cruza** | **Dos soluciones en un flujo.** Dos herramientas distintas se conectan por puertos compartidos para resolver un problema mayor. | *Integración de APIs / Composición* | Dos grafos conectándose en la Mesa compartida. |
| **Se trenza** | **Alguien la adaptó.** Un profesional tomó la herramienta original y la ajustó a su contexto con un *Diff de Dominio*. | *Fork / Branch adaptado* | La genealogía muestra una nueva rama con autor y territorio. |
| **Se enreda** | **Dos cambios chocan.** Dos modificaciones simultáneas o dos reglas de dominio entran en conflicto. | *Merge conflict / Límite excedido* | Alerta de mediación del agente con propuesta de punto medio. |
| **Se desenreda** | **Alguien decidió.** Un humano aplicó su criterio y resolvió el conflicto eligiendo una alternativa o aceptando un compromiso. | *Conflict resolved / PR merged* | Tableros en verde y registro de la decisión en la bitácora. |
| **Se triza** | **Falló una prueba.** La herramienta se probó con datos reales de otro contexto y no resistió (outliers, límites físicos rotos). | *Failed test / Broken build* | Indicador de alerta: la herramienta requiere revisión en ese contexto. |
| **Se empalma** | **Alguien la reparó.** Un miembro de la comunidad detectó la falla, propuso una corrección y la unión quedó restaurada. | *Bugfix / Hotfix upstream* | Notificación de mejora disponible con opción de adopción segura. |

---

## 📋 Ejemplos del Feed (Ordenados por adopción e impacto)

### 1. 🩺 Salud, Flujo: *Controles crónicos atrasados*
* **Autora:** Camila Rojas, CESFAM Padre Las Casas (Araucanía, Chile).
* **Estado:** **Se trenza** (Adaptada por 2 personas).
* **Validación:** `Probada con 214 fichas`.
* **Descripción:** Identifica pacientes diabéticos e hipertensos que llevan más de 6 meses sin control, cruzando retiro de fármacos en farmacia con la agenda médica.

---

### 2. 📊 Datos Públicos, Flujo: *Limpieza del censo comunal*
* **Autora:** Ana Millán, Municipalidad de Coquimbo (Chile).
* **Estado:** **Se empalma** (Adaptada por 4 personas).
* **Validación:** `Reparada y probada de nuevo`.
* **Descripción:** Normaliza direcciones irregulares y tomas de terreno en grillas censales. Fue adaptada por otros municipios; al fallar con direcciones rurales, un geógrafo la empalmó y ahora corre validada.

---

### 3. 🎓 Educación, Flujo: *Asistencia escolar por curso*
* **Autor:** Rodrigo Leiva, Liceo de Ancud (Chiloé, Chile).
* **Estado:** **Se trenza** (Adaptada por 3 personas).
* **Validación:** `Probada en 6 colegios`.
* **Descripción:** Alerta ausentismo crónico temprano correlacionando clima lluvioso y aislamiento geográfico para activar apoyo psicosocial.

---

### 4. 📈 Ventas, Flujo: *Churn mensual de suscriptores*
* **Autor:** Tomás Ibarra, Valparaíso (Chile).
* **Estado:** **Se enreda** (Adaptada por 1 persona).
* **Validación:** `Propuesta del agente sin revisar`.
* **Descripción:** Modela bajas de clientes recurrentes. Una adaptación para clientes corporativos chocó con la regla de clientes personas naturales; el agente propuso un desempate que espera validación humana.

---

### 5. 📦 Ventas, Flujo: *Quiebres de stock en bodega*
* **Autora:** Paula Araya, Almacén cooperativo de Osorno (Chile).
* **Estado:** **Se triza** (Adaptada por 1 persona).
* **Validación:** `Falló con los datos de otra bodega`.
* **Descripción:** Diseñada para rotación de abarrotes secos. Al probarse en una bodega frigorífica de lácteos, la fórmula de reposición falló por no considerar la caducidad corta. Espera un empalme de la comunidad.

---

### 6. 🔬 Laboratorio, Nodo: *Normalización de qPCR*
* **Autora:** Lucía Paredes, Universidad de Concepción (Chile).
* **Estado:** `Nadie la ha adaptado todavía`.
* **Validación:** `Sin probar fuera de su laboratorio`.
* **Descripción:** Nodo atómico que normaliza ciclos umbral ($C_q$) contra genes de referencia (GAPDH/Actina). Un bloque puro esperando su primer cruce o trenzado.
