# 0002. Los nodos se definen como datos, no como código de la aplicación

- **Estado:** aceptada

## Contexto

Los nodos deben poder ejecutarse en motores escritos en distintos lenguajes (TypeScript en el navegador, Python en local) y publicarse en un Hub comunitario.

## Decisión

Un nodo es un manifiesto JSON (`node.json`) con puertos tipados, parámetros en JSON Schema y una implementación declarativa: plantilla SQL, archivo Python, plantilla de vista Vega-Lite o un subflujo. El coordinador renderiza las plantillas; los ejecutores reciben tareas ya resueltas.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Nodos como funciones TypeScript | Flexibles, tipados | Un motor Python no puede ejecutarlos; publicar código TS de terceros es un riesgo |
| Nodos como datos (elegida) | Portables entre motores; publicables; el formulario se genera solo | Las plantillas son menos flexibles que código arbitrario (para eso existe el nodo Python) |

## Consecuencias

- Crear un nodo no requiere tocar la aplicación.
- Los parámetros se validan contra JSON Schema antes de renderizar, lo que también previene inyección SQL.
