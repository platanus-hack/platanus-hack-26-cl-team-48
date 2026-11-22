# 0031. Importador de funcionalidades desde GitHub

- **Estado:** propuesta
- **Fecha:** 2026-11-22
- **Relacionado con:** ADR 0019 (Servicio de agente), ADR 0021 (Autorización del agente), ADR 0026 (Servidor MCP del motor).

## Contexto

El usuario puede pedir al agente importar o reproducir funcionalidades que ya existen en código abierto en GitHub. Para lograrlo, el agente debe clonar el repositorio en un commit exacto, ejecutar el código original para obtener los resultados esperados (`expected`), construir un borrador en Nodomics usando nodos del catálogo y SQL, y verificar que el borrador produzca resultados idénticos (`observed`).

Ejecutar código ajeno de repositorios arbitrarios introduce riesgos de seguridad: el código podría intentar robar credenciales, acceder a recursos de otros usuarios o realizar acciones destructivas.

## Decisión

1. **Claude Code dentro de un Render Sandbox:** La clonación (`git clone --depth 1` al commit fijado), análisis de código, ejecución del código original e interacción con el motor Nodomics se ejecutan de manera aislada dentro de un Render Sandbox efímero con tiempo de vida limitado (10 minutos) que se destruye al terminar.
2. **Token de trabajo y proxy MCP:** Para cumplir con la regla de no exponer secretos ni JWTs de usuario dentro del sandbox (R6), el servicio del agente emite un token de trabajo aleatorio de un solo uso guardado en memoria. Claude Code interactúa con Nodomics a través de un proxy (`/sandbox/mcp`) que valida el token de trabajo, restringe las herramientas permitidas (bloqueando `flows.apply` y `flows.publish`) y reenvía las solicitudes al MCP con el JWT real del usuario.
3. **Clave del modelo dedicada con tope (compromiso aceptado):** En lugar de intermediar todas las llamadas al modelo a través de un proxy LLM propio, el sandbox recibe una clave de API dedicada (`SANDBOX_ANTHROPIC_API_KEY`) con un tope de gasto estricto configurado en la consola de Anthropic.
4. **Estado comprobado por el agente (sin re-verificación):** El reporte estructurado producido en el sandbox (`report.json`) incluye las filas esperadas del código original y las observadas en el borrador. El servicio no re-ejecuta DuckDB/MCP, sino que determina el estado de forma determinista mediante `decideStatus` y `compareRows`, etiquetando el resultado como `"comprobado por el agente en el sandbox"`.
5. **Persistencia de procedencia (`import_report`):** Se agrega la columna `import_report jsonb` a la tabla `agent_proposals` mediante migración. La respuesta de `/agent/requests` y la propuesta guardada incluyen el reporte completo con repositorio, commit, licencia y casos de verificación.
6. **Configuración opcional:** Las variables `RENDER_SANDBOX_API_KEY`, `RENDER_WORKSPACE_ID` y `SANDBOX_ANTHROPIC_API_KEY` son opcionales; si no están presentes, el agente funciona con normalidad sin exponer la herramienta `import.from_github`.

## Consecuencias

- **Positivas:**
  - El código arbitrario se ejecuta en un sandbox completamente aislado con borrado automático.
  - La procedencia de las transformaciones queda auditada y visible en las propuestas del usuario.
  - El agente puede importar librerías complejas (como Pandas) generando nodos SQL equivalentes.
- **Compromisos:**
  - La clave dedicada en el sandbox asume el riesgo acotado a su límite de gasto mensual si es comprometida durante la vida del sandbox.
  - La confianza de verificación recae en las comparaciones de filas entre la ejecución original y el borrador dentro del sandbox.
