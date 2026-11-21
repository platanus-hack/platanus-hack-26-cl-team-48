type ThemedValue = { readonly light: string; readonly dark: string };
type ThemedToken = { readonly name: string; readonly value: ThemedValue };
type ScalarToken = { readonly name: string; readonly value: string };
type ScalarGroup = { readonly tokens: ReadonlyArray<ScalarToken> };
type TextStyle = {
  readonly name: string;
  readonly fontSize: string;
  readonly lineHeight: string;
  readonly fontWeight: number;
  readonly letterSpacing?: string;
};
type TextGroup = { readonly family: string; readonly styles: ReadonlyArray<TextStyle> };
type Theme = keyof ThemedValue;

export type DesignTokens = {
  readonly color: { readonly tokens: ReadonlyArray<ThemedToken> };
  readonly type: {
    readonly families: Readonly<Record<string, string>>;
    readonly groups: ReadonlyArray<TextGroup>;
  };
  readonly spacing: ScalarGroup;
  readonly radius: ScalarGroup;
  readonly size: ScalarGroup;
  readonly stroke: ScalarGroup;
  readonly shadow: { readonly tokens: ReadonlyArray<ThemedToken> };
  readonly zIndex: ScalarGroup;
};

const HEADER =
  "/* Generated from tokens.json by scripts/generate-tokens-css.ts. Do not edit by hand. */";
const INDENT = "  ";

export function renderTokensCss(tokens: DesignTokens): string {
  const dark = themeDeclarations(tokens, "dark");
  return [
    HEADER,
    renderBlock(":root", [
      ...themeDeclarations(tokens, "light"),
      ...themeIndependentDeclarations(tokens),
    ]),
    renderBlock('[data-theme="dark"]', dark),
    `@media (prefers-color-scheme: dark) {\n${indent(renderBlock(':root:not([data-theme="light"])', dark))}\n}`,
  ]
    .join("\n\n")
    .concat("\n");
}

function themeDeclarations(tokens: DesignTokens, theme: Theme): ReadonlyArray<string> {
  return [
    declare("color-scheme", theme),
    ...[...tokens.color.tokens, ...tokens.shadow.tokens].map((token) =>
      declare(`--${token.name}`, token.value[theme]),
    ),
  ];
}

function themeIndependentDeclarations(tokens: DesignTokens): ReadonlyArray<string> {
  return [
    ...Object.entries(tokens.type.families).map(([family, stack]) =>
      declare(`--font-${family}`, stack),
    ),
    ...tokens.type.groups.flatMap(textStyleDeclarations),
    ...[tokens.spacing, tokens.radius, tokens.size, tokens.stroke, tokens.zIndex]
      .flatMap((group) => group.tokens)
      .map((token) => declare(`--${token.name}`, token.value)),
  ];
}

function textStyleDeclarations(group: TextGroup): ReadonlyArray<string> {
  return group.styles.flatMap((style) => {
    const prefix = `--text-${style.name}`;
    return [
      declare(
        prefix,
        `${String(style.fontWeight)} ${style.fontSize}/${style.lineHeight} var(--font-${group.family})`,
      ),
      declare(`${prefix}-size`, style.fontSize),
      declare(`${prefix}-line`, style.lineHeight),
      declare(`${prefix}-weight`, String(style.fontWeight)),
      ...(style.letterSpacing === undefined
        ? []
        : [declare(`${prefix}-tracking`, style.letterSpacing)]),
    ];
  });
}

function declare(property: string, value: string): string {
  return `${property}: ${value};`;
}

function renderBlock(selector: string, declarations: ReadonlyArray<string>): string {
  return `${selector} {\n${declarations.map((line) => INDENT + line).join("\n")}\n}`;
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => INDENT + line)
    .join("\n");
}
