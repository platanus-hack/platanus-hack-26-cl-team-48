import { describe, expect, it } from "vitest";
import {
  activeAnnouncements,
  formatAnnouncements,
  isAnnouncementFile,
  parseAnnouncement,
  pendingAnnouncements,
  type Announcement,
} from "./announcements.ts";

const FILE = "2026-11-21-1830-barra-nueva.md";

const VALID_FRONTMATTER = {
  autor: "sebas",
  fecha: "2026-11-21T18:30",
  para: "todos",
  tipo: "instruccion",
  vence: "2026-11-28",
};

function announcementText(
  fields: Readonly<Record<string, string | undefined>> = VALID_FRONTMATTER,
  body = "Usen la barra nueva.",
): string {
  const lines = Object.entries(fields)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}: ${value}`);
  return ["---", ...lines, "---", body].join("\n");
}

function withField(key: string, value: string | undefined): Record<string, string | undefined> {
  return { ...VALID_FRONTMATTER, [key]: value };
}

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    file: FILE,
    author: "sebas",
    date: "2026-11-21T18:30",
    audience: "todos",
    kind: "instruccion",
    body: "Usen la barra nueva.",
    ...overrides,
  };
}

function errorOf(file: string, text: string): string {
  const result = parseAnnouncement(file, text);
  if (result.ok) throw new Error("expected a parse error");
  return result.error;
}

function fileNames(announcements: ReadonlyArray<Announcement>): string[] {
  return announcements.map((item) => item.file);
}

describe("isAnnouncementFile", () => {
  it("accepts a dated file name with a slug", () => {
    expect(isAnnouncementFile("2026-11-21-1830-barra-nueva.md")).toBe(true);
  });

  it("accepts a slug with digits", () => {
    expect(isAnnouncementFile("2026-01-05-0905-v2-listo.md")).toBe(true);
  });

  it("rejects README.md", () => {
    expect(isAnnouncementFile("README.md")).toBe(false);
  });

  it("rejects a name without the time", () => {
    expect(isAnnouncementFile("2026-11-21-barra-nueva.md")).toBe(false);
  });

  it("rejects an uppercase slug", () => {
    expect(isAnnouncementFile("2026-11-21-1830-Barra-Nueva.md")).toBe(false);
  });

  it("rejects other extensions", () => {
    expect(isAnnouncementFile("2026-11-21-1830-barra-nueva.txt")).toBe(false);
  });

  it("rejects paths with directories", () => {
    expect(isAnnouncementFile("docs/anuncios/2026-11-21-1830-barra-nueva.md")).toBe(false);
  });

  it("rejects a name without a slug", () => {
    expect(isAnnouncementFile("2026-11-21-1830.md")).toBe(false);
  });

  it("rejects a slug with characters outside letters, digits and hyphens", () => {
    expect(isAnnouncementFile("2026-11-21-1830-barra_nueva.md")).toBe(false);
  });
});

describe("parseAnnouncement", () => {
  it("parses every field of a valid announcement", () => {
    const text = announcementText(VALID_FRONTMATTER, "Usen la barra nueva.");

    const result = parseAnnouncement(FILE, text);

    expect(result).toEqual({
      ok: true,
      value: {
        file: FILE,
        author: "sebas",
        date: "2026-11-21T18:30",
        audience: "todos",
        kind: "instruccion",
        expires: "2026-11-28",
        body: "Usen la barra nueva.",
      },
    });
  });

  it("parses an aviso", () => {
    const text = announcementText(withField("tipo", "aviso"));

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value.kind).toBe("aviso");
  });

  it("treats reemplaza as an instruction that replaces the named announcement", () => {
    const text = announcementText(withField("tipo", "reemplaza:2026-11-20-1000-barra-vieja.md"));

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value).toMatchObject({
      kind: "instruccion",
      replaces: "2026-11-20-1000-barra-vieja.md",
    });
  });

  it("leaves expires undefined when vence is absent", () => {
    const text = announcementText(withField("vence", undefined));

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value.expires).toBeUndefined();
  });

  it("leaves replaces undefined for a plain instruction", () => {
    const text = announcementText();

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value.replaces).toBeUndefined();
  });

  it("keeps a multi-line markdown body", () => {
    const body = "# Título\n\n- uno\n- dos";
    const text = announcementText(VALID_FRONTMATTER, body);

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value.body).toBe(body);
  });

  it("trims field values", () => {
    const text = [
      "---",
      "autor:   sebas  ",
      "fecha: 2026-11-21T18:30",
      "para:  apps/web ",
      "tipo:  aviso ",
      "---",
      "Hola",
    ].join("\n");

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value).toMatchObject({
      author: "sebas",
      audience: "apps/web",
      kind: "aviso",
    });
  });

  it("takes surrounding quotes literally", () => {
    const text = announcementText(withField("autor", '"sebas"'));

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value.author).toBe('"sebas"');
  });

  it("ignores unknown extra keys", () => {
    const text = announcementText({ ...VALID_FRONTMATTER, prioridad: "alta" });

    const result = parseAnnouncement(FILE, text);

    expect(result.ok).toBe(true);
  });

  it("accepts CRLF line endings", () => {
    const text = announcementText().replaceAll("\n", "\r\n");

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value).toMatchObject({
      author: "sebas",
      expires: "2026-11-28",
      body: "Usen la barra nueva.",
    });
  });

  it("accepts a free-text audience such as a branch name", () => {
    const text = announcementText(withField("para", "lider/anuncios-agentes"));

    const result = parseAnnouncement(FILE, text);

    expect(result.ok && result.value.audience).toBe("lider/anuncios-agentes");
  });

  it("rejects text without frontmatter", () => {
    const result = parseAnnouncement(FILE, "Solo un cuerpo sin cabecera.");

    expect(result.ok).toBe(false);
  });

  it("rejects an unterminated frontmatter", () => {
    const result = parseAnnouncement(FILE, "---\nautor: sebas\nfecha: 2026-11-21T18:30\n");

    expect(result.ok).toBe(false);
  });

  it.each(["autor", "fecha", "para", "tipo"])(
    "rejects a missing %s and names the field",
    (field) => {
      const text = announcementText(withField(field, undefined));

      const error = errorOf(FILE, text);

      expect(error).toContain(field);
    },
  );

  it("rejects an empty autor and names the field", () => {
    const text = announcementText(withField("autor", "   "));

    const error = errorOf(FILE, text);

    expect(error).toContain("autor");
  });

  it.each(["2026-11-21", "2026-11-21 18:30", "21-11-2026T18:30", "2026-11-21T1830"])(
    "rejects fecha %s and names the field",
    (fecha) => {
      const text = announcementText(withField("fecha", fecha));

      const error = errorOf(FILE, text);

      expect(error).toContain("fecha");
    },
  );

  it.each(["2026-11-28T10:00", "28-11-2026", "2026/11/28", "mañana"])(
    "rejects vence %s and names the field",
    (vence) => {
      const text = announcementText(withField("vence", vence));

      const error = errorOf(FILE, text);

      expect(error).toContain("vence");
    },
  );

  it("rejects an unknown tipo and names the field", () => {
    const text = announcementText(withField("tipo", "urgente"));

    const error = errorOf(FILE, text);

    expect(error).toContain("tipo");
  });

  it("rejects reemplaza without a file name", () => {
    const text = announcementText(withField("tipo", "reemplaza:"));

    const result = parseAnnouncement(FILE, text);

    expect(result.ok).toBe(false);
  });

  it("rejects reemplaza pointing to something that is not an announcement file", () => {
    const text = announcementText(withField("tipo", "reemplaza:README.md"));

    const result = parseAnnouncement(FILE, text);

    expect(result.ok).toBe(false);
  });

  it("rejects an empty body", () => {
    const text = announcementText(VALID_FRONTMATTER, "   \n\n  ");

    const result = parseAnnouncement(FILE, text);

    expect(result.ok).toBe(false);
  });
});

describe("pendingAnnouncements", () => {
  const today = "2026-11-21";

  it("returns unread, unexpired announcements", () => {
    const announcements = [announcement()];

    const pending = pendingAnnouncements({ announcements, read: new Set(), today });

    expect(fileNames(pending)).toEqual([FILE]);
  });

  it("omits announcements already read", () => {
    const announcements = [
      announcement({ file: "2026-11-20-1000-a.md" }),
      announcement({ file: "2026-11-21-1000-b.md" }),
    ];

    const pending = pendingAnnouncements({
      announcements,
      read: new Set(["2026-11-20-1000-a.md"]),
      today,
    });

    expect(fileNames(pending)).toEqual(["2026-11-21-1000-b.md"]);
  });

  it("omits announcements that expired before today", () => {
    const announcements = [announcement({ expires: "2026-11-20" })];

    const pending = pendingAnnouncements({ announcements, read: new Set(), today });

    expect(pending).toEqual([]);
  });

  it("keeps announcements on their expiry day", () => {
    const announcements = [announcement({ expires: today })];

    const pending = pendingAnnouncements({ announcements, read: new Set(), today });

    expect(fileNames(pending)).toEqual([FILE]);
  });

  it("keeps announcements without an expiry date", () => {
    const announcements = [announcement()];

    const pending = pendingAnnouncements({ announcements, read: new Set(), today: "2099-01-01" });

    expect(fileNames(pending)).toEqual([FILE]);
  });

  it("omits announcements replaced by another one", () => {
    const announcements = [
      announcement({ file: "2026-11-20-1000-vieja.md" }),
      announcement({ file: "2026-11-21-1000-nueva.md", replaces: "2026-11-20-1000-vieja.md" }),
    ];

    const pending = pendingAnnouncements({ announcements, read: new Set(), today });

    expect(fileNames(pending)).toEqual(["2026-11-21-1000-nueva.md"]);
  });

  it("omits replaced announcements even when the replacing one was read", () => {
    const announcements = [
      announcement({ file: "2026-11-20-1000-vieja.md" }),
      announcement({ file: "2026-11-21-1000-nueva.md", replaces: "2026-11-20-1000-vieja.md" }),
    ];

    const pending = pendingAnnouncements({
      announcements,
      read: new Set(["2026-11-21-1000-nueva.md"]),
      today,
    });

    expect(pending).toEqual([]);
  });

  it("sorts by file name ascending", () => {
    const announcements = [
      announcement({ file: "2026-11-21-1200-c.md" }),
      announcement({ file: "2026-11-19-0800-a.md" }),
      announcement({ file: "2026-11-20-0900-b.md" }),
    ];

    const pending = pendingAnnouncements({ announcements, read: new Set(), today });

    expect(fileNames(pending)).toEqual([
      "2026-11-19-0800-a.md",
      "2026-11-20-0900-b.md",
      "2026-11-21-1200-c.md",
    ]);
  });

  it("does not mutate the input list", () => {
    const announcements = [
      announcement({ file: "2026-11-21-1200-c.md" }),
      announcement({ file: "2026-11-19-0800-a.md" }),
    ];
    const before = [...announcements];

    pendingAnnouncements({ announcements, read: new Set(), today });

    expect(announcements).toEqual(before);
  });

  it("returns an empty list for no announcements", () => {
    const pending = pendingAnnouncements({ announcements: [], read: new Set(), today });

    expect(pending).toEqual([]);
  });
});

describe("activeAnnouncements", () => {
  const today = "2026-11-21";

  it("includes announcements regardless of whether they were read", () => {
    const announcements = [
      announcement({ file: "2026-11-21-1200-b.md" }),
      announcement({ file: "2026-11-20-1000-a.md" }),
    ];

    const active = activeAnnouncements({ announcements, today });

    expect(fileNames(active)).toEqual(["2026-11-20-1000-a.md", "2026-11-21-1200-b.md"]);
  });

  it("omits expired announcements", () => {
    const announcements = [announcement({ expires: "2026-11-20" })];

    const active = activeAnnouncements({ announcements, today });

    expect(active).toEqual([]);
  });

  it("keeps announcements on their expiry day", () => {
    const announcements = [announcement({ expires: today })];

    const active = activeAnnouncements({ announcements, today });

    expect(fileNames(active)).toEqual([FILE]);
  });

  it("omits replaced announcements", () => {
    const announcements = [
      announcement({ file: "2026-11-20-1000-vieja.md" }),
      announcement({ file: "2026-11-21-1000-nueva.md", replaces: "2026-11-20-1000-vieja.md" }),
    ];

    const active = activeAnnouncements({ announcements, today });

    expect(fileNames(active)).toEqual(["2026-11-21-1000-nueva.md"]);
  });

  it("does not mutate the input list", () => {
    const announcements = [
      announcement({ file: "2026-11-21-1200-c.md" }),
      announcement({ file: "2026-11-19-0800-a.md" }),
    ];
    const before = [...announcements];

    activeAnnouncements({ announcements, today });

    expect(announcements).toEqual(before);
  });
});

describe("formatAnnouncements", () => {
  const first = announcement({
    file: "2026-11-20-1000-primero.md",
    author: "ana",
    audience: "apps/web",
    kind: "aviso",
    body: "Primer cuerpo.\n\nCon dos párrafos.",
  });
  const second = announcement({
    file: "2026-11-21-1830-segundo.md",
    author: "beto",
    audience: "todos",
    kind: "instruccion",
    replaces: "2026-11-19-0900-anterior.md",
    body: "Segundo cuerpo.",
  });

  it("returns an empty string when there is nothing to show", () => {
    expect(formatAnnouncements([], [])).toBe("");
  });

  it("starts with a heading line naming the team announcements", () => {
    const text = formatAnnouncements([first], []);

    expect(text.split("\n")[0]).toContain("Anuncios del equipo");
  });

  it("includes the file name, author, audience, kind and full body of each announcement", () => {
    const text = formatAnnouncements([first], []);

    expect(text).toContain("2026-11-20-1000-primero.md");
    expect(text).toContain("ana");
    expect(text).toContain("apps/web");
    expect(text).toContain("aviso");
    expect(text).toContain("Primer cuerpo.\n\nCon dos párrafos.");
  });

  it("says which announcement a replacing one replaces", () => {
    const text = formatAnnouncements([second], []);

    expect(text).toContain("instruccion");
    expect(text).toContain("reemplaza a 2026-11-19-0900-anterior.md");
  });

  it("preserves the order of the announcements", () => {
    const text = formatAnnouncements([second, first], []);

    expect(text.indexOf("2026-11-21-1830-segundo.md")).toBeLessThan(
      text.indexOf("2026-11-20-1000-primero.md"),
    );
  });

  it("adds a CLAUDE.md precedence line after the announcements", () => {
    const text = formatAnnouncements([first, second], []);

    expect(text).toContain("CLAUDE.md");
    expect(text.indexOf("CLAUDE.md")).toBeGreaterThan(text.indexOf("Segundo cuerpo."));
  });

  it("lists each invalid file with its error under an invalid heading", () => {
    const invalid = [
      { file: "2026-11-21-0900-roto.md", error: "falta el campo autor" },
      { file: "2026-11-21-0930-otro.md", error: "tipo desconocido" },
    ];

    const text = formatAnnouncements([first], invalid);

    const invalidHeading = text.indexOf("inválido");
    expect(invalidHeading).toBeGreaterThan(-1);
    for (const { file, error } of invalid) {
      expect(text.indexOf(file)).toBeGreaterThan(invalidHeading);
      expect(text).toContain(error);
    }
  });

  it("produces text when there are only invalid files", () => {
    const text = formatAnnouncements(
      [],
      [{ file: "2026-11-21-0900-roto.md", error: "falta el campo autor" }],
    );

    expect(text).toContain("inválido");
    expect(text).toContain("2026-11-21-0900-roto.md");
    expect(text).toContain("falta el campo autor");
  });
});
