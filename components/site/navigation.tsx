"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { primaryNavigationItems } from "@/lib/site/navigation";
import { Wordmark } from "./wordmark";

export function Navigation({
  name = "You",
  isAuthenticated = false,
}: {
  name?: string;
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!isAuthenticated && (pathname === "/" || pathname.startsWith("/auth/")))
    return null;

  return (
    <header className="site-header z-40 border-b pt-[env(safe-area-inset-top)]">
      <div className="hidden bg-[#20372f] px-6 py-2 text-center text-[0.58rem] uppercase tracking-[0.34em] text-[#e9d8bd] lg:block">
        The private wardrobe <span className="mx-3 text-[#a07c45]">✦</span> A
        considered life, dressed well
      </div>
      <nav
        aria-label="Primary navigation"
        className="mx-auto max-w-[94rem] px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12 lg:px-10 lg:py-4"
      >
        <div className="flex items-center justify-between gap-4">
          <Wordmark name={name} />
          <button
            type="button"
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#a07c45]/35 bg-[#fbf6ed]/80 text-[#603044] lg:hidden"
          >
            <span className="sr-only">
              {isMenuOpen ? "Close menu" : "Open menu"}
            </span>
            <span aria-hidden="true" className="relative block h-4 w-5">
              <span
                className={`absolute left-0 top-0 block h-px w-5 bg-current transition-transform ${isMenuOpen ? "translate-y-[7px] rotate-45" : ""}`}
              />
              <span
                className={`absolute left-0 top-[7px] block h-px w-5 bg-current transition-opacity ${isMenuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`absolute left-0 top-[14px] block h-px w-5 bg-current transition-transform ${isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>

        <div className="hidden flex-wrap gap-x-6 gap-y-3 text-[0.66rem] uppercase tracking-[0.2em] text-[#6f6861] lg:flex lg:justify-end">
          {primaryNavigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`border-b pb-1 transition-colors ${
                  isActive
                    ? "border-[#a07c45] text-[#603044]"
                    : "border-transparent hover:border-[#a07c45]/55 hover:text-[#603044]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                className="border-b border-transparent pb-1 text-[#263e36] hover:border-[#263e36]/40"
              >
                Profile
              </Link>
              <form action="/auth/sign-out" method="post">
                <button
                  className="border-b border-transparent pb-1 hover:border-black/30"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/sign-in"
              className="border-b border-transparent pb-1 text-[#263e36] hover:border-[#263e36]/40"
            >
              Sign in
            </Link>
          )}
        </div>

        <div
          id="mobile-navigation"
          className={`${isMenuOpen ? "grid" : "hidden"} mt-4 max-h-[calc(100dvh-6rem)] gap-0 overflow-y-auto border-t border-[#a07c45]/20 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden`}
        >
          {primaryNavigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between border-b border-[#a07c45]/10 px-3 py-3 font-serif text-lg ${isActive ? "bg-[#ead9d8]/55 text-[#603044]" : "text-[#4e4a45] hover:bg-white/60"}`}
              >
                <span>{item.label}</span>
                <span aria-hidden="true" className="text-[#aa8752]">
                  →
                </span>
              </Link>
            );
          })}
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className={`flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-sm tracking-[0.06em] ${pathname === "/profile" ? "bg-[#e8efe9] text-[#263e36]" : "text-[#263e36] hover:bg-white"}`}
              >
                <span>Profile</span>
                <span aria-hidden="true" className="text-[#aa8752]">
                  →
                </span>
              </Link>
              <form action="/auth/sign-out" method="post">
                <button
                  className="flex min-h-11 w-full items-center rounded-2xl px-4 py-3 text-left text-sm tracking-[0.06em] text-[#776c6e] hover:bg-white"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/sign-in"
              onClick={() => setIsMenuOpen(false)}
              className="flex min-h-11 items-center justify-between rounded-2xl px-4 py-3 text-sm tracking-[0.06em] text-[#263e36] hover:bg-white"
            >
              <span>Sign in</span>
              <span aria-hidden="true" className="text-[#aa8752]">
                →
              </span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
