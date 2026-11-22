import type { FlowNode } from "@nodomics/protocol";
import type { PipelineSpec } from "./demo-pipelines.ts";
import {
  bar,
  cast,
  filter,
  formula,
  group,
  join,
  line,
  sort,
  src,
  table,
} from "./demo-pipeline-steps.ts";

/* The six area apps and their modules. Apps join a second source, keep the seed's own nodes in the middle and
 * end in several views; modules wrap the seed's node in the preparation and checks it needs to run alone. */

export const AREA_APP_SPECS: Readonly<Record<string, PipelineSpec>> = {
  "cadena-frio-berries": {
    kind: "app",
    steps: [
      src("rutas_camiones", "Rutas y destinos", "s3://berries/rutas.csv"),
      join("unir_rutas", "Unir lecturas con su ruta", ["camion_id"]),
      cast("tipos_lectura", "Normalizar fechas y números", [
        ["timestamp", "date-iso"],
        ["temperatura_c", "number"],
        ["humedad_relativa", "number"],
      ]),
      formula("exceso_termico", "Grados sobre el máximo", ["exceso_c", "temperatura_c", "-", 2]),
      filter("solo_quiebres", "Solo quiebres de frío", ["exceso_c", ">", "0"]),
      group("resumen_camion", "Resumen por camión", [
        ["zona", "camion_id"],
        [
          ["temperatura_c", "MAX", "temp_max"],
          ["exceso_c", "SUM", "grados_hora"],
          ["humedad_relativa", "AVG", "humedad_prom"],
        ],
      ]),
      sort("ranking_camiones", "Camiones más expuestos", ["grados_hora"]),
      line("curva_temperatura", "Temperatura en el tiempo", ["timestamp", "temperatura_c", "zona"]),
      table("detalle_quiebres", "Quiebres para revisar"),
    ],
    edges: [
      "telemetria_iot>unir_rutas:left",
      "rutas_camiones>unir_rutas:right",
      "unir_rutas>tipos_lectura",
      "tipos_lectura>filtro_resiliente",
      "filtro_resiliente>alerta_heladas",
      "alerta_heladas>exceso_termico",
      "exceso_termico>grafico_comparativo",
      "exceso_termico>curva_temperatura",
      "exceso_termico>solo_quiebres",
      "solo_quiebres>resumen_camion",
      "resumen_camion>ranking_camiones",
      "solo_quiebres>detalle_quiebres",
    ],
  },
  "scribe-clinico-soap": {
    kind: "app",
    steps: [
      src("ficha_pacientes", "Ficha y peso de pacientes", "s3://urgencias/fichas.csv"),
      join("unir_ficha", "Unir nota con ficha", ["cama_id"]),
      cast("tipos_signos", "Normalizar signos vitales", [
        ["frec_respiratoria", "number"],
        ["sat_o2", "number"],
        ["edad_anos", "number"],
      ]),
      filter("pacientes_riesgo", "NEWS2 de 5 o más", ["news2_score", ">=", "5"]),
      group("resumen_riesgo", "Pacientes por nivel de riesgo", [
        ["riesgo_clinico"],
        [
          ["cama_id", "COUNT", "pacientes"],
          ["news2_score", "AVG", "news2_prom"],
        ],
      ]),
      sort("prioridad_camas", "Orden de atención", ["news2_score"]),
      table("lista_traspaso", "Lista para el traspaso"),
      table("revision_dosis", "Dosis para revisar"),
    ],
    edges: [
      "audio_transcripcion>unir_ficha:left",
      "ficha_pacientes>unir_ficha:right",
      "unir_ficha>tipos_signos",
      "tipos_signos>evaluador_news2",
      "evaluador_news2>calculador_mosteller",
      "calculador_mosteller>vista_prioridad",
      "calculador_mosteller>pacientes_riesgo",
      "pacientes_riesgo>prioridad_camas",
      "prioridad_camas>lista_traspaso",
      "calculador_mosteller>resumen_riesgo",
      "calculador_mosteller>revision_dosis",
    ],
  },
  "laboratorio-escolar-electricidad": {
    kind: "app",
    steps: [
      src("horario_colegio", "Horario de clases", "s3://colegio/horario.csv"),
      join("unir_horario", "Unir lecturas con el horario", ["hora"]),
      cast("tipos_medidor", "Normalizar lecturas", [
        ["hora", "date-iso"],
        ["kwh", "number"],
      ]),
      formula("costo_clp", "Costo en pesos", ["costo_clp", "kwh", "*", 160]),
      filter("solo_fantasmas", "Consumo fuera de clases", ["consumo_fantasma", "=", "true"]),
      group("por_bloque", "Consumo por bloque", [
        ["bloque_pedagogico"],
        [
          ["kwh", "SUM", "kwh_total"],
          ["costo_clp", "SUM", "costo_total"],
        ],
      ]),
      sort("bloques_caros", "Bloques que más gastan", ["kwh_total"]),
      line("curva_dia", "Consumo durante el día", ["hora", "kwh"]),
      table("tabla_fantasmas", "Consumos para investigar"),
    ],
    edges: [
      "smart_meter>unir_horario:left",
      "horario_colegio>unir_horario:right",
      "unir_horario>tipos_medidor",
      "tipos_medidor>agrupador_bloques",
      "agrupador_bloques>detector_anomalias",
      "detector_anomalias>costo_clp",
      "costo_clp>grafico_pedagogico",
      "costo_clp>curva_dia",
      "costo_clp>por_bloque",
      "por_bloque>bloques_caros",
      "costo_clp>solo_fantasmas",
      "solo_fantasmas>tabla_fantasmas",
    ],
  },
  "radar-compras-agrupadas": {
    kind: "app",
    steps: [
      src("lista_precios", "Lista de precios del mayorista", "s3://almacenes/precios.csv"),
      join("unir_precios", "Unir pedidos con precios", ["sku"]),
      cast("tipos_pedido", "Normalizar cantidades", [
        ["demanda_semanal_bultos", "number"],
        ["stock_actual", "number"],
      ]),
      formula("bultos_a_pedir", "Bultos que faltan", [
        "bultos",
        "punto_reorden",
        "-",
        "stock_actual",
      ]),
      filter("bajo_reorden", "Bajo el punto de reorden", ["bultos", ">", "0"]),
      group("compra_conjunta", "Compra conjunta por producto", [
        ["sku", "producto"],
        [
          ["bultos", "SUM", "bultos_total"],
          ["almacen", "COUNT", "almacenes"],
        ],
      ]),
      sort("mayor_volumen", "Mayor volumen primero", ["bultos_total"]),
      table("orden_compra", "Orden para el distribuidor"),
      bar("ahorro_por_producto", "Ahorro por producto", ["producto", "ahorro_compra_agrupada_pct"]),
    ],
    edges: [
      "pedidos_almacenes>unir_precios:left",
      "lista_precios>unir_precios:right",
      "unir_precios>tipos_pedido",
      "tipos_pedido>validador_margen",
      "validador_margen>reorden_logistico",
      "reorden_logistico>bultos_a_pedir",
      "bultos_a_pedir>bajo_reorden",
      "bajo_reorden>compra_conjunta",
      "compra_conjunta>mayor_volumen",
      "mayor_volumen>orden_compra",
      "reorden_logistico>resumen_escala",
      "reorden_logistico>ahorro_por_producto",
    ],
  },
  "observatorio-calidad-aire-sinca": {
    kind: "app",
    steps: [
      src("censo_manzanas", "Población del Censo", "s3://datos-abiertos/censo-h3.csv"),
      join("unir_censo", "Unir mediciones con población", ["h3_res8"]),
      cast("tipos_sinca", "Normalizar mediciones", [
        ["mp25_ug_m3", "number"],
        ["mp10_ug_m3", "number"],
      ]),
      formula("exceso_norma", "Veces sobre la norma MP2,5", ["veces_norma", "mp25_ug_m3", "/", 50]),
      filter("zonas_criticas", "Zonas sobre la norma", ["veces_norma", ">", "1"]),
      group("por_comuna", "Resumen por comuna", [
        ["comuna"],
        [
          ["mp25_ug_m3", "AVG", "mp25_prom"],
          ["poblacion_vulnerable_censo", "SUM", "personas_expuestas"],
        ],
      ]),
      sort("comunas_expuestas", "Comunas más expuestas", ["personas_expuestas"]),
      table("tabla_hexagonos", "Hexágonos críticos"),
      bar("mp25_por_estacion", "MP2,5 por estación", ["estacion_sinca", "mp25_ug_m3"]),
    ],
    edges: [
      "feed_sinca>unir_censo:left",
      "censo_manzanas>unir_censo:right",
      "unir_censo>tipos_sinca",
      "tipos_sinca>indexador_h3",
      "indexador_h3>calor_urbano",
      "calor_urbano>exceso_norma",
      "exceso_norma>mapa_riesgo",
      "exceso_norma>mp25_por_estacion",
      "exceso_norma>zonas_criticas",
      "zonas_criticas>tabla_hexagonos",
      "exceso_norma>por_comuna",
      "por_comuna>comunas_expuestas",
    ],
  },
  "centinela-flujo-caja": {
    kind: "app",
    steps: [
      src("pagos_banco", "Pagos recibidos (cartola)", "s3://finanzas/cartola.csv"),
      join("conciliar_pagos", "Conciliar facturas y pagos", ["folio_dte"]),
      cast("tipos_dte", "Normalizar montos y fechas", [
        ["monto_insoluto", "number"],
        ["dias_atraso", "number"],
      ]),
      filter("solo_vencidas", "Solo facturas vencidas", ["dias_atraso", ">", "0"]),
      group("por_cliente", "Deuda por cliente", [
        ["rut_cliente", "razon_social"],
        [
          ["total_exigible", "SUM", "deuda_total"],
          ["dias_atraso", "MAX", "atraso_max"],
        ],
      ]),
      sort("prioridad_cobro", "A quién cobrar primero", ["deuda_total"]),
      table("lista_cobranza", "Lista de cobranza"),
      line("proyeccion_caja", "Caja proyectada a 90 días", ["dias_atraso", "total_exigible"]),
    ],
    edges: [
      "facturas_sii>conciliar_pagos:left",
      "pagos_banco>conciliar_pagos:right",
      "conciliar_pagos>tipos_dte",
      "tipos_dte>scoring_cartera",
      "scoring_cartera>liquidacion_intereses",
      "liquidacion_intereses>curva_liquidez",
      "liquidacion_intereses>proyeccion_caja",
      "liquidacion_intereses>solo_vencidas",
      "solo_vencidas>por_cliente",
      "por_cliente>prioridad_cobro",
      "prioridad_cobro>lista_cobranza",
    ],
  },
};

/** A module runs the seed's node (`n1`) between a source, its preparation and a validity check. */
function moduleSpec(before: ReadonlyArray<FlowNode>, after: ReadonlyArray<FlowNode>): PipelineSpec {
  const ids = [...before.map((node) => node.id), "n1", ...after.map((node) => node.id)];
  return {
    kind: "flow",
    steps: [...before, ...after],
    edges: ids.slice(1).map((id, index) => `${ids[index] ?? ""}>${id}`),
  };
}

export const AREA_MODULE_SPECS: Readonly<Record<string, PipelineSpec>> = {
  "alerta-heladas-punto-rocio": moduleSpec(
    [
      src("estacion", "Estación meteorológica", "s3://agro/estacion.csv"),
      cast("tipos", "Normalizar lecturas", [
        ["temperatura_c", "number"],
        ["humedad_relativa", "number"],
      ]),
      filter("rango_valido", "Descartar lecturas imposibles", ["humedad_relativa", "<=", "100"]),
    ],
    [
      sort("mas_frias", "Horas más frías primero", ["punto_rocio_c", "ASC"]),
      table("alertas", "Semáforo de heladas"),
    ],
  ),
  "triage-news2": moduleSpec(
    [
      src("signos", "Signos vitales", "s3://urgencias/signos.csv"),
      cast("tipos", "Normalizar signos", [
        ["frec_respiratoria", "number"],
        ["sat_o2", "number"],
      ]),
      filter("con_saturacion", "Con saturación registrada", ["sat_o2", ">", "0"]),
    ],
    [
      sort("mas_graves", "Más graves primero", ["news2_score"]),
      table("tabla_triage", "Pacientes por puntaje"),
    ],
  ),
  "agrupador-bloques-academicos": moduleSpec(
    [
      src("registros", "Registros con hora", "s3://colegio/registros.csv"),
      cast("tipos", "Normalizar horas", [["hora", "date-iso"]]),
      filter("jornada", "Solo jornada escolar", ["hora", ">=", "08:00"]),
    ],
    [
      sort("por_hora", "En orden del día", ["hora", "ASC"]),
      table("tabla_bloques", "Registros por bloque"),
    ],
  ),
  "punto-reorden-stock-seguridad": moduleSpec(
    [
      src("ventas", "Ventas diarias", "s3://pymes/ventas.csv"),
      cast("tipos", "Normalizar cantidades", [
        ["venta_diaria", "number"],
        ["plazo_dias", "number"],
      ]),
      filter("con_venta", "Productos con venta", ["venta_diaria", ">", "0"]),
    ],
    [
      formula("faltante", "Unidades bajo el punto", [
        "faltante",
        "punto_reorden",
        "-",
        "stock_actual",
      ]),
      sort("urgentes", "Más urgentes primero", ["faltante"]),
      table("tabla_reorden", "Qué reponer"),
    ],
  ),
  "indexador-hexagonal-h3": moduleSpec(
    [
      src("puntos", "Puntos con coordenadas", "s3://datos/puntos.csv"),
      cast("tipos", "Normalizar coordenadas", [
        ["lat", "number"],
        ["lon", "number"],
      ]),
      filter("en_area", "Dentro del área de estudio", ["lat", "<", "-17"]),
    ],
    [
      sort("por_hexagono", "Agrupados por hexágono", ["h3_res8", "ASC"]),
      table("tabla_h3", "Puntos con su hexágono"),
    ],
  ),
  "scoring-cumplimiento-clientes": moduleSpec(
    [
      src("historial", "Historial de pagos", "s3://finanzas/historial.csv"),
      cast("tipos", "Normalizar días y montos", [
        ["dias_atraso", "number"],
        ["monto", "number"],
      ]),
      filter("con_historial", "Clientes con facturas", ["monto", ">", "0"]),
    ],
    [
      sort("peor_puntaje", "Peor puntaje primero", ["score_cumplimiento", "ASC"]),
      table("tabla_scoring", "Puntaje por cliente"),
    ],
  ),
};
