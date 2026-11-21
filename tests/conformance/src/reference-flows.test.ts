import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { Flow, parse } from "@nodomics/protocol";

it("parses three reference flows and their expected results", () => {
  const directory = new URL("../flows/", import.meta.url);
  const files = readdirSync(directory).filter((file) => file.endsWith(".nodo.json"));
  expect(files).toHaveLength(3);
  for (const file of files) {
    const flow: unknown = JSON.parse(readFileSync(new URL(file, directory), "utf8"));
    expect(parse(Flow, flow).ok).toBe(true);
    const expected: unknown = JSON.parse(
      readFileSync(new URL(file.replace(".nodo.json", ".expected.json"), directory), "utf8"),
    );
    expect(expected).toHaveProperty("out.rows");
  }
});
