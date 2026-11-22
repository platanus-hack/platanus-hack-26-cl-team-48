export type LineageEvent = "origin" | "adapt" | "agent" | "broken" | "spliced";

export type LineageSegment = {
  readonly kind: LineageEvent;
  readonly x1: number;
  readonly x2: number;
};

export type ThreadGlyphKind = "crosses" | "braids" | "tangles" | "untangles" | "breaks" | "splices";

export function segmentsFor(events: readonly LineageEvent[], width: number): LineageSegment[] {
  if (events.length === 0) {
    return [];
  }
  const segmentWidth = width / events.length;
  return events.map((kind, index) => ({
    kind,
    x1: index * segmentWidth,
    x2: (index + 1) * segmentWidth,
  }));
}

const WAVE_Y = 14;

export function wave(x1: number, x2: number, up: boolean): string {
  const step = 10;
  const firstControlY = up ? WAVE_Y - 6 : WAVE_Y + 6;
  let path = `M${String(x1)} ${String(WAVE_Y)} Q${String(x1 + step / 2)} ${String(firstControlY)} ${String(x1 + step)} ${String(WAVE_Y)}`;
  for (let x = x1 + step * 2; x <= x2; x += step) {
    path += ` T${String(x)} ${String(WAVE_Y)}`;
  }
  return path;
}

export const glyphPaths = {
  crosses: {
    base: "M0 8 C45 8 75 32 120 32",
    crossing: "M0 32 C45 32 75 8 120 8",
  },
  braids: {
    base: "M0 12 Q15 28 30 12 T60 12 T90 12 T120 12",
    crossing: "M0 28 Q15 12 30 28 T60 28 T90 28 T120 28",
  },
  tangles: {
    base: "M0 14 C30 14 40 8 52 12 C66 17 48 34 62 33 C75 32 64 11 77 14 C88 17 84 28 120 28",
    crossing: "M0 30 C30 30 42 36 54 28 C66 20 51 10 64 9 C78 8 71 31 82 25 C92 20 98 14 120 14",
  },
  untangles: {
    base: "M0 12 C20 12 25 6 33 12 C41 18 30 29 39 29 C49 29 55 20 75 20 L120 20",
    crossing: "M0 30 C20 30 26 36 34 30 C42 24 31 12 40 12 C50 12 56 20 75 20 L120 20",
  },
  breaks: {
    lead: "M0 20 C20 14 36 26 54 20",
    cracks: "M54 20 l7 -5 M54 20 l8 1 M54 20 l6 6",
    tail: "M66 20 C84 14 100 26 120 20",
  },
  splices: {
    base: "M0 20 C20 14 36 26 120 20",
    ties: [54, 58, 62, 66] as const,
  },
} as const;
