# 0018. Hub de flujos y nodos con Supabase

- **Estado:** aceptada
- **Fecha:** 2026-11-21

## Contexto

Hoy los flujos y los flujos que son nodos (ADR 0016) viven solo en el navegador de cada usuario (ADR 0015). Se comparten por link (`#` con el flujo comprimido), pero no hay perfiles, ni un lugar donde descubrir lo que otros publicaron, ni forma de instalar el nodo de otra persona.

Se quiere un hub estilo GitHub dentro de Nodomics:

- Cada usuario tiene un perfil con sus flujos y nodos publicados.
- Cualquiera puede ver un preview del flujo (el grafo, no código) y agregarlo a su proyecto: un flujo se abre como copia y un nodo se agrega a "Mis nodos".

Fuerzas en juego:

- **Tiempo:** es para un hackathon que termina el 2026-11-22.
- **Costo:** la web es un sitio estático gratis en Render.
- **Usuarios:** son analistas que no programan.

Se descartó hacer un fork de Gitea o Forgejo. Habría que reimplementar el preview del lienzo en otra pila, el usuario tendría dos apps con dos inicios de sesión, y haría falta un servidor con disco persistente.

La instalación ya está resuelta en el ADR 0016: agregar un nodo copia su manifiesto en `flow.customNodes`, el flujo queda autocontenido, y "Actualizar a x.y.z" es explícito. El hub solo agrega **publicar y descubrir**.

## Decisión

1. **Supabase como backend del hub** (plan gratis). Se usa su Auth, Postgres con Row Level Security y Storage. La web sigue siendo estática. No hay servidor propio.

2. **Paquete `@nodomics/hub`.** Define el puerto `Hub` (perfil, publicar, listar, buscar, obtener versión) y su adaptador `createSupabaseHub`. Los tests usan un adaptador en memoria, igual que `FlowLibrary`.
   - **Invariante 1:** `apps/web` puede depender también de `@nodomics/hub`.
   - **Invariante 6:** `hub → protocol`.
   - `@supabase/supabase-js` (MIT) es una dependencia de runtime nueva, solo de `@nodomics/hub`.
   - El hub **no es un motor**: no pasa por el NEP y nunca recibe datos de resultados.

3. **Modelo de datos** (esquema `public`, migraciones versionadas en `supabase/migrations/`):
   - `profiles(id = auth.users.id, handle unique, display_name, avatar_url, created_at)`.
     - `handle` cumple `^[a-z0-9-]{3,20}$` y se crea al primer inicio de sesión.
   - `publications(id, owner_id, slug, kind: 'flow' | 'node', title, description, tags text[], license, latest_version, created_at, updated_at)`.
     - `unique(owner_id, slug)`, y `slug` cumple `^[a-z0-9-]{1,30}$`.
   - `publication_versions(publication_id, version, flow jsonb, manifest jsonb null, snapshot_path text, has_state boolean, created_at)`.
     - `primary key(publication_id, version)`.
     - **Inmutables:** no hay `update` ni `delete`.
   - **Row Level Security:**
     - Lectura pública de todo.
     - Solo el dueño inserta y edita sus `publications` e inserta sus versiones.
     - Un perfil solo lo edita su dueño.

4. **Identidad de los nodos publicados.** El manifiesto publicado usa `id: "hub.<handle>.<slug>"`. Cumple `Id` del protocolo (`^[A-Za-z0-9_.-]{1,64}$`) y no choca con `mine.*`. La versión publicada es la del manifiesto (ADR 0016), y publicar exige que sea mayor que `latest_version`.

5. **Qué se publica:**
   - El `Flow` completo, con sus `customNodes`.
   - Para un nodo, también su manifiesto.
   - Antes de publicar, una función pura quita lo que no se comparte:
     - las referencias a archivos de datos (`sourceId` y archivos guardados);
     - los valores de credenciales. Por diseño ya no están en el flujo (ADR 0017); se verifica igual.
   - Todo se parsea con los esquemas del protocolo al leerlo del hub (parsear, no validar).

6. **Publicar con el estado actual (opcional).** Al publicar, el usuario elige entre dos opciones:
   - **Solo el flujo:** el preview muestra solo el grafo.
   - **Con el estado actual:** se publica, además, una **instantánea** de lo que el motor responde hoy para cada nodo:
     - la primera página de su resultado (máximo 100 filas) con su esquema;
     - su perfil;
     - su vista (gráfico);
     - sus figuras.
     - **Los archivos de origen nunca se publican.** Antes de confirmar, el diálogo dice que las filas visibles sí quedan públicas.
   - **Formato:** la instantánea es un JSON (`Snapshot`, parseado en el borde) en Storage (`snapshots/<publication>/<version>.json`, máximo 5 MB). `publication_versions.snapshot_path` apunta a ella.
     - **Toda versión tiene instantánea**, aunque se publique "solo el flujo": siempre lleva el catálogo de los manifiestos que el flujo usa, para que el preview dibuje los nodos sin conocer el catálogo del autor. El estado (`state`) es lo opcional; `publication_versions.has_state` lo indica sin descargar el JSON.
   - **Cómo se graba:** con las mismas peticiones que ya usa la vista previa (`data.page`, `data.profile`, `data.view`, `data.display` de `EngineSession`).
   - **Cómo se reproduce:** una `EngineSession` de solo lectura que responde desde la instantánea. La vista previa del hub reutiliza los mismos componentes, sin motor.
     - Pedir una página que no está grabada se muestra como "Vista limitada a las primeras 100 filas".
     - Ejecutar no está disponible.

7. **Interfaz:**
   - **Inicio de sesión** con GitHub, Google o un link por correo (Supabase Auth).
     - El SMTP incluido en Supabase permite muy pocos correos por hora. Para usuarios reales hace falta un SMTP propio (por ejemplo Resend), con un dominio verificado.
   - **Rutas:** `/hub` (búsqueda y tarjetas), `/u/<handle>` (perfil) y `/hub/<handle>/<slug>` (detalle con versiones). El link compartido sigue en el `#`.
     - Render reescribe todas las rutas a `/index.html`.
     - Las rutas usan un router propio y mínimo (`apps/web/src/routing/`: History API + `useSyncExternalStore`, unas 60 líneas). Se descartó `wouter` porque su licencia (Unlicense) no está en la lista permitida (MIT, Apache-2.0, BSD).
   - **Preview:** el `Canvas` en modo solo lectura (sin arrastrar, conectar ni editar).
   - **"Publicar"** en "Mis flujos": publica el flujo, o el nodo si el flujo tiene "Entrada de nodo".
   - **Agregar:**
     - Un flujo se abre como copia local, que se guarda como flujo nuevo (ADR 0015).
     - Un nodo se agrega a "Mis nodos" y desde ahí se usa como hoy (ADR 0016, punto 7). Se instala con los nodos propios del autor que usa por dentro (sus `customNodes`, de forma transitiva), para que funcione solo. Instalar una versión nueva reemplaza la anterior (mismo id).

8. **Seguridad al usar algo ajeno:**
   - Un flujo o nodo que viene del hub no usa credenciales guardadas hasta que el usuario lo confirma para ese flujo. Así se evita que una fuente API ajena envíe una credencial propia a su URL.
     - Por eso las referencias a credenciales (`secret` en los encabezados) y a archivos (`widget: "source"`) se quitan dos veces: al publicar y otra vez al abrir o instalar algo del hub, aunque la publicación las traiga.
   - Con el motor Python local se muestra un aviso: el código Python ajeno corre con los permisos del usuario.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Fork de Gitea o Forgejo con tema de Nodomics | Repos, forks y PRs ya hechos | Preview duplicado en otra pila; dos apps y dos sesiones; servidor con disco; PRs de código no aplican a flujos |
| GitHub como backend (un repo o gist por publicación) | Git real, sin base de datos propia | Exige cuenta de GitHub a analistas; OAuth con servidor; límites de la API |
| Cloudflare Workers + D1 + R2 | Lo más barato a escala | Auth y API propias: más trabajo para un hackathon |
| Firebase o Convex | Tiempo real cómodo | NoSQL o modelo propio; Convex sin auth incluida |
| Supabase (elegida) | Auth, Postgres con RLS, Storage y Realtime en uno; plan gratis | Se pausa tras una semana sin uso; dependencia de un proveedor |

## Consecuencias

- Nodomics deja de ser solo local: hay cuentas, datos en un servidor y contenido de terceros. Eso trae moderación (un botón "Reportar" como mínimo) y licencias (MIT por defecto, editable).
- Las instantáneas pueden exponer datos del usuario, así que siempre son opcionales y explícitas.
- Instalar sigue siendo copiar (ADR 0016). Una publicación borrada no rompe los flujos que la usan.
- Las versiones inmutables hacen reproducible cualquier flujo que use nodos del hub.
- Quedan fuera del MVP: estrellas, comentarios, forks con linaje, propuestas de cambio con diff visual, publicar los archivos de origen y DOI.
- Track Multiplayer: Supabase Realtime permite agregar después presencia o contadores en vivo sin otro servicio.

