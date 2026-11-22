# Plantillas y Arquetipos Globales de Dominio
### El conocimiento de oficio que viaja entre 50 países

En **Minga**, las soluciones no pertenecen a una sola ciudad ni a un solo país. Un problema resuelto en Santiago, en Sonora o en Sevilla se convierte en un **Arquetipo Global**: una plantilla de dominio paramétrica que cualquier profesional del mundo puede clonar, alimentar con sus fuentes de datos locales y ejecutar sin tocar una sola línea de código.

---

## 1. 🌳 Mitigación de Islas de Calor y Corredores Verdes Urbanos
* **Nombre de la Solución:** `arborizacion-global`
* **Arquetipo:** Planificación Ecológica Urbana y Justicia Térmica
* **Problema Universal:**  
  Las ciudades se calientan desigualmente: el concreto y el asfalto retienen calor diurno y no enfrían de noche. Los barrios con menor cobertura arbórea registran entre 3°C y 8°C más de temperatura, concentrando hospitalizaciones por golpes de calor en adultos mayores y niños, ya sea en **Sevilla, Monterrey, Phoenix, Santiago, Madrid o El Cairo**.
* **Estructura del Flujo en Nodos:**
  ```mermaid
  flowchart LR
    A["🛰️ Ingestor Satelital Abierto<br/>(Landsat TIRS + Sentinel-2 MSI)"] --> B["⬡ Módulo Espacial Multiescala<br/>(Grilla H3 res 8 / Manzanas)"]
    C["👥 Capa Sociodemográfica Local<br/>(Densidad niños y adultos mayores)"] --> D["⚖️ Ponderador de Vulnerabilidad Térmica<br/>(40% calor, 40% déficit dosel, 20% personas)"]
    B --> D
    D --> E["📍 Trazador de Corredor Óptimo<br/>(Grafo de menor costo para unir parques)"]
    E --> F["🌳 Calculador de Huella Arbórea<br/>(Especies nativas recomendadas por bioma)"]
  ```
* **Entradas:** Imagen LST (temperatura de brillo), índice NDVI, archivo vectorial de manzanas o censo poblacional, catálogo de parques existentes.
* **Salidas:** Mapa de calor con semáforo de urgencia de arborización, trazado georreferenciado de la calle óptima para plantar y estimación de reducción térmica (°C).
* **Adaptación Global (Diff de Dominio):**
  - *En Sevilla (España):* Se conecta la API climática de Copernicus y se seleccionan especies mediterráneas de bajo consumo hídrico (encina, algarrobo).
  - *En Mexicali (México):* Se ajusta el umbral de emergencia a 42°C y se priorizan paraderos de transporte público sin techumbre.
* **Smart Merge:** Un equipo de Melbourne aporta un nodo que calcula el sombreado proyectado por hora según la altura de los edificios vecinos; todos los urbanistas que usan el flujo lo integran con un clic.

---

## 2. ⛏️ Optimización de Sondajes y Valor de la Información
* **Nombre de la Solución:** `sondajes-mineros-global`
* **Arquetipo:** Geoestadística y Reducción de Riesgo en Exploración de Recursos
* **Problema Universal:**  
  Perforar la tierra cuesta entre $150 y $600 USD por metro lineal. Perforar a ciegas quema millones de dólares; pero esperar a tener certeza total paraliza el proyecto. Pasa igual en **Nevada (EE.UU.), Sonora (México), Antofagasta (Chile), Mendoza (Argentina) o Kalgoorlie (Australia)**.
* **Estructura del Flujo en Nodos:**
  ```mermaid
  flowchart LR
    A["🪨 Registro de Sondajes Previos<br/>(CSV con X, Y, Z, Ley/Permeabilidad)"] --> B["📊 Estimador Geoestadístico<br/>(Kriging Ordinario / Variograma)"]
    B --> C["❓ Calculador de Costo de Incertidumbre<br/>(Expected Value of Information - EVoI)"]
    D["💰 Modelo de Costos de Faena<br/>(Costo/metro según profundidad y roca)"] --> E["🎯 Localizador de Próxima Perforación<br/>(Coordenada X, Y, Z de máximo retorno de certidumbre)"]
    C & E --> F["📋 Plan de Campaña de Perforación"]
  ```
* **Entradas:** Coordenadas espaciales 3D de muestras tomadas, valor medido (ley mineral, salinidad o nivel freático), costo por metro de perforación.
* **Salidas:** Modelo 3D de volumen inferido, mapa de varianza de estimación y coordenadas exactas de la próxima perforación recomendada.
* **Adaptación Global (Diff de Dominio):**
  - *En Mendoza (Argentina) para Hidrología:* Un especialista en cuencas reemplaza la ley de cobre por **permeabilidad y nivel de agua subterránea**, transformando el flujo minero en un buscador de pozos de agua potable para sequía.

---

## 3. 🏃 Análisis Biomecánico y Cinemática Deportiva por Video
* **Nombre de la Solución:** `biomecanica-deportiva-global`
* **Arquetipo:** Visión Computacional Anclada a la Física del Rendimiento
* **Problema Universal:**  
  El cronómetro oficial da un tiempo final, pero no explica dónde se ganó o perdió la prueba. Un atleta que se abre 30 centímetros en la curva de una pista de 400 m corre hasta 3.8 metros extra sin notarlo. Pasa en cualquier estadio, pista de patinaje o piscina olímpica del mundo.
* **Estructura del Flujo en Nodos:**
  ```mermaid
  flowchart LR
    A["📹 Video de Celular o Transmisión"] --> B["🏃 Detector y Seguidor de Siluetas<br/>(ID persistente por carril)"]
    C["📐 Calibrador de Plano Métrico<br/>(Homografía de la pista a medidas oficiales)"] --> D["📏 Calculador de Desvío de Cuerda<br/>(Metros extras acumulados por radio de curvatura)"]
    B & C --> D
    D --> E["⚡ Estimador de Potencia y Cadencia<br/>(Pasos por minuto y velocidad instantánea)"]
    E --> F["🎙️ Narrador Técnico Verificado<br/>(IA restringida matemáticamente a no alucinar datos)"]
  ```
* **Adaptación Global (Diff de Dominio):**
  - *En Medellín (Colombia):* Un entrenador de patinaje de velocidad en pista peraltada ajusta la geometría a un óvalo de 200 m y la fricción de ruedas de poliuretano.
  - *En Mar del Plata (Argentina):* Un entrenador de natación adapta el módulo para carreras de 200 m combinados en piscina de 50 m analizando virajes.

---

## 4. 💧 Capacidad de Carga y Estrés de Recursos para Megaproyectos
* **Nombre de la Solución:** `estres-recursos-global`
* **Arquetipo:** Balance Hídrico-Energético y Licencia Social Operativa
* **Problema Universal:**  
  La instalación masiva de infraestructura tecnológica (centros de datos para IA) e industrial (plantas de hidrógeno o fundiciones) compite directamente por el agua dulce y la capacidad eléctrica de las comunidades vecinas en **Virginia (EE.UU.), Querétaro (México), Frankfurt (Alemania) o Santiago**.
* **Estructura del Flujo en Nodos:**
  ```mermaid
  flowchart LR
    A["📄 Cartera de Proyectos en Evaluación<br/>(Capacidad proyectada en MW)"] --> B["⚡ Modelador de Carga Eléctrica<br/>(Horas pico vs capacidad de subestación)"]
    A --> C["💧 Calculador de Huella Hídrica<br/>(PUE / Consumo de torres evaporativas)"]
    D["🌊 Balance Ecológico de Cuenca Local<br/>(Recarga anual del acuífero)"] --> E["⚖️ Evaluador de Capacidad de Carga<br/>(Demanda industrial vs consumo humano prioritario)"]
    B & C & E --> F["🚨 Semáforo de Viabilidad Ambiental<br/>(Verde: sustentable / Rojo: estrés hídrico irreversible)"]
  ```
* **Adaptación Global (Diff de Dominio):**
  - *En Dublín (Irlanda):* El flujo se ajusta para condicionar la aprobación del data center al uso exclusivo de energía eólica marina en horas de baja demanda.
  - *En Sonora (México):* Se sustituyen torres de enfriamiento de agua por condensadores adiabáticos de aire seco.

---

## 5. 🌧️ Gestión Preventiva de Drenaje e Inundaciones Pluviales
* **Nombre de la Solución:** `drenaje-inundaciones-global`
* **Arquetipo:** Hidrología Urbana y Respuesta Operativa Temprana
* **Problema Universal:**  
  Cuando caen precipitaciones concentradas en pocas horas, los desagües urbanos colapsan por acumulación de sedimentos y hojas. Las cuadrillas de emergencia llegan cuando la calle ya está inundada, ya sea en **Buenos Aires, Miami, Manila, Guayaquil o São Paulo**.
* **Estructura del Flujo en Nodos:**
  ```mermaid
  flowchart LR
    A["☔ Pronóstico Pluviométrico por Radar<br/>(Intensidad de lluvia mm/h en ventana 6h)"] --> B["🏔️ Modelo Digital de Elevación (DEM)<br/>(Dirección de escorrentía superficial)"]
    C["📍 Inventario Georreferenciado de Sumideros<br/>(Capacidad de captación y estado de limpieza)"] --> D["🌊 Calculador de Puntos Críticos de Encharcamiento"]
    A & B & C --> D
    D --> E["🚛 Ruteador Inteligente de Cuadrillas<br/>(Despacho preventivo antes del inicio de la tormenta)"]
  ```
* **Adaptación Global (Diff de Dominio):**
  - *En Guayaquil (Ecuador):* Se cruza el flujo con la **tabla de mareas del río Guayas**, bloqueando salidas pluviales cuando coincide marea alta con lluvia torrencial.
  - *En Miami (EE.UU.):* Se incorpora la cota de infiltración por aumento del nivel freático costero.

---

## 6. 🛡️ Sandbox de Confiabilidad y Auditoría para Agentes de IA
* **Nombre de la Solución:** `auditoria-agentes-global`
* **Arquetipo:** Seguridad de Sistemas Autónomos y Alineación de Modelos
* **Problema Universal:**  
  Antes de conectar un agente de IA al ERP, base de datos o herramientas financieras de una empresa, los administradores deben garantizar que el agente no sufra *prompt injection*, no filtre secretos ni intente deshabilitar sus propios mecanismos de supervisión.
* **Estructura del Flujo en Nodos:**
  ```mermaid
  flowchart LR
    A["🤖 Agente Autónomo a Auditar"] --> B["📦 Entorno Señuelo / Honeypot Aislado<br/>(Imitación perfecta del sistema de producción)"]
    C["🪤 Inyector de Pruebas Adversarias<br/>(Credenciales señuelo, instrucciones contradictorias)"] --> B
    B --> D["🕵️ Testigo Silencioso y Registrador Forense<br/>(Captura cada llamada a herramientas y terminal)"]
    D --> E["⚖️ Comparador Dicho vs Hecho<br/>(Contrasta el reporte del agente con sus acciones reales)"]
    E --> F["📜 Certificado de Integridad y Permisos Concedidos"]
  ```
* **Adaptación Global (Diff de Dominio):**
  - *En una fintech en São Paulo:* El sandbox se especializa en simular transferencias Pix para detectar exfiltración de tokens.
  - *En un hospital en Zúrich:* El honeypot inyecta historias clínicas falsas para verificar estricto cumplimiento HIPAA/GDPR.
