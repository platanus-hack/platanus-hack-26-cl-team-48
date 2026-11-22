# MCP del motor

Servicio Node que expone las herramientas del agente sobre flujos reales (ADR 0026). Usa el coordinador existente con DuckDB y Pyodide; los borradores se guardan en Supabase y solo su dueño puede leerlos o aplicarlos.

## Arranque

Con Node 24 y las dependencias instaladas desde la raíz, se arma con Vite (los paquetes del monorepo son TypeScript con importaciones `?raw` que Node no corre tal cual) y se arranca el bundle:

```sh
pnpm --filter @nodomics/mcp build
SUPABASE_URL=https://proyecto.supabase.co SUPABASE_ANON_KEY=clave-publicable pnpm --filter @nodomics/mcp start
```

`PORT` es opcional, por defecto `8790`. Antes de arrancar, aplica la migración `supabase/migrations/20261122000000_flow_drafts.sql` al mismo proyecto que guarda los flujos.

- `GET /health` devuelve `{"status":"ok"}`.
- `POST /mcp` habla MCP Streamable HTTP sin sesiones. La inicialización y `tools/list` no requieren cuenta. Cada `tools/call` requiere `Authorization: Bearer <JWT de Supabase>` y verifica la identidad con Supabase Auth.
- El servicio necesita solamente URL y clave publicable de Supabase; nunca usa una clave de administración. El JWT del usuario se propaga al almacenamiento y RLS decide el acceso.

Las herramientas leen el catálogo y los flujos, crean y editan borradores, validan, muestran diferencias y aplican todos o algunos cambios. `flows.apply` rechaza un borrador cuya revisión de origen cambió y conserva los campos del documento ajenos al flujo. `flows.declare_as_node` todavía responde que no está disponible.

`run.flow`, `run.sample` y `run.logs` ejecutan el flujo o borrador. Las muestras tienen hasta 20 filas y 64 KB. El servicio conserva hasta cuatro revisiones en memoria; los borradores persisten aunque el servicio reinicie. Python se carga con la primera ejecución, por lo que esta puede tardar más.

## Despliegue

`render.yaml` declara `nodomics-mcp`. Configura sus variables públicas de Supabase y conecta el agente con `MCP_URL=https://nodomics-mcp.onrender.com/mcp`, sin el modo falso. `/health` comprueba que el proceso escucha; una prueba con JWT comprueba autenticación, almacenamiento y ejecución.

Los archivos cargados en el navegador y las credenciales de la interfaz no existen en este servicio: los nodos que dependen de ellos fallan con un error. El código SQL y Python se ejecuta dentro del proceso del servicio, como establece el ADR 0026. Un editor abierto puede sobrescribir un cambio aplicado por el agente cuando vuelva a guardar; la sincronización en vivo queda pendiente.
