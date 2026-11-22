# Nodomic

**Análisis de datos que se arma con nodos como LEGO, se comparte como código y lo construye un agente contigo.**

La mayoría de quienes analizan datos no programan: viven en Excel, con análisis frágiles, difíciles de auditar y de compartir. Nodomic les da un lienzo visual donde conectan fuentes, transformaciones y vistas con nodos, sin escribir código.

## Qué se puede hacer

- **Armar flujos en el navegador.** Fuentes, filtros, uniones, agrupaciones, fórmulas, SQL, Python y gráficos, conectados en un lienzo. Todo corre en tu navegador con DuckDB y Pyodide: tus datos no salen de tu máquina.
- **Guardar y publicar.** Tus flujos viven en tu cuenta. Al publicarlos en el hub crean versiones públicas, y el hub muestra si un flujo tiene cambios sin publicar.
- **Reutilizar.** Cualquiera puede abrir una copia de un flujo publicado, o agregarlo a sus nodos y usarlo como un nodo dentro de otro flujo.
- **Construir con un agente.** Un agente con Claude arma flujos a través de un servidor MCP del motor: trabaja sobre un borrador aislado, lo ejecuta para probarlo y te propone los cambios para que decidas cuáles aplicar.
- **Encontrar personas.** El feed "Para ti" recomienda con quién colaborar según lo que cada uno ofrece y busca.

## Cómo está hecho

- **Interfaz:** React. Habla solo un protocolo propio (NEP) con motores intercambiables.
- **Motor:** un coordinador en TypeScript con ejecutores de DuckDB-WASM y Pyodide.
- **Hub y cuentas:** Supabase, con seguridad por filas.
- **Agente:** servicio en Node con Claude, con memoria temporal y embeddings de Voyage.
- **MCP del motor:** ejecuta los borradores en un worker aislado, con la identidad de cada usuario.

Prueba en https://nodomics-web.onrender.com
