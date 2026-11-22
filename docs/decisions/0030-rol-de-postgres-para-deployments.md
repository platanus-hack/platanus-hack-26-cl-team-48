# 0030. Rol de Postgres limitado para `apps/deploy`

- **Estado:** propuesta (espera decisión del líder)
- **Fecha:** 2026-11-22
- **Afecta a:** ADR 0027 §4.

## Contexto

`apps/deploy` escribe la tabla `deployments` con la clave de servicio de Supabase (`SUPABASE_SERVICE_ROLE_KEY`). Esa clave salta RLS en **toda** la base: perfiles, flujos, publicaciones. Si alguien la saca del servicio (un log, una variable mal expuesta, una dependencia comprometida), puede leer y escribir todo. La revisión del hosteo lo marcó como hallazgo importante.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| **A. Funciones `security definer`** (`deployments_save`, `deployments_remove`, `deployments_count`) que solo tocan `deployments`, ejecutables por un rol nuevo `deploy_writer`; `apps/deploy` entra con un JWT firmado para ese rol | La clave del servicio solo puede tocar `deployments`; las reglas viven en la base (se puede mover ahí el cupo) | Firmar un JWT propio con el secreto JWT del proyecto; reescribir `supabase-deployment-store.ts` sobre RPC |
| **B. Rol `deploy_writer` con `grant` solo sobre `deployments`** y conexión directa a Postgres (sin PostgREST) | Simple de entender; permisos estándar de Postgres | Una cadena de conexión más que guardar; cliente de Postgres nuevo (dependencia de runtime) |
| **C. Dejarlo como está** | Cero trabajo | Una fuga de la clave expone toda la base |

## Recomendación

**A**, porque se queda dentro de Supabase (sin dependencias nuevas) y además permite mover el cupo a la base si `nodomics-deploy` se escala a varias instancias (ADR 0029 §5).

## Consecuencias si se acepta

- Migración nueva con el rol, las funciones y los `grant`.
- `SUPABASE_SERVICE_ROLE_KEY` desaparece de `nodomics-deploy`; aparece `DEPLOY_DB_JWT` (o el secreto para firmarlo).
- `supabase-deployment-store.ts` llama a las funciones por RPC.
