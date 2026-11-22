// Fixture worker for worker-runner tests: answers the runner protocol with plain JS.
// The flow name picks the behaviour of each request:
//   "hold"    → kept unanswered until a "release" request arrives
//   "release" → answered, then every held request is answered (out of order)
//   "never"   → never answered
//   "exit"    → the thread exits with status 1
//   "throw"   → the thread throws an uncaught error
//   "fail"    → answered with an error result
//   other     → answered right away
import { parentPort, threadId } from "node:worker_threads";

const held = [];

function valueFor(method, args) {
  const [flow, extra] = args;
  if (method === "run") {
    const upTo = extra ?? flow.nodes.map((node) => node.id);
    return {
      nodes: flow.nodes
        .filter((node) => upTo.includes(node.id))
        .map((node) => ({ nodeId: node.id, status: "ok", error: null })),
    };
  }
  if (method === "sample") {
    return {
      schema: { columns: [{ name: "port", type: "text" }] },
      rows: [{ nodeId: extra.nodeId, port: extra.port }],
      page: extra.page,
      hasMore: false,
    };
  }
  return { nodeId: extra, lines: [`thread ${String(threadId)}`] };
}

function answer(request) {
  const result =
    request.args[0].name === "fail"
      ? { ok: false, error: { message: `worker failed ${request.method}` } }
      : { ok: true, value: valueFor(request.method, request.args) };
  parentPort.postMessage({ id: request.id, result });
}

parentPort.on("message", (request) => {
  const name = request.args[0].name;
  if (name === "hold") held.push(request);
  else if (name === "never") return;
  else if (name === "exit") process.exit(1);
  else if (name === "throw") throw new Error("fixture worker crashed");
  else {
    answer(request);
    if (name === "release") held.splice(0).reverse().forEach(answer);
  }
});
