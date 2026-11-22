import { parseProfileCard, type FeedHit } from "@nodomics/profile";

/** The about text of a profile hit; the payload of other kinds is not shown. */
export function HitSummary({ hit }: { readonly hit: FeedHit }) {
  if (hit.kind !== "profile") return null;
  const card = parseProfileCard(hit.payload);
  return card.ok ? <span className="web-hub-for-you-reason">{card.value.about}</span> : null;
}
