# @nodomics/e2e

Pruebas de interfaz con Playwright que recorren el guion de la demo (`docs/04-poc-una-noche.md` §6, puerta G4).

```sh
pnpm e2e
```

- Levanta la app con Vite en `http://localhost:5199` (o reutiliza un servidor que ya escuche ahí) y usa el Chromium instalado por Playwright.
- No forma parte de `pnpm check`: necesita navegador y red (DuckDB-WASM y Pyodide se descargan). Los ayudantes puros (`src/support/*.test.ts`) sí corren con Vitest en `pnpm check`.
- El paso 8 arranca `engines/python-local/.venv/bin/nodomics-engine`; si no existe, se omite (`cd engines/python-local && uv sync`). La dirección con el token nunca se imprime.
- Las pruebas marcadas con `test.fail()` documentan fallas conocidas de la app; el comentario de cada una explica la causa.
