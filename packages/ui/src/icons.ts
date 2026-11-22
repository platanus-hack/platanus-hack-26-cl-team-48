// Lucide icons (ISC license), stroke 2 on a 24 box, copied from the Nodomics design system bundle.
export type IconElement = {
  readonly tag: "circle" | "ellipse" | "line" | "path" | "polygon" | "polyline" | "rect";
  readonly attributes: Readonly<Record<string, string>>;
};

export const ICONS = {
  play: [{ tag: "polygon", attributes: { points: "6 3 20 12 6 21 6 3" } }],
  square: [{ tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "3", rx: "2" } }],
  pause: [
    { tag: "rect", attributes: { x: "14", y: "4", width: "4", height: "16", rx: "1" } },
    { tag: "rect", attributes: { x: "6", y: "4", width: "4", height: "16", rx: "1" } },
  ],
  clock: [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "polyline", attributes: { points: "12 6 12 12 16 14" } },
  ],
  "loader-circle": [{ tag: "path", attributes: { d: "M21 12a9 9 0 1 1-6.219-8.56" } }],
  check: [{ tag: "path", attributes: { d: "M20 6 9 17l-5-5" } }],
  "circle-check": [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attributes: { d: "m9 12 2 2 4-4" } },
  ],
  "triangle-alert": [
    {
      tag: "path",
      attributes: { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" },
    },
    { tag: "path", attributes: { d: "M12 9v4" } },
    { tag: "path", attributes: { d: "M12 17h.01" } },
  ],
  "circle-alert": [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "line", attributes: { x1: "12", x2: "12", y1: "8", y2: "12" } },
    { tag: "line", attributes: { x1: "12", x2: "12.01", y1: "16", y2: "16" } },
  ],
  history: [
    { tag: "path", attributes: { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" } },
    { tag: "path", attributes: { d: "M3 3v5h5" } },
    { tag: "path", attributes: { d: "M12 7v5l4 2" } },
  ],
  "circle-off": [
    { tag: "path", attributes: { d: "m2 2 20 20" } },
    { tag: "path", attributes: { d: "M8.35 2.69A10 10 0 0 1 21.3 15.65" } },
    { tag: "path", attributes: { d: "M19.08 19.08A10 10 0 1 1 4.92 4.92" } },
  ],
  "package-x": [
    {
      tag: "path",
      attributes: {
        d: "M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14",
      },
    },
    { tag: "path", attributes: { d: "m7.5 4.27 9 5.15" } },
    { tag: "polyline", attributes: { points: "3.29 7 12 12 20.71 7" } },
    { tag: "line", attributes: { x1: "12", x2: "12", y1: "22", y2: "12" } },
    { tag: "path", attributes: { d: "m17 13 5 5m-5 0 5-5" } },
  ],
  "circle-arrow-up": [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attributes: { d: "m16 12-4-4-4 4" } },
    { tag: "path", attributes: { d: "M12 16V8" } },
  ],
  archive: [
    { tag: "rect", attributes: { width: "20", height: "5", x: "2", y: "3", rx: "1" } },
    { tag: "path", attributes: { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" } },
    { tag: "path", attributes: { d: "M10 12h4" } },
  ],
  "key-round": [
    {
      tag: "path",
      attributes: {
        d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      },
    },
    { tag: "circle", attributes: { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor" } },
  ],
  "shield-alert": [
    {
      tag: "path",
      attributes: {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    },
    { tag: "path", attributes: { d: "M12 8v4" } },
    { tag: "path", attributes: { d: "M12 16h.01" } },
  ],
  "app-window": [
    { tag: "rect", attributes: { x: "2", y: "4", width: "20", height: "16", rx: "2" } },
    { tag: "path", attributes: { d: "M10 4v4" } },
    { tag: "path", attributes: { d: "M2 8h20" } },
    { tag: "path", attributes: { d: "M6 4v4" } },
  ],
  cpu: [
    { tag: "rect", attributes: { width: "16", height: "16", x: "4", y: "4", rx: "2" } },
    { tag: "rect", attributes: { width: "6", height: "6", x: "9", y: "9", rx: "1" } },
    { tag: "path", attributes: { d: "M15 2v2" } },
    { tag: "path", attributes: { d: "M15 20v2" } },
    { tag: "path", attributes: { d: "M2 15h2" } },
    { tag: "path", attributes: { d: "M2 9h2" } },
    { tag: "path", attributes: { d: "M20 15h2" } },
    { tag: "path", attributes: { d: "M20 9h2" } },
    { tag: "path", attributes: { d: "M9 2v2" } },
    { tag: "path", attributes: { d: "M9 20v2" } },
  ],
  cloud: [
    { tag: "path", attributes: { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" } },
  ],
  "badge-check": [
    {
      tag: "path",
      attributes: {
        d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
      },
    },
    { tag: "path", attributes: { d: "m9 12 2 2 4-4" } },
  ],
  "building-2": [
    { tag: "path", attributes: { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" } },
    { tag: "path", attributes: { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" } },
    { tag: "path", attributes: { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" } },
    { tag: "path", attributes: { d: "M10 6h4" } },
    { tag: "path", attributes: { d: "M10 10h4" } },
    { tag: "path", attributes: { d: "M10 14h4" } },
    { tag: "path", attributes: { d: "M10 18h4" } },
  ],
  users: [
    { tag: "path", attributes: { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attributes: { cx: "9", cy: "7", r: "4" } },
    { tag: "path", attributes: { d: "M22 21v-2a4 4 0 0 0-3-3.87" } },
    { tag: "path", attributes: { d: "M16 3.13a4 4 0 0 1 0 7.75" } },
  ],
  star: [
    {
      tag: "path",
      attributes: {
        d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      },
    },
  ],
  "git-fork": [
    { tag: "circle", attributes: { cx: "12", cy: "18", r: "3" } },
    { tag: "circle", attributes: { cx: "6", cy: "6", r: "3" } },
    { tag: "circle", attributes: { cx: "18", cy: "6", r: "3" } },
    { tag: "path", attributes: { d: "M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" } },
    { tag: "path", attributes: { d: "M12 12v3" } },
  ],
  "git-branch": [
    { tag: "line", attributes: { x1: "6", x2: "6", y1: "3", y2: "15" } },
    { tag: "circle", attributes: { cx: "18", cy: "6", r: "3" } },
    { tag: "circle", attributes: { cx: "6", cy: "18", r: "3" } },
    { tag: "path", attributes: { d: "M18 9a9 9 0 0 1-9 9" } },
  ],
  server: [
    { tag: "rect", attributes: { width: "20", height: "8", x: "2", y: "2", rx: "2", ry: "2" } },
    { tag: "rect", attributes: { width: "20", height: "8", x: "2", y: "14", rx: "2", ry: "2" } },
    { tag: "line", attributes: { x1: "6", x2: "6.01", y1: "6", y2: "6" } },
    { tag: "line", attributes: { x1: "6", x2: "6.01", y1: "18", y2: "18" } },
  ],
  eye: [
    {
      tag: "path",
      attributes: {
        d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      },
    },
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "3" } },
  ],
  ellipsis: [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "1" } },
    { tag: "circle", attributes: { cx: "19", cy: "12", r: "1" } },
    { tag: "circle", attributes: { cx: "5", cy: "12", r: "1" } },
  ],
  search: [
    { tag: "circle", attributes: { cx: "11", cy: "11", r: "8" } },
    { tag: "path", attributes: { d: "m21 21-4.3-4.3" } },
  ],
  plus: [
    { tag: "path", attributes: { d: "M5 12h14" } },
    { tag: "path", attributes: { d: "M12 5v14" } },
  ],
  x: [
    { tag: "path", attributes: { d: "M18 6 6 18" } },
    { tag: "path", attributes: { d: "m6 6 12 12" } },
  ],
  "chevron-down": [{ tag: "path", attributes: { d: "m6 9 6 6 6-6" } }],
  "chevron-left": [{ tag: "path", attributes: { d: "m15 18-6-6 6-6" } }],
  "chevron-right": [{ tag: "path", attributes: { d: "m9 18 6-6-6-6" } }],
  filter: [
    { tag: "polygon", attributes: { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" } },
  ],
  "table-2": [
    {
      tag: "path",
      attributes: {
        d: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
      },
    },
  ],
  sigma: [
    {
      tag: "path",
      attributes: {
        d: "M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2",
      },
    },
  ],
  code: [
    { tag: "polyline", attributes: { points: "16 18 22 12 16 6" } },
    { tag: "polyline", attributes: { points: "8 6 2 12 8 18" } },
  ],
  "chart-column": [
    { tag: "path", attributes: { d: "M3 3v16a2 2 0 0 0 2 2h16" } },
    { tag: "path", attributes: { d: "M18 17V9" } },
    { tag: "path", attributes: { d: "M13 17V5" } },
    { tag: "path", attributes: { d: "M8 17v-3" } },
  ],
  workflow: [
    { tag: "rect", attributes: { width: "8", height: "8", x: "3", y: "3", rx: "2" } },
    { tag: "path", attributes: { d: "M7 11v4a2 2 0 0 0 2 2h4" } },
    { tag: "rect", attributes: { width: "8", height: "8", x: "13", y: "13", rx: "2" } },
  ],
  database: [
    { tag: "ellipse", attributes: { cx: "12", cy: "5", rx: "9", ry: "3" } },
    { tag: "path", attributes: { d: "M3 5V19A9 3 0 0 0 21 19V5" } },
    { tag: "path", attributes: { d: "M3 12A9 3 0 0 0 21 12" } },
  ],
  "file-spreadsheet": [
    {
      tag: "path",
      attributes: { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" },
    },
    { tag: "path", attributes: { d: "M14 2v4a2 2 0 0 0 2 2h4" } },
    { tag: "path", attributes: { d: "M8 13h2" } },
    { tag: "path", attributes: { d: "M14 13h2" } },
    { tag: "path", attributes: { d: "M8 17h2" } },
    { tag: "path", attributes: { d: "M14 17h2" } },
  ],
  sparkles: [
    {
      tag: "path",
      attributes: {
        d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
      },
    },
    { tag: "path", attributes: { d: "M20 3v4" } },
    { tag: "path", attributes: { d: "M22 5h-4" } },
    { tag: "path", attributes: { d: "M4 17v2" } },
    { tag: "path", attributes: { d: "M5 18H3" } },
  ],
  "message-square": [
    {
      tag: "path",
      attributes: { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    },
  ],
  redo: [
    { tag: "path", attributes: { d: "M21 7v6h-6" } },
    { tag: "path", attributes: { d: "M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2l3 3" } },
  ],
  "rotate-ccw": [
    { tag: "path", attributes: { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" } },
    { tag: "path", attributes: { d: "M3 3v5h5" } },
  ],
  info: [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attributes: { d: "M12 16v-4" } },
    { tag: "path", attributes: { d: "M12 8h.01" } },
  ],
  "circle-help": [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attributes: { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" } },
    { tag: "path", attributes: { d: "M12 17h.01" } },
  ],
  boxes: [
    {
      tag: "path",
      attributes: {
        d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",
      },
    },
    { tag: "path", attributes: { d: "m7 16.5-4.74-2.85" } },
    { tag: "path", attributes: { d: "m7 16.5 5-3" } },
    { tag: "path", attributes: { d: "M7 16.5v5.17" } },
    {
      tag: "path",
      attributes: {
        d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",
      },
    },
    { tag: "path", attributes: { d: "m17 16.5-5-3" } },
    { tag: "path", attributes: { d: "m17 16.5 4.74-2.85" } },
    { tag: "path", attributes: { d: "M17 16.5v5.17" } },
    {
      tag: "path",
      attributes: {
        d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",
      },
    },
    { tag: "path", attributes: { d: "M12 8 7.26 5.15" } },
    { tag: "path", attributes: { d: "m12 8 4.74-2.85" } },
    { tag: "path", attributes: { d: "M12 13.5V8" } },
  ],
  lock: [
    { tag: "rect", attributes: { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" } },
    { tag: "path", attributes: { d: "M7 11V7a5 5 0 0 1 10 0v4" } },
  ],
  upload: [
    { tag: "path", attributes: { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" } },
    { tag: "polyline", attributes: { points: "17 8 12 3 7 8" } },
    { tag: "line", attributes: { x1: "12", x2: "12", y1: "3", y2: "15" } },
  ],
  merge: [
    { tag: "path", attributes: { d: "m8 6 4-4 4 4" } },
    { tag: "path", attributes: { d: "M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" } },
    { tag: "path", attributes: { d: "m20 22-5-5" } },
  ],
  "git-pull-request": [
    { tag: "circle", attributes: { cx: "18", cy: "18", r: "3" } },
    { tag: "circle", attributes: { cx: "6", cy: "6", r: "3" } },
    { tag: "path", attributes: { d: "M13 6h3a2 2 0 0 1 2 2v7" } },
    { tag: "line", attributes: { x1: "6", x2: "6", y1: "9", y2: "21" } },
  ],
  "columns-3": [
    { tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attributes: { d: "M9 3v18" } },
    { tag: "path", attributes: { d: "M15 3v18" } },
  ],
  hash: [
    { tag: "line", attributes: { x1: "4", x2: "20", y1: "9", y2: "9" } },
    { tag: "line", attributes: { x1: "4", x2: "20", y1: "15", y2: "15" } },
    { tag: "line", attributes: { x1: "10", x2: "8", y1: "3", y2: "21" } },
    { tag: "line", attributes: { x1: "16", x2: "14", y1: "3", y2: "21" } },
  ],
  type: [
    { tag: "polyline", attributes: { points: "4 7 4 4 20 4 20 7" } },
    { tag: "line", attributes: { x1: "9", x2: "15", y1: "20", y2: "20" } },
    { tag: "line", attributes: { x1: "12", x2: "12", y1: "4", y2: "20" } },
  ],
  calendar: [
    { tag: "path", attributes: { d: "M8 2v4" } },
    { tag: "path", attributes: { d: "M16 2v4" } },
    { tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "4", rx: "2" } },
    { tag: "path", attributes: { d: "M3 10h18" } },
  ],
  "toggle-left": [
    { tag: "rect", attributes: { width: "20", height: "12", x: "2", y: "6", rx: "6", ry: "6" } },
    { tag: "circle", attributes: { cx: "8", cy: "12", r: "2" } },
  ],
  copy: [
    { tag: "rect", attributes: { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" } },
    { tag: "path", attributes: { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" } },
  ],
  "trash-2": [
    { tag: "path", attributes: { d: "M3 6h18" } },
    { tag: "path", attributes: { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" } },
    { tag: "path", attributes: { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" } },
    { tag: "line", attributes: { x1: "10", x2: "10", y1: "11", y2: "17" } },
    { tag: "line", attributes: { x1: "14", x2: "14", y1: "11", y2: "17" } },
  ],
  "grip-vertical": [
    { tag: "circle", attributes: { cx: "9", cy: "12", r: "1" } },
    { tag: "circle", attributes: { cx: "9", cy: "5", r: "1" } },
    { tag: "circle", attributes: { cx: "9", cy: "19", r: "1" } },
    { tag: "circle", attributes: { cx: "15", cy: "12", r: "1" } },
    { tag: "circle", attributes: { cx: "15", cy: "5", r: "1" } },
    { tag: "circle", attributes: { cx: "15", cy: "19", r: "1" } },
  ],
  "arrow-right-left": [
    { tag: "path", attributes: { d: "m16 3 4 4-4 4" } },
    { tag: "path", attributes: { d: "M20 7H4" } },
    { tag: "path", attributes: { d: "m8 21-4-4 4-4" } },
    { tag: "path", attributes: { d: "M4 17h16" } },
  ],
  "circle-dashed": [
    { tag: "path", attributes: { d: "M10.1 2.182a10 10 0 0 1 3.8 0" } },
    { tag: "path", attributes: { d: "M13.9 21.818a10 10 0 0 1-3.8 0" } },
    { tag: "path", attributes: { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7" } },
    { tag: "path", attributes: { d: "M2.182 13.9a10 10 0 0 1 0-3.8" } },
    { tag: "path", attributes: { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69" } },
    { tag: "path", attributes: { d: "M21.818 10.1a10 10 0 0 1 0 3.8" } },
    { tag: "path", attributes: { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69" } },
    { tag: "path", attributes: { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7" } },
  ],
  "circle-slash": [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "line", attributes: { x1: "9", x2: "15", y1: "15", y2: "9" } },
  ],
  "square-dashed": [
    { tag: "path", attributes: { d: "M5 3a2 2 0 0 0-2 2" } },
    { tag: "path", attributes: { d: "M19 3a2 2 0 0 1 2 2" } },
    { tag: "path", attributes: { d: "M21 19a2 2 0 0 1-2 2" } },
    { tag: "path", attributes: { d: "M5 21a2 2 0 0 1-2-2" } },
    { tag: "path", attributes: { d: "M9 3h1" } },
    { tag: "path", attributes: { d: "M9 21h1" } },
    { tag: "path", attributes: { d: "M14 3h1" } },
    { tag: "path", attributes: { d: "M14 21h1" } },
    { tag: "path", attributes: { d: "M3 9v1" } },
    { tag: "path", attributes: { d: "M21 9v1" } },
    { tag: "path", attributes: { d: "M3 14v1" } },
    { tag: "path", attributes: { d: "M21 14v1" } },
  ],
  "database-zap": [
    { tag: "ellipse", attributes: { cx: "12", cy: "5", rx: "9", ry: "3" } },
    { tag: "path", attributes: { d: "M3 5V19A9 3 0 0 0 15 21.84" } },
    { tag: "path", attributes: { d: "M21 5V8" } },
    { tag: "path", attributes: { d: "M21 12L18 17H22L19 22" } },
    { tag: "path", attributes: { d: "M3 12A9 3 0 0 0 14.59 14.87" } },
  ],
  user: [
    { tag: "path", attributes: { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attributes: { cx: "12", cy: "7", r: "4" } },
  ],
  "list-filter": [
    { tag: "path", attributes: { d: "M3 6h18" } },
    { tag: "path", attributes: { d: "M7 12h10" } },
    { tag: "path", attributes: { d: "M10 18h4" } },
  ],
  download: [
    { tag: "path", attributes: { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" } },
    { tag: "path", attributes: { d: "m7 10 5 5 5-5" } },
    { tag: "path", attributes: { d: "M12 15V3" } },
  ],
  minus: [{ tag: "path", attributes: { d: "M5 12h14" } }],
  maximize: [
    {
      tag: "path",
      attributes: {
        d: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2",
      },
    },
  ],
  "maximize-2": [
    { tag: "path", attributes: { d: "M15 3h6v6" } },
    { tag: "path", attributes: { d: "M9 21H3v-6" } },
    { tag: "path", attributes: { d: "m21 3-7 7" } },
    { tag: "path", attributes: { d: "m3 21 7-7" } },
  ],
  "minimize-2": [
    { tag: "path", attributes: { d: "M4 14h6v6" } },
    { tag: "path", attributes: { d: "M20 10h-6V4" } },
    { tag: "path", attributes: { d: "m14 10 7-7" } },
    { tag: "path", attributes: { d: "m3 21 7-7" } },
  ],
  sun: [
    {
      tag: "path",
      attributes: {
        d: "M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42",
      },
    },
    { tag: "path", attributes: { d: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0" } },
  ],
  moon: [{ tag: "path", attributes: { d: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" } }],
  monitor: [
    { tag: "path", attributes: { d: "M4 3h16a2 2 0 0 1 2 2v12H2V5a2 2 0 0 1 2-2Z" } },
    { tag: "path", attributes: { d: "M8 21h8m-4-4v4" } },
  ],
  "panel-bottom-close": [
    { tag: "path", attributes: { d: "M3 3h18v18H3Z" } },
    { tag: "path", attributes: { d: "M3 15h18" } },
    { tag: "path", attributes: { d: "m9 7 3 3 3-3" } },
  ],
  "undo-2": [
    { tag: "path", attributes: { d: "M9 14 4 9l5-5" } },
    { tag: "path", attributes: { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" } },
  ],
  "redo-2": [
    { tag: "path", attributes: { d: "m15 14 5-5-5-5" } },
    { tag: "path", attributes: { d: "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" } },
  ],
  calculator: [
    { tag: "rect", attributes: { width: "16", height: "20", x: "4", y: "2", rx: "2" } },
    { tag: "line", attributes: { x1: "8", x2: "16", y1: "6", y2: "6" } },
    { tag: "line", attributes: { x1: "16", x2: "16", y1: "14", y2: "18" } },
    { tag: "path", attributes: { d: "M16 10h.01" } },
    { tag: "path", attributes: { d: "M12 10h.01" } },
    { tag: "path", attributes: { d: "M8 10h.01" } },
    { tag: "path", attributes: { d: "M12 14h.01" } },
    { tag: "path", attributes: { d: "M8 14h.01" } },
    { tag: "path", attributes: { d: "M12 18h.01" } },
    { tag: "path", attributes: { d: "M8 18h.01" } },
  ],
  layers: [
    {
      tag: "path",
      attributes: {
        d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
      },
    },
    { tag: "path", attributes: { d: "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" } },
    { tag: "path", attributes: { d: "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" } },
  ],
  "list-end": [
    { tag: "path", attributes: { d: "M16 5H3" } },
    { tag: "path", attributes: { d: "M16 12H3" } },
    { tag: "path", attributes: { d: "M9 19H3" } },
    { tag: "path", attributes: { d: "m16 16-3 3 3 3" } },
    { tag: "path", attributes: { d: "M21 5v12a2 2 0 0 1-2 2h-6" } },
  ],
  "arrow-up-down": [
    { tag: "path", attributes: { d: "m21 16-4 4-4-4" } },
    { tag: "path", attributes: { d: "M17 20V4" } },
    { tag: "path", attributes: { d: "m3 8 4-4 4 4" } },
    { tag: "path", attributes: { d: "M7 4v16" } },
  ],
  terminal: [
    { tag: "polyline", attributes: { points: "4 17 10 11 4 5" } },
    { tag: "line", attributes: { x1: "12", x2: "20", y1: "19", y2: "19" } },
  ],
  "panel-left-close": [
    { tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attributes: { d: "M9 3v18" } },
    { tag: "path", attributes: { d: "m16 15-3-3 3-3" } },
  ],
  "panel-left-open": [
    { tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attributes: { d: "M9 3v18" } },
    { tag: "path", attributes: { d: "m14 9 3 3-3 3" } },
  ],
  "panel-right-close": [
    { tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attributes: { d: "M15 3v18" } },
    { tag: "path", attributes: { d: "m8 9 3 3-3 3" } },
  ],
  "panel-right-open": [
    { tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attributes: { d: "M15 3v18" } },
    { tag: "path", attributes: { d: "m10 15-3-3 3-3" } },
  ],
  "layout-grid": [
    { tag: "rect", attributes: { width: "7", height: "7", x: "3", y: "3", rx: "1" } },
    { tag: "rect", attributes: { width: "7", height: "7", x: "14", y: "3", rx: "1" } },
    { tag: "rect", attributes: { width: "7", height: "7", x: "14", y: "14", rx: "1" } },
    { tag: "rect", attributes: { width: "7", height: "7", x: "3", y: "14", rx: "1" } },
  ],
  "panel-bottom": [
    { tag: "rect", attributes: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attributes: { d: "M3 15h18" } },
  ],
  table: [
    {
      tag: "path",
      attributes: {
        d: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
      },
    },
  ],
  ban: [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attributes: { d: "m4.9 4.9 14.2 14.2" } },
  ],
  "chart-line": [
    { tag: "path", attributes: { d: "M3 3v16a2 2 0 0 0 2 2h16" } },
    { tag: "path", attributes: { d: "m19 9-5 5-4-4-3 3" } },
  ],
  globe: [
    { tag: "circle", attributes: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attributes: { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" } },
    { tag: "path", attributes: { d: "M2 12h20" } },
  ],
  "folder-open": [
    {
      tag: "path",
      attributes: {
        d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      },
    },
  ],
  "log-in": [
    { tag: "path", attributes: { d: "m10 17 5-5-5-5" } },
    { tag: "path", attributes: { d: "M15 12H3" } },
    { tag: "path", attributes: { d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" } },
  ],
  "log-out": [
    { tag: "path", attributes: { d: "m16 17 5-5-5-5" } },
    { tag: "path", attributes: { d: "M21 12H9" } },
    { tag: "path", attributes: { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" } },
  ],
} as const satisfies Readonly<Record<string, ReadonlyArray<IconElement>>>;

export type IconName = keyof typeof ICONS;
