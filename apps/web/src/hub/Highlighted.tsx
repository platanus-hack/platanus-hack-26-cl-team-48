/** A headline with its key words in the accent colour; the text is split, never injected as HTML. */
export function Highlighted({
  text,
  emphasis,
}: {
  readonly text: string;
  readonly emphasis: string;
}) {
  const [before = text, ...rest] = text.split(emphasis);
  if (rest.length === 0) return text;
  return (
    <>
      {before}
      <span className="web-hub-accent">{emphasis}</span>
      {rest.join(emphasis)}
    </>
  );
}
