import { expect, it } from "vitest";
import type { ExecutorPort } from "@nodomics/protocol";
import { composeExecutors } from "./compose-executors.ts";

it("selects browser factories without opening a local connection", async () => {
  const ports: ExecutorPort[] = [];
  let localUrl = "";
  expect(
    await composeExecutors(
      { mode: "browser" },
      {
        browser: () => Promise.resolve(ports),
        local: (url) => {
          localUrl = url;
          throw new Error("Unexpected local connection");
        },
      },
    ),
  ).toBe(ports);
  expect(localUrl).toBe("");
});

it("selects the local executor without loading browser runtimes", async () => {
  const port: ExecutorPort = {
    request: () => Promise.reject(new Error("unused")),
    onLog: () => () => undefined,
  };
  const urls: string[] = [];
  expect(
    await composeExecutors(
      { mode: "local", url: "ws://localhost" },
      {
        browser: () => Promise.reject(new Error("Unexpected browser load")),
        local: (url) => {
          urls.push(url);
          return port;
        },
      },
    ),
  ).toEqual([port]);
  expect(urls).toEqual(["ws://localhost"]);
});
