# 0022. Perfiles vectoriales y buscador del Feed

- **Estado:** aceptada
- **Fecha:** 2026-11-21

## Contexto

El Feed es la parte social de Nodomics (`docs/05-capa-agente.md` §2 se lo asigna a Cantú). Su objetivo es que los nichos se encuentren y **colaboren**. Por ejemplo, un matemático con teoría sólida que no sabe implementarla debería encontrar a quien sí sabe, y una veterinaria que encontró un flujo útil debería poder usarlo aunque no programe.

Hoy el hub (ADR 0018) solo tiene perfiles mínimos (`handle`, `display_name`, `avatar_url`) y una búsqueda de publicaciones por texto. La capa de agente (ADR 0019 y 0020) ya trae varias piezas que el Feed debe reutilizar:

- Voyage AI como proveedor de embeddings, con `voyage-3.5` y 1024 dimensiones.
- La tabla `agent_component_cards` con pgvector y la función `match_agent_components`.
- Un servicio propio, `apps/agent`, que guarda las claves de Anthropic y Voyage.

Fuerzas en juego:

- **Colaborar no es parecerse.** La similitud vectorial junta a los parecidos: los vecinos de un matemático teórico son otros matemáticos teóricos. El Feed necesita encontrar **complementos**.
- **El perfil va a cambiar.** Habrá campos nuevos y otros desaparecerán. El formato no puede obligar a migrar la base ni a reescribir la búsqueda en cada cambio.
- **Un mismo espacio.** Perfiles, nodos, flujos y apps deben poder compararse entre sí, así que todos se vectorizan con el mismo modelo.
- **Idioma.** Los usuarios escriben en español. Anthropic no ofrece embeddings, y `gte-small`, el modelo integrado de Supabase, solo cubre inglés y trunca los textos a 512 tokens.
- **Tiempo:** el hackathon termina el 2026-11-22.

## Decisión

### 1. Ficha de perfil extensible

Cada perfil tiene una ficha JSON versionada, guardada como `jsonb`:

```json
{
  "schemaVersion": 1,
  "about": "Veterinaria. Estudio brotes de enfermedades en ganado.",
  "technical": "uses",
  "domains": [{ "name": "epidemiología veterinaria", "depth": "expert" }],
  "offers": ["modelos de contagio", "datos de campo"],
  "seeks": ["alguien que automatice mis análisis en Python"],
  "links": { "linkedin": "…", "github": "…", "website": "…" }
}
```

Tres reglas la hacen extensible:

- **`schemaVersion` y migraciones puras.** El parser (TypeBox) convierte cualquier versión anterior a la actual al leerla (`v1 → v2 → …`). Para agregar o quitar un campo se sube la versión y se escribe su migración. La base no cambia.
- **Una sola función decide qué se vectoriza** (`profileToEmbeddingTexts`). Ningún otro código sabe qué campos entran al vector.
- **Junto a cada vector se guardan el hash del texto vectorizado y el modelo usado.** Si la ficha o el modelo cambian, el hash ya no coincide y el vector se recalcula.

### 2. Nivel técnico en dos ejes, no en una escala

Una sola escala pondría "a la mitad" a quien es experto en teoría y principiante en código, que es justo el caso que el Feed quiere resolver. Por eso hay dos ejes, descritos como conductas observables y no como números autoevaluados:

- **`technical`** es la relación de la persona con Nodomics: `uses` (usa flujos), `builds` (arma flujos) o `codes` (programa nodos).
- **`depth` por dominio**: `curious`, `practitioner` o `expert`.

### 3. Dos vectores por perfil: lo que ofrece y lo que busca

- **Vector `offers`:** se calcula a partir de `about`, `domains` y `offers`.
- **Vector `seeks`:** se calcula a partir de `seeks`.
- **Emparejamiento:** el vector `seeks` de A se compara con el `offers` de B y con las fichas de componente. Así el matemático que busca "implementar X en Python" encuentra a quien ofrece Python y simulación, aunque sus dominios no tengan nada en común.
- **Búsqueda libre:** se vectoriza la consulta con `input_type: "query"` y se compara contra los vectores `offers` y contra las fichas de componente.

### 4. Mismo espacio que las fichas de componente

- **Modelo compartido.** Perfiles y fichas de componente usan el mismo modelo de Voyage y la misma dimensión (1024). Se propone pasar ambos a **`voyage-4`**, multilingüe y la versión vigente. Tiene la misma dimensión que `voyage-3.5`, así que no cambia el esquema de `agent_component_cards`.
- **Tabla nueva `profile_cards`,** gemela de `agent_component_cards`:
  - `profile_id` (FK a `profiles`), `card jsonb`, `schema_version`;
  - `offers_embedding vector(1024)` y `seeks_embedding vector(1024)`, cada uno con índice HNSW coseno;
  - `content_hash` y `embedding_model`.
- **Permisos (RLS):** lectura pública; solo el dueño inserta y edita su ficha.
- **Búsqueda unificada.** Una función `match_feed(query, k)` une `profile_cards` y `agent_component_cards` y las ordena por similitud. Cada resultado lleva su tipo (`profile`, `node`, `flow` o `app`).

### 5. Los vectores se calculan en `apps/agent`

Se reutiliza el servicio de Gabriel (ADR 0019): ya guarda la clave de Voyage y tiene el puerto `EmbeddingsPort`. Así no hacen falta Edge Functions ni copias de las claves. Se agregan tres rutas HTTP, autenticadas con el JWT de Supabase del usuario (ADR 0021):

- `POST /feed/profile`: recibe la ficha, la parsea, la guarda y la vectoriza.
- `POST /feed/search`: búsqueda libre.
- `GET /feed/matches`: los complementos del usuario.

Quién escribe esas rutas (Gabriel, o Cantú en un módulo `feed/` dentro de `apps/agent`) se acuerda con Gabriel.

### 6. Agente de registro

- **Entrada:** la persona sube su CV en PDF o pega texto, y opcionalmente indica su usuario de GitHub, que se lee con la API pública.
- **Extracción:** `apps/agent` le pasa todo a Claude (`claude-opus-5-5`, con el PDF como bloque `document`) y obtiene la ficha mediante *structured outputs* (`output_config.format`), con el mismo esquema de §1.
- **Confirmación:** la ficha se muestra a la persona para que la corrija antes de guardarla.
- **El CV no se guarda.** Se procesa en memoria y se descarta. Solo persiste la ficha que la persona confirma.
- **LinkedIn queda fuera:** no tiene una API pública para leer perfiles y hacer *scraping* viola sus términos. El enlace a LinkedIn se guarda solo como link.
- **Costo:** con un CV típico (unos 5k tokens de entrada), cada extracción cuesta del orden de USD 0,04.

### 7. Mapa del Feed

- **Proyección.** Los vectores se proyectan a 2D con PCA (análisis de componentes principales) y se dibujan como un mapa:
  - **Forma:** según el tipo (perfil, nodo, flujo o app).
  - **Color:** según `technical`.
  - **Líneas:** los emparejamientos `seeks ↔ offers`.
- **Dónde se calcula:** en el navegador, con un PCA propio: una función pura, sin dependencias nuevas. Es viable con el volumen del hackathon (cientos de puntos).
- **Si el volumen crece:** la proyección pasa a `apps/agent` y la web recibe solo coordenadas.

### 8. Apps

Una app es un flujo grande. Por ahora **no es un tipo nuevo de publicación**: es un flujo con la etiqueta `app`. Se convertirá en un tipo propio (otro ADR) cuando tenga un comportamiento distinto del de un flujo.

### 9. Propuesta para la ficha de componente (ADR 0020)

Para que comparta las reglas de §1:

- **Versionado:** agregar `schemaVersion`.
- **Contexto genérico:** cambiar `context: { domain, crop, region }`, que es específico de agronomía, por `context: { domain, tags }`.
- **Audiencia:** agregar `audience`, con los mismos valores que `technical` (`uses`, `builds`, `codes`), para saber a quién le sirve cada componente.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Voyage en `apps/agent`, compartido con las fichas de componente (elegida) | Un solo proveedor, una sola clave y un solo espacio vectorial; reutiliza el `EmbeddingsPort` existente; multilingüe | Depende del servicio de Gabriel y de acordar con él las rutas |
| `gte-small` en Edge Functions de Supabase | Gratis y sin servicio propio | Solo inglés y trunca a 512 tokens; quedaría en un espacio distinto al de las fichas de componente |
| Edge Functions que llaman a Voyage | Coherente con el ADR 0018 | Duplica claves y código que ya existen en `apps/agent`; el ADR 0019 ya las descartó para la capa de agente |
| Un solo vector por perfil | Más simple | Solo encuentra a los parecidos, no a los complementos |
| Nivel técnico en una sola escala | Simple de mostrar | No representa a quien es experto en teoría y principiante en código |
| Columnas SQL por cada campo del perfil | Consultas tipadas en SQL | Cada cambio del perfil exige una migración de base |

## Consecuencias

- **El perfil evoluciona sin migrar la base:** cada cambio es una migración pura en TypeScript, con sus tests.
- **Perfiles y componentes comparten espacio:** una sola búsqueda devuelve personas, nodos, flujos y apps.
- **El Feed depende de que `apps/agent` esté desplegado.** Sin el servicio, el buscador y el agente de registro no funcionan. El resto del hub sigue igual.
- **Cambiar de modelo de embeddings obliga a revectorizar todo** (perfiles y fichas). El campo `embedding_model` permite detectar los vectores viejos.
- **Los datos personales del CV no se almacenan.** Solo persiste la ficha confirmada, que es pública.
- **Paquete nuevo `packages/profile`.** Es puro y contiene el esquema de la ficha, el parseo con migraciones y `profileToEmbeddingTexts`. Lo importan `apps/web` y `apps/agent`, lo que amplía el ADR 0019: `apps/agent` puede importar `protocol` y `profile`. `profile` solo importa `protocol`.
- **Mapa con PCA en lugar de UMAP.** `umap-js` no se actualiza desde 2024, así que la proyección de §7 se hace con un PCA propio, una función pura sin dependencias nuevas. UMAP se reevalúa si los grupos no se distinguen.
- **Sin dependencias nuevas de runtime.** `@anthropic-ai/sdk` ya entra con el ADR 0019.

## Preguntas abiertas

1. ¿Gabriel acepta pasar las fichas de componente a `voyage-4`?
2. ¿Quién escribe las rutas `/feed/*` en `apps/agent`?
3. ¿Gabriel acepta los cambios a la ficha de componente de §9?
