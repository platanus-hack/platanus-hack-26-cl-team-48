# 0024. El hub como página principal y el estado de publicación de cada flujo

- **Estado:** aceptada (decisión del líder)
- **Fecha:** 2026-11-21
- **Reemplaza:** el punto 5 del ADR 0023 (visibilidad privada o pública de cada flujo).

## Contexto

Con el ADR 0023, "Mis flujos" vive en la cuenta. Cada flujo tiene además un interruptor privado/público, y aparte están las publicaciones del hub (ADR 0018), inmutables y versionadas. Son dos ideas de "público" que no se conocen: no se sabe de qué flujo salió una publicación, ni si el flujo cambió desde que se publicó. El líder pidió que el hub sea lo principal y que al editor se entre desde un flujo propio.

## Decisión

1. **Un flujo es el borrador; publicar crea versiones públicas de él.**
   - El flujo guardado (tabla `flows`) es siempre privado. La columna `visibility` queda en `'private'` y la interfaz ya no la usa.
   - Se quitan "Hacer público" y "Hacer privado".
2. **Cada flujo guarda su última publicación**, dentro de su documento (no cambia el esquema de la base):
   - `published: { publicationId, handle, slug, version, fingerprint, hasChanges }`.
   - **Al publicar desde el editor**, se escribe con la huella (`fingerprint`) del flujo tal como se publicó, sin parámetros privados, y `hasChanges: false`.
   - **El guardado automático** recalcula `hasChanges`, comparando la huella del flujo limpio con la publicada. Lo hace el editor, porque es quien conoce el catálogo para limpiar los parámetros privados.
   - **Estado que muestra el hub:**
     - "Sin publicar".
     - "Publicado · vX.Y.Z".
     - "Cambios sin publicar".
3. **El hub es la página principal:**
   - `/` abre el hub (`/hub` sigue funcionando) y `/editor` abre el editor.
   - **Formas de abrir el editor:**
     - `/editor?flow=<id>` abre ese flujo.
     - `/editor?new` abre un lienzo vacío.
     - `/editor` solo abre el último flujo.
   - **Enlaces compartidos:**
     - Nuevos: `/editor#…`.
     - Viejos, `/#…`: siguen abriendo el editor.
   - Ir del hub al editor recarga la página en la misma pestaña.
4. **"Mis flujos" pasa al hub:**
   - Es una vista del panel lateral del hub, solo con sesión, junto a "Mis publicaciones", con un botón "Nuevo flujo".
   - Cada flujo muestra su estado. "Entrar" es la acción principal y "Copiar" la secundaria, debajo; además "Renombrar", "Exportar" y "Borrar".
   - El riel del editor pierde "Mis flujos".
5. **En la página de una publicación propia**, "Entrar" es la acción principal y "Copiar" la secundaria, debajo.
   - "Entrar" abre el flujo de origen.
   - **Publicaciones anteriores a este ADR** no tienen flujo de origen. Para ellas, "Entrar" crea un flujo propio con la versión que se está viendo, ya vinculado a la publicación, y lo abre.
   - En publicaciones ajenas no cambia nada: "Abrir una copia" sigue siendo la acción principal.
6. **La barra del hub pierde "Abrir el editor".** Al editor se entra desde un flujo propio o con "Nuevo flujo".

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Columna `source_flow_id` en `publications` | El vínculo queda en la base | Cambia el esquema del hub y su puerto; el estado igual necesita la huella del editor |
| Comparar contra la versión publicada al listar | Sin datos extra | Una descarga por flujo y la limpieza necesita el catálogo, que el hub no tiene |
| Ramas (varios borradores por flujo) | Flujo de trabajo tipo git | Mucho más alcance; "Copiar" ya permite bifurcar |

## Consecuencias

- El estado de publicación se ve en el hub sin descargar versiones.
- El vínculo vive en el documento del flujo. Si se borra el flujo, la publicación queda sin origen, y "Entrar" crea uno nuevo.
- Al editor se llega desde el hub: un enlace viejo a `/` que no sea compartido ahora abre el hub.
