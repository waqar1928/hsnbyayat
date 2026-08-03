import Link from "next/link";
import GarmentPlaceholder from "./GarmentPlaceholder";

type Tile = {
  name: string;
  group: string;
  sub: string | null;
  count: number;
  placeholderType: string;
  placeholderColor: string;
};

export default function CategoryTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Shop by category</h2>
      </div>
      <div className="tiles">
        {tiles.map((t) => {
          const params = new URLSearchParams({ group: t.group, ...(t.sub ? { sub: t.sub } : {}) });
          return (
            <Link className="tile" href={`/shop?${params.toString()}`} key={t.name}>
              <GarmentPlaceholder type={t.placeholderType} color={t.placeholderColor} />
              <span className="tile-name">{t.name}</span>
              <span className="tile-count">{t.count} styles</span>
              <span className="tile-cta">Shop now →</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
