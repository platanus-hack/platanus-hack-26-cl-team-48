# 0028. Ajustes del hosteo a la API real de Render

- **Estado:** aceptada (decisión del líder)
- **Fecha:** 2026-11-22
- **Reemplaza en parte a:** ADR 0027 §2 y §4 (solo los puntos de abajo; el resto sigue vigente).

## Contexto

Al implementar `apps/deploy` se comparó el contrato del ADR 0027 con la documentación de la API de Render y aparecieron cuatro diferencias.

## Decisión

1. **Región solo al crear.** El `PATCH /services/{id}` no acepta `region`, así que solo se manda en `create`.
2. **`buildCommand` obligatorio en Nativo.** Render lo exige en builds nativos. Sin él, el plan responde `INVALID_SPEC`. En Estático sigue siendo opcional.
3. **`autoDeployTrigger: "off"`** reemplaza a `autoDeploy: "no"`, que Render marca como obsoleto.
4. **Nombre único del servicio:** `nd-<8 caracteres del id del usuario>-<id del nodo saneado, máx. 12>-<6 hex del SHA-256 del id del flujo>`. Render exige nombres únicos por cuenta, y con el formato anterior chocaban dos flujos del mismo usuario con un nodo del mismo id.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Un `buildCommand` por defecto según el runtime | El usuario escribe menos | Comportamiento mágico que puede no servir para su proyecto |
| El id del despliegue en el nombre | Siempre único | El nombre cambiaría si se borra y se vuelve a crear; el hash del flujo es estable |

## Consecuencias

- Un Servicio Nativo pide dos comandos (build e inicio). El formulario lo dice en la descripción del campo.
- La URL pública (`https://<nombre>.onrender.com`) incluye el hash del flujo.
