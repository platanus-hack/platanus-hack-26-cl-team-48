# Nodomics — Uso sencillo: web, pero todo corre en local

## Principio

> **Abres un link y funciona. Tus datos nunca salen de tu computador. Si algún día necesitas más potencia, instalas un motor con un clic, y la misma página lo usa sola.**

La interfaz siempre es la web (`nodomics.app`). Lo que cambia es **dónde se ejecutan los nodos**, y el usuario no tiene que pensar en eso.

## Motor progresivo en 3 niveles

| Nivel | Qué instala el usuario | Dónde corre | Para quién |
|---|---|---|---|
| **0 — Navegador** | Nada. Abre el link. | En la pestaña: DuckDB-WASM (SQL/tablas) + Pyodide (Python) dentro de Web Workers | El 80% de los usuarios no técnicos, aulas, demos y "remixar" un flujo publicado |
| **1 — Motor local** | Una app pequeña con un clic (icono en la barra de tareas), o `uvx nodomics` / `npx nodomics` para técnicos | Proceso Python nativo en `localhost`; la web se conecta a él | Datos grandes (>1–2 GB), cualquier librería de pip, bases de datos, APIs sin CORS, ejecución programada |
| **2 — Nube / equipo** (pago, opcional) | Nada | Servidores de Nodomics o de la institución | Colaborar, compartir ejecuciones, tableros siempre activos |

**La misma página y el mismo flujo funcionan en los tres niveles.** No hay una "versión de escritorio" distinta que mantener.

Precedentes de cada pieza:
- Nivel 0: JupyterLite y marimo (notebooks Python 100% en el navegador), Observable (DuckDB-WASM).
- Nivel 1: ComfyUI y n8n (`npx n8n` levanta un servidor local y abres la interfaz en el navegador), Ollama (app en la barra de tareas que expone una API local).

## Cómo decide dónde corre cada nodo

Cada nodo declara en su manifiesto lo que necesita:

```yaml
runtime: python
requires:
  packages: [scikit-learn]      # ¿existe para Pyodide?
  network: false                # ¿necesita internet o una base de datos?
  min_memory: 500MB
targets: [browser, local]       # dónde puede correr
```

Un planificador decide por nodo:
- Si todo puede correr en el navegador, se queda ahí.
- Si un nodo necesita algo que el navegador no puede hacer (una librería nativa, una conexión a Postgres, más memoria), la interfaz muestra una insignia **"Necesita motor local"** y un botón **"Instalar motor (1 clic)"**.
- Con el motor instalado, la web lo detecta sola y le pasa esos nodos. El resto puede seguir en el navegador. Los datos viajan entre ambos en formato Arrow.

El usuario solo ve un indicador: 🟢 *corre en tu navegador* · 🔵 *corre en tu motor local* · 🟣 *corre en la nube*.

## Detalles que hacen que se sienta simple

**Primer minuto**
- **Sin cuenta para empezar.** La cuenta solo se pide para publicar en el Hub.
- **Arrastra un CSV o Excel a la página** → se crea el nodo fuente, aparece la vista previa y se sugiere un gráfico. Primer resultado en menos de 30 segundos.
- **Plantillas por profesión** en la pantalla de inicio ("Analizar una encuesta", "Ventas por mes", "Curva de crecimiento bacteriano").

**Archivos y guardado (local-first)**
- Los flujos se guardan en el navegador (OPFS/IndexedDB) automáticamente, sin botón "guardar".
- Opción **"Vincular una carpeta"** (File System Access API): el flujo se guarda como `.nodo.json` en tu carpeta, al lado de tus datos. Así se puede respaldar, enviar por correo o versionar con git.
- **Los datos no se copian a ningún servidor.** Se leen desde el archivo original del usuario.
- Credenciales (API keys, contraseñas de bases de datos) guardadas cifradas en el equipo.

**Rendimiento**
- Toda la ejecución ocurre en **Web Workers**, así la interfaz nunca se congela.
- **Caché por nodo**: al cambiar un parámetro solo se recalcula lo que está aguas abajo.
- Pyodide (~10 MB o más) se **descarga en diferido**, solo cuando aparece el primer nodo de Python, y queda guardado por un service worker. Los nodos SQL arrancan al instante.
- **Instalable como PWA** → icono en el escritorio y funciona sin internet.

**Nodos de la comunidad**
- Al abrir un flujo ajeno, los nodos que faltan se descargan solos (modelo ComfyUI).
- Cada nodo corre aislado en su Worker con **permisos explícitos** ("este nodo quiere acceder a internet: ¿permitir?"). En el navegador el aislamiento lo da el propio navegador, y eso es una ventaja de seguridad sobre ejecutar código ajeno en el escritorio.

## Límites del modo navegador (y cómo se resuelven)

| Límite | Detalle | Solución |
|---|---|---|
| Memoria | DuckDB-WASM está limitado a ~4 GB por WebAssembly de 32 bits, y el navegador puede imponer menos | Para datos grandes, motor local. Memory64 podría ampliar el límite a futuro |
| Librerías Python | Pyodide trae numpy, pandas, scipy, scikit-learn, statsmodels y matplotlib, pero no todo lo que hay en pip (en especial, librerías con código nativo no portadas) | Marcar esos nodos como "solo motor local" |
| Bases de datos | El navegador no puede abrir conexiones TCP a Postgres o MySQL | Motor local (o nube) |
| APIs / URLs remotas | Muchas APIs bloquean peticiones desde navegadores (CORS) | Motor local; opcionalmente un proxy de Nodomics para URLs públicas, avisando de lo que implica para la privacidad |
| Ejecución programada | La pestaña tiene que estar abierta | Motor local o nube |

## Riesgo a considerar: la conexión web ↔ motor local

- Desde Chrome 142 (octubre 2025), cuando una página web intenta hablar con `localhost`, Chrome **pide permiso** ("Acceso a la red local"). Es un solo clic, pero hay que diseñarlo: explicar antes por qué aparece el aviso y qué hacer si alguien lo bloqueó.
- El motor local tiene que **autenticar a la página**: emparejar con un token la primera vez y aceptar solo el origen `nodomics.app`. Si no, cualquier sitio web podría ordenarle ejecutar código.
- Alternativa sin ese aviso: que el motor local sirva su propia interfaz (`http://localhost:XXXX`, como hacen n8n y ComfyUI). Es más robusto, pero se pierde la experiencia de "abro nodomics.app y está todo".

## Recomendación para el MVP

1. **Solo nivel 0 (navegador)** en el MVP. Es la experiencia más simple, cuesta cero en servidores y basta para CSV/Excel de hasta cientos de MB, que cubre la mayoría de los casos de no técnicos.
2. Diseñar desde el día uno la **abstracción de motor** (`targets` en el manifiesto y comunicación con Arrow), para que el nivel 1 se agregue sin reescribir nada.
3. Nivel 1 en la fase 2, empezando por `uvx nodomics` para técnicos y después la app de un clic.
4. Prueba de concepto clave: un flujo de 5 nodos (CSV → filtro → agrupación → Python → gráfico) con 1M de filas, todo en el navegador, en menos de 3 segundos.

## Fuentes
- [Chrome: Local Network Access](https://developer.chrome.com/blog/local-network-access), [explicación del aviso en Chrome 142](https://piunikaweb.com/2026/02/09/chrome-local-network-permission-explained/), [problemas conocidos para desarrollo local (Adobe)](https://developer.adobe.com/express/add-ons/docs/guides/getting_started/local_development/known_issues_limitations)
- [DuckDB-WASM: documentación y límites](https://duckdb.org/docs/current/clients/wasm/overview), [discusión sobre Memory64](https://hn.svelte.dev/item/43599613)
