# 0007. `exec.load` devuelve errores de nodo como valores

- **Estado:** aceptada (modifica el punto 2 de la decisión 0006)

## Contexto

En ADR 0006 `exec.load` devolvía directamente un `ResultRef`. Una fuente ilegible (CSV mal formado, URL caída, ruta inexistente) es un error esperado del dominio, pero solo podía expresarse como error JSON-RPC, en contra de "los errores esperados son valores".

## Decisión

`exec.load` devuelve `{ ok: true, ref: ResultRef } | { ok: false, error: NodeError }`, igual que `exec.run`. Los códigos habituales son `SOURCE_UNREADABLE` y `SOURCE_UNAVAILABLE`.

## Alternativas consideradas

| Opción | A favor | En contra |
|---|---|---|
| Error JSON-RPC con `data` | Sin cambio de esquema | Mezcla errores de dominio con fallas de protocolo |
| Nuevo código NEP | Simple | El coordinador tendría que traducirlo a error de nodo igualmente |
| Unión como `exec.run` | Coherente con el resto del protocolo de ejecutor | Cambio en ejecutores ya escritos |

## Consecuencias

Los ejecutores (DuckDB-WASM, Python local) y el coordinador adaptan `exec.load`. El coordinador convierte el error en `node.status: error` del nodo fuente.
