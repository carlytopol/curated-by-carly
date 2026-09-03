import { OutfitCollection } from "@/components/outfits/outfit-collection";
import { EditorialPageHero } from "@/components/site/editorial-page-hero";

export default function HistoryPage() {
  return (
    <main className="editorial-shell editorial-page min-h-[calc(100vh-97px)]"><div className="mx-auto max-w-7xl"><EditorialPageHero kicker="Wardrobe memory" title="Wardrobe History" deck="A dated record of what you wore, where you went, and the combinations worth returning to." image="/images/editorial/archive-hero.png" imageAlt="A monochrome dressing room with an open fashion archive and treasured accessories" /><OutfitCollection mode="history" /></div></main>
  );
}
