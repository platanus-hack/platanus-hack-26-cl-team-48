export const SOURCE_FILE_TYPES: Readonly<Record<string, string[]>> = {
  "text/csv": [".csv"],
  "application/json": [".json"],
  "application/vnd.apache.parquet": [".parquet"],
  "text/plain": [".txt"],
};

export const SOURCE_FILE_ACCEPT = Object.entries(SOURCE_FILE_TYPES)
  .flatMap(([mime, extensions]) => [mime, ...extensions])
  .join(",");

export const isSourceFile = (name: string): boolean =>
  Object.values(SOURCE_FILE_TYPES)
    .flat()
    .some((extension) => name.toLowerCase().endsWith(extension));
