type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="editorial-shell flex min-h-[calc(100vh-97px)] items-center px-6 py-20 sm:px-10">
      <section className="editorial-masthead mx-auto w-full max-w-4xl">
        <p className="editorial-kicker">
          {eyebrow}
        </p>
        <h1 className="editorial-title max-w-3xl">
          {title}
        </h1>
        <p className="editorial-deck">
          {description}
        </p>
      </section>
    </main>
  );
}
