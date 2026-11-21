import { expect, it } from "vitest";
import { hasFilePicker, pickSourceFile } from "./pick-source-file.ts";

it("offers all engine file formats in the system picker", async () => {
  const options: unknown[] = [];
  const browser = Object.assign(window, {
    showOpenFilePicker: (value: unknown) => {
      options.push(value);
      return Promise.resolve([]);
    },
  });
  expect(hasFilePicker(browser)).toBe(true);
  await pickSourceFile(browser);

  for (const extension of [".csv", ".json", ".parquet", ".txt"])
    expect(JSON.stringify(options)).toContain(extension);
});
