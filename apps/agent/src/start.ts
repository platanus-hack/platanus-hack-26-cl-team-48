import { loadConfig } from "./config.ts";
import { createServer } from "./server.ts";

const config = loadConfig(process.env);

if (config.ok) {
  createServer({}).listen(config.value.port);
} else {
  const issues = config.error.issues.map(({ variable, kind }) => `${variable} (${kind})`);
  process.stderr.write(`Invalid agent configuration: ${issues.join(", ")}\n`);
  process.exitCode = 1;
}
