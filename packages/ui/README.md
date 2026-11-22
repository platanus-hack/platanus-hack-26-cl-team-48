# @nodomics/ui — design system de Nodomics

> La identidad visual del Hub (tokens de marca y linaje, componentes del hilo y reglas de estilo) está en [lenguaje-del-nudo.md](./lenguaje-del-nudo.md).

Tokens, fuentes, estilos y componentes React **de presentación**. Es la única fuente de colores, tamaños, radios y tipografía de la interfaz (`CLAUDE.md`, invariante 7).

- Los componentes reciben datos y callbacks por props. No guardan estado de negocio, no hacen I/O y no conocen el protocolo: `apps/web` traduce sus tipos (por ejemplo `NodeState` del NEP) a los de este paquete.
- `ui` no importa ningún paquete interno.
- Principios visuales y de voz del diseñador: siguen valiendo los del design system original (el estado nunca depende solo del color, todo lo de la IA va con borde `ai-pending`, nada por debajo de 11 px, etc.).

## 1. Instalar en una app

```ts
// Una sola vez, en el punto de entrada de la app y en este orden.
import "@nodomics/ui/tokens.css";
import "@nodomics/ui/fonts.css";
import "@nodomics/ui/components.css";

import { Button, Node, DataGrid } from "@nodomics/ui";
```

`react` y `react-dom` 19 son `peerDependencies`: la app los aporta.

### Tema

- Claro por defecto (`:root`).
- Oscuro con `data-theme="dark"` en `<html>`, o automático si el sistema lo pide (`prefers-color-scheme: dark`).
- `data-theme="light"` fuerza el claro aunque el sistema esté en oscuro.

## 2. Tokens

`tokens.json` es la fuente de verdad (copiado del design system). `src/tokens.css` **se genera**; no se edita a mano:

```sh
pnpm --filter @nodomics/ui tokens   # regenera src/tokens.css
```

Un test falla si `tokens.css` no coincide con lo generado, y otro falla si `components.css` usa un color, tamaño, radio o fuente que no venga de un token.

En tu CSS usa siempre `var(--…)`:

| Grupo | Variables |
|---|---|
| Superficies | `--canvas`, `--canvas-grid`, `--surface-100`, `--surface-200`, `--surface-300`, `--surface-sunken`, `--surface-hover`, `--surface-inverse` |
| Bordes | `--line-subtle`, `--line`, `--line-strong` |
| Texto | `--ink`, `--ink-muted`, `--ink-faint`, `--ink-inverse` |
| Acento y foco | `--accent`, `--accent-hover`, `--on-accent`, `--accent-soft`, `--accent-ink`, `--focus-ring` |
| Estados | `--status-queued`, `--status-running`, `--status-ok`, `--status-ok-soft`, `--status-stale`, `--status-warn`, `--status-warn-soft`, `--status-error`, `--status-error-soft`, `--on-status` |
| Tipos de dato | `--type-table`, `--type-column`, `--type-value`, `--type-geo`, `--type-image`, `--type-model`, `--type-chart`, `--type-repo`, `--type-service`, `--type-any` |
| Motores | `--engine-browser`, `--engine-local`, `--engine-cloud` |
| Confianza | `--trust-official`, `--trust-verified`, `--trust-org`, `--trust-community` |
| IA y colaboración | `--ai-pending`, `--ai-pending-soft`, `--collab-1` … `--collab-6` |
| Sombras | `--shadow-node`, `--shadow-lift`, `--shadow-pop` |
| Familias | `--font-sans`, `--font-mono` |
| Estilos de texto | `--text-<estilo>` (shorthand para `font:`), `--text-<estilo>-size`, `-line`, `-weight` y `-tracking` (solo `display` y `overline`). Estilos: `display`, `title-lg`, `title`, `title-sm`, `body`, `body-sm`, `label`, `caption`, `overline`, `mono`, `mono-sm`, `mono-label` |
| Espaciado | `--space-0` (2) `--space-1` (4) `--space-2` (8) `--space-3` (12) `--space-4` (16) `--space-6` (24) `--space-8` (32) `--space-12` (48) |
| Radios | `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` |
| Tamaños | `--control-sm/md/lg`, `--row-sm/md`, `--node-width`, `--node-header`, `--port-size`, `--icon-sm`, `--icon-md`, `--panel-min` |
| Trazos | `--stroke-hairline`, `--stroke-edge`, `--stroke-strong` |
| Capas | `--z-canvas`, `--z-panel`, `--z-popover`, `--z-modal`, `--z-toast` |

```css
.library-panel {
  min-width: var(--panel-min);
  padding: var(--space-4);
  background: var(--surface-200);
  border-right: var(--stroke-hairline) solid var(--line);
  font: var(--text-body-sm);
}
```

Si necesitas un valor que no existe, combina tokens con `calc()` o pide un token nuevo al líder; nunca escribas `#hex`, `px` o una fuente a mano.

`--node-port-row` es un token público estable definido en `components.css`, disponible
tras importar esa hoja. Define la altura compartida de las filas de puertos como
`calc(var(--control-sm) - var(--space-0))`. Los consumidores pueden leerla con
`getComputedStyle(element).getPropertyValue("--node-port-row")` o usar
`var(--node-port-row)` en CSS para alinear sus filas con los puertos del nodo.

## 3. Textos

Todos los textos visibles de los componentes están en `src/messages.ts` (español). Los textos que pasas por props (títulos, etiquetas, resúmenes) son responsabilidad de la app.

## 4. Componentes

Tipos compartidos (uniones de strings): `DataType`, `ColumnType`, `ExecState`, `Condition`, `Engine`, `TrustLevel`, `Point`, `IconName`.

### Icon

Iconos Lucide como SVG en línea (lista en `ICONS`, incluidos `chevron-left` y `redo`). Decorativo salvo que tenga `label`.

```tsx
<Icon name="database" />
<Icon name="loader-circle" spin size={ICON_SIZE.sm} label="Cargando" />
```

### Button

```tsx
<Button variant="primary" icon="play" shortcut="⌘↵" onClick={run}>Ejecutar</Button>
<Button variant="ghost" size="sm" icon="x" label="Cerrar" onClick={close} />  // solo icono: `label` es obligatorio en la práctica
<Button loading>Publicar</Button>
```

### Badge y TrustBadge

```tsx
<Badge tone="warn" icon="triangle-alert">12 % nulos</Badge>
<TrustBadge level="verified" />
<TrustBadge level="official" compact />
```

### StatusIndicator

Estado de ejecución o condición, siempre con icono y texto.

```tsx
<StatusIndicator state="running" progress={0.4} />   // «Ejecutando 40 %»
<StatusIndicator state="credential" compact />
```

### EngineBadge

```tsx
<EngineBadge engine="browser" />
<EngineBadge engine="local" detail="3.12" />
<EngineBadge engine="cloud" compact />
```

### TypeGlyph y Port

```tsx
<TypeGlyph type="geo" />
<Port direction="in" name="datos" type="table" connected />
<Port direction="out" name="resultado" type="chart" multi showType state="compatible" />
```

### Node

Tres niveles de detalle (`zoom`: `far`, `mid`, `near`). Las acciones rápidas aparecen al seleccionarlo y se reportan con `onAction("run" | "view-data" | "toggle-disabled" | "more")`.

```tsx
<Node
  variant="transform"
  title="Filtrar filas"
  inputs={[{ name: "datos", type: "table", connected: true }]}
  outputs={[{ name: "filtrado", type: "table" }]}
  summary="región = Sur y monto > 0"
  rows={31207}
  cols={4}
  state="done"
  conditions={["warning"]}
  engine="browser"
  selected
  onAction={handleNodeAction}
/>
```

### Edge

Conexión entre dos puntos del lienzo (posicionada en absoluto) o `inline` para documentación.

```tsx
<Edge from={{ x: 240, y: 80 }} to={{ x: 420, y: 140 }} type="table" state="flowing" onSelect={select} />
```

### Field, Input, Select, Switch

`Field` etiqueta y marca como inválido al control que envuelve. Los controles son controlados: `value`/`checked` + `onChange`. Sin `onChange`, `Input` es de solo lectura.

```tsx
<Field label="Umbral" help="Filas por debajo se descartan" error={error} modified onReset={reset}>
  <Input type="number" value={threshold} unit="%" onChange={setThreshold} />
</Field>
<Field label="Orden">
  <Select options={[{ value: "asc", label: "Ascendente" }, "desc"]} value={order} onChange={setOrder} />
</Field>
<Switch checked={ignoreCase} label="Ignorar mayúsculas" onChange={setIgnoreCase} />
```

Fuera de un `Field`, pasa `label` a `Input`/`Select` para darles nombre accesible.

Para un control propio, importa `useFieldControlId` desde `@nodomics/ui` y asigna
su resultado al `id`. Devuelve `string | undefined`: fuera de `Field` no aporta id.
El hook enlaza la etiqueta; el estado inválido del control propio lo gestiona el consumidor.

```tsx
function QueryTextarea() {
  return <textarea id={useFieldControlId()} />;
}

<Field label="Consulta"><QueryTextarea /></Field>
```

### ColumnSelect y ColumnTypeIcon

La apertura, la búsqueda y la selección las decide quien lo usa.

```tsx
<ColumnSelect
  columns={[{ name: "monto", type: "number", hint: "0 – 9.800" }, { name: "region", type: "text" }]}
  value={selected}
  multiple
  filterType={["number"]}
  open={isOpen}
  search={query}
  onToggle={toggle}
  onChange={setSelected}
  onSearchChange={setQuery}
/>
<ColumnTypeIcon type="date" showLabel />
```

### ConditionBuilder

Reporta cada cambio con el índice de la condición; agregar, quitar y alternar `Y`/`O` son callbacks.

```tsx
<ConditionBuilder
  columns={columns}
  conditions={[{ column: "region", op: "=", value: "Sur" }]}
  join="Y"
  operators={["=", "≠", ">", "<"]}
  openColumnIndex={openIndex}
  onColumnListToggle={setOpenIndex}
  onConditionChange={updateCondition}
  onJoinToggle={toggleJoin}
  onRemoveCondition={removeCondition}
  onAddCondition={addCondition}
  onAddGroup={addGroup}
/>
```

### DataGrid

Muestra una página de un resultado (los datos viven en el motor: pásale solo la página). Una celda con error es `{ error, value }`; una fila de comparación es `{ cells, __diff: "added" | "removed" }`.

```tsx
<DataGrid
  columns={[{ name: "region", type: "text", pinned: true }, { name: "monto", type: "number", sorted: "desc" }]}
  rows={page.rows}
  offset={page.offset}
  total={result.rowCount}
  engine="browser"
  selectedRow={selected}
  onRowSelect={setSelected}
/>
```

### ColumnProfile

```tsx
<ColumnProfile name="monto" type="number" count={31207} nulls={12} bins={[3, 9, 14, 6]} range={["0", "9.800"]} stats={[["media", "1.204"]]} />
```

### HubCard

```tsx
<HubCard kind="flow" title="Encuestas 2025" author="Ana" trust="community" version="1.2.0" stars={42} uses={1250} forks={3} updated="hace 3 días" io={{ in: ["table"], out: ["chart"] }} />
```

### Notice

`role="alert"` para errores, `role="status"` para el resto. El detalle técnico va plegado.

```tsx
<Notice tone="error" title="No pudimos leer «ventas.xlsx»" detail={error.detail} actions={<Button>Elegir otro archivo</Button>} onClose={dismiss}>
  Parece que el archivo está dañado o protegido con contraseña.
</Notice>
```
