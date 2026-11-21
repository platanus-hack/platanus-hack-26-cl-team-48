# Motor Python local (`nodomics-engine`)

Ejecutor de Nodomics que corre en tu máquina con DuckDB y CPython. El coordinador sigue en el navegador y le despacha tareas por WebSocket con el protocolo de ejecutor (`exec.*`, ver `packages/protocol/src/executor.ts`). No conoce el grafo ni las plantillas: recibe SQL ya renderizado o código Python y tablas por alias.

## Requisitos

- [uv](https://docs.astral.sh/uv/) (instala Python 3.12 si hace falta).
- El JSON Schema del protocolo, generado desde la raíz del repo (no se versiona):

  ```sh
  pnpm install
  pnpm --filter @nodomics/protocol export-schema
  ```

## Arrancar

```sh
cd engines/python-local
uv run nodomics-engine
```

Imprime algo como:

```
Nodomics local engine listening on ws://127.0.0.1:7341
Allowed origins: http://localhost:5173
Connect with: ws://127.0.0.1:7341/?token=Qm9...
```

Opciones:

| Opción | Por defecto | Para qué |
|---|---|---|
| `--port N` | `7341` | Puerto de escucha |
| `--allow-origin ORIGEN` | `http://localhost:5173` | Origen permitido; se puede repetir |
| `--schema RUTA` | `packages/protocol/schema/protocol.schema.json` | JSON Schema del protocolo |

## Conectar

Pega la URL `ws://127.0.0.1:7341/?token=...` en la interfaz. El token cambia cada vez que arranca el motor.

Seguridad mínima:

- Escucha **solo** en `127.0.0.1`.
- Rechaza el handshake sin el `token` correcto (401) o con un `Origin` que no esté en la lista, o sin `Origin` (403).
- No hay sandbox: el código Python de los nodos corre con tus permisos y `exec.load` lee rutas locales y descarga URLs `http(s)`. Conéctalo solo a la app en la que confías.

## Mensajes

JSON-RPC 2.0 en mensajes de texto. Los binarios (Arrow, bytes de una fuente) viajan como `{"$bytes": "<base64>"}`, igual que en `@nodomics/rpc`. Los parámetros se validan contra el JSON Schema exportado; si no cumplen, la respuesta es `-32602`.

| Método | Respuesta |
|---|---|
| `exec.hello` | `{ executor: "python-local", runtimes: ["sql","python"], packages }` |
| `exec.run` | `{ ok: true, outputs }` o `{ ok: false, error: { code, message, detail } }`. SQL produce la salida `out`; Python, las claves del dict que devuelve `entry(inputs, params)`. Cada línea de `print` llega como notificación `exec.log` antes de la respuesta |
| `exec.page` / `exec.profile` | Página (máx. 1000 filas) o perfil por columna |
| `exec.export` / `exec.import` | Resultado en Arrow IPC (formato *stream*) |
| `exec.load` | Fuente csv/parquet/json desde bytes, URL o ruta → `{ ok: true, ref: ResultRef }` o `{ ok: false, error: NodeError }` |
| `exec.drop` | `{}` |

Errores de protocolo: `-32700`, `-32600`, `-32601`, `-32602`, `-32603` y `-32001` (`RESULT_EXPIRED`, resultado inexistente o liberado). Los errores de fuente en `exec.load` son valores: `SOURCE_UNREADABLE` para contenido ilegible y `SOURCE_UNAVAILABLE` para rutas o URLs inaccesibles. Un marcador `$bytes` con base64 inválido recibe `-32602`. Las peticiones con `id: null` reciben respuesta con ese mismo identificador.

Las tareas Python se ejecutan en serie con un candado compartido entre conexiones del servidor para aislar la captura de stdout y los logs de cada `taskId`.

## Desarrollo

```sh
uv run pytest
uv run ruff check && uv run ruff format --check
uv run pyright
```

Los tests levantan el servidor en un puerto efímero y hablan con él con un cliente WebSocket real. Si falta el JSON Schema, lo generan con `pnpm`.
