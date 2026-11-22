# Catálogo de Casos de Uso de Minga
### Ecosistema de Aplicaciones Completas, Módulos y Nodos Individuales

Este catálogo define los casos de uso oficiales de **Minga**, diseñados para demostrar cómo personas que conocen su oficio —sin saber programar— pueden crear, adaptar y enriquecer herramientas lógicas visuales con ayuda de sus agentes de IA.

---

## Estructura de Niveles en Minga

1. **Nivel 1: Aplicación Completa (Full Flow / App de Punta a Punta)**  
   Soluciones funcionales listas para operar. Resuelven un ciclo completo de trabajo (entradas de datos, lógica de negocio encadenada, interfaz de resultados y acciones).
2. **Nivel 2: Módulo Reutilizable (Sub-flow / Bloque Compuesto)**  
   Conjunto de nodos que encapsulan una función de negocio específica. Diseñados para enchufarse en cualquier flujo mayor.
3. **Nivel 3: Nodo Individual (Regla / Cálculo Atómico)**  
   La unidad mínima de criterio profesional: una fórmula, un umbral de decisión, una condición de alerta o una normalización de datos.

---

# 1. Área: Agronomía & Cadena Alimentaria (Casos Clave de la Demo)

### 1.1 Aplicación Completa: Cadena de Frío y Ventana de Cosecha
* **Autor Original:** Camila Vergara (Ingeniera Agrónoma, Maule, Chile).
* **Problema:** En berries, cosechar con calor acelera la degradación y satura la cámara frigorífica. Se pierde hasta 25% de la fruta antes del empaque.
* **Lógica Interna:**
  - *Entradas:* Toneladas cosechadas, hora de inicio, temperatura ambiente por hora (API meteorológica o termómetro), tipo de cultivo.
  - *Nodos:*
    1. `Calculador de Temperatura de Pulpa`: Estima la temperatura interna del fruto según la hora de corte.
    2. `Ventana de Firmeza`: Cuenta regresiva de horas seguras para entrar a frío antes de ablandamiento irreversible.
    3. `Balance Térmico de Cámara`: Estima los frigorías/hora requeridos para bajar la fruta a 1°C.
    4. `Alerta de Saturación`: Límite crítico de capacidad de la planta de frío.
  - *Salidas:* Semáforo de cosecha (Verde/Amarillo/Rojo), cronograma sugerido de camiones y carga térmica proyectada.
* **Adaptación de otro profesional (Diff de Dominio):**  
  *Valeria (Agrónoma de Zamora, Michoacán, México)* toma la herramienta para fresas:
  - *Cambio del Agente:* Reduce la ventana crítica de 4 horas (arándano) a 2 horas (fresa más delicada).
  - *Validación:* Valeria aprueba el umbral pero ajusta la temperatura máxima de recepción a 18°C.
* **La Mejora Comunitaria (Smart Merge):**  
  Un transportista de Jalisco conecta su nodo de `Tiempo de Tránsito con Aislante Térmico`. Valeria y Camila reciben la sugerencia de incorporar este nodo a sus flujos sin alterar sus reglas de cultivo.

---

### 1.2 Módulo: Monitoreo de Microclima y Alerta de Heladas Tardías
* **Autor Original:** Esteban Morales (Vitivinicultor, Valle de Casablanca, Chile).
* **Problema:** Las heladas radiativas de primavera destruyen las yemas de la vid si no se activan los aspersores o hélices a tiempo.
* **Lógica Interna:**
  - *Nodos:* `Punto de Rocío`, `Gradiente de Caída Térmica (horas 02:00 a 06:00)`, `Gatillador de Alerta Preventiva (a 1.5°C del umbral de daño)`.
* **Adaptación (Diff de Dominio):**  
  *Un fruticultor de manzanos en Cuauhtémoc, Chihuahua* cambia el umbral crítico de -0.5°C a -2.0°C porque el manzano en letargo tolera más frío que la vid brotada.
* **Smart Merge:**  
  La comunidad agrega una verificación de humedad relativa que evita falsas alarmas con heladas secas. Ambos productores adoptan el parche manteniendo sus propios umbrales de temperatura.

---

### 1.3 Nodo Individual (Estrella de la Demo): Filtro de Sensores Resiliente
* **Autor Original:** Red de Estaciones Meteorológicas Comunitarias.
* **Regla:** `Ignorar lecturas nulas (Null/Vacío) en vez de promediar Cero`.
* **El Problema:** Cuando un termómetro de campo falla o pierde batería, envía un valor nulo (`[18, 22, null, 25]`). Los sistemas tradicionales promedian el `0`, arrojando una falsa alerta de congelamiento (`16.2°C` promedio erróneo).
* **La Regla del Nodo:** Filtra valores fuera de rango físico y omite registros nulos en el cálculo del denominador.
* **Por qué es clave en Minga:** Cuando este nodo se actualiza, todos los flujos que lo contienen en cualquier país reciben la corrección sin romper las variables del cultivo.

---

# 2. Área: Salud & Coordinación Asistencial

### 2.1 Aplicación Completa: Scribe Clínico Estructurado & Traspaso de Guardia
* **Autor Original:** Dra. Marcela Baeza (Médica Internista, Hospital Público, Santiago).
* **Problema:** En el traspaso de turno, el médico saliente y el entrante dependen de notas en papel o relatos verbales rápidos. Se pierden exámenes pendientes, contraindicaciones farmacológicas y evoluciones críticas.
* **Lógica Interna:**
  - *Entradas:* Grabación de voz de la entrega de turno o de la visita a cama del paciente.
  - *Nodos:*
    1. `Transcriptor Fonético y Clínico`: Convierte la voz a texto reconociendo fármacos, dosis y signos vitales en español médico local.
    2. `Extractor de Formato SOAP`: Clasifica en Subjetivo, Objetivo, Apreciación y Plan.
    3. `Detector de Alergias y Contraindicaciones`: Cruza medicamentos prescritos con la lista de alergias del paciente.
    4. `Bandeja de Tareas Pendientes`: Aísla interconsultas e imágenes que faltan por revisar antes del alta.
  - *Salidas:* Ficha de traspaso validada con firma digital rápida y lista de pacientes críticos priorizados.
* **Adaptación de otro profesional (Diff de Dominio):**  
  *Un kinesiólogo intensivista* clona el flujo. Su agente adapta la plantilla: en vez de enfocar fármacos, prioriza parámetros ventilatorios (FiO2, PEEP) y movilidad articular.
* **La Mejora Comunitaria (Smart Merge):**  
  Una enfermera de urgencias añade un validador que exige consignar si el paciente tiene vía venosa periférica permeable. El flujo de Marcela y del kinesiólogo reciben esta opción como campo sugerido sin pisar sus notas.

---

### 2.2 Módulo: Triage y Alerta Temprana de Deterioro Fisiológico (Score NEWS2)
* **Autor Original:** Equipo de Enfermería de Cuidados Intermedios.
* **Lógica:** Recibe 6 parámetros (frecuencia respiratoria, saturación O2, presión sistólica, pulso, conciencia, temperatura) y calcula el puntaje NEWS2 determinista. Si supera 5 puntos, dispara alerta de evaluación médica inmediata.
* **Adaptación:** Una sala de pediatría adapta los rangos de edad transformándolo en **PEWS** (Pediatric Early Warning Score).

---

### 2.3 Nodo Individual: Calculador de Dosis por Superficie Corporal (Mosteller)
* **Regla:** Calcula $SC = \sqrt{\frac{Peso(kg) \times Altura(cm)}{3600}}$ y ajusta dosis de quimioterápicos o antibióticos complejos, bloqueando la salida si excede la dosis máxima por metro cuadrado.

---

# 3. Área: Educación & Docencia

### 3.1 Aplicación Completa: Laboratorio de Análisis de Datos de Consumo Escolar
* **Autor Original:** Prof. Andrés Navarro (Profesor de Ciencias, Temuco, Chile).
* **Problema:** Los docentes quieren que sus alumnos trabajen con datos reales de los medidores de agua y luz de la escuela, pero no pueden enseñar Python en 45 minutos.
* **Lógica Interna:**
  - *Entradas:* Archivo CSV exportado del medidor eléctrico inteligente.
  - *Nodos:* `Lector CSV`, `Agrupador Temporal`, `Cálculo de Consumo Base (nocturno)`, `Detector de Fugas de Energía`, `Visualizador de Barras`.
  - *Salidas:* Gráfico interactivo y reporte escolar de huella de carbono.
* **Adaptación (Diff de Dominio):**  
  *Una profesora en Puebla, México* tiene clases en bloques de 50 minutos y lecturas en pesos mexicanos. El agente reemplaza las tarifas de Enel Chile por CFE México y adapta el histograma.
* **La Mejora Comunitaria:**  
  Un estudiante del curso de Temuco crea un nodo que normaliza los cortes de luz para que no arruinen el promedio semanal. La profesora de Puebla recibe el update con un clic.

---

### 3.2 Módulo: Agrupador Temporal por Bloques Académicos
* **Función:** Toma timestamps continuos y los agrupa según la campana del colegio (Bloque 1, Recreo, Bloque 2, Almuerzo) en lugar de horas reloj estándar.

---

### 3.3 Nodo Individual: Detector de Outliers por Desviación Mediana (MAD)
* **Regla:** Identifica mediciones imposibles (ruido de sensor escolar) utilizando la desviación mediana absoluta, más robusta que el promedio ante errores extremos de alumnos.

---

# 4. Área: Ventas, Pymes & Comercio Local

### 4.1 Aplicación Completa: Radar de Demanda y Compras Colectivas para Almacenes
* **Autor Original:** Matías Pinto (Red de Almacenes de Barrio, Valparaíso).
* **Problema:** Los pequeños comercios compran caro porque compran solos cada semana, sin anticipar cuándo se les acabará la harina o el aceite.
* **Lógica Interna:**
  - *Entradas:* Boletas de venta diarias (fotos o texto de WhatsApp) y lista de precios de proveedores mayoristas.
  - *Nodos:*
    1. `Extractor de Líneas de Venta`: Parsea los productos vendidos y cantidades.
    2. `Estimador de Agotamiento de Stock`: Proyecta los días restantes de inventario según el ritmo de ventas de los últimos 14 días.
    3. `Generador de Orden de Compra Sugerida`: Calcula la cantidad óptima considerando el descuento por bulto mayorista.
    4. `Consolidador de Canasta Comunal`: Suma pedidos de 5 almacenes vecinos en una sola orden grande.
  - *Salidas:* Pedido consolidado por WhatsApp listo para enviar al distribuidor con 18% de descuento por volumen.
* **Adaptación (Diff de Dominio):**  
  *Un restaurante en Guadalajara* adapta el flujo para insumos perecederos (aguacate, carne), acortando el horizonte de predicción de 14 días a 3 días por fecha de caducidad.
* **La Mejora Comunitaria:**  
  Un almacenero de Buin incorpora un nodo que calcula el costo financiero de pagar con factura a 30 días vs. contado. Todos los almacenes del círculo reciben este comparador.

---

### 4.2 Módulo: Punto de Reorden con Stock de Seguridad
* **Función:** $ROP = (VentaDiariaPromedio \times TiempoEntregaProveedor) + StockSeguridad$. Evita quiebres de stock sin congelar capital de trabajo innecesario.

---

### 4.3 Nodo Individual: Validador de Margen Neto Tributario
* **Regla:** Recibe costo sin IVA, precio de venta público y tasa impositiva (19% Chile, 16% México), devolviendo el margen bruto real y alertando si queda por debajo del 22%.

---

# 5. Área: Datos Públicos & Infraestructura Urbana (Con Datos Reales)

### 5.1 Aplicación Completa: Observatorio Comunal de Calidad del Aire y Vulnerabilidad
* **Autor Original:** Dra. Pamela Smith (Geógrafa Urbana, Santiago).
* **Problema:** Las alertas ambientales del gobierno se publican por macrozona, pero en una misma comuna hay barrios con 3 veces más contaminación y adultos mayores expuestos.
* **Lógica Interna:**
  - *Entradas:* API pública de estaciones de monitoreo SINCA (Chile) + datos geoespaciales censales (Censo 2024 / Grilla Uber H3).
  - *Nodos:*
    1. `Ingestor API SINCA`: Descarga horaria de PM2.5 y PM10 en vivo.
    2. `Interpolador Espacial IDW`: Estima la concentración de humo en hexágonos de 500 metros.
    3. `Cruce Censal de Población Vulnerable`: Pondera el riesgo según porcentaje de niños menores a 5 años y mayores a 65 años por zona.
    4. `Semáforo de Actividad Física Escolar`: Dictamina si se suspenden las clases de educación física en patios abiertos.
  - *Salidas:* Mapa interactivo comunal y reporte automático para directores de colegios y consultorios.
* **Adaptación (Diff de Dominio):**  
  *Un colectivo ambiental de Monterrey, México* conecta la API del Sistema Integral de Monitoreo Ambiental (SIMA) de Nuevo León. La lógica espacial de vulnerabilidad se conserva íntegra.
* **La Mejora Comunitaria:**  
  Un meteorólogo de Temuco añade el factor de inversión térmica matinal para anticipar la hora pico de humo de leña. La versión de Santiago y la de Monterrey adoptan la mejora.

---

### 5.2 Módulo: Indexador Hexagonal Uber H3
* **Función:** Convierte coordenadas latitud/longitud a identificadores de hexágonos H3 (resolución 8 o 9) para acelerar agregaciones espaciales en el navegador sin base de datos geográfica pesada.

---

### 5.3 Nodo Individual: Calculador de Índice de Calor Urbano Normalizado (NDVI vs LST)
* **Regla:** Cruza índice de vegetación con temperatura superficial satelital para identificar "islas de calor" en manzanas de asfalto sin sombra.

---

# 6. Área: Finanzas & Gestión de Flujo de Caja

### 6.1 Aplicación Completa: Centinela de Flujo de Caja y Cobranza Preventiva
* **Autor Original:** Carlos Henríquez (Director Financiero de Pyme de Servicios, Concepción).
* **Problema:** Las pymes no quiebran por falta de ventas, sino por falta de liquidez cuando los clientes grandes pagan a 60 o 90 días.
* **Lógica Interna:**
  - *Entradas:* Cartola bancaria en CSV y registro de facturas emitidas por cobrar.
  - *Nodos:*
    1. `Conciliador de Pagos`: Asocia depósitos con folios de facturas emitidas.
    2. `Curva de Cobranza Real por Cliente`: Calcula la morosidad promedio histórica de cada cliente (ej. "Cliente X paga al día 47, no al 30").
    3. `Proyector de Saldo a 30 Días`: Cruza pagos fijos (sueldos, imposiciones, arriendo) contra cobranza esperada real.
    4. `Gatillador de Alerta de Déficit`: Avisa si la cuenta bancaria tocará saldo rojo en las próximas 3 semanas.
  - *Salidas:* Dashboard de liquidez futura y borradores de correos amables de cobranza previa al vencimiento.
* **Adaptación (Diff de Dominio):**  
  *Una consultora en Bogotá, Colombia* adopta la herramienta adaptando el régimen de retenciones en la fuente (ReteFuente) y fechas de corte impositivo locales.
* **La Mejora Comunitaria:**  
  Un contador de Puerto Montt agrega un nodo de simulación de *Factoring*: muestra cuánto cuesta anticipar la factura vs. pedir un crédito bancario para cubrir la brecha.

---

### 6.2 Módulo: Scoring Dinámico de Pagadores
* **Función:** Clasifica a los clientes en categorías A (pagadores a tiempo), B (atraso predecible) y C (riesgo alto de incobrabilidad) según su varianza de pago en los últimos 6 meses.

---

### 6.3 Nodo Individual: Calculador de Interés Moratorio Legal
* **Regla:** Computa el interés penal diario acumulado sobre saldos vencidos aplicando la tasa de interés máxima convencional fijada por la autoridad financiera de cada país.
