// A port apart from Vite's default 5173 so the suite never drives a developer's own server.
export const APP_PORT = 5199;
export const APP_ORIGIN = `http://localhost:${String(APP_PORT)}`;
