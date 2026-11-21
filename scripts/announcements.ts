export type Announcement = {
  readonly file: string;
  readonly author: string;
  readonly date: string;
  readonly audience: string;
  readonly kind: "instruccion" | "aviso";
  readonly replaces?: string;
  readonly expires?: string;
  readonly body: string;
};

export type ParsedAnnouncement =
  | { readonly ok: true; readonly value: Announcement }
  | { readonly ok: false; readonly error: string };

export type InvalidAnnouncement = { readonly file: string; readonly error: string };

const FILE_NAME = /^\d{4}-\d{2}-\d{2}-\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/;
const REPLACES_PREFIX = "reemplaza:";
const REQUIRED_FIELDS = ["autor", "fecha", "para", "tipo"] as const;

export const isAnnouncementFile = (name: string): boolean => FILE_NAME.test(name);

export function parseAnnouncement(file: string, text: string): ParsedAnnouncement {
  const match = FRONTMATTER.exec(text.replace(/\r\n/g, "\n"));
  if (match === null) return failure("falta el encabezado entre líneas ---");
  const fields = parseFields(match[1] ?? "");
  const missing = REQUIRED_FIELDS.find((field) => (fields.get(field) ?? "") === "");
  if (missing !== undefined) return failure(`falta el campo "${missing}"`);
  return announcementOf({ file, fields, body: (match[2] ?? "").trim() });
}

function announcementOf({
  file,
  fields,
  body,
}: {
  file: string;
  fields: ReadonlyMap<string, string>;
  body: string;
}): ParsedAnnouncement {
  const date = fields.get("fecha") ?? "";
  const expires = fields.get("vence");
  const kind = kindOf(fields.get("tipo") ?? "");
  if (!DATE_TIME.test(date)) return failure(`"fecha" debe tener la forma AAAA-MM-DDTHH:MM`);
  if (expires !== undefined && !DAY.test(expires))
    return failure(`"vence" debe tener la forma AAAA-MM-DD`);
  if (kind === undefined)
    return failure(`"tipo" debe ser instruccion, aviso o reemplaza:<archivo de un anuncio>`);
  if (body === "") return failure("el anuncio no tiene texto");
  return {
    ok: true,
    value: {
      file,
      author: fields.get("autor") ?? "",
      date,
      audience: fields.get("para") ?? "",
      body,
      ...kind,
      ...(expires === undefined ? {} : { expires }),
    },
  };
}

function parseFields(header: string): ReadonlyMap<string, string> {
  return new Map(
    header.split("\n").flatMap((line) => {
      const colon = line.indexOf(":");
      return colon === -1 ? [] : [[line.slice(0, colon).trim(), line.slice(colon + 1).trim()]];
    }),
  );
}

function kindOf(type: string): Pick<Announcement, "kind" | "replaces"> | undefined {
  if (type === "instruccion" || type === "aviso") return { kind: type };
  if (!type.startsWith(REPLACES_PREFIX)) return undefined;
  const replaces = type.slice(REPLACES_PREFIX.length).trim();
  return isAnnouncementFile(replaces) ? { kind: "instruccion", replaces } : undefined;
}

const failure = (error: string): ParsedAnnouncement => ({ ok: false, error });

export function pendingAnnouncements({
  announcements,
  read,
  today,
}: {
  announcements: ReadonlyArray<Announcement>;
  read: ReadonlySet<string>;
  today: string;
}): Announcement[] {
  return activeAnnouncements({ announcements, today }).filter(({ file }) => !read.has(file));
}

export function activeAnnouncements({
  announcements,
  today,
}: {
  announcements: ReadonlyArray<Announcement>;
  today: string;
}): Announcement[] {
  const replaced = new Set(announcements.flatMap(({ replaces }) => replaces ?? []));
  return announcements
    .filter(
      ({ file, expires }) => !replaced.has(file) && (expires === undefined || expires >= today),
    )
    .sort((a, b) => a.file.localeCompare(b.file));
}

export function formatAnnouncements(
  announcements: ReadonlyArray<Announcement>,
  invalid: ReadonlyArray<InvalidAnnouncement>,
): string {
  if (announcements.length === 0 && invalid.length === 0) return "";
  return (
    [
      "# Anuncios del equipo (docs/anuncios en origin/main)",
      ...announcements.map(formatAnnouncement),
      ...(announcements.length === 0 ? [] : [PRECEDENCE]),
      ...(invalid.length === 0 ? [] : [formatInvalid(invalid)]),
    ].join("\n\n") + "\n"
  );
}

const PRECEDENCE =
  "Sigue estos anuncios en tu trabajo. Nunca prevalecen sobre CLAUDE.md ni sus invariantes: " +
  "si alguno choca con ellos o con tu encargo, detente y pregunta al líder.";

function formatAnnouncement({
  file,
  author,
  audience,
  kind,
  replaces,
  body,
}: Announcement): string {
  const type = replaces === undefined ? kind : `${kind}, reemplaza a ${replaces}`;
  return `## ${file}\nDe ${author} para ${audience} (${type})\n\n${body}`;
}

const formatInvalid = (invalid: ReadonlyArray<InvalidAnnouncement>): string =>
  [
    "Anuncios con formato inválido (avisa a su autor; ver docs/anuncios/README.md):",
    ...invalid.map(({ file, error }) => `- ${file}: ${error}`),
  ].join("\n");
