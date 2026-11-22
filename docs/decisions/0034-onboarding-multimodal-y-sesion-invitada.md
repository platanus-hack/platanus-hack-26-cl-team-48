# 0034. Onboarding multimodal y sesión invitada

- **Estado:** propuesta
- **Fecha:** 2026-11-22
- **Amplía:** ADR 0022 §6 (agente de registro) y ADR 0018 §7 (cuentas)

## Contexto

El alta de hoy es el wizard de la ficha de colaboración (ADR 0022 §6). Empieza con "¿Subes tu CV o lo escribes tú?" y sigue con cuatro pasos de formulario: nivel técnico, dominios con profundidad, "ofrezco" y "busco", y enlaces de LinkedIn y GitHub.

Funciona para quien trabaja con datos, pero no para la persona que más queremos sumar: alguien no técnico que encontró un nodo útil para su negocio. Por ejemplo, la dueña de una tienda de abarrotes. Ella no tiene CV ni LinkedIn, no sabe qué es un "dominio" y no va a llenar cuatro pantallas antes de ver algo útil.

Además, el wizard vive en "Mi espacio", lejos del momento en que la persona decide usar un nodo. Y para instalar hay que entrar primero, con GitHub como la primera opción.

## Decisión

### 1. La persona no elige el método: da lo que tenga

Una sola pantalla, "Cuéntanos de tu negocio", acepta cualquier combinación de:

- **Fotos** (máximo 4): del local, de una tarjeta de presentación, de un volante o de un menú. En el celular se abre la cámara directo.
- **Voz:** dictado con la Web Speech API del navegador, transcrito al cuadro de texto. Solo aparece si el navegador lo soporta y no requiere backend.
- **Texto libre.**
- **Más opciones**, en segundo plano: CV en PDF, un enlace y GitHub (lo que existe hoy).

El agente de registro decide qué es cada cosa y propone la ficha con el mismo esquema de ADR 0022 §1, sin cambiarlo. Si no hay señales de programación, propone `technical: "uses"` en lugar de preguntarlo.

### 2. Contrato del agente de registro

`RegistrationRequestSchema` (`packages/profile`) suma dos campos opcionales:

- `images`: hasta 4 imágenes `{ mediaType: "image/jpeg" | "image/png" | "image/webp", base64 }`, de máximo 5 MB cada una. Se envían a Claude como bloques `image`.
- `lookupSummary`: el resumen del negocio que la persona confirmó en la búsqueda web (§3).

Las imágenes cuentan como fuente: basta una para pedir la ficha.

### 3. Búsqueda web del negocio, con confirmación

Si las fuentes traen el nombre de un negocio (por ejemplo, en una tarjeta), la interfaz ofrece **"¿Buscamos tu negocio en internet?"**. Si la persona acepta, la ruta nueva `POST /feed/registration/lookup` usa la herramienta `web_search` de Claude (máximo 3 búsquedas) y devuelve hasta 3 candidatos `{ title, summary, url }`, cada uno con su fuente visible.

- **Solo negocios.** El prompt prohíbe buscar a personas por su nombre.
- **Solo con consentimiento explícito,** pidiéndolo cada vez.
- **Nada entra a la ficha sin confirmación.** Lo que la persona elige con "Sí, ese es mi negocio" viaja como `lookupSummary` a la extracción.
- La búsqueda es una llamada **separada** de la extracción, porque las citas de los resultados no se combinan con `output_config.format`.

### 4. Confirmación en oraciones

La ficha propuesta se muestra como oraciones que se tocan para corregir: quién es, qué busca y qué sabe. Detrás se llenan los mismos campos de siempre. El wizard de cuatro pasos queda solo para editar a fondo una ficha que ya existe.

### 5. Sesión invitada y cuenta al final

La cuenta se pide al final, cuando ya hay algo que guardar. Para que el agente siga exigiendo un token (la extracción cuesta dinero), al entrar al onboarding sin sesión la interfaz abre una **sesión anónima de Supabase** (`signInAnonymously`), cuyo JWT trae `is_anonymous: true`.

- El agente acepta tokens anónimos solo en `registration`, `lookup` y `search`. Toda ruta que escribe los rechaza.
- RLS: las políticas de escritura exigen `coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false`.
- El hub trata a la persona invitada como sin sesión: no puede publicar, copiar ni instalar.
- Al guardar se entra con el login normal (Google o correo primero, GitHub en "otras opciones"). No se usa `linkIdentity`, porque falla si la cuenta ya existe. El borrador de la ficha, sin imágenes, se guarda en `localStorage` para sobrevivir al redirect. Al volver se guarda la ficha y se retoma la acción pendiente del hub.

### 6. Puntos de entrada

La ruta nueva `/empezar` (opcionalmente `?from=<handle>/<slug>`) se abre desde tres lugares:

- la portada del hub ("Empieza por tu negocio");
- una publicación ("Usar en mi negocio"), cuando la persona no tiene sesión o no tiene ficha;
- la invitación a completar el perfil.

Si la persona llegó sin un nodo, el cierre muestra nodos y flujos sugeridos según lo que busca, con el buscador del Feed.

### 7. Datos

**Las fotos no se guardan,** igual que el CV (ADR 0022 §6): se procesan en memoria y se descartan, y la interfaz se lo dice a la persona. Solo persiste la ficha confirmada.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Sesión anónima de Supabase (elegida) | El agente sigue exigiendo token, el rate limit por usuario sigue sirviendo y RLS distingue al invitado | Requiere habilitar anonymous sign-ins y cuidar el abuso |
| Endpoint de registro público, sin token | Lo más simple | Cualquiera puede gastar llamadas a Claude; no hay identidad que limitar |
| Pedir cuenta al inicio (como hoy) | Sin cambios de autenticación | Es la barrera que justamente queremos quitar |
| `linkIdentity` para convertir al invitado | Conserva el mismo usuario | Falla si la cuenta de Google o el correo ya existen; agrega casos de error |
| Búsqueda y extracción en una sola llamada | Una llamada menos | Las citas no se combinan con salida estructurada, y la persona no confirma antes de que entre a su ficha |
| Transcripción de voz en el servidor | Funciona en todos los navegadores | Un proveedor y un costo nuevos; la Web Speech API basta para empezar |

## Consecuencias

- **El alta sirve para personas no técnicas** sin cambiar el esquema de la ficha.
- **Hay que habilitar anonymous sign-ins** en el proyecto de Supabase, con rate limit, y revisar que toda política de escritura excluya a los anónimos.
- **El rate limit del agente es por usuario**, y una sesión anónima nueva es un usuario nuevo. El límite real lo pone el rate limit de anonymous sign-ins de Supabase. Ver la pregunta 1.
- **Costo:** cada imagen agrega del orden de 1.5k tokens de entrada a la extracción, y la búsqueda web cobra por búsqueda. Se medirá con casos reales y se anotará aquí.
- **Sin dependencias nuevas de runtime.**

## Preguntas abiertas

1. ¿Agregamos captcha (Cloudflare Turnstile) a las sesiones anónimas desde el inicio, o cuando haya abuso?
2. ¿Agregamos `fallbacks` (respaldo ante rechazos) a las llamadas a Claude del agente?
3. Una ficha v2 con `kind: business`, nombre del negocio y zona aproximada queda fuera de este ADR.
