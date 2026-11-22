const DATA_URL_SEPARATOR = ",";

/** Reads a file into base64, the form the registration route takes a PDF in. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      resolve(url.split(DATA_URL_SEPARATOR)[1] ?? "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("The file could not be read"));
    };
    reader.readAsDataURL(file);
  });
}
