import { Bool, Float64, Int32, Table, tableToIPC, Utf8, vectorFromArray } from "apache-arrow";
import type { Column, Runtime, Task } from "@nodomics/protocol";

/** A small table with every column type the executors must agree on, including nulls. */
export function encodePeopleTable(): Uint8Array {
  return tableToIPC(
    new Table({
      id: vectorFromArray([1, 2, 3, 4], new Int32()),
      name: vectorFromArray(["ana", "bea", null, "dan"], new Utf8()),
      score: vectorFromArray([4.5, 1.5, null, 1.5], new Float64()),
      active: vectorFromArray([true, false, true, null], new Bool()),
    }),
    "stream",
  );
}

export const PEOPLE_SCHEMA: readonly Column[] = [
  { name: "id", type: "number" },
  { name: "name", type: "text" },
  { name: "score", type: "number" },
  { name: "active", type: "bool" },
];

export const PEOPLE_ROWS: readonly (readonly unknown[])[] = [
  [1, "ana", 4.5, true],
  [2, "bea", 1.5, false],
  [3, null, null, true],
  [4, "dan", 1.5, null],
];

export const PEOPLE_CSV = new TextEncoder().encode("id,name\n1,ana\n2,bea\n");

/** Per runtime, a task that keeps the `people` whose score is above 2, with columns id and score. */
export const FILTER_TASKS: Readonly<Record<Runtime, (peopleId: string) => Task>> = {
  sql: (peopleId) => ({
    kind: "sql",
    query: "SELECT id, score FROM people WHERE score > 2",
    inputs: { people: peopleId },
  }),
  python: (peopleId) => ({
    kind: "python",
    code: [
      "def run(inputs, params):",
      "    people = inputs['people']",
      "    return {'out': people[people['score'] > params['min']][['id', 'score']]}",
    ].join("\n"),
    entry: "run",
    inputs: { people: peopleId },
    params: { min: 2 },
  }),
};
