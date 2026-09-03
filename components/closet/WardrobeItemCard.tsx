"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { wardrobeDetailHref } from "@/lib/wardrobe/filter-state";

type WardrobeItemCardProps = {
  id: string;
  image: string;
  brand: string | null;
  name: string | null;
  department: string;
  category: string | null;
  subcategory: string | null;
  subcategory2?: string | null;
  color: string | null;
  favorite: boolean;
  isDeleting?: boolean;
  onDelete: (id: string) => Promise<boolean>;
  returnTo?: string;
};

export default function WardrobeItemCard({
  id,
  image,
  brand,
  name,
  department,
  category,
  subcategory,
  subcategory2,
  color,
  favorite,
  isDeleting = false,
  onDelete,
  returnTo = "/closet",
}: WardrobeItemCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isFavorite, setIsFavorite] = useState(favorite);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState("");

  async function deletePiece() {
    const didDelete = await onDelete(id);
    if (!didDelete) setIsConfirmingDelete(false);
  }

  async function toggleFavorite() {
    if (isUpdatingFavorite) return;
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);
    setIsUpdatingFavorite(true);
    setFavoriteStatus("");
    try {
      const response = await fetch(`/api/closet-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: nextFavorite }),
      });
      if (!response.ok) throw new Error();
      setFavoriteStatus(nextFavorite ? "Added to favorites." : "Removed from favorites.");
    } catch {
      setIsFavorite(!nextFavorite);
      setFavoriteStatus("Favorite could not be updated. Please try again.");
    } finally {
      setIsUpdatingFavorite(false);
    }
  }

  return (
    <article
      data-wardrobe-item-id={id}
      className="paper-panel group overflow-hidden rounded-[1.5rem] transition-transform duration-300 hover:-translate-y-1 sm:rounded-3xl"
    >
      <div className="relative aspect-square overflow-hidden bg-white sm:aspect-[4/5]">
        <Link href={wardrobeDetailHref(id, returnTo)} aria-label={`Open details for ${name || "wardrobe piece"}`} className="relative block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a07c45]">
          {image ? (
            <Image
              src={image}
              alt={[brand, name].filter(Boolean).join(" ") || "Wardrobe item"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-neutral-400">
              Image to come
            </span>
          )}
        </Link>
        <button
          type="button"
          aria-label={isFavorite ? `Remove ${name || "piece"} from favorites` : `Mark ${name || "piece"} as a favorite`}
          aria-pressed={isFavorite}
          disabled={isUpdatingFavorite}
          onClick={() => void toggleFavorite()}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-[0_4px_16px_rgba(32,55,47,0.16)] backdrop-blur-sm transition hover:scale-105 hover:bg-white disabled:cursor-wait disabled:opacity-60 sm:right-5 sm:top-5"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            className={`h-5 w-5 ${isFavorite ? "text-[#8b4655]" : "text-neutral-600"}`}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
        </button>
      </div>

      <div className="p-5 sm:p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          {brand || "Designer not noted"}
        </p>
        <h3 className="mt-2 font-serif text-[1.4rem] font-light tracking-tight text-[#20372f] sm:mt-3 sm:text-2xl">
          <Link href={wardrobeDetailHref(id, returnTo)} className="underline-offset-4 hover:underline focus:outline-none focus-visible:underline">{name || "Untitled piece"}</Link>
        </h3>
        <p className="mt-2 text-sm text-neutral-500 sm:mt-3">
          {department} <span aria-hidden="true">·</span> {category || "Uncategorized"}{[subcategory, subcategory2].filter(Boolean).length ? ` / ${[subcategory, subcategory2].filter(Boolean).join(" + ")}` : ""} <span aria-hidden="true">·</span> {color || "Color not noted"}
        </p>
        <p aria-live="polite" className={`mt-2 min-h-4 text-xs ${favoriteStatus.includes("could not") ? "text-[#8b4655]" : "text-[#6f725e]"}`}>{favoriteStatus}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.07] pt-4">
          <Link href={wardrobeDetailHref(id, returnTo)} className="text-xs uppercase tracking-[0.18em] text-[#8a6f43] underline-offset-4 hover:underline">Review details</Link>
          <button type="button" disabled={isDeleting} onClick={() => setIsConfirmingDelete(true)} aria-label={`Delete ${name || "wardrobe piece"}`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs text-[#8b4655] hover:bg-[#fff0f1] disabled:cursor-wait disabled:opacity-50">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {isDeleting ? "Removing…" : "Delete"}
          </button>
        </div>
        {isConfirmingDelete && (
          <div role="dialog" aria-label={`Confirm removal of ${name || "wardrobe piece"}`} className="mt-4 rounded-2xl border border-[#d8aeb7] bg-[#fff6f7] p-4">
            <p className="text-sm leading-6 text-[#653744]">Remove this piece and all of its photos permanently? This cannot be undone.</p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" disabled={isDeleting} onClick={() => setIsConfirmingDelete(false)} className="min-h-11 rounded-full px-4 text-xs text-[#5f5356] hover:bg-white">Cancel</button>
              <button type="button" disabled={isDeleting} onClick={() => void deletePiece()} className="min-h-11 rounded-full bg-[#8b4655] px-4 text-xs text-white hover:bg-[#713744] disabled:cursor-wait disabled:opacity-60">{isDeleting ? "Removing…" : "Permanently remove"}</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
