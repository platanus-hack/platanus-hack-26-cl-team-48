import type { Responses } from "./response-fetch.ts";
import type { Column } from "@nodomics/protocol";
import type { ExpectedDisplay } from "./check-displays.ts";

export type Table = {
  readonly columns: readonly Column[];
  readonly rows: readonly (readonly unknown[])[];
};

export type TestCase = {
  readonly name: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly inputs: Readonly<Record<string, Table>>;
  readonly responses?: Responses;
  readonly sources?: Readonly<Record<string, Table>>;
  readonly expected: Readonly<Record<string, unknown>>;
  /** The figures the node shows, when the case checks them. */
  readonly displays?: ReadonlyArray<ExpectedDisplay>;
};
