/** The values a size the user resizes can take, and how far one key press moves it. */
export type SizeRange = { readonly min: number; readonly max: number; readonly step: number };

export const clampToRange = (range: SizeRange, value: number): number =>
  Math.min(range.max, Math.max(range.min, value));

export const isWithinRange = (range: SizeRange, value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= range.min && value <= range.max;

/** Width of the parameters panel, in multiples of `--panel-min`. */
export const PARAMS_WIDTH_RANGE: SizeRange = { min: 1, max: 2.5, step: 0.1 };

/** Height of the code editor inside the parameters panel, in rows of `--control-lg`. */
export const CODE_EDITOR_ROWS_RANGE: SizeRange = { min: 4, max: 40, step: 1 };
