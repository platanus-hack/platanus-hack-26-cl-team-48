---
autor: sebas
fecha: 2026-11-21T16:45
para: todos
tipo: aviso
---
Nuevo layout del editor en `main` (`apps/web`). Dónde quedó cada cosa:

- **Barra de arriba:** nombre del flujo, "Opciones del flujo" (Nuevo, Importar, Exportar), deshacer/rehacer, motor, Compartir, Ejecutar y cuenta.
- **Riel de la izquierda** (`workspace/ActivityRail.tsx`): abre un panel lateral a la vez (`workspace/SidePanel.tsx`) con Nodos, Mis flujos, Mis nodos, Datos, Credenciales y Agente. Abajo están el hub y el tema. Ya no existe el diálogo "Mis flujos".
- **Parámetros** a la derecha, con pestañas Parámetros, Puertos e Historia (`params/NodeDetailTabs.tsx`).
- **Vista previa** "En panel": ahora queda acoplada bajo el lienzo.
- **Hub** en su propia pestaña (`/hub`, `hub/HubApp.tsx`). "Abrir una copia" abre el flujo en una pestaña nueva del editor, y "Agregar a Mis nodos" aparece solo en el editor abierto.

Son **maquetas**: se ven, pero no hacen nada todavía. Están marcadas con un recuadro morado punteado que dice "Maqueta: …".

- **Agente:** último botón del riel (`agent/AgentPanel.tsx`). Sus propuestas y el campo de mensaje están deshabilitados.
- **Historia:** tercera pestaña de Parámetros (`params/ParamsPanel.tsx`).
- **Para ti:** sección del hub bajo el buscador (`hub/HubPage.tsx`). Las tarjetas son ejemplos fijos.

Quien construya una de estas features la reemplaza en ese mismo lugar y quita su nota de maqueta.

Ojo: sin `apps/web/.env.local`, el hub corre en memoria **por pestaña**. Lo que publiques desde el editor no aparece en la pestaña del hub. Para probar el hub de punta a punta necesitas las claves (ver `2026-11-21-1550-claves-opcionales.md`).
