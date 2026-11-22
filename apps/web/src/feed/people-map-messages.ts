const people = (count: number) => `${String(count)} ${count === 1 ? "persona" : "personas"}`;

export const PEOPLE_MAP_MESSAGES = {
  empty: "Todavía no hay perfiles en el mapa.",
  noResults: "No hay perfiles en el mapa para esta búsqueda.",
  loading: "Cargando mapa…",
  signIn: "Inicia sesión para ver el mapa.",
  unavailable: "El mapa de personas no está disponible.",
  proximity: "Cada burbuja es un nicho: personas que ofrecen cosas parecidas.",
  summary: (niches: number, count: number) =>
    `${String(niches)} ${niches === 1 ? "nicho" : "nichos"} · ${people(count)}`,
  sample: (count: number) => `Mostrando hasta ${String(count)} perfiles.`,
  plot: "Mapa de afinidad",
  hint: "Toca un nicho para descubrir de qué se trata, o un punto para conocer a alguien.",
  people,
  nicheName: (label: string, count: number) => `${label}, ${people(count)}`,
  niche: "Nicho",
  keywords: "Temas en común",
  mix: "Cómo trabajan",
  matches: (count: number) =>
    `${people(count)} ${count === 1 ? "ofrece" : "ofrecen"} algo de lo que buscas`,
  back: "Ver todo el mapa",
  technical: {
    uses: "Usa herramientas",
    builds: "Construye soluciones",
    codes: "Programa",
  },
  matchDetail: "Ofrece algo relacionado con lo que buscas.",
  offers: "Lo que ofrece",
  profile: "Abrir perfil",
} as const;
