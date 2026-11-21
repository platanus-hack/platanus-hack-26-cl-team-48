---
autor: sebas
fecha: 2026-11-21T15:50
para: todos
tipo: reemplaza:2026-11-21-1548-claves-del-hub.md
---
Para desarrollar en local no necesitas ninguna clave: `pnpm dev` funciona completo y el hub corre en memoria (puedes publicar y navegar, pero no se guarda al recargar y no hay cuentas reales). Usa eso por defecto.

Las claves de Supabase solo hacen falta si tu tarea necesita probar el hub real (entrar con una cuenta, datos que persisten):

1. Copia `apps/web/.env.example` a `apps/web/.env.local`.
2. Pídele a sebas `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` por mensaje privado.
3. Reinicia `pnpm dev`.

- Ojo: hay un solo proyecto de Supabase. Con las claves, lo que publiques en local aparece en el hub del sitio publicado (https://nodomics-web.onrender.com). Borra tus publicaciones de prueba.
- Agentes: no pidan claves salvo que la tarea lo exija; nunca las inventen ni las busquen en otro lado.
- Nunca commitees `.env.local` ni pegues claves en código, issues, commits o anuncios.
