const CONNECT_LINE = /^Connect with: (ws:\/\/\S+)\n/m;

/** The address (with its secret token) that the local engine prints once it listens. */
export const readConnectAddress = (output: string): string | undefined =>
  CONNECT_LINE.exec(output)?.[1];
