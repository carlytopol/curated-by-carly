import { OutfitCollection } from "@/components/outfits/outfit-collection";
import { EditorialPageHero } from "@/components/site/editorial-page-hero";

export default function StyleArchivePage() {
  return (
    <main className="editorial-shell editorial-page min-h-[calc(100vh-97px)]"><div className="mx-auto max-w-7xl"><EditorialPageHero kicker="Personal editorial" title="Style Archive" deck="The outfits, silhouettes, and moments that feel most like you—and the visual language Curated can learn from with your permission." image="/images/editorial/archive-hero.png" imageAlt="A monochrome dressing room with an open fashion archive and treasured accessories" /><OutfitCollection mode="archive" /></div></main>
  );
}
