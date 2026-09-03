import { ShopperChat } from "./shopper-chat";
import { EditorialPageHero } from "@/components/site/editorial-page-hero";

export default function PersonalShopperPage() {
  return (
    <main className="editorial-shell editorial-page min-h-[calc(100vh-97px)]">
      <div className="mx-auto max-w-7xl">
        <EditorialPageHero kicker="Private styling appointment" title="Personal Shopper" deck="A considered conversation about what belongs in your wardrobe—and what does not." image="/images/editorial/personal-shopper-hero.png" imageAlt="A private monochrome boutique salon with a garment rail and antique mirror" />
        <ShopperChat />
      </div>
    </main>
  );
}
