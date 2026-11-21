# 0015. Guardado local de flujos, datos y credenciales

- **Estado:** aceptada

## Contexto

Hoy un flujo vive solo en memoria: al recargar se pierde, salvo que se exporte (`.nodo.json`) o se comparta por enlace. El usuario pidió guardar en el navegador flujos, nodos propios y datos, con guardado automático, y ver lo guardado en la interfaz. No quiere guardar archivos de datos grandes: como mucho una referencia al archivo o el contenido si no pasa de cierto tamaño.

Hay un detalle del motor que condiciona todo: los parámetros de fuente (`x-nodomics.widget: "source"`) guardan el `sourceId` que devolvió `source.add`, y ese id solo vale en la sesión del motor que lo creó. Al recargar o cambiar de motor apunta a nada, o peor, a otro archivo con el mismo id.

## Decisión

1. **IndexedDB, solo navegador.** La interfaz guarda en una base `nodomics` con tres almacenes:
   - `flows`: `{ id, name, flow, files, updatedAt, node? }`. `files` asocia cada `sourceId` usado en el flujo con la clave de su archivo; `node` lo usa el ADR 0016.
   - `files`: `{ key, name, size, savedAt, bytes?, handle? }`.
   - `secrets`: las credenciales del ADR 0017.

   Todo lo leído se parsea una vez en el borde (esquema `Flow` del protocolo para los flujos); lo inválido se descarta con aviso. Si IndexedDB no está disponible, la app funciona sin guardar y lo avisa una vez. El acceso vive en un adaptador (`FlowLibrary`) inyectado en `main.tsx`; los tests usan uno en memoria.
2. **Guardado automático.** Cada cambio del flujo se guarda un segundo después del último cambio. Un flujo vacío no se guarda. Al abrir la app se abre el flujo modificado más recientemente, salvo que la URL traiga un flujo compartido; ese se abre sin guardar hasta que se edite, y entonces se guarda como un flujo nuevo.
3. **Archivos de datos.** Al subir un archivo:
   - **Hasta 10 MB:** se guarda su contenido.
   - **Más de 10 MB:** se guarda el `FileSystemFileHandle` si el navegador lo dio (Chrome y Edge, al elegirlo con el selector del sistema). Si no, solo nombre y tamaño.
4. **Reconexión de fuentes.** Al conectar un motor o abrir un flujo, cada parámetro de fuente cuyo `sourceId` no viene de esta sesión se vuelve a cargar con `source.add` desde lo guardado, y el parámetro se reescribe con el id nuevo, sin entrar al historial de deshacer.
   - Si solo hay un handle, se pide permiso de lectura; el navegador exige un clic, así que el campo muestra "Permitir acceso".
   - Si solo hay nombre y tamaño, el campo muestra "Vuelve a elegir el archivo".
5. **"Mis flujos".** Un botón de la barra abre una pantalla con pestañas:
   - **Flujos:** abrir, duplicar, renombrar, exportar y borrar, más "Nuevo flujo".
   - **Nodos:** los flujos que son nodos, según el ADR 0016.
   - **Datos:** archivos guardados con su tamaño; se pueden borrar.
   - **Credenciales:** ADR 0017.

   La barra muestra el nombre del flujo, editable, y el estado "Guardado" o "Guardando…".
6. **"Convertir en nodo" desaparece** (ADR 0016). Los nodos que creó siguen en `localStorage` (ADR 0009) y se siguen mostrando en "Mis nodos" mientras existan; no se crean nuevos.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| `localStorage` | Síncrono, ya se usa | 5 MB en total y solo texto: no caben archivos ni handles |
| Guardar siempre el archivo completo | Siempre se puede reabrir | Llena la cuota del sitio con datos que el usuario no quiere duplicar |
| Guardar solo la ruta | Sin peso | El navegador no da rutas; solo handles, y solo en Chrome y Edge |
| Elegir el `sourceId` desde la interfaz | Sin reconexión | Cambia el NEP; los ids siguen sin valer en otro motor |

## Consecuencias

- **Por navegador:** todo es por navegador y por dispositivo, y se pierde si se borran los datos del sitio. Exportar sigue siendo la forma de llevar un flujo a otro lado.
- **Sin cambios en el NEP:** la reconexión de fuentes también arregla cambiar de motor con archivos subidos.
- **Pruebas:** el adaptador de IndexedDB se prueba con `fake-indexeddb` (dependencia de desarrollo, Apache-2.0).
