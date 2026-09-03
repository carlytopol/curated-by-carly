import Image from "next/image";

type EditorialPageHeroProps = {
  kicker: string;
  title: string;
  deck: string;
  image: string;
  imageAlt: string;
  objectPosition?: string;
  compact?: boolean;
};

export function EditorialPageHero({ kicker, title, deck, image, imageAlt, objectPosition = "center", compact = false }: EditorialPageHeroProps) {
  return (
    <header className={`relative isolate overflow-hidden rounded-[1.5rem] border border-[#c6a46e]/25 bg-[#241f1d] shadow-[0_18px_50px_rgba(40,29,31,0.12)] sm:rounded-[2.25rem] sm:shadow-[0_28px_80px_rgba(40,29,31,0.14)] ${compact ? "min-h-[17rem] sm:min-h-[26rem]" : "min-h-[19rem] sm:min-h-[32rem]"}`}>
      <Image src={image} alt={imageAlt} fill priority sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover grayscale" style={{ objectPosition }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,21,20,0.9)_0%,rgba(25,21,20,0.58)_48%,rgba(25,21,20,0.18)_100%)]" />
      <div className="absolute inset-3 border border-white/20 sm:inset-7" aria-hidden="true" />
      <div className={`relative z-10 flex max-w-3xl flex-col justify-end px-5 pb-7 pt-16 text-white sm:px-14 sm:pb-14 ${compact ? "min-h-[17rem] sm:min-h-[26rem]" : "min-h-[19rem] sm:min-h-[32rem]"}`}>
        <p className="text-[0.56rem] uppercase tracking-[0.3em] text-[#e0c49a] sm:text-[0.62rem] sm:tracking-[0.36em]">{kicker}</p>
        <h1 className={`mt-3 font-serif font-light leading-[0.92] tracking-[-0.035em] text-[#fffaf0] sm:mt-5 ${compact ? "text-[2.85rem] sm:text-6xl lg:text-7xl" : "text-[3.15rem] sm:text-7xl lg:text-[6.5rem]"}`}>{title}</h1>
        <p className="mt-4 max-w-2xl font-serif text-lg font-light italic leading-6 text-white/78 sm:mt-6 sm:text-2xl sm:leading-8">{deck}</p>
      </div>
    </header>
  );
}
