// "Hear <artist> on GeekFon Radio": every station the artist is on, linking
// straight into /radio on that station (2026-10-04, Sean: cross-pollinate
// fans from an artist's page into the stations that feature her).
import type { RadioStation } from "@/lib/server/radio";
import "./roster.css";

export default function RadioStrip({ artistName, stations }: { artistName: string; stations: RadioStation[] }) {
  if (!stations.length) return null;
  return (
    <section className="rs-radio" aria-label={`${artistName} on GeekFon Radio`}>
      <div className="rs-radio-head">
        <span className="rs-radio-dot" aria-hidden="true" />
        Hear {artistName} on GeekFon Radio
      </div>
      <div className="rs-radio-list">
        {stations.map(s => (
          <a key={s.slug} className="rs-radio-chip" href={s.slug === "main" ? "/radio" : `/radio?station=${encodeURIComponent(s.slug)}`}>
            {s.name}
          </a>
        ))}
      </div>
    </section>
  );
}
