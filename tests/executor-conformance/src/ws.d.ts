declare module "ws" {
  export const WebSocket: {
    new (
      url: string,
      options: { readonly origin: string; readonly handshakeTimeout: number },
    ): globalThis.WebSocket;
  };
}
