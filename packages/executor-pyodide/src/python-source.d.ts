// Vite (and Vitest) inline a file as text when it is imported with `?raw`.
declare module "*.py?raw" {
  const source: string;
  // eslint-disable-next-line import-x/no-default-export -- Vite exposes `?raw` files as default exports.
  export default source;
}
