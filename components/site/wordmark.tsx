import Link from "next/link";

type WordmarkProps = {
  name?: string;
  byline?: string;
};

export function Wordmark({ name = "You", byline }: WordmarkProps) {
  return (
    <Link href="/" className="group inline-flex min-h-11 items-center gap-3.5 leading-none">
      <span aria-hidden="true" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#a07c45]/55 bg-[#f8f1e6] text-[#603044] shadow-[inset_0_0_0_3px_#f8f1e6,inset_0_0_0_4px_rgba(160,124,69,0.3)]">
        <span className="font-serif text-xl italic">C</span>
      </span>
      <span className="inline-flex flex-col">
      <span className="font-serif text-xl tracking-[0.24em] text-[#20372f] sm:text-[1.6rem]">
        CURATED
      </span>
      <span className="mt-1.5 text-[0.56rem] uppercase tracking-[0.44em] text-[#89666e] transition-colors group-hover:text-[#603044]">
        {byline ?? `By ${name}`}
      </span>
      </span>
    </Link>
  );
}
