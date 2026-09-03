import { ProfileForm } from "./profile-form";
import { StyleNotes } from "./style-notes";
import { EditorialPageHero } from "@/components/site/editorial-page-hero";

export default function ProfilePage() {
  return (
    <main className="editorial-shell editorial-page min-h-[calc(100vh-97px)]">
      <div className="mx-auto max-w-5xl"><EditorialPageHero kicker="Private preferences" title="Profile" deck="The details that help Curated understand how you live, dress, and want clothing to feel." image="/images/editorial/atelier-hero.png" imageAlt="A monochrome couture atelier with a draped dress form and tailoring table" /><ProfileForm /><StyleNotes /></div>
    </main>
  );
}
