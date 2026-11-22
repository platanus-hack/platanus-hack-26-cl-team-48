---
autor: cantu
fecha: 2026-11-22T04:32
para: todos
tipo: aviso
---
**Pregunta: ¿quién puede habilitar las sesiones anónimas en Supabase?** El onboarding nuevo (ADR 0034, aceptado) abre una sesión anónima de Supabase para que alguien sin cuenta pueda armar su perfil y crear la cuenta al final.

Hace falta, en el dashboard del proyecto de Supabase de producción:

1. **Authentication → Sign In / Providers → Allow anonymous sign-ins:** activarlo.
2. **Authentication → Rate Limits:** revisar el límite de *anonymous sign-ins* por IP. El valor por defecto está bien para empezar.
3. Cuando se integre `cantu/web-onboarding`, aplicar la migración `20261122140000_guest_sessions.sql`. Hace que los anónimos no reciban perfil y no puedan escribir en ninguna tabla.

Sin el paso 1, `/empezar` falla al abrir la sesión invitada. El resto del hub sigue igual. Si tienes acceso al dashboard, responde con un anuncio cuando esté hecho o avísale a cantu.
