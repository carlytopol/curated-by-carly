"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  if (!isAuthenticated && (pathname === "/" || pathname.startsWith("/auth/")))
    return null;
  return (
    <footer className="border-t border-[#a07c45]/25 bg-[#20372f] px-5 py-6 text-[#efe5d4] sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:gap-6 sm:text-left">
        <div>
          <p className="font-serif text-xl tracking-[0.18em] sm:text-2xl">CURATED</p>
          <p className="mt-2 text-[0.58rem] uppercase tracking-[0.32em] text-[#d4b98c]">
            Private by design
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-0 text-[0.6rem] uppercase tracking-[0.16em] text-[#e8ddca]/75 sm:gap-x-7 sm:gap-y-3 sm:text-[0.65rem] sm:tracking-[0.18em]">
          <Link href="/privacy" className="min-h-11 py-3 hover:text-white">
            Privacy &amp; Security
          </Link>
          <Link href="/profile" className="min-h-11 py-3 hover:text-white">
            Profile
          </Link>
          <Link href="/" className="min-h-11 py-3 hover:text-white">
            The House
          </Link>
        </div>
      </div>
    </footer>
  );
}
