---
autor: sebas
fecha: 2026-11-21T23:59
para: todos
tipo: aviso
---
Ya está en `main` (y desplegado en https://nodomics-web.onrender.com):

**El hub es la página principal (ADR 0024).**

- `/` abre el hub y `/editor` el editor (`/editor?flow=<id>`, `/editor?new`). `/hub` y los enlaces viejos `/#…` siguen funcionando.
- "Mis flujos" pasó al hub, como vista de Explorar (solo con sesión). Cada flujo muestra "Sin publicar", "Publicado · vX" o "Cambios sin publicar", con "Entrar" (principal) y "Copiar" (secundaria).
- El riel del editor y la barra del hub ya no tienen "Mis flujos" ni "Abrir el editor".
- "Abrir una copia" y "Agregar a Mis nodos" piden entrar y, al volver, hacen la acción elegida.
- Los flujos guardados son siempre privados: publicar crea versiones públicas y el flujo guarda su última publicación (`published` en el documento).

**El feed y el agente de Arturo y Gabriel están integrados** (rama `gabriel/agent-feed-integracion`).

- `HubPage` muestra `ForYouSection` y `PeopleSection`, y `main.tsx` envuelve el hub en `FeedContext`.
- Sin `VITE_AGENT_URL` el feed corre en memoria, y así está desplegado por ahora.
- Falta, antes de usar el agente en producción: aplicar sus migraciones de Supabase (`agent_*`, `profile_cards`) y crear el servicio `nodomics-agent` de `render.yaml` con sus claves.

Si tu rama toca `HubPage`, `HubApp`, `PublicationPage`, `main.tsx` o `messages.ts`, rebasa sobre `main` antes de seguir.
