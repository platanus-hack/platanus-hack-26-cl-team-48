import { expect, it } from "vitest";
import { readPermittedFile, requestFileAccess } from "./file-permission.ts";

function fileHandle(permission: PermissionState) {
  const file = new File(["csv"], "ventas.csv");
  const handle = {
    kind: "file" as const,
    name: file.name,
    getFile: () => Promise.resolve(file),
    isSameEntry: () => Promise.resolve(true),
    createWritable: () => Promise.reject(new Error("unused")),
  };
  return {
    ...handle,
    queryPermission: () => Promise.resolve(permission),
    requestPermission: () => Promise.resolve(permission),
  };
}
it("only reads handles with granted permission and leaves denied handles pending", async () => {
  expect((await readPermittedFile(fileHandle("granted")))?.name).toBe("ventas.csv");
  expect(await readPermittedFile(fileHandle("prompt"))).toBeUndefined();
  expect(await requestFileAccess(fileHandle("denied"))).toBeUndefined();
  expect((await requestFileAccess(fileHandle("granted")))?.name).toBe("ventas.csv");
});
