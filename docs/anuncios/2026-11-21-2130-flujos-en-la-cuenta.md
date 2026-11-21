---
autor: sebas
fecha: 2026-11-21T21:30
para: todos
tipo: aviso
---
Desde ahora "Mis flujos" se guarda solo en la cuenta (Supabase), ya no en el navegador (ADR 0023, tabla `flows`). Ya está en `main`.

- **Sin sesión** se puede editar y ejecutar, pero no se guarda: la barra dice "Entra para guardar".
- **Sin sesión se ocultan** "Mis flujos" y "Agente" en el riel, "Publicar en el hub…" en Compartir y "Mis publicaciones" en el hub. Si construyes algo que necesita cuenta, ocúltalo igual sin sesión (`useHubProfile()` en `hub/hub-context.ts`).
- **Archivos de datos y credenciales** siguen en el navegador (IndexedDB).
- **El hub en memoria** (sin `apps/web/.env.local`) trae una "Cuenta local" para entrar y guardar; se pierde al recargar.
- **Los e2e** corren siempre con el hub en memoria, aunque tengas claves en `.env.local` (`tests/e2e/playwright.config.ts`).
- **En el código:** `FlowStore` en `@nodomics/hub` y `createCloudFlowLibrary` en `apps/web/src/library/`.

Lo próximo, en camino: el hub pasa a ser la página principal, y "Mis flujos" se muestra ahí con su estado de publicación. Lo aviso cuando esté.
