declare module "*?url" {
  const url: string;
  // Vite asset imports expose their URL through a default export.
  // eslint-disable-next-line import-x/no-default-export
  export default url;
}
