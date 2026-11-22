import type { FeedMapPerson } from "@nodomics/profile";
import { RouteLink } from "../routing/RouteLink.tsx";
import type { Niche } from "./find-niches.ts";
import { PEOPLE_MAP_MESSAGES as COPY } from "./people-map-messages.ts";

const TECHNICAL_LEVELS = ["uses", "builds", "codes"] as const;
const PERCENT = 100;

/** What a niche is about, without listing who is in it. */
export function NicheDetails({
  niche,
  members,
  onBack,
}: {
  readonly niche: Niche;
  readonly members: readonly FeedMapPerson[];
  readonly onBack: () => void;
}) {
  const matches = members.filter(({ match }) => match).length;
  return (
    <div className="web-niche-details">
      <p className="web-overline">{COPY.niche}</p>
      <h3 className="web-niche-details-title">{niche.label}</h3>
      <p className="web-niche-details-count">{COPY.people(niche.handles.length)}</p>
      {niche.keywords.length > 0 && (
        <ul className="web-niche-keywords" aria-label={COPY.keywords}>
          {niche.keywords.map((keyword) => (
            <li key={keyword}>{keyword}</li>
          ))}
        </ul>
      )}
      <TechnicalMix members={members} />
      {matches > 0 && <p className="web-niche-details-match">{COPY.matches(matches)}</p>}
      <button type="button" className="web-niche-details-back" onClick={onBack}>
        {COPY.back}
      </button>
    </div>
  );
}

/** How the niche's members work, as one proportional bar. */
function TechnicalMix({ members }: { readonly members: readonly FeedMapPerson[] }) {
  const levels = TECHNICAL_LEVELS.map((level) => ({
    level,
    count: members.filter(({ technical }) => technical === level).length,
  })).filter(({ count }) => count > 0);
  return (
    <div className="web-niche-mix">
      <p className="web-overline">{COPY.mix}</p>
      <div className="web-niche-mix-bar" aria-hidden="true">
        {levels.map(({ level, count }) => (
          <span
            key={level}
            data-technical={level}
            style={{ width: `${String((count / members.length) * PERCENT)}%` }}
          />
        ))}
      </div>
      <ul className="web-niche-mix-legend">
        {levels.map(({ level, count }) => (
          <li key={level} data-technical={level}>
            {COPY.technical[level]} · {count}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PersonDetails({
  person,
  niche,
}: {
  readonly person: FeedMapPerson;
  readonly niche: Niche | undefined;
}) {
  return (
    <div className="web-niche-details">
      {niche !== undefined && <p className="web-overline">{niche.label}</p>}
      <h3 className="web-niche-details-title">{person.title}</h3>
      <p className="web-niche-details-count">{COPY.technical[person.technical]}</p>
      {person.match && <p className="web-niche-details-match">{COPY.matchDetail}</p>}
      {person.offers.length > 0 && (
        <ul className="web-niche-keywords" aria-label={COPY.offers}>
          {person.offers.map((offer, index) => (
            <li key={index}>{offer}</li>
          ))}
        </ul>
      )}
      <RouteLink
        route={{ page: "profile", handle: person.handle }}
        className="nd-btn nd-btn-primary nd-btn-md web-niche-details-profile"
      >
        {COPY.profile}
      </RouteLink>
    </div>
  );
}
