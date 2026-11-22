import { FEED_MAP_MAX_PEOPLE, type FeedMapPerson } from "@nodomics/profile";
import { useMemo, useState } from "react";
import { RouteLink } from "../routing/RouteLink.tsx";
import { projectPeople } from "./project-people.ts";
import { PEOPLE_MAP_MESSAGES as COPY } from "./people-map-messages.ts";
import "./people-map.css";

const asPercent = (coordinate = 0.5) => `${String(coordinate * 100)}%`;

export function PeopleMap({
  people,
  filtered = false,
}: {
  readonly people: readonly FeedMapPerson[];
  readonly filtered?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const points = useMemo(() => projectPeople(people.map(({ vector }) => vector)), [people]);
  const person = people.find(({ handle }) => handle === selected);
  if (people.length === 0) return <p>{filtered ? COPY.noResults : COPY.empty}</p>;
  return (
    <div className="web-people-map">
      <p>{COPY.proximity}</p>
      {people.length === FEED_MAP_MAX_PEOPLE && <p>{COPY.sample(FEED_MAP_MAX_PEOPLE)}</p>}
      <div className="web-people-map-plot" role="group" aria-label={COPY.plot}>
        <div className="web-people-map-points">
          {people.map((entry, index) => (
            <button
              key={entry.handle}
              type="button"
              tabIndex={-1}
              title={entry.title}
              aria-label={entry.title}
              aria-pressed={entry.handle === selected}
              className="web-people-map-point"
              data-technical={entry.technical}
              data-match={entry.match}
              style={{
                left: asPercent(points[index]?.x),
                top: asPercent(points[index]?.y),
              }}
              onClick={() => {
                setSelected(entry.handle);
              }}
            />
          ))}
        </div>
      </div>
      <p className="web-people-map-legend">
        {Object.entries(COPY.technical).map(([level, label]) => (
          <span key={level} data-technical={level}>
            {label}
          </span>
        ))}
        {people.some(({ match }) => match) && <span data-match="true">{COPY.match}</span>}
      </p>
      <label className="web-people-map-select">
        {COPY.select}
        <select
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
          }}
        >
          <option value="">{COPY.choose}</option>
          {people.map(({ handle, title }) => (
            <option key={handle} value={handle}>
              {title}
            </option>
          ))}
        </select>
      </label>
      <div aria-live="polite">{person !== undefined && <PersonDetails person={person} />}</div>
    </div>
  );
}

function PersonDetails({ person }: { readonly person: FeedMapPerson }) {
  return (
    <div className="web-people-map-details">
      <h3>{person.title}</h3>
      <p>{COPY.technical[person.technical]}</p>
      {person.match && <p>{COPY.matchDetail}</p>}
      {person.offers.length > 0 && (
        <ul aria-label={COPY.offers}>
          {person.offers.map((offer, index) => (
            <li key={index}>{offer}</li>
          ))}
        </ul>
      )}
      <RouteLink route={{ page: "profile", handle: person.handle }}>{COPY.profile}</RouteLink>
    </div>
  );
}
