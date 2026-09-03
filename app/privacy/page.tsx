const protections = [
  ["Your account", "Supabase Auth verifies your session. Private pages and APIs require an authenticated account, and the production app refuses to fall back to a shared demonstration identity."],
  ["Your wardrobe", "Wardrobe records, outfits, history, schedule, and measurements are protected by per-user Row Level Security policies. Requests are also checked against the signed-in user on the server."],
  ["Your photographs", "Images are stored in a non-public Supabase bucket beneath your user ID. Curated displays them with temporary signed links that expire after one hour."],
  ["Your location", "Dress my Day requests browser location permission only when needed for weather. Current coordinates are used for that weather request and are not written to your profile by the daily weather tool."],
  ["AI assistance", "When you request photo analysis, styling, shopping, or itinerary help, the necessary image, document, wardrobe details, or profile context is sent securely from Curated's server to the OpenAI API. Curated requests no application-state storage for these responses."],
] as const;

export default function PrivacyPage() {
  return (
    <main className="editorial-shell editorial-page min-h-[calc(100vh-97px)]">
      <div className="mx-auto max-w-5xl">
        <header className="editorial-masthead">
          <p className="editorial-kicker">A private house</p>
          <h1 className="editorial-title">Privacy &amp; Security</h1>
          <p className="editorial-deck">A plain-language account of what Curated protects, what its assistants need to see, and where the present boundaries are.</p>
        </header>

        <section className="paper-panel mt-8 p-5 sm:mt-12 sm:p-10">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {protections.map(([title, description], index) => (
              <article key={title} className="border-t border-[#a07c45]/25 pt-5">
                <p className="font-serif text-lg italic text-[#a07c45]">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 font-serif text-3xl text-[#20372f]">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#6b6760]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="salon-panel mt-10 p-6 text-[#f8efe2] sm:p-10">
          <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#d7bd91]">Important limits</p>
          <h2 className="mt-4 font-serif text-4xl">What to know before using AI features</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-white/75">
            <p>OpenAI states that API data is not used to train its models unless the API organization explicitly opts in. Standard abuse-monitoring logs may nevertheless retain customer content for up to 30 days. Image and file inputs are also scanned for prohibited child-safety content.</p>
            <p>Personal Shopper may use public web search when you supply a product link. Curated instructs the assistant never to place private wardrobe, profile, fit, or conversation details into a public search query.</p>
            <p>Deleting a wardrobe piece or saved outfit removes its associated private image. Full account deletion is not yet self-service; that remains an open product requirement rather than a protection we claim to have completed.</p>
          </div>
          <a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-11 items-center border border-[#d7bd91]/40 px-5 py-3 text-xs uppercase tracking-[0.16em] text-[#f8efe2]">OpenAI data controls</a>
        </section>
      </div>
    </main>
  );
}
