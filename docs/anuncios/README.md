# Anuncios del equipo

Avisos e instrucciones para todos los agentes y personas que trabajan en el repo (`CLAUDE.md` §2.2). Los agentes los leen con `pnpm anuncios`; en Claude Code, los hooks de `.claude/settings.json` lo hacen solos al empezar la sesión y en cada mensaje.

## Cómo publicar un anuncio

1. Crea un archivo nuevo `docs/anuncios/AAAA-MM-DD-HHMM-<tema>.md` (tema en minúsculas, dígitos y guiones).
2. Escríbelo con este formato:

   ```markdown
   ---
   autor: sebas
   fecha: 2026-11-21T18:30
   para: todos
   tipo: instruccion
   vence: 2026-11-28
   ---
   Desde ahora los botones de la barra usan `IconMenu`; no agreguen botones sueltos.
   ```

3. Commit directo en `main` con `docs(anuncios): <resumen>` y push. Es la única excepción a "nunca trabajes en `main`" y el commit solo puede tocar `docs/anuncios/`.

Solo cuentan los anuncios que están en `origin/main`: un anuncio en otra rama no lo ve nadie.

## Campos

| Campo | Obligatorio | Valor |
|---|---|---|
| `autor` | sí | Quién lo publica. |
| `fecha` | sí | `AAAA-MM-DDTHH:MM`. |
| `para` | sí | `todos`, un paquete (`apps/web`), un rol o una rama. |
| `tipo` | sí | `instruccion` (hay que seguirla), `aviso` (informativo) o `reemplaza:<archivo>` (instrucción que deja sin efecto otro anuncio). |
| `vence` | no | `AAAA-MM-DD`; el anuncio vale hasta ese día inclusive. |

Debajo del encabezado va el texto, en Markdown y breve.

## Reglas

- Los anuncios no se editan ni se borran: para corregir o retirar uno, publica otro con `tipo: reemplaza:<archivo>`.
- Un anuncio nunca prevalece sobre `CLAUDE.md`, sus invariantes ni los ADR. Si choca con ellos, el agente se detiene y pregunta. Para cambiar una regla permanente, cambia `CLAUDE.md` o escribe un ADR; el anuncio solo avisa.
- No hay acuse de recibo. Cada clon recuerda qué anuncios ya mostró, en un archivo local dentro de `.git` que no se commitea.
