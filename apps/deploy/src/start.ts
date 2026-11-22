import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { loadConfig, type DeployConfig } from "./config.ts";
import { createDeployUseCases } from "./deploy-use-cases.ts";
import { createSupabaseIdentity } from "./identity.ts";
import { createRenderProvider } from "./render-provider.ts";
import { createDeployHandler, MAX_BODY_BYTES } from "./server.ts";
import { createSupabaseDeploymentStore } from "./supabase-deployment-store.ts";
import { createSupabaseFlowReader } from "./supabase-flow-reader.ts";

const HTTP_INTERNAL_ERROR = 500;
const METHODS_WITHOUT_BODY = ["GET", "HEAD"];

const config = loadConfig(process.env);
if (config.ok) {
  const handle = handlerOf(config.value);
  createServer((request, response) => {
    serve(handle, request, response).catch(() => {
      if (!response.headersSent) response.statusCode = HTTP_INTERNAL_ERROR;
      response.end();
    });
  }).listen(config.value.port, "0.0.0.0");
} else {
  const issues = config.error.issues.map(({ variable, kind }) => `${variable} (${kind})`);
  process.stderr.write(`Invalid deploy configuration: ${issues.join(", ")}\n`);
  process.exitCode = 1;
}

function handlerOf(config: DeployConfig): (request: Request) => Promise<Response> {
  return createDeployHandler({
    identity: createSupabaseIdentity({
      supabaseUrl: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
      fetch,
    }),
    useCases: createDeployUseCases({
      flows: createSupabaseFlowReader({
        supabaseUrl: config.supabaseUrl,
        anonKey: config.supabaseAnonKey,
      }),
      deployments: createSupabaseDeploymentStore({
        supabaseUrl: config.supabaseUrl,
        serviceRoleKey: config.supabaseServiceRoleKey,
      }),
      provider: createRenderProvider({
        apiKey: config.renderApiKey,
        ownerId: config.renderOwnerId,
        fetch,
      }),
      now: () => new Date(),
      createId: randomUUID,
    }),
    allowedOrigins: config.allowedOrigins,
  });
}

async function serve(
  handle: (request: Request) => Promise<Response>,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const reply = await handle(await fetchRequestOf(request));
  response.writeHead(reply.status, Object.fromEntries(reply.headers));
  response.end(Buffer.from(await reply.arrayBuffer()));
}

async function fetchRequestOf(request: IncomingMessage): Promise<Request> {
  const method = request.method ?? "GET";
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers))
    if (typeof value === "string") headers.set(name, value);
  return new Request(`http://localhost${request.url ?? "/"}`, {
    method,
    headers,
    ...(METHODS_WITHOUT_BODY.includes(method) ? {} : { body: await limitedBodyOf(request) }),
  });
}

/** Stops reading one byte past the limit: enough for the handler to answer 413. */
async function limitedBodyOf(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    chunks.push(buffer);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) break;
  }
  return Buffer.concat(chunks);
}
