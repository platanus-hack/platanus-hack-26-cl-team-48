type PermissionHandle = FileSystemFileHandle & {
  readonly queryPermission: (options: { readonly mode: "read" }) => Promise<PermissionState>;
  readonly requestPermission: (options: { readonly mode: "read" }) => Promise<PermissionState>;
};
function canQuery(
  handle: FileSystemFileHandle,
): handle is FileSystemFileHandle & Pick<PermissionHandle, "queryPermission"> {
  return "queryPermission" in handle && typeof handle.queryPermission === "function";
}
function canRequest(
  handle: FileSystemFileHandle,
): handle is FileSystemFileHandle & Pick<PermissionHandle, "requestPermission"> {
  return "requestPermission" in handle && typeof handle.requestPermission === "function";
}
export async function readPermittedFile(handle: FileSystemFileHandle): Promise<File | undefined> {
  if (!canQuery(handle)) return undefined;
  return (await handle.queryPermission({ mode: "read" })) === "granted"
    ? handle.getFile()
    : undefined;
}
export async function requestFileAccess(handle: FileSystemFileHandle): Promise<File | undefined> {
  if (!canRequest(handle)) return undefined;
  return (await handle.requestPermission({ mode: "read" })) === "granted"
    ? handle.getFile()
    : undefined;
}
