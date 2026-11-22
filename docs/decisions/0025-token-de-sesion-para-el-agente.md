# 0025. El hub entrega el token de sesión al servicio del agente

- **Estado:** aceptada (decisión del líder)
- **Fecha:** 2026-11-21
- **Relacionada con:** ADR 0021 (autorización del agente) y ADR 0022 (feed).

## Contexto

El agente verifica a cada usuario con el token de acceso de Supabase (`/auth/v1/user`). La web no podía mandarlo: el puerto `Hub` no lo expone, y `main.tsx` pasaba un token vacío, así que el agente veía a todos como anónimos.

## Decisión

- `@nodomics/hub` agrega un puerto pequeño, `SessionToken { accessToken(): Promise<string | undefined> }`, aparte de `Hub` (interfaces chicas, CLAUDE.md §3).
- **El hub de Supabase** devuelve el `access_token` de la sesión actual, o `undefined` sin sesión.
- **El hub en memoria** no tiene autenticación real y siempre devuelve `undefined`.
- `main.tsx` se lo pasa al feed (`getAccessToken`). La interfaz nunca guarda ni muestra el token.

## Consecuencias

- El feed y el agente funcionan con la sesión del usuario en producción.
- El token solo sale hacia `VITE_AGENT_URL`, que el agente limita por CORS (`AGENT_ALLOWED_ORIGINS`).
