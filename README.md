# Nodomics

<img src="./docs/design-system/assets/knot-mark.svg" width="72" alt="Símbolo de Nodomics: dos aros entrelazados">

Nodomics es un espacio para que personas que conocen su oficio, aunque no programen, compartan herramientas que les funcionan. Puedes partir del trabajo de un colega, ver qué reglas utiliza y probar una adaptación con datos que conoces.

**[Abrir Nodomics](https://nodomics-web.onrender.com/)** · Platanus Hack 26, Santiago · Track Multiplayer

## Cómo se usa

1. **Encuentra un punto de partida.** En el hub puedes explorar lo que publicó la comunidad, abrir una copia de un flujo, agregar un nodo a tu biblioteca o crear un flujo propio.
2. **Entiende y adapta la herramienta.** En el editor, cada nodo representa un paso concreto, como leer una tabla, filtrar mediciones o calcular un resultado. Puedes inspeccionar sus entradas y salidas, cambiar una regla y ejecutar el flujo. El agente puede preparar cambios en un borrador para que los revises.
3. **Comparte lo que aprendiste.** Tu flujo de trabajo es privado. Cuando decides compartirlo, publicas una versión en el hub para que otra persona pueda probarla, reutilizar una pieza o adaptarla a su contexto.

Por ejemplo, una profesora comparte un flujo para analizar el consumo eléctrico de la escuela. Un estudiante descubre que la regla de limpieza descarta las lecturas de cero junto con las vacías. Con los datos `[12, 0, vacío, 7]`, el curso puede comprobar el cambio: el cero debe conservarse y solo falta una medición. La corrección puede servirle a la siguiente clase.

## Pruébalo en local

Necesitas Node.js 24 o superior y pnpm 10.28.1. Desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre la URL que indique Vite. Puedes explorar el editor y el hub en memoria. Para usar cuentas y publicaciones persistentes, copia [la configuración de ejemplo](apps/web/.env.example) a `apps/web/.env.local` y completa los valores públicos de Supabase. Para conectar el agente, configura también `VITE_AGENT_URL` y sigue la [guía del servicio](apps/agent/README.md).

## Sobre el proyecto

El equipo desarrolla el motor de nodos, el editor visual y las herramientas con las que el agente trabaja sobre los flujos. La [arquitectura](docs/engineering/arquitectura.md) describe cómo se conectan. El símbolo de los dos aros pertenece al [sistema de diseño del proyecto](docs/design-system/README.md).

**Equipo 48:** [Jesus Gabriel Gudiño Lara](https://github.com/Gabriels114), [Diego Sebastian Cruz Cervantes](https://github.com/SebasCrucer) y [Arturo Cantú Olivarez](https://github.com/Cantuuuu).

Para revisar el repositorio en profundidad, la [guía técnica de Nodomics](docs/engineering/guia-tecnica.md) recorre el editor, el motor, la colaboración, el agente, el importador de GitHub y el despliegue, con enlaces al código y a las pruebas.
