# 0035 — Inicio de sesión con correo y contraseña

- **Estado:** aceptada
- **Fecha:** 2026-11-22

## Contexto

El hub permite entrar con GitHub, Google o un enlace por correo (ADR 0018, punto 7). El enlace
depende del SMTP incluido en Supabase, que manda muy pocos correos por hora, y obliga a salir de la
app para entrar. Hace falta una opción clásica que funcione sin esperar un correo.

## Decisión

`SignInMethod` (`packages/hub`) suma dos variantes, como una opción más junto a las existentes:

| Variante | Qué hace en Supabase |
|---|---|
| `{ kind: "password", email, password }` | `auth.signInWithPassword` |
| `{ kind: "sign-up", email, password }` | `auth.signUp` (con `emailRedirectTo`) |

- Credenciales incorrectas o una cuenta que ya existe se devuelven como `HubError` `invalid`; otros
  fallos, como `unavailable`.
- Si el proyecto pide confirmar el correo, `sign-up` termina sin sesión: la interfaz lo detecta con
  `currentProfile()` y pide revisar el correo.
- El perfil se crea igual que con los otros métodos (trigger `on_auth_user_created`).
- El hub en memoria no guarda contraseñas: trata ambas variantes como el enlace por correo.

## Consecuencias

- El proveedor Email de Supabase Auth debe tener habilitadas las contraseñas (lo está por defecto).
- La política de contraseñas (largo mínimo, filtración) la aplica Supabase, no la interfaz.
- Crear cuenta con confirmación de correo sigue dependiendo del SMTP (ver ADR 0018).
