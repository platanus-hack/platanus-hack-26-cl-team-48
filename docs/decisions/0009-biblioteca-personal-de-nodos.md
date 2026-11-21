# 0009. Biblioteca personal de nodos en el almacenamiento del navegador

- **Estado:** aceptada

## Contexto

"Convertir en nodo" crea un manifiesto de flujo que vive en `flow.customNodes` del flujo que lo creó. El guion de la demo (paso 4) pide reutilizarlo en otro flujo. La PoC no tiene cuentas ni backend, y el usuario eligió persistir esos nodos en el navegador.

## Decisión

La interfaz guarda en `localStorage`, bajo una clave versionada, una **biblioteca personal**: la lista de manifiestos (`NodeManifest`) que el usuario creó con "Convertir en nodo".

- Al convertir, el manifiesto se agrega al flujo (como hoy) **y** a la biblioteca personal.
- "Mis nodos" muestra los nodos de la biblioteca personal y los de `flow.customNodes`, sin duplicar por `id`.
- Al agregar al lienzo un nodo de la biblioteca personal, su manifiesto se copia en `flow.customNodes`: un flujo exportado o compartido sigue siendo autocontenido y no depende del navegador de quien lo creó.
- Lo leído de `localStorage` cruza un borde: se parsea una vez con el esquema `NodeManifest` del protocolo; lo inválido se descarta y se avisa, nunca rompe la app. Si el almacenamiento no está disponible (modo privado, bloqueado), la biblioteca funciona solo en memoria.
- El acceso al almacenamiento vive en un adaptador inyectado en la raíz de composición (`main.tsx`); el resto de la interfaz no toca `localStorage`.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Solo memoria de la sesión | Sin persistencia ni ADR | Se pierde al recargar; no cumple "otro flujo" de forma útil |
| IndexedDB | Más capacidad | Asíncrono y más código para unos pocos manifiestos |
| Backend / Hub | Compartible entre dispositivos | Fuera del alcance de la PoC |

## Consecuencias

Los nodos personales son por navegador y dispositivo; se pierden si se borra el almacenamiento del sitio. El Hub real (fuera de la PoC) reemplazará este adaptador sin cambiar el resto de la interfaz. La clave versionada permite migrar el formato.
