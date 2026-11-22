import { FEED_MAP_MAX_PEOPLE, type FeedMapPerson } from "@nodomics/profile";
import { useMemo, useState } from "react";
import { findNiches, type Niche } from "./find-niches.ts";
import { layoutNiches, MAP_ASPECT, type Bubble, type Dot } from "./niche-layout.ts";
import { NicheDetails, PersonDetails } from "./NicheDetails.tsx";
import { projectPeople } from "./project-people.ts";
import { PEOPLE_MAP_MESSAGES as COPY } from "./people-map-messages.ts";
import "./people-map.css";

const HUES = 6;
const PERCENT = 100;

type Selection =
  | { readonly kind: "niche"; readonly id: string }
  | { readonly kind: "person"; readonly handle: string };

const across = (value: number) => `${String((value / MAP_ASPECT) * PERCENT)}%`;
const down = (value: number) => `${String(value * PERCENT)}%`;
const hueOf = (index: number) => String((index % HUES) + 1);

function useNicheMap(people: readonly FeedMapPerson[]) {
  return useMemo(() => {
    const points = projectPeople(people.map(({ vector }) => vector));
    const positions = new Map(
      people.map(({ handle }, index) => [handle, points[index] ?? { x: 0, y: 0 }]),
    );
    const niches = findNiches(people);
    return { niches, ...layoutNiches(niches, positions) };
  }, [people]);
}

/** The people map: niches of people who offer similar things, as bubbles to explore. */
export function PeopleMap({
  people,
  filtered = false,
}: {
  readonly people: readonly FeedMapPerson[];
  readonly filtered?: boolean;
}) {
  const [selection, setSelection] = useState<Selection>();
  const { niches, bubbles, dots } = useNicheMap(people);
  if (people.length === 0) {
    return <p className="web-niche-map-empty">{filtered ? COPY.noResults : COPY.empty}</p>;
  }
  const person = people.find(
    ({ handle }) => selection?.kind === "person" && selection.handle === handle,
  );
  const focusedId =
    selection?.kind === "niche"
      ? selection.id
      : dots.find(({ handle }) => handle === person?.handle)?.nicheId;
  const niche = niches.find(({ id }) => id === focusedId);
  return (
    <div className="web-niche-map">
      <MapHeader niches={niches.length} people={people.length} />
      <div className="web-niche-map-body">
        <div
          className="web-niche-map-stage"
          role="group"
          aria-label={COPY.plot}
          data-focused={focusedId !== undefined}
        >
          {bubbles.map((bubble, index) => (
            <NicheBubble
              key={bubble.id}
              bubble={bubble}
              niche={niches[index]}
              hue={hueOf(index)}
              isActive={bubble.id === focusedId}
              onSelect={() => {
                setSelection({ kind: "niche", id: bubble.id });
              }}
            />
          ))}
          {dots.map((dot) => (
            <PersonDot
              key={dot.handle}
              dot={dot}
              person={people.find(({ handle }) => handle === dot.handle)}
              hue={hueOf(niches.findIndex(({ id }) => id === dot.nicheId))}
              isActive={dot.nicheId === focusedId}
              isSelected={dot.handle === person?.handle}
              onSelect={() => {
                setSelection({ kind: "person", handle: dot.handle });
              }}
            />
          ))}
        </div>
        <aside className="web-niche-panel" aria-live="polite">
          {person !== undefined ? (
            <PersonDetails person={person} niche={niche} />
          ) : niche !== undefined ? (
            <NicheDetails
              niche={niche}
              members={people.filter(({ handle }) => niche.handles.includes(handle))}
              onBack={() => {
                setSelection(undefined);
              }}
            />
          ) : (
            <p className="web-niche-panel-hint">{COPY.hint}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function MapHeader({ niches, people }: { readonly niches: number; readonly people: number }) {
  return (
    <header className="web-niche-map-header">
      <p className="web-niche-map-summary">{COPY.summary(niches, people)}</p>
      <p className="web-niche-map-lead">
        {COPY.proximity}
        {people === FEED_MAP_MAX_PEOPLE && ` ${COPY.sample(FEED_MAP_MAX_PEOPLE)}`}
      </p>
    </header>
  );
}

function NicheBubble(props: {
  readonly bubble: Bubble;
  readonly niche: Niche | undefined;
  readonly hue: string;
  readonly isActive: boolean;
  readonly onSelect: () => void;
}) {
  const { bubble, niche } = props;
  if (niche === undefined) return null;
  return (
    <button
      type="button"
      className="web-niche-bubble"
      data-hue={props.hue}
      data-active={props.isActive}
      aria-pressed={props.isActive}
      aria-label={COPY.nicheName(niche.label, niche.handles.length)}
      style={{
        left: across(bubble.x - bubble.radius),
        top: down(bubble.y - bubble.radius),
        width: across(bubble.radius * 2),
      }}
      onClick={props.onSelect}
    >
      <span className="web-niche-bubble-label" aria-hidden="true">
        {niche.label}
        <span className="web-niche-bubble-count">{niche.handles.length}</span>
      </span>
    </button>
  );
}

function PersonDot(props: {
  readonly dot: Dot;
  readonly person: FeedMapPerson | undefined;
  readonly hue: string;
  readonly isActive: boolean;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}) {
  const { dot, person } = props;
  if (person === undefined) return null;
  return (
    <button
      type="button"
      tabIndex={-1}
      title={person.title}
      aria-label={person.title}
      aria-pressed={props.isSelected}
      className="web-niche-dot"
      data-hue={props.hue}
      data-active={props.isActive}
      data-technical={person.technical}
      data-match={person.match}
      style={{ left: across(dot.x), top: down(dot.y) }}
      onClick={props.onSelect}
    />
  );
}
