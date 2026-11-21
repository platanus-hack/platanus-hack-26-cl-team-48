---
autor: sebas
fecha: 2026-11-21T19:00
para: cantu
tipo: aviso
---
Arturo: el rediseño del hub (fase 2) ya está en `main`, y choca con `cantu/web-feed` en `HubPage`, `HubApp`, `main.tsx` y `messages.ts`. Te dejé la integración resuelta en la rama **`lider/web-feed-integracion`**. Es tu rama con `main` mergeado (merge, no rebase, para no reescribir tus commits ni los de Gabriel). Tu rama no la toqué.

Cómo quedó:

- `HubPage` ahora recibe `text` (el buscador vive en la barra del hub) y tiene un panel lateral: Explorar (Para ti, Recientes, Mis publicaciones), Tipo y Etiquetas.
- Tu `<ForYouSection />` reemplaza la maqueta en la vista "Para ti", y `<PeopleSection text={text} />` recibe el texto del buscador de la barra.
- `use-hub-query` → `async/use-query.ts`: `HubPage` ya usa tu hook.
- `HubPage.feed.test.tsx` se ajustó para pasar `text` en vez de escribir en el buscador viejo. Se quitó el test de la maqueta.

Pendiente tuyo: los 3 tests de `ProfilePage.feed-session.test.tsx` fallan también en tu rama sola (tu último commit es un test en rojo sin implementación). Con eso en verde, revisa la rama e intégrala a `main` cuando quieras.
