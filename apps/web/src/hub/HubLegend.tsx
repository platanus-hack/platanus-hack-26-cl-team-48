import { ThreadGlyph, type ThreadGlyphKind } from "@nodomics/ui";

const LEYENDA: ReadonlyArray<{
  readonly kind: ThreadGlyphKind;
  readonly title: string;
  readonly desc: string;
}> = [
  { kind: "crosses", title: "Se cruza", desc: "Dos soluciones en un flujo" },
  { kind: "braids", title: "Se trenza", desc: "Alguien la adaptó" },
  { kind: "tangles", title: "Se enreda", desc: "Dos cambios chocan" },
  { kind: "untangles", title: "Se desenreda", desc: "Alguien decidió" },
  { kind: "breaks", title: "Se triza", desc: "Falló una prueba" },
  { kind: "splices", title: "Se empalma", desc: "Alguien la reparó" },
];

export function HubLegend() {
  return (
    <section className="web-hub-legend" aria-label="Cómo leer el hilo">
      <p className="web-hub-legend-title">Cómo leer el hilo de cada solución</p>
      <div className="web-hub-legend-row">
        {LEYENDA.map(({ kind, title, desc }) => (
          <div key={kind} className="web-hub-legend-item">
            <ThreadGlyph kind={kind} />
            <b>{title}</b>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
