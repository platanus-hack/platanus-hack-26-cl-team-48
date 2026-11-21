# 0023. Flujos guardados en Supabase, privados o públicos

- **Estado:** aceptada (decisión del líder)
- **Fecha:** 2026-11-21
- **Reemplaza:** el punto 1 del ADR 0015 en lo que toca a los flujos (`flows`). Archivos y credenciales siguen como dice el ADR 0015.

## Contexto

Con el ADR 0015, "Mis flujos" vive en IndexedDB: es por navegador y por dirección. Un flujo guardado en `localhost` no aparece en el sitio publicado, ni en otro navegador. Desde el ADR 0018 hay cuentas en Supabase, y el líder decidió que los flujos ya no se guarden en local: solo en Supabase, privados o públicos.

## Decisión

1. **Tabla `flows`** (migración `supabase/migrations/20261121220000_flows.sql`):
   - Columnas: `id text primary key`, `owner_id uuid` (por defecto `auth.uid()`), `visibility text` (`'private' | 'public'`, por defecto `'private'`), `document jsonb`, `updated_at timestamptz`.
   - `document` es el flujo guardado de la interfaz (nombre, `Flow`, archivos asociados y datos de nodo del ADR 0016). La interfaz lo parsea al leerlo, porque es el borde (parsear, no validar).
   - **Row Level Security:**
     - El dueño lee, crea, edita y borra sus flujos.
     - Cualquiera lee un flujo público.
     - Un flujo es mutable: el guardado automático lo reescribe. Publicar en el hub (ADR 0018) sigue aparte, con versiones inmutables.
2. **Puerto `FlowStore` en `@nodomics/hub`**, separado de `Hub` para que las interfaces sigan siendo pequeñas:
   - `listOwnFlows`, `readFlow`, `saveOwnFlow`, `deleteOwnFlow`.
   - Sin sesión, responden `signed-out`.
   - `createSupabaseHub` y `createMemoryHub` implementan los dos puertos.
3. **En la interfaz**, `FlowLibrary` sigue siendo el único puerto que usan los stores:
   - Los flujos van al `FlowStore`.
   - Archivos y credenciales siguen en IndexedDB. Las credenciales nunca salen del navegador.
   - Sin sesión, la lista sale vacía con el aviso `signed-out`.
4. **Sin sesión se puede editar y ejecutar, pero no se guarda.**
   - La barra dice "Entra para guardar" y "Mis flujos" invita a entrar.
   - Al entrar, el flujo abierto se guarda en la cuenta, o, si el lienzo está vacío, se abre el último flujo de la cuenta.
   - Entrar con GitHub o Google navega fuera de la página. Para no perder lo hecho sin sesión, al salir de la página sin sesión el flujo abierto queda en `sessionStorage` (solo esa pestaña, sin listarse en "Mis flujos"); al volver se abre y, con sesión, se guarda en la cuenta.
   - Al salir de la cuenta, la lista se vacía. Si el flujo abierto estaba guardado en la cuenta, el lienzo se vacía también: así no se copia a la próxima cuenta que entre, ni se duplica al volver a entrar. Un flujo hecho sin sesión se queda en el lienzo.
   - Solo cuenta como salir una sesión que termina, no una consulta del perfil que falla.
5. **Visibilidad:** cada flujo de "Mis flujos" muestra si es privado o público y se cambia con "Hacer público" o "Hacer privado". Todo flujo nuevo es privado, y también toda copia hecha con "Duplicar". El guardado automático no envía la visibilidad: solo "Hacer público" y "Hacer privado" la cambian, para que un guardado no pise un cambio de visibilidad hecho al mismo tiempo.
6. **Los flujos locales existentes se ignoran.** El almacén `flows` de IndexedDB ya no se lee ni se escribe. Quien quiera conservar uno lo exporta antes desde una versión anterior.
7. **Sin claves de Supabase**, el hub en memoria trae una cuenta local de prueba. Así se puede entrar y guardar en desarrollo y en los e2e, aunque todo se pierde al recargar.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Seguir en IndexedDB y sincronizar con Supabase | Funciona sin sesión | Dos fuentes de verdad, conflictos de sincronización; el líder pidió no guardar en local |
| Público = publicación del hub | Un solo concepto de público | Las publicaciones son inmutables y versionadas; el guardado automático necesita una fila mutable |
| Columnas tipadas en vez de `document jsonb` | Consultas por nombre en la base | El hub tendría que conocer archivos y datos de nodo de la interfaz; hoy nadie consulta por esos campos |

## Consecuencias

- "Mis flujos" sigue a la cuenta en cualquier navegador y dirección.
- Sin sesión no se guarda nada. Es un cambio visible para quien usaba la app sin cuenta.
- Los archivos de datos siguen por navegador: un flujo abierto en otro navegador pide volver a elegir el archivo.
- Un flujo público se puede leer por su id. Mostrar flujos públicos en el perfil o compartirlos por id queda para después.
- Supabase plan gratis: cada guardado automático es una escritura (como mucho una por segundo por pestaña).
