import { sampleDatasets } from "@nodomics/nodes-core";
import { expect, it } from "vitest";
import { fetchWithFiles } from "./fetch-with-files.ts";

it("reads file URLs, which the platform fetch of Node rejects", async () => {
  const url = sampleDatasets["sample.ventas"]?.url ?? "";

  const response = await fetchWithFiles(url);

  expect(url).toMatch(/^file:/);
  expect(await response.text()).toMatch(/^fecha,region,producto,unidades,precio/);
});
