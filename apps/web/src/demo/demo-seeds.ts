/* eslint-disable max-params -- demo fixtures: positional builders keep hundreds of nodes readable */
import type { ProfileCard, FeedHit } from "@nodomics/profile";
import {
  FLOW_FORMAT,
  type Column,
  type ColumnProfile,
  type Flow,
  type FlowEdge,
  type FlowNode,
  type NodeManifest,
} from "@nodomics/protocol";
import type { Hub, HubProfile, PublicationDraft } from "@nodomics/hub";
import { SNAPSHOT_FORMAT, type Snapshot, type SnapshotState } from "@nodomics/hub";

/* ----------------------------------------------------------------------------------
 * Helper builders for Flows, Nodes, Edges, Manifests, and Snapshots
 * ---------------------------------------------------------------------------------- */

export function flowNode(
  id: string,
  type: string,
  params: Record<string, unknown> = {},
  position: { x: number; y: number } = { x: 0, y: 0 },
  label?: string,
): FlowNode {
  return {
    id,
    type,
    version: "0.1.0",
    params,
    position,
    ...(label !== undefined ? { label } : {}),
  };
}

export function flowEdge(
  fromNode: string,
  fromPort: string,
  toNode: string,
  toPort: string,
): FlowEdge {
  return {
    id: `${fromNode}_${fromPort}__${toNode}_${toPort}`,
    from: { node: fromNode, port: fromPort },
    to: { node: toNode, port: toPort },
  };
}

export function flowGraph(
  name: string,
  nodes: ReadonlyArray<FlowNode>,
  edges: ReadonlyArray<FlowEdge>,
  customNodes?: ReadonlyArray<NodeManifest>,
): Flow {
  return {
    format: FLOW_FORMAT,
    name,
    nodes: [...nodes],
    edges: [...edges],
    ...(customNodes !== undefined ? { customNodes: [...customNodes] } : {}),
  };
}

export function createSnapshot(
  catalog: ReadonlyArray<NodeManifest>,
  state?: SnapshotState,
): Snapshot {
  return {
    format: SNAPSHOT_FORMAT,
    catalog: [...catalog],
    ...(state !== undefined ? { state } : {}),
  };
}

/* ----------------------------------------------------------------------------------
 * TAXONOMÍA VISUAL DEL FEED Y DEL HILO (Minga Community Grammar)
 * ADR / VOCABULARIO-HILO.md
 * ---------------------------------------------------------------------------------- */

export type ThreadConnectionState =
  "Se cruza" | "Se trenza" | "Se enreda" | "Se desenreda" | "Se triza" | "Se empalma";

export type ThreadStateDefinition = {
  readonly state: ThreadConnectionState;
  readonly meaning: string;
  readonly traditionalEquivalent: string;
  readonly userView: string;
};

export const THREAD_CONNECTION_STATES: Readonly<
  Record<ThreadConnectionState, ThreadStateDefinition>
> = {
  "Se cruza": {
    state: "Se cruza",
    meaning:
      "Dos soluciones en un flujo. Dos herramientas distintas se conectan por puertos compartidos.",
    traditionalEquivalent: "Integración de APIs / Composición",
    userView: "Dos grafos conectándose en la Mesa compartida.",
  },
  "Se trenza": {
    state: "Se trenza",
    meaning:
      "Alguien la adaptó. Un profesional tomó la herramienta original y la ajustó a su contexto con un Diff de Dominio.",
    traditionalEquivalent: "Fork / Branch adaptado",
    userView: "La genealogía muestra una nueva rama con autor y territorio.",
  },
  "Se enreda": {
    state: "Se enreda",
    meaning:
      "Dos cambios chocan. Dos modificaciones simultáneas o dos reglas de dominio entran en conflicto.",
    traditionalEquivalent: "Merge conflict / Límite excedido",
    userView: "Alerta de mediación del agente con propuesta de punto medio.",
  },
  "Se desenreda": {
    state: "Se desenreda",
    meaning:
      "Alguien decidió. Un humano aplicó su criterio y resolvió el conflicto eligiendo una alternativa.",
    traditionalEquivalent: "Conflict resolved / PR merged",
    userView: "Tableros en verde y registro de la decisión en la bitácora.",
  },
  "Se triza": {
    state: "Se triza",
    meaning:
      "Falló una prueba. La herramienta se probó con datos reales de otro contexto y no resistió.",
    traditionalEquivalent: "Failed test / Broken build",
    userView: "Indicador de alerta: la herramienta requiere revisión en ese contexto.",
  },
  "Se empalma": {
    state: "Se empalma",
    meaning:
      "Alguien la reparó. Un miembro de la comunidad detectó la falla, propuso una corrección y la unión quedó restaurada.",
    traditionalEquivalent: "Bugfix / Hotfix upstream",
    userView: "Notificación de mejora disponible con opción de adopción segura.",
  },
};

export type HiloCaseMetadata = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly kind: "flow" | "node";
  readonly authorName: string;
  readonly authorHandle: string;
  readonly authorTerritory: string;
  readonly threadState: ThreadConnectionState | "Sin adaptar";
  readonly adaptationsCount: number;
  readonly validationBadge: string;
  readonly description: string;
};

/* ----------------------------------------------------------------------------------
 * 1. PROFILES & COLLABORATION CARDS
 * ---------------------------------------------------------------------------------- */

/* ÁREA 1: Agronomía */
export const MATEO_PROFILE: HubProfile = {
  id: "u-mateo",
  handle: "mateo_agrolab",
  displayName: "Dr. Mateo Albornoz",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
};

export const MATEO_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Ingeniero agrónomo y doctor en fisiología vegetal. Especialista en agrometeorología, sensores IoT y cadena de frío de exportación de arándanos y frambuesas en el Valle del Maule 🇨🇱 y Michoacán 🇲🇽.",
  technical: "codes",
  domains: [
    { name: "agronomía", depth: "expert" },
    { name: "sensores iot", depth: "expert" },
    { name: "cadena de frío", depth: "expert" },
    { name: "fisiología de berries", depth: "practitioner" },
  ],
  offers: [
    "algoritmos de punto de rocío y heladas",
    "calibración de sensores agrícolas en campo",
    "modelos de pérdida de calidad postcosecha",
  ],
  seeks: [
    "integración con imágenes multiespectrales Sentinel-2",
    "sensores LoRaWAN de bajo consumo",
    "modelos de machine learning climático",
  ],
  links: {
    linkedin: "https://linkedin.com/in/mateo-albornoz-agro",
    github: "https://github.com/mateo-agrolab",
  },
};

/* ÁREA 2: Salud */
export const VALENTINA_PROFILE: HubProfile = {
  id: "u-valencastro",
  handle: "valencastro_md",
  displayName: "Dra. Valentina Castro",
  avatarUrl: "https://images.unsplash.com/photo-1594824813576-92c81350a416?w=150",
};

export const VALENTINA_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Médica intensivista e informática médica en hospital público. Diseñando flujos clínicos para entrega de guardia SOAP, scoring fisiológico NEWS2 y seguridad farmacológica en urgencias y UCI.",
  technical: "builds",
  domains: [
    { name: "informática médica", depth: "expert" },
    { name: "medicina de urgencias", depth: "expert" },
    { name: "farmacología clínica", depth: "practitioner" },
    { name: "triage y deterioro precoz", depth: "expert" },
  ],
  offers: [
    "protocolos clínicos validados para traspaso de turno",
    "cálculos de dosificación pediátrica por superficie corporal",
    "modelos de alerta de sepsis temprana",
  ],
  seeks: [
    "modelos de Whisper / transcripción clínica local segura",
    "interoperabilidad HL7 FHIR",
    "herramientas sin fuga de datos de pacientes",
  ],
  links: {
    linkedin: "https://linkedin.com/in/valentina-castro-md",
    github: "https://github.com/valencastro",
  },
};

/* ÁREA 3: Educación */
export const TOMAS_PROFILE: HubProfile = {
  id: "u-tomas",
  handle: "tomas_edu",
  displayName: "Prof. Tomás Baeza",
  avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
};

export const TOMAS_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Profesor de Física y Ciencias de la Computación en liceos técnicos de Chile. Entusiasta del aprendizaje basado en datos reales sobre consumo eléctrico escolar y eficiencia energética.",
  technical: "builds",
  domains: [
    { name: "educación stem", depth: "expert" },
    { name: "eficiencia energética escolar", depth: "practitioner" },
    { name: "estadística didáctica", depth: "expert" },
  ],
  offers: [
    "secuencias didácticas con datos reales de medidores",
    "algoritmos robustos simplificados para estudiantes (MAD)",
    "talleres de pensamiento computacional en aula",
  ],
  seeks: [
    "colegas docentes para laboratorios cruzados",
    "visualizaciones interactivas de consumo para estudiantes",
    "smart meters de código abierto",
  ],
  links: {
    linkedin: "https://linkedin.com/in/tomas-baeza-edu",
    website: "https://cienciasabiertas.cl",
  },
};

/* ÁREA 4: Ventas & Pymes */
export const FRANCISCA_PROFILE: HubProfile = {
  id: "u-fran",
  handle: "fran_retail",
  displayName: "Francisca Silva",
  avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
};

export const FRANCISCA_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Ingeniera comercial y consultora de abastecimiento pyme. Articulo redes de compras colectivas y gestión inteligente de inventario para almacenes de barrio y minimarkets independientes.",
  technical: "builds",
  domains: [
    { name: "retail pyme", depth: "expert" },
    { name: "gestión de inventarios", depth: "expert" },
    { name: "compras agrupadas", depth: "expert" },
    { name: "márgenes y pricing", depth: "practitioner" },
  ],
  offers: [
    "modelos de punto de reorden con stock de seguridad",
    "red de compra colectiva de abarrotes de alta rotación",
    "validadores de márgenes con IVA descontado",
  ],
  seeks: [
    "integración con facturación electrónica SII",
    "conexión directa con cooperativas y molinos mayoristas",
    "bots de pedidos comunitarios por WhatsApp",
  ],
  links: {
    linkedin: "https://linkedin.com/in/francisca-silva-retail",
  },
};

/* ÁREA 5: Datos Públicos */
export const RODRIGO_PROFILE: HubProfile = {
  id: "u-rodrigo",
  handle: "rodrigo_geodatos",
  displayName: "Rodrigo Morales",
  avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
};

export const RODRIGO_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Científico de datos espaciales y cartógrafo. Construyo observatorios ciudadanos de calidad del aire con estaciones SINCA del MMA Chile y malla hexagonal Uber H3 con datos de población Censo.",
  technical: "codes",
  domains: [
    { name: "análisis geoespacial", depth: "expert" },
    { name: "calidad del aire sinca", depth: "expert" },
    { name: "uber h3", depth: "expert" },
    { name: "datos públicos abiertos", depth: "practitioner" },
  ],
  offers: [
    "pipelines de ingestión de redes SINCA Chile",
    "indexación territorial hexagonal H3 multinivel",
    "cálculo de isla de calor urbana LST/NDVI",
  ],
  seeks: [
    "investigadores en epidemiología ambiental",
    "activistas comunitarios por la justicia ambiental",
    "datos satelitales Landsat/MODIS en tiempo real",
  ],
  links: {
    github: "https://github.com/rodrigo-morales-geo",
    website: "https://geodatos.cl",
  },
};

/* ÁREA 6: Finanzas */
export const CAMILA_PROFILE: HubProfile = {
  id: "u-camila",
  handle: "camila_finanzas",
  displayName: "Camila Vergara",
  avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
};

export const CAMILA_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "CFO fraccional y consultora financiera para pymes b2b. Experta en flujo de caja proyectado, cobranza preventiva, cálculo de intereses moratorios legales y scoring de crédito.",
  technical: "codes",
  domains: [
    { name: "flujo de caja", depth: "expert" },
    { name: "scoring crediticio", depth: "expert" },
    { name: "legislación financiera", depth: "practitioner" },
    { name: "cobranza pyme", depth: "expert" },
  ],
  offers: [
    "modelos de proyección de tesorería a 90 días",
    "fórmulas automatizadas de interés penal legal Ley 18010",
    "matrices de riesgo y puntualidad de deudores",
  ],
  seeks: [
    "conectores bancarios Open Banking en Chile",
    "modelos probabilísticos de quiebra empresarial",
    "automatización de cartas de cobranza prejudicial",
  ],
  links: {
    linkedin: "https://linkedin.com/in/camila-vergara-finanzas",
    github: "https://github.com/camila-finanzas",
  },
};

/* Disciplinas Adicionales */
export const MATIAS_PROFILE: HubProfile = {
  id: "u-matias",
  handle: "matias_solar",
  displayName: "Ing. Matías Solar",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
};

export const MATIAS_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Ingeniero civil electricista especializado en plantas solares fotovoltaicas utility-scale y generación distribuida PMGD en el Desierto de Atacama y zona central de Chile.",
  technical: "codes",
  domains: [
    { name: "energía solar fotovoltaica", depth: "expert" },
    { name: "irradiancia solar", depth: "expert" },
    { name: "parques solares atacama", depth: "practitioner" },
  ],
  offers: [
    "modelos de irradiancia en plano inclinado GTI",
    "curvas de degradación de paneles monocristalinos",
    "análisis de pérdidas por polvo y soiling",
  ],
  seeks: [
    "datos de piranómetros locales calibrados",
    "modelos predictivos de radiación con nubes",
    "operadores de parques solares para validación empírica",
  ],
  links: {
    linkedin: "https://linkedin.com/in/matias-solar-energy",
    github: "https://github.com/matias-solar",
  },
};

export const ESTEBAN_PROFILE: HubProfile = {
  id: "u-esteban",
  handle: "esteban_estructuras",
  displayName: "Ing. Esteban Larraín",
  avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
};

export const ESTEBAN_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Ingeniero civil calculista estructural. Especialista en diseño sismo-resistente bajo norma chilena NCh433, espectros de diseño elásticos e inelásticos y control de derivas de piso.",
  technical: "codes",
  domains: [
    { name: "cálculo estructural", depth: "expert" },
    { name: "diseño sísmico nch433", depth: "expert" },
    { name: "dinámica de estructuras", depth: "practitioner" },
  ],
  offers: [
    "generador de espectros de diseño sísmico NCh433 Of.96 Mod 2009",
    "cálculo de cortante basal mínimo y máximo",
    "verificación de distorsión de entrepiso",
  ],
  seeks: [
    "arquitectos y constructores",
    "registros acelerográficos del CSN",
    "software de elementos finitos de código abierto",
  ],
  links: {
    linkedin: "https://linkedin.com/in/esteban-larrain-estructuras",
  },
};

export const DON_PEPE_PROFILE: HubProfile = {
  id: "u-donpepe",
  handle: "don_pepe_almacen",
  displayName: "Don José «Pepe» Donoso",
  avatarUrl: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150",
};

export const DON_PEPE_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Comerciante de abarrotes con 22 años atendiendo almacén de barrio en Puente Alto. Busco simplificar el cuadre de caja diario, calcular el punto de equilibrio y comprar más barato junto a otros colegas.",
  technical: "uses",
  domains: [
    { name: "comercio de abarrotes", depth: "expert" },
    { name: "atención de barrio", depth: "expert" },
    { name: "control de caja", depth: "practitioner" },
  ],
  offers: [
    "experiencia real de rotación de productos populares",
    "conocimiento de hábitos de compra de barrio",
  ],
  seeks: [
    "planillas simples que no se tranque el computador",
    "red de almacenes para comprar arroz y aceite más barato",
    "apoyo para cuadrar la caja rápido",
  ],
  links: {
    website: "https://almacendonpepe.cl",
  },
};

export const DRA_LUCIA_PROFILE: HubProfile = {
  id: "u-lucia",
  handle: "dra_lucia_dental",
  displayName: "Dra. Lucía Valenzuela",
  avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
};

export const DRA_LUCIA_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Cirujana dentista y ortodoncista. Automatizando el control de insumos clínicos, trazabilidad de esterilización por autoclave y seguimiento de presupuestos de tratamientos integrales.",
  technical: "builds",
  domains: [
    { name: "odontología", depth: "expert" },
    { name: "ortodoncia", depth: "expert" },
    { name: "gestión clínica dental", depth: "practitioner" },
  ],
  offers: [
    "protocolos de inventario para box dental",
    "fichas de seguimiento de brackets y alineadores",
    "trazabilidad de instrumental esterilizado",
  ],
  seeks: [
    "integración con radiografías panorámicas DICOM",
    "recordatorios automáticos de control a pacientes",
    "control de costos por sillón/hora",
  ],
  links: {
    linkedin: "https://linkedin.com/in/lucia-valenzuela-odontologia",
  },
};

export const DR_HUGO_PROFILE: HubProfile = {
  id: "u-hugo",
  handle: "dr_hugo_ganado",
  displayName: "Dr. Hugo San Martín",
  avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150",
};

export const DR_HUGO_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Médico veterinario especialista en producción bovina de leche y carne en la Región de Los Lagos. Monitoreo de producción lechera, protocolos sanitarios de brucelosis/tuberculosis y nutrición en praderas.",
  technical: "builds",
  domains: [
    { name: "veterinaria de grandes animales", depth: "expert" },
    { name: "producción lechera", depth: "expert" },
    { name: "salud de ubres y mastitis", depth: "expert" },
  ],
  offers: [
    "tableros de control de partos y secado",
    "cálculo de ración balanceada en base a materia seca de pradera",
    "curvas de lactancia individuales y por rebaño",
  ],
  seeks: [
    "sensores de rumia y collares electrónicos",
    "datos meteorológicos locales de estrés calórico THI",
    "colegas agrónomos para manejo de forraje",
  ],
  links: {
    linkedin: "https://linkedin.com/in/hugo-sanmartin-veterinaria",
  },
};

export const HECTOR_PROFILE: HubProfile = {
  id: "u-hector",
  handle: "ferreteria_central",
  displayName: "Héctor Carrasco",
  avatarUrl: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150",
};

export const HECTOR_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Administrador de ferretería industrial y materiales de obra gruesa en San Bernardo. Gestiono más de 8.000 SKUs de fijaciones, tuberías, pinturas y herramientas eléctricas.",
  technical: "builds",
  domains: [
    { name: "ferretería industrial", depth: "expert" },
    { name: "control de inventario sku", depth: "expert" },
    { name: "materiales de construcción", depth: "practitioner" },
  ],
  offers: [
    "matriz de clasificación ABC para ferreterías",
    "fórmulas de stock mínimo para tornillería y fitting",
    "cotizador rápido de listas de obra para maestros",
  ],
  seeks: [
    "lectores de códigos de barra rápidos",
    "listas de precios actualizadas de importadores mayoristas",
    "sistemas de alerta de quiebre de stock",
  ],
  links: {
    website: "https://ferreteriacentral.cl",
  },
};

/* Autores específicos de los 6 Casos del Hilo (VOCABULARIO-HILO.md) */
export const CAMILA_CESFAM_PROFILE: HubProfile = {
  id: "u-camilacesfam",
  handle: "camila_cesfam",
  displayName: "Camila Rojas",
  avatarUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150",
};

export const CAMILA_CESFAM_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Enfermera jefa del programa cardiovascular en CESFAM Padre Las Casas, Araucanía. Diseñando flujos de detección temprana de pacientes crónicos inasistentes.",
  technical: "builds",
  domains: [
    { name: "salud primaria cesfam", depth: "expert" },
    { name: "seguimiento cardiovascular", depth: "expert" },
    { name: "atención comunitaria", depth: "practitioner" },
  ],
  offers: ["protocolos de rescate de pacientes crónicos", "flujos validados de cruce con farmacia"],
  seeks: ["integración con Rayen Salud", "alertas sms comunitarias"],
  links: { linkedin: "https://linkedin.com/in/camila-rojas-salud" },
};

export const ANA_COQUIMBO_PROFILE: HubProfile = {
  id: "u-anacoquimbo",
  handle: "ana_coquimbo",
  displayName: "Ana Millán",
  avatarUrl: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=150",
};

export const ANA_COQUIMBO_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Planificadora territorial y geógrafa en la Municipalidad de Coquimbo. Trabajo con microdatos censales y regularización de tomas y loteos irregulares.",
  technical: "builds",
  domains: [
    { name: "censo y territorio", depth: "expert" },
    { name: "gestión municipal", depth: "expert" },
    { name: "georreferenciación rural", depth: "practitioner" },
  ],
  offers: ["algoritmos de limpieza de direcciones chilenas", "normalización de grillas censales"],
  seeks: ["geógrafos de zonas rurales", "modelos de validación catastral"],
  links: { website: "https://municoquimbo.cl" },
};

export const RODRIGO_ANCUD_PROFILE: HubProfile = {
  id: "u-rodrigoancud",
  handle: "rodrigo_ancud",
  displayName: "Rodrigo Leiva",
  avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
};

export const RODRIGO_ANCUD_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Orientador y docente en el Liceo Bicentenario de Ancud, Chiloé. Investigando el impacto del aislamiento insular y el clima lluvioso en el ausentismo escolar.",
  technical: "uses",
  domains: [
    { name: "asistencia escolar", depth: "expert" },
    { name: "ruralidad chiloe", depth: "expert" },
    { name: "apoyo psicosocial", depth: "practitioner" },
  ],
  offers: ["red de apoyo psicosocial por ausentismo", "indicadores de alerta temprana en Chiloé"],
  seeks: ["colegas de colegios rurales", "tableros visuales para apoderados"],
  links: { linkedin: "https://linkedin.com/in/rodrigo-leiva-ancud" },
};

export const TOMAS_IBARRA_PROFILE: HubProfile = {
  id: "u-tomasibarra",
  handle: "tomas_saas",
  displayName: "Tomás Ibarra",
  avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
};

export const TOMAS_IBARRA_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Analista de crecimiento y retención en startup de Valparaíso. Modela churn predictivo y cohortes de clientes recurrentes.",
  technical: "codes",
  domains: [
    { name: "churn y retención", depth: "expert" },
    { name: "modelos de suscripción", depth: "expert" },
    { name: "analítica saas", depth: "practitioner" },
  ],
  offers: ["modelos predictivos de bajas de suscriptores", "análisis de cohortes de ingresos"],
  seeks: ["expertos en contratos corporativos b2b", "especialistas en mediación de reglas"],
  links: { github: "https://github.com/tomas-ibarra-valpo" },
};

export const PAULA_OSORNO_PROFILE: HubProfile = {
  id: "u-paulaosorno",
  handle: "paula_osorno",
  displayName: "Paula Araya",
  avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
};

export const PAULA_OSORNO_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Encargada de operaciones en Almacén Cooperativo de Osorno. Controlando mermas y quiebres de inventario de pequeños productores lecheros y agrícolas.",
  technical: "builds",
  domains: [
    { name: "cooperativas agrícolas", depth: "expert" },
    { name: "bodegas y mermas", depth: "expert" },
    { name: "cadena de perecibles", depth: "practitioner" },
  ],
  offers: ["fórmulas de rotación de abarrotes secos", "gestión comunitaria de bodegas"],
  seeks: ["especialistas en refrigeración y lácteos", "apoyo para empalmar fórmulas de stock"],
  links: { website: "https://cooperativaosorno.cl" },
};

export const LUCIA_QPCR_PROFILE: HubProfile = {
  id: "u-luciaqpcr",
  handle: "lucia_qpcr",
  displayName: "Dra. Lucía Paredes",
  avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
};

export const LUCIA_QPCR_CARD: ProfileCard = {
  schemaVersion: 1,
  about:
    "Investigadora en biología molecular y diagnóstico genético en la Universidad de Concepción. Experta en qPCR y validación de biomarcadores.",
  technical: "codes",
  domains: [
    { name: "biología molecular", depth: "expert" },
    { name: "qpcr", depth: "expert" },
    { name: "diagnóstico genético", depth: "practitioner" },
  ],
  offers: ["nodos de normalización delta-delta-Cq", "filtros de curvas de amplificación qPCR"],
  seeks: ["laboratorios clínicos para validación externa", "bioinformáticos"],
  links: { linkedin: "https://linkedin.com/in/lucia-paredes-qpcr" },
};

export const DEMO_PROFILES: ReadonlyArray<HubProfile> = [
  MATEO_PROFILE,
  VALENTINA_PROFILE,
  TOMAS_PROFILE,
  FRANCISCA_PROFILE,
  RODRIGO_PROFILE,
  CAMILA_PROFILE,
  MATIAS_PROFILE,
  ESTEBAN_PROFILE,
  DON_PEPE_PROFILE,
  DRA_LUCIA_PROFILE,
  DR_HUGO_PROFILE,
  HECTOR_PROFILE,
  CAMILA_CESFAM_PROFILE,
  ANA_COQUIMBO_PROFILE,
  RODRIGO_ANCUD_PROFILE,
  TOMAS_IBARRA_PROFILE,
  PAULA_OSORNO_PROFILE,
  LUCIA_QPCR_PROFILE,
];

export const DEMO_PROFILE_CARDS: Readonly<Record<string, ProfileCard>> = {
  [MATEO_PROFILE.handle]: MATEO_CARD,
  [VALENTINA_PROFILE.handle]: VALENTINA_CARD,
  [TOMAS_PROFILE.handle]: TOMAS_CARD,
  [FRANCISCA_PROFILE.handle]: FRANCISCA_CARD,
  [RODRIGO_PROFILE.handle]: RODRIGO_CARD,
  [CAMILA_PROFILE.handle]: CAMILA_CARD,
  [MATIAS_PROFILE.handle]: MATIAS_CARD,
  [ESTEBAN_PROFILE.handle]: ESTEBAN_CARD,
  [DON_PEPE_PROFILE.handle]: DON_PEPE_CARD,
  [DRA_LUCIA_PROFILE.handle]: DRA_LUCIA_CARD,
  [DR_HUGO_PROFILE.handle]: DR_HUGO_CARD,
  [HECTOR_PROFILE.handle]: HECTOR_CARD,
  [CAMILA_CESFAM_PROFILE.handle]: CAMILA_CESFAM_CARD,
  [ANA_COQUIMBO_PROFILE.handle]: ANA_COQUIMBO_CARD,
  [RODRIGO_ANCUD_PROFILE.handle]: RODRIGO_ANCUD_CARD,
  [TOMAS_IBARRA_PROFILE.handle]: TOMAS_IBARRA_CARD,
  [PAULA_OSORNO_PROFILE.handle]: PAULA_OSORNO_CARD,
  [LUCIA_QPCR_PROFILE.handle]: LUCIA_QPCR_CARD,
};

/* ----------------------------------------------------------------------------------
 * Common Node Manifests (Reusable base primitives)
 * ---------------------------------------------------------------------------------- */

export const SOURCE_CSV_MANIFEST: NodeManifest = {
  id: "core.source.csv",
  version: "0.1.0",
  name: "Archivo CSV",
  category: "Fuentes",
  inputs: [],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      path: { type: "string" },
      delimiter: { type: "string", default: "," },
    },
  },
  impl: { kind: "builtin", name: "flow.node" },
};

export const FILTER_MANIFEST: NodeManifest = {
  id: "core.filter",
  version: "0.1.0",
  name: "Filtrar",
  category: "Transformar",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      column: { type: "string" },
      op: { type: "string", enum: ["=", "!=", ">", "<", ">=", "<="] },
      value: { type: "string" },
    },
  },
  impl: { kind: "sql", template: "SELECT * FROM {{in}} WHERE {{column}} {{op}} {{value}}" },
};

export const VIEW_BAR_MANIFEST: NodeManifest = {
  id: "core.view.bar",
  version: "0.1.0",
  name: "Gráfico de barras",
  category: "Vistas",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "chart" }],
  params: {
    type: "object",
    properties: {
      x: { type: "string" },
      y: { type: "string" },
      title: { type: "string" },
    },
  },
  impl: { kind: "view", spec: { mark: "bar" } },
};

export const FLOW_INPUT_MANIFEST: NodeManifest = {
  id: "flow.input",
  version: "0.1.0",
  name: "Entrada de módulo",
  category: "Flujo",
  inputs: [],
  outputs: [{ id: "out", type: "any" }],
  params: { type: "object", properties: { name: { type: "string" } } },
  impl: { kind: "builtin", name: "flow.input" },
};

export const FLOW_OUTPUT_MANIFEST: NodeManifest = {
  id: "flow.output",
  version: "0.1.0",
  name: "Salida de módulo",
  category: "Flujo",
  inputs: [{ id: "in", type: "any" }],
  outputs: [],
  params: { type: "object", properties: { name: { type: "string" } } },
  impl: { kind: "builtin", name: "flow.output" },
};

/* ----------------------------------------------------------------------------------
 * ÁREA 1: AGRONOMÍA (Caso Demo)
 * App: "Cadena de Frío y Cosecha de Berries" (Maule 🇨🇱 vs Michoacán 🇲🇽)
 * Nodo: "Filtro de Sensores Resiliente" (ignorar nulos vs promediar cero: [18, 22, null, 25])
 * Módulo: "Alerta de Heladas Tardías y Punto de Rocío"
 * ---------------------------------------------------------------------------------- */

export const AGRO_FILTRO_SENSORES_MANIFEST: NodeManifest = {
  id: "hub.agronomia.filtro-sensores",
  version: "0.1.0",
  name: "Filtro de Sensores Resiliente",
  description:
    "Filtro tolerante a fallas para telemetría de frío. Permite ignorar nulos, imputar con cero o interpolar en series como [18, 22, null, 25] sin quebrar el pipeline.",
  category: "Agronomía / IoT",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      strategy: {
        type: "string",
        enum: ["ignore_nulls", "average_zero", "interpolate"],
        default: "ignore_nulls",
      },
      column: { type: "string", default: "temperatura_c" },
      min_valid: { type: "number", default: -10 },
      max_valid: { type: "number", default: 45 },
    },
    required: ["strategy", "column"],
  },
  impl: {
    kind: "python",
    entry: "filter_telemetry",
    code: `def filter_telemetry(data, params):
    col = params.get("column", "temperatura_c")
    strategy = params.get("strategy", "ignore_nulls")
    clean = []
    for row in data:
        val = row.get(col)
        if val is None:
            if strategy == "ignore_nulls":
                continue
            elif strategy == "average_zero":
                row[col] = 0.0
        clean.append(row)
    return clean`,
  },
};

export const AGRO_ALERTA_HELADAS_MANIFEST: NodeManifest = {
  id: "hub.agronomia.alerta-heladas",
  version: "0.1.0",
  name: "Alerta de Heladas Tardías y Punto de Rocío",
  description:
    "Módulo compuesto que calcula el punto de rocío psicrométrico (Magnus) y emite semáforo de riesgo de helada y quiebre de frío en huertos y cámaras.",
  category: "Agronomía / Clima",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      umbral_helada: { type: "number", default: 2.0 },
      temp_col: { type: "string", default: "temperatura_c" },
      hum_col: { type: "string", default: "humedad_relativa" },
    },
  },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("m_in", "flow.input", { name: "in" }, { x: 0, y: 0 }),
        flowNode(
          "m_dew",
          "hub.agronomia.calc-rocio",
          { a: 17.27, b: 237.7 },
          { x: 260, y: 0 },
          "Magnus-Tetens",
        ),
        flowNode(
          "m_semaforo",
          "core.filter",
          { column: "punto_rocio_c", op: "<", value: "3.0" },
          { x: 520, y: 0 },
          "Alerta crítica",
        ),
        flowNode("m_out", "flow.output", { name: "out" }, { x: 780, y: 0 }),
      ],
      edges: [
        flowEdge("m_in", "out", "m_dew", "in"),
        flowEdge("m_dew", "out", "m_semaforo", "in"),
        flowEdge("m_semaforo", "out", "m_out", "in"),
      ],
    },
  },
};

const AGRO_TELEMETRIA_COLUMNS: Column[] = [
  { name: "timestamp", type: "date" },
  { name: "zona", type: "text" },
  { name: "camion_id", type: "text" },
  { name: "temperatura_c", type: "number" },
  { name: "humedad_relativa", type: "number" },
  { name: "punto_rocio_c", type: "number" },
  { name: "alerta_frio", type: "text" },
];

const AGRO_SAMPLE_ROWS: unknown[][] = [
  ["2026-11-20T04:00:00Z", "Maule (Curicó) 🇨🇱", "CAM-CL-104", 1.8, 88.0, 0.1, "ÓPTIMO"],
  ["2026-11-20T05:00:00Z", "Maule (Curicó) 🇨🇱", "CAM-CL-104", 2.2, 85.5, 0.3, "ÓPTIMO"],
  ["2026-11-20T06:00:00Z", "Maule (Linares) 🇨🇱", "CAM-CL-108", 0.4, 92.0, -0.6, "RIESGO_HELADA"],
  ["2026-11-20T07:00:00Z", "Maule (Linares) 🇨🇱", "CAM-CL-108", -0.5, 94.0, -1.2, "HELADA_NEGRA"],
  ["2026-11-20T04:00:00Z", "Michoacán (Zamora) 🇲🇽", "CAM-MX-201", 3.1, 78.0, 0.2, "ÓPTIMO"],
  ["2026-11-20T05:00:00Z", "Michoacán (Zamora) 🇲🇽", "CAM-MX-201", 4.5, 82.0, 1.8, "QUIEBRE_FRIO"],
  ["2026-11-20T06:00:00Z", "Michoacán (Los Reyes) 🇲🇽", "CAM-MX-205", 2.9, 80.0, 0.1, "ÓPTIMO"],
  [
    "2026-11-20T07:00:00Z",
    "Michoacán (Los Reyes) 🇲🇽",
    "CAM-MX-205",
    5.2,
    84.0,
    2.7,
    "QUIEBRE_FRIO",
  ],
];

const AGRO_COL_PROFILES: ColumnProfile[] = [
  { name: "timestamp", type: "date", count: 8, nulls: 0, distinct: 4, bins: [] },
  { name: "zona", type: "text", count: 8, nulls: 0, distinct: 4, bins: [] },
  { name: "camion_id", type: "text", count: 8, nulls: 0, distinct: 4, bins: [] },
  {
    name: "temperatura_c",
    type: "number",
    count: 8,
    nulls: 0,
    distinct: 8,
    min: "-0.5",
    max: "5.2",
    mean: 2.45,
    bins: [1, 2, 3, 2],
  },
  {
    name: "humedad_relativa",
    type: "number",
    count: 8,
    nulls: 0,
    distinct: 7,
    min: "78.0",
    max: "94.0",
    mean: 85.4,
    bins: [2, 3, 2, 1],
  },
  {
    name: "punto_rocio_c",
    type: "number",
    count: 8,
    nulls: 0,
    distinct: 7,
    min: "-1.2",
    max: "2.7",
    mean: 0.42,
    bins: [2, 3, 2, 1],
  },
  { name: "alerta_frio", type: "text", count: 8, nulls: 0, distinct: 4, bins: [] },
];

export const DRAFT_AGRO_APP: PublicationDraft = {
  slug: "cadena-frio-berries",
  kind: "flow",
  title: "Cadena de Frío y Cosecha de Berries (Maule 🇨🇱 vs Michoacán 🇲🇽)",
  description:
    "Para exportadores y packings de berries que necesitan saber, a tiempo, cuándo una cámara o un camión refrigerado se sale de rango. Toma la telemetría de temperatura y humedad, limpia las lecturas caídas, calcula el punto de rocío y marca quiebres térmicos y riesgo de helada; termina en un gráfico que compara Maule con Michoacán. Úsala como base cambiando la fuente de sensores y los umbrales de tu fruta.",
  tags: ["agronomia", "berries", "cadena-de-frio", "iot", "maule", "michoacan"],
  version: "1.0.0",
  flow: flowGraph(
    "Cadena de Frío y Cosecha de Berries",
    [
      flowNode(
        "telemetria_iot",
        "core.source.csv",
        { path: "s3://berries/telemetria.csv" },
        { x: 0, y: 0 },
        "Sensores IoT",
      ),
      flowNode(
        "filtro_resiliente",
        "hub.agronomia.filtro-sensores",
        { strategy: "ignore_nulls" },
        { x: 260, y: 0 },
        "Filtro Resiliente",
      ),
      flowNode(
        "alerta_heladas",
        "hub.agronomia.alerta-heladas",
        { umbral_helada: 2.0 },
        { x: 520, y: 0 },
        "Alerta Heladas & Rocío",
      ),
      flowNode(
        "grafico_comparativo",
        "core.view.bar",
        { x: "zona", y: "temperatura_c", title: "Temperatura por Zona" },
        { x: 780, y: 0 },
        "Comparativa Maule vs Michoacán",
      ),
    ],
    [
      flowEdge("telemetria_iot", "out", "filtro_resiliente", "in"),
      flowEdge("filtro_resiliente", "out", "alerta_heladas", "in"),
      flowEdge("alerta_heladas", "out", "grafico_comparativo", "in"),
    ],
  ),
  snapshot: createSnapshot(
    [
      SOURCE_CSV_MANIFEST,
      AGRO_FILTRO_SENSORES_MANIFEST,
      AGRO_ALERTA_HELADAS_MANIFEST,
      VIEW_BAR_MANIFEST,
    ],
    {
      nodes: {
        telemetria_iot: { state: "done" },
        filtro_resiliente: { state: "done" },
        alerta_heladas: { state: "done" },
        grafico_comparativo: { state: "done" },
      },
      results: {
        alerta_heladas: {
          out: { id: "res_agro_alerta", rowCount: 8, schema: AGRO_TELEMETRIA_COLUMNS },
        },
      },
      displays: { grafico_comparativo: [] },
      schemas: {
        alerta_heladas: { out: AGRO_TELEMETRIA_COLUMNS },
      },
      pages: {
        res_agro_alerta: { columns: AGRO_TELEMETRIA_COLUMNS, rows: AGRO_SAMPLE_ROWS, total: 8 },
      },
      profiles: {
        res_agro_alerta: { columns: AGRO_COL_PROFILES },
      },
      views: {
        grafico_comparativo: {
          spec: { mark: "bar", encoding: { x: "zona", y: "temperatura_c" } },
          rowCount: 8,
          sampled: false,
        },
      },
      figures: {},
    },
  ),
};

export const DRAFT_AGRO_NODE: PublicationDraft = {
  slug: "filtro-sensores-resiliente",
  kind: "node",
  title: "Filtro de Sensores Resiliente",
  description:
    "Para cualquier flujo que lea sensores con huecos. Recibe una serie con lecturas nulas y la entrega limpia, con la estrategia que elijas: ignorar los nulos, rellenarlos con cero o interpolar entre los vecinos (por ejemplo, [18.2, 22.1, null, 25.0]). Ponlo justo después de la fuente para que un sensor caído no rompa el resto del flujo.",
  tags: ["agronomia", "iot", "calidad-de-datos", "sensores", "resiliencia"],
  version: "0.1.0",
  flow: flowGraph(
    "Filtro de Sensores Resiliente Demo",
    [flowNode("n1", "hub.agronomia.filtro-sensores", { strategy: "ignore_nulls" }, { x: 0, y: 0 })],
    [],
  ),
  manifest: AGRO_FILTRO_SENSORES_MANIFEST,
  snapshot: createSnapshot([AGRO_FILTRO_SENSORES_MANIFEST]),
};

export const DRAFT_AGRO_MODULE: PublicationDraft = {
  slug: "alerta-heladas-punto-rocio",
  kind: "node",
  title: "Alerta de Heladas Tardías y Punto de Rocío",
  description:
    "Para agricultores con estación meteorológica que quieren adelantarse a una helada. A partir de temperatura y humedad relativa calcula el punto de rocío y entrega un semáforo de riesgo que distingue helada blanca (por radiación) de helada negra. Ajusta los umbrales del semáforo a tu cultivo y a tu zona.",
  tags: ["agronomia", "clima", "heladas", "punto-de-rocio", "modulo"],
  version: "0.1.0",
  flow: flowGraph(
    "Alerta de Heladas Tardías Demo",
    [flowNode("n1", "hub.agronomia.alerta-heladas", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: AGRO_ALERTA_HELADAS_MANIFEST,
  snapshot: createSnapshot([AGRO_ALERTA_HELADAS_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * ÁREA 2: SALUD
 * App: "Scribe Clínico & Traspaso de Guardia SOAP"
 * Módulo: "Triage NEWS2 / Deterioro Fisiológico"
 * Nodo: "Dosis Pediátrica por Superficie Corporal (Mosteller)"
 * ---------------------------------------------------------------------------------- */

export const HEALTH_MOSTELLER_MANIFEST: NodeManifest = {
  id: "hub.salud.dosis-mosteller",
  version: "0.1.0",
  name: "Dosis Pediátrica por Superficie Corporal (Mosteller)",
  description:
    "Cálculo de Body Surface Area (BSA) con la fórmula de Mosteller: BSA = sqrt(peso_kg * talla_cm / 3600), ajustando posología en mg/m² para antibióticos y quimioterapia.",
  category: "Salud / Pediatría",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      peso_col: { type: "string", default: "peso_kg" },
      talla_col: { type: "string", default: "talla_cm" },
      dosis_mg_m2: { type: "number", default: 150.0 },
    },
    required: ["peso_col", "talla_col", "dosis_mg_m2"],
  },
  impl: {
    kind: "python",
    entry: "calculate_pediatric_dose",
    code: `import math
def calculate_pediatric_dose(patients, params):
    dosis_base = params.get("dosis_mg_m2", 150.0)
    for p in patients:
        peso = p.get("peso_kg", 0.0)
        talla = p.get("talla_cm", 0.0)
        bsa = math.sqrt((peso * talla) / 3600.0) if peso > 0 and talla > 0 else 0.0
        p["bsa_m2"] = round(bsa, 3)
        p["dosis_calculada_mg"] = round(bsa * dosis_base, 1)
    return patients`,
  },
};

export const HEALTH_NEWS2_MANIFEST: NodeManifest = {
  id: "hub.salud.triage-news2",
  version: "0.1.0",
  name: "Triage NEWS2 / Deterioro Fisiológico",
  description:
    "Módulo compuesto que implementa el score NEWS2 (Royal College of Physicians) evaluando saturación O2, frecuencia respiratoria, pulso, presión sistólica, temperatura y nivel de consciencia.",
  category: "Salud / Urgencias",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      umbral_alerta_roja: { type: "number", default: 7 },
    },
  },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("t_in", "flow.input", { name: "in" }, { x: 0, y: 0 }),
        flowNode("t_score", "hub.salud.calc-news2", {}, { x: 260, y: 0 }, "Score Fisiológico"),
        flowNode(
          "t_clasifica",
          "core.filter",
          { column: "news2_score", op: ">=", value: "5" },
          { x: 520, y: 0 },
          "Riesgo Medio/Alto",
        ),
        flowNode("t_out", "flow.output", { name: "out" }, { x: 780, y: 0 }),
      ],
      edges: [
        flowEdge("t_in", "out", "t_score", "in"),
        flowEdge("t_score", "out", "t_clasifica", "in"),
        flowEdge("t_clasifica", "out", "t_out", "in"),
      ],
    },
  },
};

const HEALTH_PATIENTS_COLUMNS: Column[] = [
  { name: "cama_id", type: "text" },
  { name: "paciente", type: "text" },
  { name: "edad_anos", type: "number" },
  { name: "diagnostico_soap", type: "text" },
  { name: "frec_respiratoria", type: "number" },
  { name: "sat_o2", type: "number" },
  { name: "news2_score", type: "number" },
  { name: "riesgo_clinico", type: "text" },
  { name: "dosis_ajustada_mg", type: "number" },
];

const HEALTH_SAMPLE_ROWS: unknown[][] = [
  [
    "UCI-01",
    "Gómez, M. (12a)",
    12,
    "S: Disnea postoperatoria; O: Taquicárdico; A: Sepsis incipiente; P: ATB IV",
    26,
    92,
    6,
    "RIESGO_MEDIO",
    245.5,
  ],
  [
    "UCI-02",
    "Pérez, C. (68a)",
    68,
    "S: Dolor torácico opresivo; O: PA 85/50; A: Shock cardiogénico; P: Noradrenalina",
    30,
    89,
    9,
    "RIESGO_ALTO",
    0.0,
  ],
  [
    "URG-05",
    "Navarro, L. (4a)",
    4,
    "S: Cuadro febril 39°C y vómitos; O: Deshidratación leve; P: Cefalosporina Mosteller",
    22,
    98,
    1,
    "RIESGO_BAJO",
    112.0,
  ],
  [
    "URG-08",
    "Torres, J. (54a)",
    54,
    "S: Cefalea intensa súbita; O: PA 180/110; A: Crisis hipertensiva; P: Labetalol",
    18,
    97,
    2,
    "RIESGO_BAJO",
    0.0,
  ],
];

export const DRAFT_HEALTH_APP: PublicationDraft = {
  slug: "scribe-clinico-soap",
  kind: "flow",
  title: "Scribe Clínico & Traspaso de Guardia SOAP",
  description:
    "Para equipos de urgencia y enfermería que entregan turno con poco tiempo. Ordena la nota de traspaso en formato SOAP (Subjetivo, Objetivo, Análisis, Plan), calcula el puntaje NEWS2 con los signos vitales y revisa dosis pediátricas por superficie corporal; termina en una vista que prioriza a los pacientes que más se deterioran. Es un apoyo a la entrega de turno: no reemplaza el criterio clínico.",
  tags: ["salud", "soap", "urgencias", "clinical-notes", "traspaso-de-guardia"],
  version: "1.0.0",
  flow: flowGraph(
    "Scribe Clínico & Traspaso de Guardia SOAP",
    [
      flowNode(
        "audio_transcripcion",
        "core.source.csv",
        { path: "guardia_urgencias.csv" },
        { x: 0, y: 0 },
        "Transcripción de Turno",
      ),
      flowNode("evaluador_news2", "hub.salud.triage-news2", {}, { x: 260, y: 0 }, "Triage NEWS2"),
      flowNode(
        "calculador_mosteller",
        "hub.salud.dosis-mosteller",
        { dosis_mg_m2: 150 },
        { x: 520, y: 0 },
        "Dosis Pediátrica",
      ),
      flowNode(
        "vista_prioridad",
        "core.view.bar",
        { x: "cama_id", y: "news2_score", title: "Prioridad Pacientes" },
        { x: 780, y: 0 },
        "Tablero de Urgencia",
      ),
    ],
    [
      flowEdge("audio_transcripcion", "out", "evaluador_news2", "in"),
      flowEdge("evaluador_news2", "out", "calculador_mosteller", "in"),
      flowEdge("calculador_mosteller", "out", "vista_prioridad", "in"),
    ],
  ),
  snapshot: createSnapshot(
    [SOURCE_CSV_MANIFEST, HEALTH_NEWS2_MANIFEST, HEALTH_MOSTELLER_MANIFEST, VIEW_BAR_MANIFEST],
    {
      nodes: {
        audio_transcripcion: { state: "done" },
        evaluador_news2: { state: "done" },
        calculador_mosteller: { state: "done" },
        vista_prioridad: { state: "done" },
      },
      results: {
        calculador_mosteller: {
          out: { id: "res_health_soap", rowCount: 4, schema: HEALTH_PATIENTS_COLUMNS },
        },
      },
      displays: { vista_prioridad: [] },
      schemas: {
        calculador_mosteller: { out: HEALTH_PATIENTS_COLUMNS },
      },
      pages: {
        res_health_soap: { columns: HEALTH_PATIENTS_COLUMNS, rows: HEALTH_SAMPLE_ROWS, total: 4 },
      },
      profiles: {
        res_health_soap: {
          columns: [
            { name: "cama_id", type: "text", count: 4, nulls: 0, distinct: 4, bins: [] },
            { name: "paciente", type: "text", count: 4, nulls: 0, distinct: 4, bins: [] },
            {
              name: "edad_anos",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "4",
              max: "68",
              mean: 34.5,
              bins: [1, 1, 1, 1],
            },
            { name: "diagnostico_soap", type: "text", count: 4, nulls: 0, distinct: 4, bins: [] },
            {
              name: "frec_respiratoria",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "18",
              max: "30",
              mean: 24,
              bins: [1, 1, 1, 1],
            },
            {
              name: "sat_o2",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "89",
              max: "98",
              mean: 94,
              bins: [1, 1, 1, 1],
            },
            {
              name: "news2_score",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "1",
              max: "9",
              mean: 4.5,
              bins: [1, 1, 1, 1],
            },
            { name: "riesgo_clinico", type: "text", count: 4, nulls: 0, distinct: 3, bins: [] },
            {
              name: "dosis_ajustada_mg",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 3,
              min: "0.0",
              max: "245.5",
              mean: 89.3,
              bins: [2, 1, 0, 1],
            },
          ],
        },
      },
      views: {
        vista_prioridad: { spec: { mark: "bar" }, rowCount: 4, sampled: false },
      },
      figures: {},
    },
  ),
};

export const DRAFT_HEALTH_MODULE: PublicationDraft = {
  slug: "triage-news2",
  kind: "node",
  title: "Triage NEWS2 / Deterioro Fisiológico",
  description:
    "Para servicios de urgencia y hospitalización que quieren detectar antes el deterioro de un paciente. Recibe frecuencia respiratoria, saturación, presión, pulso, conciencia y temperatura, y entrega el puntaje NEWS2 con su nivel de alerta. Sirve como señal temprana: la decisión clínica sigue siendo del equipo.",
  tags: ["salud", "urgencias", "news2", "triage", "fisiologia"],
  version: "0.1.0",
  flow: flowGraph(
    "Triage NEWS2 Demo",
    [flowNode("n1", "hub.salud.triage-news2", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: HEALTH_NEWS2_MANIFEST,
  snapshot: createSnapshot([HEALTH_NEWS2_MANIFEST]),
};

export const DRAFT_HEALTH_NODE: PublicationDraft = {
  slug: "dosis-pediatrica-mosteller",
  kind: "node",
  title: "Dosis Pediátrica por Superficie Corporal (Mosteller)",
  description:
    "Para farmacia clínica y pediatría. Recibe peso y talla, calcula la superficie corporal (m²) con la fórmula de Mosteller y la usa para escalar una dosis indicada por m². Úsalo como verificación de cálculo; la dosis final siempre la valida un profesional.",
  tags: ["salud", "pediatria", "farmacologia", "mosteller", "dosificacion"],
  version: "0.1.0",
  flow: flowGraph(
    "Dosis Pediátrica Mosteller Demo",
    [flowNode("n1", "hub.salud.dosis-mosteller", { dosis_mg_m2: 150 }, { x: 0, y: 0 })],
    [],
  ),
  manifest: HEALTH_MOSTELLER_MANIFEST,
  snapshot: createSnapshot([HEALTH_MOSTELLER_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * ÁREA 3: EDUCACIÓN
 * App: "Laboratorio Escolar de Consumo Eléctrico"
 * Módulo: "Agrupador Temporal por Bloques Académicos (45 min vs 60 min)"
 * Nodo: "Detector de Outliers MAD para Alumnos"
 * ---------------------------------------------------------------------------------- */

export const EDU_MAD_MANIFEST: NodeManifest = {
  id: "hub.educacion.detector-mad",
  version: "0.1.0",
  name: "Detector de Outliers MAD para Alumnos",
  description:
    "Implementación didáctica del estimador Median Absolute Deviation (MAD). Compara visualmente la media con la mediana y etiqueta picos anómalos de consumo.",
  category: "Educación / Estadística",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      columna_valor: { type: "string", default: "kwh" },
      umbral_mad: { type: "number", default: 2.5 },
    },
    required: ["columna_valor", "umbral_mad"],
  },
  impl: {
    kind: "python",
    entry: "mad_outliers",
    code: `def mad_outliers(rows, params):
    col = params.get("columna_valor", "kwh")
    k = params.get("umbral_mad", 2.5)
    values = sorted([r[col] for r in rows if r.get(col) is not None])
    if not values:
        return rows
    med = values[len(values)//2]
    diffs = sorted([abs(v - med) for v in values])
    mad = diffs[len(diffs)//2] or 1.0
    for r in rows:
        v = r.get(col, 0)
        score = abs(v - med) / (1.4826 * mad)
        r["mad_score"] = round(score, 2)
        r["es_outlier"] = score > k
    return rows`,
  },
};

export const EDU_BLOQUES_MANIFEST: NodeManifest = {
  id: "hub.educacion.bloques-academicos",
  version: "0.1.0",
  name: "Agrupador Temporal por Bloques Académicos (45 min vs 60 min)",
  description:
    "Módulo compuesto que mapea marcas de tiempo de medidores eléctricos en bloques lectivos (Clase 1, Recreo, Clase 2, Almuerzo, Noche) para colegios técnicos.",
  category: "Educación / Horarios",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      duracion_bloque_min: { type: "number", enum: [45, 60], default: 45 },
    },
  },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("b_in", "flow.input", { name: "in" }, { x: 0, y: 0 }),
        flowNode(
          "b_map",
          "hub.educacion.mapeo-horario",
          { formato: "chileno_45min" },
          { x: 260, y: 0 },
          "Bloques Escolares",
        ),
        flowNode("b_out", "flow.output", { name: "out" }, { x: 520, y: 0 }),
      ],
      edges: [flowEdge("b_in", "out", "b_map", "in"), flowEdge("b_map", "out", "b_out", "in")],
    },
  },
};

const EDU_CONSUMO_COLUMNS: Column[] = [
  { name: "hora", type: "text" },
  { name: "bloque_pedagogico", type: "text" },
  { name: "kwh", type: "number" },
  { name: "mad_score", type: "number" },
  { name: "es_outlier", type: "bool" },
  { name: "consumo_fantasma", type: "text" },
];

const EDU_SAMPLE_ROWS: unknown[][] = [
  ["02:15", "Noche / Inactivo", 3.2, 0.45, false, "NORMAL_STANDBY"],
  ["03:30", "Noche / Inactivo", 8.9, 3.12, true, "CONSUMO_VAMPIRO_ALERTA"],
  ["08:15", "Bloque 1 (08:00 - 09:30)", 18.5, 0.88, false, "CLASES_ACTIVAS"],
  ["09:40", "Recreo Mañana (09:30 - 09:45)", 6.1, 0.32, false, "LUCES_APAGADAS"],
  ["11:15", "Bloque 2 (10:00 - 11:30)", 21.0, 1.2, false, "TALLER_MAQUINAS"],
  ["13:20", "Almuerzo y Patios", 7.4, 0.25, false, "COMEDOR"],
];

export const DRAFT_EDU_APP: PublicationDraft = {
  slug: "laboratorio-escolar-electricidad",
  kind: "flow",
  title: "Laboratorio Escolar de Consumo Eléctrico",
  description:
    "Para profesores de ciencias que quieren enseñar análisis de datos con datos reales de su colegio. Toma las lecturas del medidor eléctrico, las agrupa por bloque de clases y recreos, detecta consumos fuera de lo normal (como equipos encendidos de noche) con el método MAD y termina en un gráfico pensado para la sala. Cambia la fuente por el medidor de tu establecimiento.",
  tags: ["educacion", "stem", "energia", "colegios", "ciencia-de-datos"],
  version: "1.0.0",
  flow: flowGraph(
    "Laboratorio Escolar de Consumo Eléctrico",
    [
      flowNode(
        "smart_meter",
        "core.source.csv",
        { path: "liceo_electricidad.csv" },
        { x: 0, y: 0 },
        "Smart Meter Escolar",
      ),
      flowNode(
        "agrupador_bloques",
        "hub.educacion.bloques-academicos",
        { duracion_bloque_min: 45 },
        { x: 260, y: 0 },
        "Bloques Académicos",
      ),
      flowNode(
        "detector_anomalias",
        "hub.educacion.detector-mad",
        { umbral_mad: 2.5 },
        { x: 520, y: 0 },
        "Detector MAD Alumnos",
      ),
      flowNode(
        "grafico_pedagogico",
        "core.view.bar",
        { x: "bloque_pedagogico", y: "kwh", title: "Consumo por Bloque" },
        { x: 780, y: 0 },
        "Gráfico Didáctico",
      ),
    ],
    [
      flowEdge("smart_meter", "out", "agrupador_bloques", "in"),
      flowEdge("agrupador_bloques", "out", "detector_anomalias", "in"),
      flowEdge("detector_anomalias", "out", "grafico_pedagogico", "in"),
    ],
  ),
  snapshot: createSnapshot(
    [SOURCE_CSV_MANIFEST, EDU_BLOQUES_MANIFEST, EDU_MAD_MANIFEST, VIEW_BAR_MANIFEST],
    {
      nodes: {
        smart_meter: { state: "done" },
        agrupador_bloques: { state: "done" },
        detector_anomalias: { state: "done" },
        grafico_pedagogico: { state: "done" },
      },
      results: {
        detector_anomalias: {
          out: { id: "res_edu_kwh", rowCount: 6, schema: EDU_CONSUMO_COLUMNS },
        },
      },
      displays: { grafico_pedagogico: [] },
      schemas: {
        detector_anomalias: { out: EDU_CONSUMO_COLUMNS },
      },
      pages: {
        res_edu_kwh: { columns: EDU_CONSUMO_COLUMNS, rows: EDU_SAMPLE_ROWS, total: 6 },
      },
      profiles: {
        res_edu_kwh: {
          columns: [
            { name: "hora", type: "text", count: 6, nulls: 0, distinct: 6, bins: [] },
            { name: "bloque_pedagogico", type: "text", count: 6, nulls: 0, distinct: 6, bins: [] },
            {
              name: "kwh",
              type: "number",
              count: 6,
              nulls: 0,
              distinct: 6,
              min: "3.2",
              max: "21.0",
              mean: 10.85,
              bins: [2, 1, 2, 1],
            },
            {
              name: "mad_score",
              type: "number",
              count: 6,
              nulls: 0,
              distinct: 6,
              min: "0.25",
              max: "3.12",
              mean: 1.04,
              bins: [4, 1, 0, 1],
            },
            { name: "es_outlier", type: "bool", count: 6, nulls: 0, distinct: 2, bins: [] },
            { name: "consumo_fantasma", type: "text", count: 6, nulls: 0, distinct: 6, bins: [] },
          ],
        },
      },
      views: {
        grafico_pedagogico: { spec: { mark: "bar" }, rowCount: 6, sampled: false },
      },
      figures: {},
    },
  ),
};

export const DRAFT_EDU_MODULE: PublicationDraft = {
  slug: "agrupador-bloques-academicos",
  kind: "node",
  title: "Agrupador Temporal por Bloques Académicos (45 min vs 60 min)",
  description:
    "Para analizar cualquier serie de tiempo escolar. Recibe registros con fecha y hora y los asigna al bloque de la jornada que corresponde (de 45 o 60 minutos, recreos incluidos), para comparar consumo o actividad por bloque. Ajusta el horario a la jornada de tu colegio.",
  tags: ["educacion", "horarios", "bloques-academicos", "analitica-escolar"],
  version: "0.1.0",
  flow: flowGraph(
    "Bloques Académicos Demo",
    [flowNode("n1", "hub.educacion.bloques-academicos", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: EDU_BLOQUES_MANIFEST,
  snapshot: createSnapshot([EDU_BLOQUES_MANIFEST]),
};

export const DRAFT_EDU_NODE: PublicationDraft = {
  slug: "detector-outliers-mad",
  kind: "node",
  title: "Detector de Outliers MAD para Alumnos",
  description:
    "Para proyectos escolares de STEM que necesitan encontrar valores raros sin estadística avanzada. Recibe una columna numérica y marca los datos que se alejan de la mediana según la desviación absoluta mediana (MAD), un método robusto y fácil de explicar en clases. Puedes ajustar la sensibilidad con un solo parámetro.",
  tags: ["educacion", "estadistica", "mad", "outliers", "didactico"],
  version: "0.1.0",
  flow: flowGraph(
    "Detector Outliers MAD Demo",
    [flowNode("n1", "hub.educacion.detector-mad", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: EDU_MAD_MANIFEST,
  snapshot: createSnapshot([EDU_MAD_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * ÁREA 4: VENTAS & PYMES
 * App: "Radar de Demanda y Compras Agrupadas"
 * Módulo: "Punto de Reorden con Stock de Seguridad"
 * Nodo: "Validador de Margen Neto con IVA Descontado"
 * ---------------------------------------------------------------------------------- */

export const PYMES_MARGEN_MANIFEST: NodeManifest = {
  id: "hub.pymes.margen-neto-iva",
  version: "0.1.0",
  name: "Validador de Margen Neto con IVA Descontado",
  description:
    "Calcula el precio neto sin IVA (19% Chile / 16% México), descuenta fletes y verifica margen comercial neto evitando vender bajo costo de reposición.",
  category: "Ventas & Pymes / Precios",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      tasa_iva: { type: "number", default: 0.19 },
      margen_minimo_pct: { type: "number", default: 20.0 },
    },
  },
  impl: {
    kind: "sql",
    template:
      "SELECT sku, producto, precio_bruto, ROUND(precio_bruto / (1.0 + {{tasa_iva}}), 2) AS precio_neto, costo_reposicion, ROUND((precio_bruto / (1.0 + {{tasa_iva}})) - costo_reposicion, 2) AS margen_pesos, ROUND((((precio_bruto / (1.0 + {{tasa_iva}})) - costo_reposicion) / (precio_bruto / (1.0 + {{tasa_iva}}))) * 100, 1) AS margen_pct FROM {{in}};",
  },
};

export const PYMES_PUNTO_REORDEN_MANIFEST: NodeManifest = {
  id: "hub.pymes.punto-reorden",
  version: "0.1.0",
  name: "Punto de Reorden con Stock de Seguridad",
  description:
    "Módulo compuesto para logística pyme: calcula el ROP = (Demanda Diaria * Lead Time) + Stock Seguridad para anticipar compras colectivas sin quiebres.",
  category: "Ventas & Pymes / Logística",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      nivel_servicio_z: { type: "number", default: 1.65 },
    },
  },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("p_in", "flow.input", { name: "in" }, { x: 0, y: 0 }),
        flowNode("p_calc", "hub.pymes.calc-rop", { z: 1.65 }, { x: 260, y: 0 }, "Cálculo ROP"),
        flowNode(
          "p_alerta",
          "core.filter",
          { column: "stock_actual", op: "<=", value: "rop" },
          { x: 520, y: 0 },
          "Necesita Reorden",
        ),
        flowNode("p_out", "flow.output", { name: "out" }, { x: 780, y: 0 }),
      ],
      edges: [
        flowEdge("p_in", "out", "p_calc", "in"),
        flowEdge("p_calc", "out", "p_alerta", "in"),
        flowEdge("p_alerta", "out", "p_out", "in"),
      ],
    },
  },
};

const PYMES_PEDIDOS_COLUMNS: Column[] = [
  { name: "almacen", type: "text" },
  { name: "sku", type: "text" },
  { name: "producto", type: "text" },
  { name: "demanda_semanal_bultos", type: "number" },
  { name: "stock_actual", type: "number" },
  { name: "punto_reorden", type: "number" },
  { name: "precio_neto_compra", type: "number" },
  { name: "ahorro_compra_agrupada_pct", type: "number" },
];

const PYMES_SAMPLE_ROWS: unknown[][] = [
  [
    "Almacén Don Tito (Maipú)",
    "AB-001",
    "Aceite Vegetal 900cc (Caja x 12)",
    25,
    6,
    18,
    14200,
    18.5,
  ],
  [
    "Minimarket Los Aromos (La Florida)",
    "AB-001",
    "Aceite Vegetal 900cc (Caja x 12)",
    35,
    10,
    22,
    14200,
    18.5,
  ],
  [
    "Botillería La Esquina (Santiago)",
    "AB-003",
    "Harina Selecta 1kg (Fardo x 10)",
    40,
    12,
    30,
    8900,
    14.0,
  ],
  ["Almacén Doña María (Ñuñoa)", "AB-004", "Arroz Grado 1 (Saco x 25kg)", 15, 3, 12, 22500, 21.0],
];

export const DRAFT_PYMES_APP: PublicationDraft = {
  slug: "radar-compras-agrupadas",
  kind: "flow",
  title: "Radar de Demanda y Compras Agrupadas para Almacenes",
  description:
    "Para almacenes de barrio y minimarkets que quieren comprar en conjunto y conseguir mejor precio. Junta los pedidos de varios almacenes, revisa el margen real de cada producto sin IVA, calcula cuándo reponer y entrega un resumen consolidado para negociar con la distribuidora. Úsala como base cambiando la lista de almacenes y productos.",
  tags: ["pymes", "almacenes", "compras-colectivas", "inventario", "abastecimiento"],
  version: "1.0.0",
  flow: flowGraph(
    "Radar de Demanda y Compras Agrupadas",
    [
      flowNode(
        "pedidos_almacenes",
        "core.source.csv",
        { path: "pedidos_red_almacenes.csv" },
        { x: 0, y: 0 },
        "Pedidos de Almacenes",
      ),
      flowNode(
        "validador_margen",
        "hub.pymes.margen-neto-iva",
        { tasa_iva: 0.19 },
        { x: 260, y: 0 },
        "Márgenes sin IVA",
      ),
      flowNode(
        "reorden_logistico",
        "hub.pymes.punto-reorden",
        {},
        { x: 520, y: 0 },
        "Punto de Reorden",
      ),
      flowNode(
        "resumen_escala",
        "core.view.bar",
        { x: "producto", y: "demanda_semanal_bultos", title: "Volumen Mayorista" },
        { x: 780, y: 0 },
        "Volumen Colectivo",
      ),
    ],
    [
      flowEdge("pedidos_almacenes", "out", "validador_margen", "in"),
      flowEdge("validador_margen", "out", "reorden_logistico", "in"),
      flowEdge("reorden_logistico", "out", "resumen_escala", "in"),
    ],
  ),
  snapshot: createSnapshot(
    [SOURCE_CSV_MANIFEST, PYMES_MARGEN_MANIFEST, PYMES_PUNTO_REORDEN_MANIFEST, VIEW_BAR_MANIFEST],
    {
      nodes: {
        pedidos_almacenes: { state: "done" },
        validador_margen: { state: "done" },
        reorden_logistico: { state: "done" },
        resumen_escala: { state: "done" },
      },
      results: {
        reorden_logistico: {
          out: { id: "res_pymes_pedidos", rowCount: 4, schema: PYMES_PEDIDOS_COLUMNS },
        },
      },
      displays: { resumen_escala: [] },
      schemas: {
        reorden_logistico: { out: PYMES_PEDIDOS_COLUMNS },
      },
      pages: {
        res_pymes_pedidos: { columns: PYMES_PEDIDOS_COLUMNS, rows: PYMES_SAMPLE_ROWS, total: 4 },
      },
      profiles: {
        res_pymes_pedidos: {
          columns: [
            { name: "almacen", type: "text", count: 4, nulls: 0, distinct: 4, bins: [] },
            { name: "sku", type: "text", count: 4, nulls: 0, distinct: 3, bins: [] },
            { name: "producto", type: "text", count: 4, nulls: 0, distinct: 3, bins: [] },
            {
              name: "demanda_semanal_bultos",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "15",
              max: "40",
              mean: 28.75,
              bins: [1, 1, 1, 1],
            },
            {
              name: "stock_actual",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "3",
              max: "12",
              mean: 7.75,
              bins: [1, 1, 1, 1],
            },
            {
              name: "punto_reorden",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "12",
              max: "30",
              mean: 20.5,
              bins: [1, 1, 1, 1],
            },
            {
              name: "precio_neto_compra",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 3,
              min: "8900",
              max: "22500",
              mean: 14950,
              bins: [1, 2, 0, 1],
            },
            {
              name: "ahorro_compra_agrupada_pct",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 3,
              min: "14.0",
              max: "21.0",
              mean: 18.0,
              bins: [1, 0, 2, 1],
            },
          ],
        },
      },
      views: {
        resumen_escala: { spec: { mark: "bar" }, rowCount: 4, sampled: false },
      },
      figures: {},
    },
  ),
};

export const DRAFT_PYMES_MODULE: PublicationDraft = {
  slug: "punto-reorden-stock-seguridad",
  kind: "node",
  title: "Punto de Reorden con Stock de Seguridad",
  description:
    "Para minoristas que se quedan sin stock o compran de más. Recibe la venta diaria, su variación y el plazo de entrega del proveedor, y entrega el punto de reorden con su stock de seguridad. Ajusta el nivel de servicio según cuánto te cuesta quedarte sin un producto.",
  tags: ["pymes", "logistica", "inventario", "stock-seguridad", "reorden"],
  version: "0.1.0",
  flow: flowGraph(
    "Punto de Reorden Demo",
    [flowNode("n1", "hub.pymes.punto-reorden", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: PYMES_PUNTO_REORDEN_MANIFEST,
  snapshot: createSnapshot([PYMES_PUNTO_REORDEN_MANIFEST]),
};

export const DRAFT_PYMES_NODE: PublicationDraft = {
  slug: "validador-margen-neto-iva",
  kind: "node",
  title: "Validador de Margen Neto con IVA Descontado",
  description:
    "Para negocios que fijan precios con IVA incluido y no saben cuánto ganan realmente. Recibe el precio de venta y el costo de cada producto, descuenta el IVA y entrega el margen de contribución real por producto. Cambia la tasa si tu país usa otra.",
  tags: ["pymes", "precios", "iva", "margen", "contabilidad"],
  version: "0.1.0",
  flow: flowGraph(
    "Validador de Margen Neto con IVA Demo",
    [flowNode("n1", "hub.pymes.margen-neto-iva", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: PYMES_MARGEN_MANIFEST,
  snapshot: createSnapshot([PYMES_MARGEN_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * ÁREA 5: DATOS PÚBLICOS (Datos Reales)
 * App: "Observatorio Comunal de Calidad del Aire (SINCA Chile / Censo H3)"
 * Módulo: "Indexador Hexagonal Uber H3"
 * Nodo: "Índice de Calor Urbano Normalizado"
 * ---------------------------------------------------------------------------------- */

export const PUBLIC_UHI_MANIFEST: NodeManifest = {
  id: "hub.datos.calor-urbano",
  version: "0.1.0",
  name: "Índice de Calor Urbano Normalizado",
  description:
    "Calcula el Urban Heat Island Index (0 a 1) combinando temperatura superficial LST, cobertura vegetal NDVI y densidad edificada para priorizar arborización.",
  category: "Datos Públicos / Clima Urbano",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      peso_lst: { type: "number", default: 0.6 },
      peso_ndvi: { type: "number", default: 0.4 },
    },
  },
  impl: {
    kind: "python",
    entry: "calculate_uhi_index",
    code: `def calculate_uhi_index(hexagons, params):
    w_lst = params.get("peso_lst", 0.6)
    w_ndvi = params.get("peso_ndvi", 0.4)
    for h in hexagons:
        lst = h.get("temp_superficial_c", 25.0)
        ndvi = h.get("ndvi", 0.2)
        uhi = (lst / 45.0) * w_lst + (1.0 - max(0.0, ndvi)) * w_ndvi
        h["indice_calor_urbano"] = round(min(1.0, max(0.0, uhi)), 3)
    return hexagons`,
  },
};

export const PUBLIC_H3_MANIFEST: NodeManifest = {
  id: "hub.datos.indexador-h3",
  version: "0.1.0",
  name: "Indexador Hexagonal Uber H3",
  description:
    "Módulo compuesto que mapea coordenadas geográficas (lat, lng) a identificadores de celdas hexagonales Uber H3 a resoluciones 7, 8 o 9.",
  category: "Datos Públicos / Geoespacial",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      resolucion: { type: "integer", enum: [7, 8, 9], default: 8 },
    },
  },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("h_in", "flow.input", { name: "in" }, { x: 0, y: 0 }),
        flowNode("h_index", "hub.datos.h3-geo-to-h3", { res: 8 }, { x: 260, y: 0 }, "Indexador H3"),
        flowNode("h_out", "flow.output", { name: "out" }, { x: 520, y: 0 }),
      ],
      edges: [flowEdge("h_in", "out", "h_index", "in"), flowEdge("h_index", "out", "h_out", "in")],
    },
  },
};

const PUBLIC_AIR_COLUMNS: Column[] = [
  { name: "estacion_sinca", type: "text" },
  { name: "comuna", type: "text" },
  { name: "h3_res8", type: "text" },
  { name: "mp25_ug_m3", type: "number" },
  { name: "mp10_ug_m3", type: "number" },
  { name: "indice_calor_urbano", type: "number" },
  { name: "categoria_ica", type: "text" },
  { name: "poblacion_vulnerable_censo", type: "number" },
];

const PUBLIC_SAMPLE_ROWS: unknown[][] = [
  ["Pudahuel SINCA", "Pudahuel", "884f00d897fffff", 78.4, 135.2, 0.84, "PREEMERGENCIA", 14850],
  ["Cerrillos SINCA", "Cerrillos", "884f00d895fffff", 54.1, 98.6, 0.76, "ALERTA", 11200],
  ["Las Condes SINCA", "Las Condes", "884f00d833fffff", 22.8, 45.0, 0.42, "BUENO", 8400],
  ["Temuco Las Encinas", "Temuco", "884f6869b3fffff", 112.5, 185.0, 0.65, "EMERGENCIA", 22400],
  ["Coyhaique I", "Coyhaique", "884e1b816bfffff", 145.0, 220.0, 0.58, "EMERGENCIA", 9800],
];

export const DRAFT_PUBLIC_APP: PublicationDraft = {
  slug: "observatorio-calidad-aire-sinca",
  kind: "flow",
  title: "Observatorio Comunal de Calidad del Aire (SINCA Chile / Censo H3)",
  description:
    "Para municipios y equipos de salud pública que quieren saber dónde el aire hace más daño. Toma los datos abiertos de calidad del aire del SINCA (MP2,5 y MP10 por hora), los agrega en hexágonos H3, los cruza con la población vulnerable del Censo y termina en un mapa de riesgo por barrio. Cambia la comuna o la fuente de datos para usarla en otra ciudad.",
  tags: ["datos-publicos", "sinca", "medio-ambiente", "h3", "chile", "salud-publica"],
  version: "1.0.0",
  flow: flowGraph(
    "Observatorio Comunal de Calidad del Aire",
    [
      flowNode(
        "feed_sinca",
        "core.source.csv",
        { path: "sinca_chile_estaciones.csv" },
        { x: 0, y: 0 },
        "Red SINCA Chile",
      ),
      flowNode(
        "indexador_h3",
        "hub.datos.indexador-h3",
        { resolucion: 8 },
        { x: 260, y: 0 },
        "Malla Uber H3",
      ),
      flowNode(
        "calor_urbano",
        "hub.datos.calor-urbano",
        {},
        { x: 520, y: 0 },
        "Índice Calor Urbano",
      ),
      flowNode(
        "mapa_riesgo",
        "core.view.bar",
        { x: "comuna", y: "mp25_ug_m3", title: "MP2.5 por Comuna" },
        { x: 780, y: 0 },
        "Exposición Comunal",
      ),
    ],
    [
      flowEdge("feed_sinca", "out", "indexador_h3", "in"),
      flowEdge("indexador_h3", "out", "calor_urbano", "in"),
      flowEdge("calor_urbano", "out", "mapa_riesgo", "in"),
    ],
  ),
  snapshot: createSnapshot(
    [SOURCE_CSV_MANIFEST, PUBLIC_H3_MANIFEST, PUBLIC_UHI_MANIFEST, VIEW_BAR_MANIFEST],
    {
      nodes: {
        feed_sinca: { state: "done" },
        indexador_h3: { state: "done" },
        calor_urbano: { state: "done" },
        mapa_riesgo: { state: "done" },
      },
      results: {
        calor_urbano: {
          out: { id: "res_public_air", rowCount: 5, schema: PUBLIC_AIR_COLUMNS },
        },
      },
      displays: { mapa_riesgo: [] },
      schemas: {
        calor_urbano: { out: PUBLIC_AIR_COLUMNS },
      },
      pages: {
        res_public_air: { columns: PUBLIC_AIR_COLUMNS, rows: PUBLIC_SAMPLE_ROWS, total: 5 },
      },
      profiles: {
        res_public_air: {
          columns: [
            { name: "estacion_sinca", type: "text", count: 5, nulls: 0, distinct: 5, bins: [] },
            { name: "comuna", type: "text", count: 5, nulls: 0, distinct: 5, bins: [] },
            { name: "h3_res8", type: "text", count: 5, nulls: 0, distinct: 5, bins: [] },
            {
              name: "mp25_ug_m3",
              type: "number",
              count: 5,
              nulls: 0,
              distinct: 5,
              min: "22.8",
              max: "145.0",
              mean: 82.56,
              bins: [1, 1, 1, 2],
            },
            {
              name: "mp10_ug_m3",
              type: "number",
              count: 5,
              nulls: 0,
              distinct: 5,
              min: "45.0",
              max: "220.0",
              mean: 136.76,
              bins: [1, 1, 1, 2],
            },
            {
              name: "indice_calor_urbano",
              type: "number",
              count: 5,
              nulls: 0,
              distinct: 5,
              min: "0.42",
              max: "0.84",
              mean: 0.65,
              bins: [1, 1, 1, 2],
            },
            { name: "categoria_ica", type: "text", count: 5, nulls: 0, distinct: 4, bins: [] },
            {
              name: "poblacion_vulnerable_censo",
              type: "number",
              count: 5,
              nulls: 0,
              distinct: 5,
              min: "8400",
              max: "22400",
              mean: 13330,
              bins: [2, 1, 1, 1],
            },
          ],
        },
      },
      views: {
        mapa_riesgo: { spec: { mark: "bar" }, rowCount: 5, sampled: false },
      },
      figures: {},
    },
  ),
};

export const DRAFT_PUBLIC_MODULE: PublicationDraft = {
  slug: "indexador-hexagonal-h3",
  kind: "node",
  title: "Indexador Hexagonal Uber H3",
  description:
    "Para cualquier flujo con coordenadas. Recibe puntos con latitud y longitud y les asigna su hexágono H3 en resolución 7, 8 u 9, para agregar y comparar zonas sin cargar mapas pesados. Elige la resolución según el tamaño de barrio que te interesa.",
  tags: ["datos-publicos", "geoespacial", "h3", "uber-h3", "gis"],
  version: "0.1.0",
  flow: flowGraph(
    "Indexador H3 Demo",
    [flowNode("n1", "hub.datos.indexador-h3", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: PUBLIC_H3_MANIFEST,
  snapshot: createSnapshot([PUBLIC_H3_MANIFEST]),
};

export const DRAFT_PUBLIC_NODE: PublicationDraft = {
  slug: "indice-calor-urbano-normalizado",
  kind: "node",
  title: "Índice de Calor Urbano Normalizado",
  description:
    "Para equipos de urbanismo y medio ambiente. Recibe temperatura de superficie por zona y calcula un índice de isla de calor normalizado, para ver qué barrios se calientan más que el resto de la ciudad y dónde falta arbolado.",
  tags: ["datos-publicos", "clima-urbano", "uhi", "isla-de-calor", "gis"],
  version: "0.1.0",
  flow: flowGraph(
    "Índice de Calor Urbano Demo",
    [flowNode("n1", "hub.datos.calor-urbano", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: PUBLIC_UHI_MANIFEST,
  snapshot: createSnapshot([PUBLIC_UHI_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * ÁREA 6: FINANZAS
 * App: "Centinela de Flujo de Caja y Cobranza Preventiva"
 * Módulo: "Scoring de Cumplimiento de Clientes"
 * Nodo: "Calculador de Interés Penal Diario Legal"
 * ---------------------------------------------------------------------------------- */

export const FINANCE_INTERES_MANIFEST: NodeManifest = {
  id: "hub.finanzas.interes-penal",
  version: "0.1.0",
  name: "Calculador de Interés Penal Diario Legal",
  description:
    "Calcula intereses moratorios diarios legales bajo Ley N° 18.010 y Ley 21.131 (Pago a 30 días en Chile), aplicando la tasa máxima convencional diaria.",
  category: "Finanzas / Legal",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      tasa_anual_pct: { type: "number", default: 28.5 },
      columna_monto: { type: "string", default: "monto_insoluto" },
      columna_dias_mora: { type: "string", default: "dias_atraso" },
    },
  },
  impl: {
    kind: "python",
    entry: "calcular_interes_mora",
    code: `def calcular_interes_mora(facturas, params):
    tasa_diaria = (params.get("tasa_anual_pct", 28.5) / 100.0) / 360.0
    for f in facturas:
        monto = f.get("monto_insoluto", 0.0)
        dias = max(0, f.get("dias_atraso", 0))
        interes = monto * tasa_diaria * dias
        f["interes_penal_legal"] = round(interes, 0)
        f["total_exigible"] = round(monto + interes, 0)
    return facturas`,
  },
};

export const FINANCE_SCORING_MANIFEST: NodeManifest = {
  id: "hub.finanzas.scoring-cumplimiento",
  version: "0.1.0",
  name: "Scoring de Cumplimiento de Clientes",
  description:
    "Módulo compuesto que clasifica pagadores según Days Sales Outstanding (DSO) y retraso histórico: Grado A (Puntual), B (Alerta Preventiva), C (Gestión Prejudicial).",
  category: "Finanzas / Riesgo",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      dias_tolerancia_b: { type: "integer", default: 15 },
      dias_critico_c: { type: "integer", default: 45 },
    },
  },
  impl: {
    kind: "flow",
    graph: {
      nodes: [
        flowNode("s_in", "flow.input", { name: "in" }, { x: 0, y: 0 }),
        flowNode("s_score", "hub.finanzas.dso-scoring", {}, { x: 260, y: 0 }, "Algoritmo DSO"),
        flowNode("s_out", "flow.output", { name: "out" }, { x: 520, y: 0 }),
      ],
      edges: [flowEdge("s_in", "out", "s_score", "in"), flowEdge("s_score", "out", "s_out", "in")],
    },
  },
};

const FINANCE_FACTURAS_COLUMNS: Column[] = [
  { name: "rut_cliente", type: "text" },
  { name: "razon_social", type: "text" },
  { name: "folio_dte", type: "number" },
  { name: "monto_insoluto", type: "number" },
  { name: "dias_atraso", type: "number" },
  { name: "score_cumplimiento", type: "text" },
  { name: "interes_penal_legal", type: "number" },
  { name: "total_exigible", type: "number" },
];

const FINANCE_SAMPLE_ROWS: unknown[][] = [
  [
    "76.842.110-3",
    "Constructora del Valle SpA",
    1840,
    12500000,
    42,
    "C_RIESGO_CRITICO",
    415625,
    12915625,
  ],
  [
    "77.291.450-K",
    "Distribuidora Norte Sur Ltda",
    2102,
    4800000,
    12,
    "B_ALERTA_TEMPRANA",
    45600,
    4845600,
  ],
  ["96.882.340-1", "Servicios Mineros Atacama S.A.", 3045, 28000000, 0, "A_PUNTUAL", 0, 28000000],
  [
    "76.104.920-8",
    "Agroindustrial Los Andes Ltda",
    1950,
    7200000,
    68,
    "C_RIESGO_CRITICO",
    387600,
    7587600,
  ],
];

export const DRAFT_FINANCE_APP: PublicationDraft = {
  slug: "centinela-flujo-caja",
  kind: "flow",
  title: "Centinela de Flujo de Caja y Cobranza Preventiva",
  description:
    "Para pymes que facturan electrónicamente y sufren por pagos atrasados. Toma las facturas emitidas, clasifica a los clientes según cómo pagan, calcula el interés por mora según la Ley 18.010 y la ley de Pago a 30 Días, y proyecta la caja de los próximos 90 días. Cambia la fuente por la exportación de facturas de tu empresa.",
  tags: ["finanzas", "flujo-de-caja", "cobranza", "facturacion", "scoring-b2b"],
  version: "1.0.0",
  flow: flowGraph(
    "Centinela de Flujo de Caja y Cobranza Preventiva",
    [
      flowNode(
        "facturas_sii",
        "core.source.csv",
        { path: "facturas_emitidas_dte.csv" },
        { x: 0, y: 0 },
        "DTEs Emitidos",
      ),
      flowNode(
        "scoring_cartera",
        "hub.finanzas.scoring-cumplimiento",
        {},
        { x: 260, y: 0 },
        "Scoring de Cumplimiento",
      ),
      flowNode(
        "liquidacion_intereses",
        "hub.finanzas.interes-penal",
        { tasa_anual_pct: 28.5 },
        { x: 520, y: 0 },
        "Intereses Penales",
      ),
      flowNode(
        "curva_liquidez",
        "core.view.bar",
        { x: "razon_social", y: "total_exigible", title: "Recuperación por Cliente" },
        { x: 780, y: 0 },
        "Gráfico Exigible",
      ),
    ],
    [
      flowEdge("facturas_sii", "out", "scoring_cartera", "in"),
      flowEdge("scoring_cartera", "out", "liquidacion_intereses", "in"),
      flowEdge("liquidacion_intereses", "out", "curva_liquidez", "in"),
    ],
  ),
  snapshot: createSnapshot(
    [SOURCE_CSV_MANIFEST, FINANCE_SCORING_MANIFEST, FINANCE_INTERES_MANIFEST, VIEW_BAR_MANIFEST],
    {
      nodes: {
        facturas_sii: { state: "done" },
        scoring_cartera: { state: "done" },
        liquidacion_intereses: { state: "done" },
        curva_liquidez: { state: "done" },
      },
      results: {
        liquidacion_intereses: {
          out: { id: "res_fin_dte", rowCount: 4, schema: FINANCE_FACTURAS_COLUMNS },
        },
      },
      displays: { curva_liquidez: [] },
      schemas: {
        liquidacion_intereses: { out: FINANCE_FACTURAS_COLUMNS },
      },
      pages: {
        res_fin_dte: { columns: FINANCE_FACTURAS_COLUMNS, rows: FINANCE_SAMPLE_ROWS, total: 4 },
      },
      profiles: {
        res_fin_dte: {
          columns: [
            { name: "rut_cliente", type: "text", count: 4, nulls: 0, distinct: 4, bins: [] },
            { name: "razon_social", type: "text", count: 4, nulls: 0, distinct: 4, bins: [] },
            {
              name: "folio_dte",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "1840",
              max: "3045",
              mean: 2234,
              bins: [1, 1, 1, 1],
            },
            {
              name: "monto_insoluto",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "4800000",
              max: "28000000",
              mean: 13125000,
              bins: [2, 1, 0, 1],
            },
            {
              name: "dias_atraso",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "0",
              max: "68",
              mean: 30.5,
              bins: [1, 1, 1, 1],
            },
            { name: "score_cumplimiento", type: "text", count: 4, nulls: 0, distinct: 3, bins: [] },
            {
              name: "interes_penal_legal",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "0",
              max: "415625",
              mean: 212206,
              bins: [1, 1, 1, 1],
            },
            {
              name: "total_exigible",
              type: "number",
              count: 4,
              nulls: 0,
              distinct: 4,
              min: "4845600",
              max: "28000000",
              mean: 13337206,
              bins: [2, 1, 0, 1],
            },
          ],
        },
      },
      views: {
        curva_liquidez: { spec: { mark: "bar" }, rowCount: 4, sampled: false },
      },
      figures: {},
    },
  ),
};

export const DRAFT_FINANCE_MODULE: PublicationDraft = {
  slug: "scoring-cumplimiento-clientes",
  kind: "node",
  title: "Scoring de Cumplimiento de Clientes",
  description:
    "Para empresas que venden con crédito a otras empresas. Recibe el historial de pagos y entrega un puntaje por cliente según días promedio de cobro (DSO) y días de mora acumulados, para decidir a quién seguir dando crédito.",
  tags: ["finanzas", "credito", "scoring", "riesgo", "clientes"],
  version: "0.1.0",
  flow: flowGraph(
    "Scoring de Cumplimiento Demo",
    [flowNode("n1", "hub.finanzas.scoring-cumplimiento", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: FINANCE_SCORING_MANIFEST,
  snapshot: createSnapshot([FINANCE_SCORING_MANIFEST]),
};

export const DRAFT_FINANCE_NODE: PublicationDraft = {
  slug: "calculador-interes-penal-legal",
  kind: "node",
  title: "Calculador de Interés Penal Diario Legal",
  description:
    "Para administración y cobranza en Chile. Recibe el monto, la fecha de vencimiento y la fecha de pago, y calcula el interés por mora con la tasa de interés corriente de la Ley 18.010. Actualiza la tasa cada mes con la que publica la CMF.",
  tags: ["finanzas", "legal", "interes-moratorio", "ley-18010", "chile"],
  version: "0.1.0",
  flow: flowGraph(
    "Interés Penal Legal Demo",
    [flowNode("n1", "hub.finanzas.interes-penal", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: FINANCE_INTERES_MANIFEST,
  snapshot: createSnapshot([FINANCE_INTERES_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * DISCIPLINAS ADICIONALES (Solicitadas por el equipo de coordinación)
 * Energía, Ingeniería Civil, Tiendas de Abarrotes, Dentistas, Veterinarias, Ferreterías
 * ---------------------------------------------------------------------------------- */

export const SOLAR_APP_DRAFT: PublicationDraft = {
  slug: "predictor-generacion-solar",
  kind: "flow",
  title: "Predictor de Generación Fotovoltaica y Degradación de Paneles",
  description:
    "Para operadores y desarrolladores de plantas fotovoltaicas. Toma la radiación medida por el piranómetro, calcula la irradiancia sobre el plano inclinado de los paneles (GTI), descuenta las pérdidas por suciedad y termina en un gráfico de generación diaria esperada en MWh. Ajusta la inclinación y la tasa de suciedad a tu planta.",
  tags: ["energia", "solar", "fotovoltaica", "atacama", "irradiancia"],
  version: "1.0.0",
  flow: flowGraph(
    "Predictor Solar Fotovoltaico",
    [
      flowNode(
        "datos_piranometro",
        "core.source.csv",
        { path: "atacama_sol.csv" },
        { x: 0, y: 0 },
        "Piranómetro",
      ),
      flowNode(
        "calc_gti",
        "hub.energia.gti",
        { tilt_deg: 22 },
        { x: 260, y: 0 },
        "Irradiancia GTI",
      ),
      flowNode(
        "grafico_mwh",
        "core.view.bar",
        { x: "hora", y: "mwh_producidos" },
        { x: 520, y: 0 },
        "Curva de Generación",
      ),
    ],
    [
      flowEdge("datos_piranometro", "out", "calc_gti", "in"),
      flowEdge("calc_gti", "out", "grafico_mwh", "in"),
    ],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const CIVIL_APP_DRAFT: PublicationDraft = {
  slug: "espectro-diseno-sismico-nch433",
  kind: "flow",
  title: "Espectro de Diseño Sísmico NCh433 & Verificación de Deriva",
  description:
    "Para ingenieros estructurales en Chile. A partir de la zona sísmica, el tipo de suelo y la categoría del edificio, genera el espectro elástico de diseño y calcula el corte basal mínimo según la NCh433 Of.96 Mod. 2009, y lo muestra en un gráfico. Es una ayuda de cálculo: la memoria estructural la firma el profesional responsable.",
  tags: ["ingenieria-civil", "sismica", "nch433", "estructuras", "chile"],
  version: "1.0.0",
  flow: flowGraph(
    "Espectro Sísmico NCh433",
    [
      flowNode(
        "parametros_suelo",
        "core.source.csv",
        { path: "suelo_zona.csv" },
        { x: 0, y: 0 },
        "Suelo Tipo III / Zona 3",
      ),
      flowNode(
        "calculo_corte",
        "hub.estructuras.corte-basal",
        { r_factor: 7 },
        { x: 260, y: 0 },
        "Cortante Basal",
      ),
      flowNode(
        "vista_espectro",
        "core.view.bar",
        { x: "periodo_t", y: "sa_aceleracion" },
        { x: 520, y: 0 },
        "Espectro Sa/g",
      ),
    ],
    [
      flowEdge("parametros_suelo", "out", "calculo_corte", "in"),
      flowEdge("calculo_corte", "out", "vista_espectro", "in"),
    ],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const DON_PEPE_APP_DRAFT: PublicationDraft = {
  slug: "cuadre-caja-equilibrio-abarrotes",
  kind: "flow",
  title: "Cuadre de Caja Diario y Punto de Equilibrio de Abarrotes",
  description:
    "Para el almacén de barrio que cierra la caja a mano. Junta las ventas del día en efectivo, tarjeta y fiado, y calcula cuánto hay que vender para cubrir arriendo, luz y demás costos fijos. Cambia los costos fijos por los de tu local.",
  tags: ["abarrotes", "caja-diaria", "punto-equilibrio", "almacen"],
  version: "1.0.0",
  flow: flowGraph(
    "Cuadre de Caja Abarrotes",
    [
      flowNode(
        "caja_diaria",
        "core.source.csv",
        { path: "ventas_pos.csv" },
        { x: 0, y: 0 },
        "Ventas Pos y Efectivo",
      ),
      flowNode(
        "resumen_caja",
        "core.view.bar",
        { x: "metodo_pago", y: "total" },
        { x: 260, y: 0 },
        "Cuadre",
      ),
    ],
    [flowEdge("caja_diaria", "out", "resumen_caja", "in")],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const DENTAL_APP_DRAFT: PublicationDraft = {
  slug: "control-insumos-box-dental",
  kind: "flow",
  title: "Control de Insumos Clínicos y Trazabilidad de Esterilización",
  description:
    "Para clínicas dentales que quieren dejar de perder insumos vencidos. Lleva el stock de resinas, anestubos y arcos de ortodoncia, filtra los que vencen pronto y registra los lotes que pasaron por el autoclave. Cambia la lista de insumos por la de tu clínica.",
  tags: ["odontologia", "insumos-dentales", "esterilizacion", "clinica"],
  version: "1.0.0",
  flow: flowGraph(
    "Control Box Dental",
    [
      flowNode(
        "insumos_box",
        "core.source.csv",
        { path: "inventario_dental.csv" },
        { x: 0, y: 0 },
        "Stock Box",
      ),
      flowNode(
        "filtro_caducidad",
        "core.filter",
        { column: "dias_para_vencer", op: "<=", value: "30" },
        { x: 260, y: 0 },
        "Próximos a Vencer",
      ),
    ],
    [flowEdge("insumos_box", "out", "filtro_caducidad", "in")],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST]),
};

export const GANADO_APP_DRAFT: PublicationDraft = {
  slug: "control-rebao-curva-lactancia",
  kind: "flow",
  title: "Monitoreo de Rebaño Lechero y Curvas de Lactancia",
  description:
    "Para lecherías del sur de Chile. Toma el control lechero diario por vaca, proyecta su curva de lactancia (modelo de Wood) y avisa cuando la producción cae de golpe, una señal temprana de mastitis subclínica. Ajusta el umbral de caída a tu rebaño.",
  tags: ["veterinaria", "ganaderia", "leche", "bovinos", "los-lagos"],
  version: "1.0.0",
  flow: flowGraph(
    "Curva de Lactancia Lechera",
    [
      flowNode(
        "control_lechero",
        "core.source.csv",
        { path: "sala_ordena.csv" },
        { x: 0, y: 0 },
        "Sala de Ordeña",
      ),
      flowNode(
        "alerta_mastitis",
        "core.filter",
        { column: "celulas_somaticas", op: ">", value: "250000" },
        { x: 260, y: 0 },
        "Alerta Mastitis",
      ),
    ],
    [flowEdge("control_lechero", "out", "alerta_mastitis", "in")],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST]),
};

export const FERRETERIA_APP_DRAFT: PublicationDraft = {
  slug: "matriz-abc-inventario-ferretero",
  kind: "flow",
  title: "Matriz ABC y Reposición de Inventario Ferretero",
  description:
    "Para ferreterías con miles de productos. Clasifica cada artículo en A, B o C según cuánto dinero mueve y cuánto rota, filtra los clase A y prepara la reposición quincenal. Cambia la frecuencia de reposición según tus proveedores.",
  tags: ["ferreteria", "inventario-abc", "materiales", "sku"],
  version: "1.0.0",
  flow: flowGraph(
    "Matriz ABC Ferretera",
    [
      flowNode(
        "articulos_sku",
        "core.source.csv",
        { path: "catalogo_ferretero.csv" },
        { x: 0, y: 0 },
        "Catálogo 8000 SKUs",
      ),
      flowNode(
        "filtro_clase_a",
        "core.filter",
        { column: "clase_abc", op: "=", value: "A" },
        { x: 260, y: 0 },
        "Artículos Clase A",
      ),
    ],
    [flowEdge("articulos_sku", "out", "filtro_clase_a", "in")],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * 6 CASOS ESPECÍFICOS DEL HILO Y DEL FEED (VOCABULARIO-HILO.md)
 * Ordenados por cuánto se han adaptado:
 * 1. Controles crónicos atrasados (Salud, flujo) - 'Se trenza' (2 adaptaciones) - 'Probada con 214 fichas'
 * 2. Limpieza del censo comunal (Datos públicos, flujo) - 'Se empalma' (4 adaptaciones) - 'Reparada y probada de nuevo'
 * 3. Asistencia escolar por curso (Educación, flujo) - 'Se trenza' (3 adaptaciones) - 'Probada en 6 colegios'
 * 4. Churn mensual de suscriptores (Ventas, flujo) - 'Se enreda' (1 adaptación) - 'Propuesta del agente sin revisar'
 * 5. Quiebres de stock en bodega (Ventas, flujo) - 'Se triza' (1 adaptación) - 'Falló con los datos de otra bodega'
 * 6. Normalización de qPCR (Laboratorio, nodo) - Sin adaptar - 'Sin probar fuera de su laboratorio'
 * ---------------------------------------------------------------------------------- */

export const DRAFT_HILO_CRONICOS: PublicationDraft = {
  slug: "controles-cronicos-atrasados",
  kind: "flow",
  title: "Controles crónicos atrasados",
  description:
    "Para equipos de CESFAM que quieren recuperar a pacientes crónicos que dejaron de venir. Cruza los retiros de medicamentos en farmacia con la agenda médica, encuentra a los pacientes con diabetes o hipertensión que llevan más de 6 meses sin control y entrega la lista para contactarlos. Se probó en el CESFAM Padre Las Casas con 214 fichas.",
  tags: ["salud", "cesfam", "cronicos", "se-trenza", "probada-con-214-fichas"],
  version: "1.2.0",
  flow: flowGraph(
    "Controles Crónicos Atrasados",
    [
      flowNode(
        "farmacia_retiros",
        "core.source.csv",
        { path: "farmacia_padrelascasas.csv" },
        { x: 0, y: 0 },
        "Farmacia CESFAM",
      ),
      flowNode(
        "agenda_medica",
        "core.source.csv",
        { path: "agenda_medica.csv" },
        { x: 0, y: 180 },
        "Agenda Médica",
      ),
      flowNode(
        "filtro_inasistentes",
        "core.filter",
        { column: "dias_sin_control", op: ">", value: "180" },
        { x: 260, y: 90 },
        "Más de 6 Meses",
      ),
      flowNode(
        "alerta_pacientes",
        "core.view.bar",
        { x: "sector_cesfam", y: "total_pacientes" },
        { x: 520, y: 90 },
        "Pacientes por Sector",
      ),
    ],
    [
      flowEdge("farmacia_retiros", "out", "filtro_inasistentes", "in"),
      flowEdge("filtro_inasistentes", "out", "alerta_pacientes", "in"),
    ],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const DRAFT_HILO_CENSO: PublicationDraft = {
  slug: "limpieza-censo-comunal",
  kind: "flow",
  title: "Limpieza del censo comunal",
  description:
    "Para municipios que trabajan con direcciones desordenadas. Normaliza direcciones irregulares, incluidas tomas de terreno y sectores rurales, y las ubica en la grilla censal. Nació en Coquimbo; cuando otros municipios la usaron y falló con direcciones rurales, un geógrafo de la comunidad la reparó y hoy corre validada.",
  tags: ["datos-publicos", "censo", "coquimbo", "se-empalma", "reparada-y-probada-de-nuevo"],
  version: "2.0.1",
  flow: flowGraph(
    "Limpieza del Censo Comunal",
    [
      flowNode(
        "direcciones_brutas",
        "core.source.csv",
        { path: "catastro_coquimbo.csv" },
        { x: 0, y: 0 },
        "Catastro Municipal",
      ),
      flowNode(
        "normalizador_rural",
        "core.filter",
        { column: "tipo_calle", op: "!=", value: "SIN_NUMERO" },
        { x: 260, y: 0 },
        "Empalme Rural",
      ),
      flowNode(
        "grilla_censal",
        "core.view.bar",
        { x: "distrito_censal", y: "viviendas_validadas" },
        { x: 520, y: 0 },
        "Grilla Censal",
      ),
    ],
    [
      flowEdge("direcciones_brutas", "out", "normalizador_rural", "in"),
      flowEdge("normalizador_rural", "out", "grilla_censal", "in"),
    ],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const DRAFT_HILO_ASISTENCIA: PublicationDraft = {
  slug: "asistencia-escolar-curso",
  kind: "flow",
  title: "Asistencia escolar por curso",
  description:
    "Para colegios que quieren detectar el ausentismo crónico antes de que sea deserción. Toma el libro de asistencia, cruza las ausencias con días de lluvia y el aislamiento de cada estudiante, y avisa qué cursos y alumnos necesitan apoyo psicosocial. Se probó en 6 colegios de Ancud, en Chiloé.",
  tags: ["educacion", "asistencia", "chiloe", "se-trenza", "probada-en-6-colegios"],
  version: "1.3.0",
  flow: flowGraph(
    "Asistencia Escolar por Curso",
    [
      flowNode(
        "libro_asistencia",
        "core.source.csv",
        { path: "asistencia_ancud.csv" },
        { x: 0, y: 0 },
        "Libro Digital",
      ),
      flowNode(
        "alerta_ausentismo",
        "core.filter",
        { column: "inasistencia_pct", op: ">=", value: "15" },
        { x: 260, y: 0 },
        "Ausentismo Crónico",
      ),
      flowNode(
        "vista_cursos",
        "core.view.bar",
        { x: "curso", y: "alumnos_en_riesgo" },
        { x: 520, y: 0 },
        "Riesgo por Curso",
      ),
    ],
    [
      flowEdge("libro_asistencia", "out", "alerta_ausentismo", "in"),
      flowEdge("alerta_ausentismo", "out", "vista_cursos", "in"),
    ],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const DRAFT_HILO_CHURN: PublicationDraft = {
  slug: "churn-mensual-suscriptores",
  kind: "flow",
  title: "Churn mensual de suscriptores",
  description:
    "Para negocios con suscripciones que quieren entender por qué se van sus clientes. Toma las suscripciones activas, filtra las bajas del mes y las muestra por cohorte. Nació en Valparaíso para clientes personas; una adaptación para empresas chocó con esa regla y el agente propuso una solución que todavía espera revisión humana.",
  tags: ["ventas", "churn", "saas", "se-enreda", "propuesta-agente-sin-revisar"],
  version: "1.1.0-conflict",
  flow: flowGraph(
    "Churn Mensual de Suscriptores",
    [
      flowNode(
        "suscripciones_activas",
        "core.source.csv",
        { path: "suscripciones.csv" },
        { x: 0, y: 0 },
        "Base Suscriptores",
      ),
      flowNode(
        "filtro_bajas",
        "core.filter",
        { column: "dias_sin_login", op: ">=", value: "45" },
        { x: 260, y: 0 },
        "Regla en Conflicto",
      ),
      flowNode(
        "vista_cohortes",
        "core.view.bar",
        { x: "cohorte", y: "tasa_churn" },
        { x: 520, y: 0 },
        "Cohortes",
      ),
    ],
    [
      flowEdge("suscripciones_activas", "out", "filtro_bajas", "in"),
      flowEdge("filtro_bajas", "out", "vista_cohortes", "in"),
    ],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const DRAFT_HILO_BODEGA: PublicationDraft = {
  slug: "quiebres-stock-bodega",
  kind: "flow",
  title: "Quiebres de stock en bodega",
  description:
    "Para bodegas que quieren enterarse de los quiebres de stock antes que el cliente. Revisa el inventario, detecta los productos por debajo del mínimo y avisa a compras. Se diseñó para abarrotes secos en Osorno; al probarla en una bodega de lácteos falló, porque no considera vencimientos cortos. Espera que alguien de la comunidad la adapte.",
  tags: ["ventas", "bodega", "mermas", "se-triza", "fallo-datos-otra-bodega"],
  version: "1.0.1-broken",
  flow: flowGraph(
    "Quiebres de Stock en Bodega",
    [
      flowNode(
        "inventario_bodega",
        "core.source.csv",
        { path: "bodega_osorno.csv" },
        { x: 0, y: 0 },
        "Stock Bodega",
      ),
      flowNode(
        "filtro_quiebre",
        "core.filter",
        { column: "dias_stock", op: "<=", value: "3" },
        { x: 260, y: 0 },
        "Fórmula Triza",
      ),
      flowNode(
        "alerta_compras",
        "core.view.bar",
        { x: "familia_producto", y: "quiebres" },
        { x: 520, y: 0 },
        "Quiebres",
      ),
    ],
    [
      flowEdge("inventario_bodega", "out", "filtro_quiebre", "in"),
      flowEdge("filtro_quiebre", "out", "alerta_compras", "in"),
    ],
  ),
  snapshot: createSnapshot([SOURCE_CSV_MANIFEST, FILTER_MANIFEST, VIEW_BAR_MANIFEST]),
};

export const LAB_QPCR_MANIFEST: NodeManifest = {
  id: "hub.laboratorio.normalizacion-qpcr",
  version: "0.1.0",
  name: "Normalización de qPCR",
  description:
    "Nodo atómico que normaliza ciclos umbral (Cq) contra genes de referencia constitutivos (GAPDH/Actina) mediante método delta-delta-Cq de Livak.",
  category: "Laboratorio / Biología Molecular",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      gen_referencia: { type: "string", default: "GAPDH" },
      columna_cq: { type: "string", default: "cq_valor" },
    },
    required: ["gen_referencia", "columna_cq"],
  },
  impl: {
    kind: "python",
    entry: "normalizar_qpcr",
    code: `def normalizar_qpcr(muestras, params):
    ref_gene = params.get("gen_referencia", "GAPDH")
    for m in muestras:
        cq = m.get("cq_valor", 0.0)
        ref_cq = m.get("cq_referencia", 20.0)
        delta_cq = cq - ref_cq
        m["delta_cq"] = round(delta_cq, 2)
        m["expresion_relativa"] = round(2 ** (-delta_cq), 4)
    return muestras`,
  },
};

export const DRAFT_HILO_QPCR: PublicationDraft = {
  slug: "normalizacion-qpcr",
  kind: "node",
  title: "Normalización de qPCR",
  description:
    "Para laboratorios de biología molecular. Recibe los ciclos umbral (Cq) de una placa de qPCR y los normaliza contra genes de referencia como GAPDH o actina, para comparar expresión entre muestras. Viene de la Universidad de Concepción y todavía no se ha probado fuera de ese laboratorio: es una buena primera pieza para adaptar.",
  tags: [
    "laboratorio",
    "qpcr",
    "biologia-molecular",
    "sin-adaptar",
    "sin-probar-fuera-laboratorio",
  ],
  version: "0.1.0",
  flow: flowGraph(
    "Normalización de qPCR Demo",
    [flowNode("n1", "hub.laboratorio.normalizacion-qpcr", {}, { x: 0, y: 0 })],
    [],
  ),
  manifest: LAB_QPCR_MANIFEST,
  snapshot: createSnapshot([LAB_QPCR_MANIFEST]),
};

export const HILO_CASES_CATALOG: ReadonlyArray<HiloCaseMetadata> = [
  {
    id: "case-cronicos",
    slug: DRAFT_HILO_CRONICOS.slug,
    title: DRAFT_HILO_CRONICOS.title,
    category: "Salud",
    kind: "flow",
    authorName: CAMILA_CESFAM_PROFILE.displayName,
    authorHandle: CAMILA_CESFAM_PROFILE.handle,
    authorTerritory: "CESFAM Padre Las Casas (Araucanía, Chile)",
    threadState: "Se trenza",
    adaptationsCount: 2,
    validationBadge: "Probada con 214 fichas",
    description: DRAFT_HILO_CRONICOS.description,
  },
  {
    id: "case-censo",
    slug: DRAFT_HILO_CENSO.slug,
    title: DRAFT_HILO_CENSO.title,
    category: "Datos Públicos",
    kind: "flow",
    authorName: ANA_COQUIMBO_PROFILE.displayName,
    authorHandle: ANA_COQUIMBO_PROFILE.handle,
    authorTerritory: "Municipalidad de Coquimbo (Chile)",
    threadState: "Se empalma",
    adaptationsCount: 4,
    validationBadge: "Reparada y probada de nuevo",
    description: DRAFT_HILO_CENSO.description,
  },
  {
    id: "case-asistencia",
    slug: DRAFT_HILO_ASISTENCIA.slug,
    title: DRAFT_HILO_ASISTENCIA.title,
    category: "Educación",
    kind: "flow",
    authorName: RODRIGO_ANCUD_PROFILE.displayName,
    authorHandle: RODRIGO_ANCUD_PROFILE.handle,
    authorTerritory: "Liceo de Ancud (Chiloé, Chile)",
    threadState: "Se trenza",
    adaptationsCount: 3,
    validationBadge: "Probada en 6 colegios",
    description: DRAFT_HILO_ASISTENCIA.description,
  },
  {
    id: "case-churn",
    slug: DRAFT_HILO_CHURN.slug,
    title: DRAFT_HILO_CHURN.title,
    category: "Ventas",
    kind: "flow",
    authorName: TOMAS_IBARRA_PROFILE.displayName,
    authorHandle: TOMAS_IBARRA_PROFILE.handle,
    authorTerritory: "Valparaíso (Chile)",
    threadState: "Se enreda",
    adaptationsCount: 1,
    validationBadge: "Propuesta del agente sin revisar",
    description: DRAFT_HILO_CHURN.description,
  },
  {
    id: "case-bodega",
    slug: DRAFT_HILO_BODEGA.slug,
    title: DRAFT_HILO_BODEGA.title,
    category: "Ventas",
    kind: "flow",
    authorName: PAULA_OSORNO_PROFILE.displayName,
    authorHandle: PAULA_OSORNO_PROFILE.handle,
    authorTerritory: "Almacén cooperativo de Osorno (Chile)",
    threadState: "Se triza",
    adaptationsCount: 1,
    validationBadge: "Falló con los datos de otra bodega",
    description: DRAFT_HILO_BODEGA.description,
  },
  {
    id: "case-qpcr",
    slug: DRAFT_HILO_QPCR.slug,
    title: DRAFT_HILO_QPCR.title,
    category: "Laboratorio",
    kind: "node",
    authorName: LUCIA_QPCR_PROFILE.displayName,
    authorHandle: LUCIA_QPCR_PROFILE.handle,
    authorTerritory: "Universidad de Concepción (Chile)",
    threadState: "Sin adaptar",
    adaptationsCount: 0,
    validationBadge: "Sin probar fuera de su laboratorio",
    description: DRAFT_HILO_QPCR.description,
  },
];

/* ----------------------------------------------------------------------------------
 * Meta-Arquetipos Globales (docs/casos-de-uso/13-arquetipos-globales.md)
 * ---------------------------------------------------------------------------------- */

export const GLOBAL_HEATMAP_MANIFEST: NodeManifest = {
  id: "hub.global.arborizacion-urbana",
  version: "0.1.0",
  name: "Mitigación de Islas de Calor y Corredores Verdes",
  category: "Urbanismo Global",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      umbral_calor_critico: { type: "number", default: 35.0 },
      peso_vulnerabilidad: { type: "number", default: 0.4 },
    },
  },
  impl: {
    kind: "sql",
    template:
      "SELECT h3_index, lst_temp, ndvi_veg, (0.4 * lst_temp + 0.4 * (1.0 - ndvi_veg) + 0.2 * pop_vulnerable) as urgencia_termica FROM {{in}} ORDER BY urgencia_termica DESC;",
  },
};

export const GLOBAL_DRILLING_MANIFEST: NodeManifest = {
  id: "hub.global.sondajes-optimos",
  version: "0.1.0",
  name: "Optimización de Sondajes y Reducción de Incertidumbre",
  category: "Geología Global",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      costo_metro_usd: { type: "number", default: 250.0 },
      metodo_estimacion: { type: "string", default: "kriging_ordinario" },
    },
  },
  impl: {
    kind: "python",
    entry: "run_kriging_evoi",
    code: "def run_kriging_evoi(df, **params):\n    return df\n",
  },
};

export const GLOBAL_BIOMECHANICS_MANIFEST: NodeManifest = {
  id: "hub.global.cinematica-deportiva",
  version: "0.1.0",
  name: "Análisis Biomecánico y Cinemática Deportiva por Video",
  category: "Deporte Global",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      longitud_pista_m: { type: "number", default: 400.0 },
      carril_referencia: { type: "integer", default: 1 },
    },
  },
  impl: {
    kind: "python",
    entry: "track_and_homography",
    code: "def track_and_homography(df, **params):\n    return df\n",
  },
};

export const GLOBAL_RESOURCES_MANIFEST: NodeManifest = {
  id: "hub.global.estres-recursos-megaproyectos",
  version: "0.1.0",
  name: "Capacidad de Carga y Estrés Hídrico-Energético",
  category: "Medio Ambiente Global",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      limite_estres_pct: { type: "number", default: 20.0 },
    },
  },
  impl: {
    kind: "sql",
    template:
      "SELECT proyecto_id, mw_demand, liters_sec_cooling, (liters_sec_cooling / cuenca_recharge_sec) * 100.0 as stress_pct FROM {{in}};",
  },
};

export const GLOBAL_DRAINAGE_MANIFEST: NodeManifest = {
  id: "hub.global.drenaje-inundaciones",
  version: "0.1.0",
  name: "Gestión Preventiva de Drenaje e Inundaciones Pluviales",
  category: "Hidrología Global",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      umbral_alerta_mm_hora: { type: "number", default: 20.0 },
    },
  },
  impl: {
    kind: "sql",
    template:
      "SELECT sumidero_id, direccion, pendiente_deg, mm_lluvia_proyectada, CASE WHEN mm_lluvia_proyectada > 20.0 THEN 'DESPACHAR_CUADRILLA' ELSE 'NORMAL' END as accion FROM {{in}};",
  },
};

export const GLOBAL_AI_AUDIT_MANIFEST: NodeManifest = {
  id: "hub.global.auditoria-agentes-ia",
  version: "0.1.0",
  name: "Sandbox de Confiabilidad y Auditoría Forense de Agentes",
  category: "Seguridad IA Global",
  inputs: [{ id: "in", type: "table" }],
  outputs: [{ id: "out", type: "table" }],
  params: {
    type: "object",
    properties: {
      nivel_aislamiento: { type: "string", default: "estricto_read_only" },
    },
  },
  impl: {
    kind: "python",
    entry: "evaluate_agent_sandbox",
    code: "def evaluate_agent_sandbox(df, **params):\n    return df\n",
  },
};

export const DRAFT_GLOBAL_HEATMAP: PublicationDraft = {
  slug: "arborizacion-global",
  kind: "flow",
  title: "Mitigación de Islas de Calor y Corredores Verdes Urbanos",
  description:
    "Para ciudades que quieren plantar árboles donde más se necesitan. Cruza imágenes satelitales abiertas (Landsat o Sentinel) en una grilla hexagonal con la densidad de adultos mayores, y prioriza las calles donde reforestar baja más la temperatura para las personas más expuestas. Pensada para adaptarse a Sevilla, Phoenix, Monterrey o Santiago.",
  tags: ["global", "clima", "ciudades", "arboles", "islas-de-calor", "urbanismo"],
  version: "0.1.0",
  flow: flowGraph(
    "Mitigación de Islas de Calor Global",
    [
      flowNode(
        "in",
        "core.source.csv",
        { path: "urban_grid.csv" },
        { x: 0, y: 0 },
        "Capa Satelital Abierta",
      ),
      flowNode("calc", GLOBAL_HEATMAP_MANIFEST.id, {}, { x: 260, y: 0 }, "Índice Urgencia Térmica"),
      flowNode(
        "out",
        "core.filter",
        { column: "urgencia_termica", op: ">", value: "0.7" },
        { x: 520, y: 0 },
        "Corredor Verde Priorizado",
      ),
    ],
    [flowEdge("in", "out", "calc", "in"), flowEdge("calc", "out", "out", "in")],
    [GLOBAL_HEATMAP_MANIFEST],
  ),
  snapshot: createSnapshot([GLOBAL_HEATMAP_MANIFEST]),
};

export const DRAFT_GLOBAL_DRILLING: PublicationDraft = {
  slug: "sondajes-mineros-global",
  kind: "flow",
  title: "Optimización de Sondajes y Valor de la Información",
  description:
    "Para equipos de exploración minera o hídrica que deben decidir dónde perforar el próximo pozo. Estima el recurso en 3D a partir de los sondajes existentes, calcula cuánto cuesta la incertidumbre que queda y sugiere la ubicación que más la reduce por cada peso invertido. Pensada para adaptarse a Nevada, Zacatecas, Mendoza o Antofagasta.",
  tags: ["global", "geologia", "mineria", "agua", "sondajes", "bayesian"],
  version: "0.1.0",
  flow: flowGraph(
    "Optimización de Sondajes Global",
    [
      flowNode(
        "in",
        "core.source.csv",
        { path: "sondajes_previos.csv" },
        { x: 0, y: 0 },
        "Muestras de Pozos",
      ),
      flowNode(
        "kriging",
        GLOBAL_DRILLING_MANIFEST.id,
        {},
        { x: 260, y: 0 },
        "Geoestadística & Kriging",
      ),
      flowNode(
        "out",
        "core.filter",
        { column: "incertidumbre_reducida", op: ">", value: "100000" },
        { x: 520, y: 0 },
        "Próximo Sondaje Óptimo",
      ),
    ],
    [flowEdge("in", "out", "kriging", "in"), flowEdge("kriging", "out", "out", "in")],
    [GLOBAL_DRILLING_MANIFEST],
  ),
  snapshot: createSnapshot([GLOBAL_DRILLING_MANIFEST]),
};

export const DRAFT_GLOBAL_BIOMECHANICS: PublicationDraft = {
  slug: "biomecanica-deportiva-global",
  kind: "flow",
  title: "Análisis Biomecánico y Cinemática Deportiva por Video",
  description:
    "Para entrenadores y analistas deportivos. Toma el video de una carrera, sigue a cada atleta y proyecta su trayectoria sobre las medidas reales de la pista, el velódromo o la piscina, para calcular cuántos metros de más recorrió en las curvas. Como los cálculos salen de la geometría de la pista, el relato que genera se apoya en medidas y no en suposiciones.",
  tags: ["global", "deporte", "atletismo", "video", "cinematica", "biomecanica"],
  version: "0.1.0",
  flow: flowGraph(
    "Cinemática Deportiva Global",
    [
      flowNode(
        "cam",
        "core.source.csv",
        { path: "tracking_video.csv" },
        { x: 0, y: 0 },
        "Video de Carrera",
      ),
      flowNode(
        "phys",
        GLOBAL_BIOMECHANICS_MANIFEST.id,
        {},
        { x: 260, y: 0 },
        "Módulo Homografía & Metros Extra",
      ),
      flowNode(
        "out",
        "core.filter",
        { column: "metros_extra_curva", op: ">", value: "1.0" },
        { x: 520, y: 0 },
        "Métricas Reales Verificadas",
      ),
    ],
    [flowEdge("cam", "out", "phys", "in"), flowEdge("phys", "out", "out", "in")],
    [GLOBAL_BIOMECHANICS_MANIFEST],
  ),
  snapshot: createSnapshot([GLOBAL_BIOMECHANICS_MANIFEST]),
};

export const DRAFT_GLOBAL_RESOURCES: PublicationDraft = {
  slug: "estres-recursos-global",
  kind: "flow",
  title: "Capacidad de Carga y Estrés de Recursos para Megaproyectos",
  description:
    "Para comunidades, autoridades y empresas que evalúan un centro de datos o una planta industrial. Proyecta cuánta agua y energía consumirá el proyecto y lo compara con lo que la cuenca puede recargar, para saber si el territorio lo soporta. Pensada para adaptarse a Querétaro, Frankfurt, Virginia o Santiago.",
  tags: ["global", "medio-ambiente", "datacenters", "agua", "energia", "sostenibilidad"],
  version: "0.1.0",
  flow: flowGraph(
    "Capacidad de Carga Global",
    [
      flowNode(
        "proy",
        "core.source.csv",
        { path: "data_centers_plan.csv" },
        { x: 0, y: 0 },
        "Mega-Industrias / Data Centers",
      ),
      flowNode(
        "eval",
        GLOBAL_RESOURCES_MANIFEST.id,
        {},
        { x: 260, y: 0 },
        "Balance Cuenca & Subestación",
      ),
      flowNode(
        "out",
        "core.filter",
        { column: "stress_pct", op: ">", value: "15.0" },
        { x: 520, y: 0 },
        "Semáforo de Viabilidad Ambiental",
      ),
    ],
    [flowEdge("proy", "out", "eval", "in"), flowEdge("eval", "out", "out", "in")],
    [GLOBAL_RESOURCES_MANIFEST],
  ),
  snapshot: createSnapshot([GLOBAL_RESOURCES_MANIFEST]),
};

export const DRAFT_GLOBAL_DRAINAGE: PublicationDraft = {
  slug: "drenaje-inundaciones-global",
  kind: "flow",
  title: "Gestión Preventiva de Drenaje e Inundaciones Pluviales",
  description:
    "Para municipios que quieren limpiar los sumideros antes de la lluvia, no después. Cruza el pronóstico de lluvia por hora con la topografía y la capacidad de los sumideros, y prioriza a dónde mandar las cuadrillas antes de que se inunden las calles. Pensada para adaptarse a Guayaquil, Buenos Aires, Miami o Manila.",
  tags: ["global", "hidrologia", "ciudades", "drenaje", "inundaciones", "emergencias"],
  version: "0.1.0",
  flow: flowGraph(
    "Drenaje e Inundaciones Global",
    [
      flowNode(
        "meteo",
        "core.source.csv",
        { path: "radar_lluvia.csv" },
        { x: 0, y: 0 },
        "Radar de Precipitación",
      ),
      flowNode(
        "topo",
        GLOBAL_DRAINAGE_MANIFEST.id,
        {},
        { x: 260, y: 0 },
        "Modelo Escorrentía & Sumideros",
      ),
      flowNode(
        "out",
        "core.filter",
        { column: "accion", op: "=", value: "DESPACHAR_CUADRILLA" },
        { x: 520, y: 0 },
        "Despacho Preventivo de Cuadrillas",
      ),
    ],
    [flowEdge("meteo", "out", "topo", "in"), flowEdge("topo", "out", "out", "in")],
    [GLOBAL_DRAINAGE_MANIFEST],
  ),
  snapshot: createSnapshot([GLOBAL_DRAINAGE_MANIFEST]),
};

export const DRAFT_GLOBAL_AI_AUDIT: PublicationDraft = {
  slug: "auditoria-agentes-global",
  kind: "flow",
  title: "Sandbox de Confiabilidad y Auditoría Forense de Agentes",
  description:
    "Para equipos que van a darle permisos reales a un agente de IA. Lo pone en un entorno aislado, le presenta pruebas adversarias y credenciales señuelo, y compara lo que el agente dice que hizo con lo que realmente hizo. Así se sabe si es confiable antes de conectarlo a sistemas reales.",
  tags: ["global", "seguridad", "agentes", "sandbox", "red-teaming", "alineacion"],
  version: "0.1.0",
  flow: flowGraph(
    "Auditoría Forense de Agentes Global",
    [
      flowNode(
        "agent",
        "core.source.csv",
        { path: "agent_actions.csv" },
        { x: 0, y: 0 },
        "Agente Autónomo a Auditar",
      ),
      flowNode(
        "audit",
        GLOBAL_AI_AUDIT_MANIFEST.id,
        {},
        { x: 260, y: 0 },
        "Testigo Silencioso & Comparador",
      ),
      flowNode(
        "out",
        "core.filter",
        { column: "desalineacion_detectada", op: "=", value: "true" },
        { x: 520, y: 0 },
        "Certificado de Confiabilidad",
      ),
    ],
    [flowEdge("agent", "out", "audit", "in"), flowEdge("audit", "out", "out", "in")],
    [GLOBAL_AI_AUDIT_MANIFEST],
  ),
  snapshot: createSnapshot([GLOBAL_AI_AUDIT_MANIFEST]),
};

/* ----------------------------------------------------------------------------------
 * Master publication draft list grouped by author handle
 * ---------------------------------------------------------------------------------- */

export type SeedEntry = {
  readonly handle: string;
  readonly draft: PublicationDraft;
};

export const DEMO_INITIAL_DRAFTS: ReadonlyArray<SeedEntry> = [
  // 1. Agronomía
  { handle: MATEO_PROFILE.handle, draft: DRAFT_AGRO_APP },
  { handle: MATEO_PROFILE.handle, draft: DRAFT_AGRO_NODE },
  { handle: MATEO_PROFILE.handle, draft: DRAFT_AGRO_MODULE },

  // 2. Salud
  { handle: VALENTINA_PROFILE.handle, draft: DRAFT_HEALTH_APP },
  { handle: VALENTINA_PROFILE.handle, draft: DRAFT_HEALTH_MODULE },
  { handle: VALENTINA_PROFILE.handle, draft: DRAFT_HEALTH_NODE },

  // 3. Educación
  { handle: TOMAS_PROFILE.handle, draft: DRAFT_EDU_APP },
  { handle: TOMAS_PROFILE.handle, draft: DRAFT_EDU_MODULE },
  { handle: TOMAS_PROFILE.handle, draft: DRAFT_EDU_NODE },

  // 4. Ventas & Pymes
  { handle: FRANCISCA_PROFILE.handle, draft: DRAFT_PYMES_APP },
  { handle: FRANCISCA_PROFILE.handle, draft: DRAFT_PYMES_MODULE },
  { handle: FRANCISCA_PROFILE.handle, draft: DRAFT_PYMES_NODE },

  // 5. Datos Públicos
  { handle: RODRIGO_PROFILE.handle, draft: DRAFT_PUBLIC_APP },
  { handle: RODRIGO_PROFILE.handle, draft: DRAFT_PUBLIC_MODULE },
  { handle: RODRIGO_PROFILE.handle, draft: DRAFT_PUBLIC_NODE },

  // 6. Finanzas
  { handle: CAMILA_PROFILE.handle, draft: DRAFT_FINANCE_APP },
  { handle: CAMILA_PROFILE.handle, draft: DRAFT_FINANCE_MODULE },
  { handle: CAMILA_PROFILE.handle, draft: DRAFT_FINANCE_NODE },

  // Disciplinas adicionales
  { handle: MATIAS_PROFILE.handle, draft: SOLAR_APP_DRAFT },
  { handle: ESTEBAN_PROFILE.handle, draft: CIVIL_APP_DRAFT },
  { handle: DON_PEPE_PROFILE.handle, draft: DON_PEPE_APP_DRAFT },
  { handle: DRA_LUCIA_PROFILE.handle, draft: DENTAL_APP_DRAFT },
  { handle: DR_HUGO_PROFILE.handle, draft: GANADO_APP_DRAFT },
  { handle: HECTOR_PROFILE.handle, draft: FERRETERIA_APP_DRAFT },

  // Casos específicos del Hilo (VOCABULARIO-HILO.md)
  { handle: CAMILA_CESFAM_PROFILE.handle, draft: DRAFT_HILO_CRONICOS },
  { handle: ANA_COQUIMBO_PROFILE.handle, draft: DRAFT_HILO_CENSO },
  { handle: RODRIGO_ANCUD_PROFILE.handle, draft: DRAFT_HILO_ASISTENCIA },
  { handle: TOMAS_IBARRA_PROFILE.handle, draft: DRAFT_HILO_CHURN },
  { handle: PAULA_OSORNO_PROFILE.handle, draft: DRAFT_HILO_BODEGA },
  { handle: LUCIA_QPCR_PROFILE.handle, draft: DRAFT_HILO_QPCR },

  // Plantillas de Arquetipos Globales (13-arquetipos-globales.md)
  { handle: RODRIGO_PROFILE.handle, draft: DRAFT_GLOBAL_HEATMAP },
  { handle: ESTEBAN_PROFILE.handle, draft: DRAFT_GLOBAL_DRILLING },
  { handle: FRANCISCA_PROFILE.handle, draft: DRAFT_GLOBAL_BIOMECHANICS },
  { handle: MATIAS_PROFILE.handle, draft: DRAFT_GLOBAL_RESOURCES },
  { handle: RODRIGO_PROFILE.handle, draft: DRAFT_GLOBAL_DRAINAGE },
  { handle: VALENTINA_PROFILE.handle, draft: DRAFT_GLOBAL_AI_AUDIT },
];

/* ----------------------------------------------------------------------------------
 * Feed Hits for the Feed/Match Service
 * ---------------------------------------------------------------------------------- */

export function profileHitOf(handle: string, title: string, card: ProfileCard): FeedHit {
  return { kind: "profile", id: handle, title, payload: card, similarity: 0.95 };
}

export function componentHitOf(kind: "flow" | "node", id: string, title: string): FeedHit {
  return { kind, id, title, payload: {}, similarity: 0.9 };
}

export const DEMO_FEED_HITS: ReadonlyArray<FeedHit> = [
  profileHitOf(MATEO_PROFILE.handle, MATEO_PROFILE.displayName, MATEO_CARD),
  profileHitOf(VALENTINA_PROFILE.handle, VALENTINA_PROFILE.displayName, VALENTINA_CARD),
  profileHitOf(TOMAS_PROFILE.handle, TOMAS_PROFILE.displayName, TOMAS_CARD),
  profileHitOf(FRANCISCA_PROFILE.handle, FRANCISCA_PROFILE.displayName, FRANCISCA_CARD),
  profileHitOf(RODRIGO_PROFILE.handle, RODRIGO_PROFILE.displayName, RODRIGO_CARD),
  profileHitOf(CAMILA_PROFILE.handle, CAMILA_PROFILE.displayName, CAMILA_CARD),
  profileHitOf(MATIAS_PROFILE.handle, MATIAS_PROFILE.displayName, MATIAS_CARD),
  profileHitOf(ESTEBAN_PROFILE.handle, ESTEBAN_PROFILE.displayName, ESTEBAN_CARD),
  profileHitOf(DON_PEPE_PROFILE.handle, DON_PEPE_PROFILE.displayName, DON_PEPE_CARD),
  profileHitOf(DRA_LUCIA_PROFILE.handle, DRA_LUCIA_PROFILE.displayName, DRA_LUCIA_CARD),
  profileHitOf(DR_HUGO_PROFILE.handle, DR_HUGO_PROFILE.displayName, DR_HUGO_CARD),
  profileHitOf(HECTOR_PROFILE.handle, HECTOR_PROFILE.displayName, HECTOR_CARD),
  profileHitOf(CAMILA_CESFAM_PROFILE.handle, CAMILA_CESFAM_PROFILE.displayName, CAMILA_CESFAM_CARD),
  profileHitOf(ANA_COQUIMBO_PROFILE.handle, ANA_COQUIMBO_PROFILE.displayName, ANA_COQUIMBO_CARD),
  profileHitOf(RODRIGO_ANCUD_PROFILE.handle, RODRIGO_ANCUD_PROFILE.displayName, RODRIGO_ANCUD_CARD),
  profileHitOf(TOMAS_IBARRA_PROFILE.handle, TOMAS_IBARRA_PROFILE.displayName, TOMAS_IBARRA_CARD),
  profileHitOf(PAULA_OSORNO_PROFILE.handle, PAULA_OSORNO_PROFILE.displayName, PAULA_OSORNO_CARD),
  profileHitOf(LUCIA_QPCR_PROFILE.handle, LUCIA_QPCR_PROFILE.displayName, LUCIA_QPCR_CARD),
  componentHitOf("flow", DRAFT_AGRO_APP.slug, DRAFT_AGRO_APP.title),
  componentHitOf("node", DRAFT_AGRO_NODE.slug, DRAFT_AGRO_NODE.title),
  componentHitOf("node", DRAFT_AGRO_MODULE.slug, DRAFT_AGRO_MODULE.title),
  componentHitOf("flow", DRAFT_HEALTH_APP.slug, DRAFT_HEALTH_APP.title),
  componentHitOf("flow", DRAFT_EDU_APP.slug, DRAFT_EDU_APP.title),
  componentHitOf("flow", DRAFT_PYMES_APP.slug, DRAFT_PYMES_APP.title),
  componentHitOf("flow", DRAFT_PUBLIC_APP.slug, DRAFT_PUBLIC_APP.title),
  componentHitOf("flow", DRAFT_FINANCE_APP.slug, DRAFT_FINANCE_APP.title),
  componentHitOf("flow", SOLAR_APP_DRAFT.slug, SOLAR_APP_DRAFT.title),
  componentHitOf("flow", CIVIL_APP_DRAFT.slug, CIVIL_APP_DRAFT.title),
  componentHitOf("flow", DON_PEPE_APP_DRAFT.slug, DON_PEPE_APP_DRAFT.title),
  componentHitOf("flow", DENTAL_APP_DRAFT.slug, DENTAL_APP_DRAFT.title),
  componentHitOf("flow", GANADO_APP_DRAFT.slug, GANADO_APP_DRAFT.title),
  componentHitOf("flow", FERRETERIA_APP_DRAFT.slug, FERRETERIA_APP_DRAFT.title),
  componentHitOf("flow", DRAFT_HILO_CRONICOS.slug, DRAFT_HILO_CRONICOS.title),
  componentHitOf("flow", DRAFT_HILO_CENSO.slug, DRAFT_HILO_CENSO.title),
  componentHitOf("flow", DRAFT_HILO_ASISTENCIA.slug, DRAFT_HILO_ASISTENCIA.title),
  componentHitOf("flow", DRAFT_HILO_CHURN.slug, DRAFT_HILO_CHURN.title),
  componentHitOf("flow", DRAFT_HILO_BODEGA.slug, DRAFT_HILO_BODEGA.title),
  componentHitOf("node", DRAFT_HILO_QPCR.slug, DRAFT_HILO_QPCR.title),
  componentHitOf("flow", DRAFT_GLOBAL_HEATMAP.slug, DRAFT_GLOBAL_HEATMAP.title),
  componentHitOf("flow", DRAFT_GLOBAL_DRILLING.slug, DRAFT_GLOBAL_DRILLING.title),
  componentHitOf("flow", DRAFT_GLOBAL_BIOMECHANICS.slug, DRAFT_GLOBAL_BIOMECHANICS.title),
  componentHitOf("flow", DRAFT_GLOBAL_RESOURCES.slug, DRAFT_GLOBAL_RESOURCES.title),
  componentHitOf("flow", DRAFT_GLOBAL_DRAINAGE.slug, DRAFT_GLOBAL_DRAINAGE.title),
  componentHitOf("flow", DRAFT_GLOBAL_AI_AUDIT.slug, DRAFT_GLOBAL_AI_AUDIT.title),
];

/* ----------------------------------------------------------------------------------
 * Hub Seeding helper functions
 * ---------------------------------------------------------------------------------- */

export async function populateMemoryHub(
  hub: Hub,
  drafts: ReadonlyArray<SeedEntry> = DEMO_INITIAL_DRAFTS,
): Promise<void> {
  const byHandle = new Map<string, PublicationDraft[]>();
  for (const { handle, draft } of drafts) {
    const list = byHandle.get(handle) ?? [];
    list.push(draft);
    byHandle.set(handle, list);
  }

  for (const [handle, userDrafts] of byHandle) {
    await hub.signIn({ kind: "email", email: handle });
    for (const draft of userDrafts) {
      await hub.publish(draft);
    }
  }
  await hub.signOut();
}
