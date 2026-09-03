import Link from "next/link";
import { redirect } from "next/navigation";
import { TodayWorkspace } from "@/app/today/_components/today-workspace";
import { primaryNavigationItems } from "@/lib/site/navigation";
import { getCurrentIdentity } from "@/lib/auth/current-user";

const destinationDescriptions: Record<string, string> = {
  "/closet": "Your private collection, photographed and beautifully organized.",
  "/style-archive": "The outfits that feel most like you.",
  "/history": "A dated memory of what you wore and where.",
  "/personal-shopper": "Thoughtful guidance for fewer, better additions.",
  "/packing": "A refined wardrobe for wherever you are going.",
};

export default async function Home() {
  const identity = await getCurrentIdentity();
  const destinations = primaryNavigationItems.filter(
    (item) => item.href !== "/today",
  );

  if (!identity.isAuthenticated) {
    redirect("/auth/sign-in?next=/");
  }

  return (
    <div className="editorial-shell min-h-[calc(100vh-97px)]">
      <section className="relative px-3 py-3 sm:px-8 sm:py-9">
        <div className="salon-panel relative mx-auto min-h-[28rem] max-w-[92rem] overflow-hidden px-5 py-10 text-white sm:min-h-[44rem] sm:px-12 sm:py-24">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(214,188,148,0.12),transparent_34%),linear-gradient(140deg,rgba(255,255,255,0.025),transparent_45%)]"
          />
          <div
            className="absolute inset-4 border border-[#d0ae75]/25 sm:inset-7"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d0ae75]/55 font-serif text-2xl font-light text-[#ead8b9] shadow-[inset_0_0_0_4px_rgba(208,174,117,0.05)] sm:h-16 sm:w-16 sm:text-3xl sm:shadow-[inset_0_0_0_5px_rgba(208,174,117,0.05)]"
            >
              C
            </div>
            <p className="antique-rule mt-4 text-[0.58rem] uppercase tracking-[0.34em] text-[#ddc29a] sm:mt-6 sm:text-[0.62rem] sm:tracking-[0.42em]">
              Your private wardrobe
            </p>
            <h1 className="mt-5 font-serif text-[3.8rem] font-light leading-[0.75] tracking-[-0.04em] text-[#fffaf0] sm:mt-8 sm:text-[8.5rem]">
              Curated
            </h1>
            <p className="mt-5 text-[0.58rem] uppercase tracking-[0.48em] text-[#e6cbd1] sm:mt-7 sm:text-[0.64rem] sm:tracking-[0.65em]">
              By {identity.firstName}
            </p>
            <div className="mt-6 h-px w-16 bg-[#c9a875]/70 sm:mt-10 sm:w-20" />
            <p className="mx-auto mt-6 max-w-2xl font-serif text-xl font-light italic leading-7 text-[#f7eee1]/90 sm:mt-8 sm:text-[2.15rem] sm:leading-[1.45]">
              A private house for the art of dressing—where every piece, plan,
              and possibility is considered.
            </p>
            <a
              href="#dress-my-day"
              className="brass-button mt-10 hidden sm:inline-flex"
            >
              Enter Dress my Day
            </a>
          </div>
        </div>
      </section>

      <section id="dress-my-day" aria-label="Dress my Day">
        <TodayWorkspace embedded />
      </section>

      <section className="px-4 pb-16 pt-6 sm:px-10 sm:pb-32 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="editorial-kicker">The house directory</p>
            <h2 className="mt-3 font-serif text-4xl leading-none text-[#20372f] sm:mt-5 sm:text-7xl">
              Rooms of your own
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-serif text-lg italic leading-7 text-[#6d6760] sm:mt-6 sm:text-xl sm:leading-8">
              Each room holds a different part of your style life. Enter only
              where the day takes you.
            </p>
          </div>
          <div className="mt-9 border-y border-[#a07c45]/25 sm:mt-20">
            {destinations.map((destination, index) => (
              <Link
                key={destination.href}
                href={destination.href}
                className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border-b border-[#a07c45]/18 px-1 py-5 last:border-0 sm:grid-cols-[5rem_minmax(12rem,0.7fr)_1fr_auto] sm:gap-5 sm:px-5 sm:py-9"
              >
                <span className="font-serif text-lg italic text-[#a07c45]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-serif text-2xl text-[#3d2b32] transition-colors group-hover:text-[#603044] sm:text-[2.15rem]">
                  {destination.label}
                </span>
                <span className="col-span-3 max-w-lg pl-[3rem] text-sm leading-6 text-[#746f68] sm:col-span-1 sm:pl-0 sm:leading-7">
                  {destinationDescriptions[destination.href]}
                </span>
                <span className="text-[0.62rem] uppercase tracking-[0.22em] text-[#89666e] transition-transform group-hover:translate-x-1">
                  Enter →
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center text-center sm:mt-16">
            <div className="h-px w-20 bg-[#a07c45]/45" aria-hidden="true" />
            <p className="mt-7 max-w-md font-serif text-lg italic leading-7 text-[#6f6962]">
              Collected slowly. Worn beautifully. Remembered always.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
