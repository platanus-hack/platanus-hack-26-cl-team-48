import { spawnSync } from "node:child_process";

// Runs under `node --watch-path=nodes` (see the `dev` script): node reruns this file after every
// change in a node folder, so the catalog Vite imports stays in sync while developing.
process.exitCode = spawnSync("pnpm", ["generate"], { stdio: "inherit" }).status ?? 1;
