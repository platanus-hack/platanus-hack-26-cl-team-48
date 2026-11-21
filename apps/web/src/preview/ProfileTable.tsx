import type { ResultRef } from "@nodomics/protocol";
import { useEngineQuery } from "../engine/use-engine-query.ts";
import { MESSAGES } from "../messages.ts";
import { summarizeColumn } from "./profile-summary.ts";
import { QueryStatus } from "./QueryStatus.tsx";

const HEADERS = MESSAGES.preview.profileColumns;

/** One row per column with its type and a summary computed by the engine (`data.profile`). */
export function ProfileTable({ resultRef }: { readonly resultRef: ResultRef }) {
  const profile = useEngineQuery(`profile:${resultRef.id}`, (session) =>
    session.profile(resultRef.id),
  );
  if (profile.status !== "ready") return <QueryStatus state={profile} />;
  return (
    <table className="web-profile-table">
      <thead>
        <tr>
          <th scope="col">{HEADERS.name}</th>
          <th scope="col">{HEADERS.type}</th>
          <th scope="col">{HEADERS.summary}</th>
        </tr>
      </thead>
      <tbody>
        {profile.value.columns.map(summarizeColumn).map((column) => (
          <tr key={column.name}>
            <td>{column.name}</td>
            <td className="web-profile-type">{column.type}</td>
            <td className="web-profile-summary">{column.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
