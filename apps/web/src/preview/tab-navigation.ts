export function navigateTabs({
  index,
  key,
  count,
}: {
  readonly index: number;
  readonly key: string;
  readonly count: number;
}): number | undefined {
  if (count === 0 || (key !== "ArrowRight" && key !== "ArrowLeft")) return undefined;
  return (index + (key === "ArrowRight" ? 1 : -1) + count) % count;
}
