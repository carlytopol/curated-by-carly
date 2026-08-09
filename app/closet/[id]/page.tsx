"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  use,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  CLOTHING_SEASONS,
  WARDROBE_DEPARTMENTS,
  categoriesForDepartment,
  subcategoriesFor,
  type WardrobeDepartment,
} from "@/types/wardrobe";
import { prepareWardrobeImages } from "@/lib/media/prepare-wardrobe-image";
import { CameraCapture } from "@/components/closet/CameraCapture";
import { safeWardrobeReturnPath } from "@/lib/wardrobe/filter-state";
import { AVAILABILITY_STATUSES, type AvailabilityStatus } from "@/lib/recommendations/rotation";

type Item = {
  id: string;
  designer: string | null;
  itemName: string | null;
  department: WardrobeDepartment;
  category: string | null;
  subcategory: string | null;
  subcategory2: string | null;
  size: string | null;
  color: string | null;
  season: string | null;
  season2: string | null;
  season3: string | null;
  favorite: boolean;
  stylingSuggestion: string | null;
  lastWornAt: string | null;
  wearCount: number;
  availabilityStatus: AvailabilityStatus;
  unavailableUntil: string | null;
  recommendationCount: number;
  photos: Array<{ id: string; sortOrder: number; url: string | null }>;
};

export default function ClothingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const query = use(searchParams);
  const returnTo = safeWardrobeReturnPath(typeof query.returnTo === "string" ? query.returnTo : null);
  const returnLabel = returnTo.startsWith("/today") ? "Back to Dress My Day" : "Back to your wardrobe selection";
  const [item, setItem] = useState<Item | null>(null);
  const [status, setStatus] = useState("Loading details…");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [standardizingPhotoId, setStandardizingPhotoId] = useState<
    string | null
  >(null);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let current = true;
    fetch(`/api/closet-items/${id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (current) {
          setItem(data);
          setStatus(data ? "" : "This piece is unavailable.");
        }
      });
    fetch("/api/closet-items")
      .then((response) => (response.ok ? response.json() : []))
      .then((items: Array<{ designer?: string | null }>) => {
        if (current)
          setBrandSuggestions(
            [
              ...new Set(
                items
                  .map((entry) => entry.designer?.trim())
                  .filter((brand): brand is string => Boolean(brand)),
              ),
            ].sort((a, b) => a.localeCompare(b)),
          );
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [id]);

  function update(key: keyof Item, value: string | boolean | null) {
    setItem((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    setStatus("Saving…");
    const response = await fetch(`/api/closet-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    setStatus(
      response.ok ? "Details saved." : "We could not save these details.",
    );
  }

  async function updateAvailability(availabilityStatus: AvailabilityStatus) {
    if (!item) return;
    const previous = item.availabilityStatus;
    setItem({ ...item, availabilityStatus, unavailableUntil: availabilityStatus === "available" ? null : item.unavailableUntil });
    setStatus(availabilityStatus === "available" ? "Marking this piece clean and available…" : "Updating availability…");
    const response = await fetch(`/api/closet-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityStatus }),
    });
    if (!response.ok) {
      setItem((current) => current ? { ...current, availabilityStatus: previous } : current);
      setStatus("We could not update availability.");
      return;
    }
    setStatus(availabilityStatus === "available" ? "This piece is clean and available for recommendations." : "Availability updated.");
  }

  async function removeFromWardrobe() {
    if (!item || isDeleting) return;
    const label = [item.designer, item.itemName].filter(Boolean).join(" — ") || "this piece";
    if (!window.confirm(`Permanently remove ${label} from your wardrobe? Its photos will also be removed, and any active recommendation containing it will be withdrawn.`)) return;
    setIsDeleting(true);
    setStatus("Removing this piece and withdrawing affected recommendations…");
    const response = await fetch(`/api/closet-items/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setStatus(body.error || "We could not completely remove this piece.");
      setIsDeleting(false);
      return;
    }
    router.push(returnTo);
    router.refresh();
  }

  async function upload(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    setIsUploading(true);
    try {
      const selectedFiles = await prepareWardrobeImages(
        Array.from(files)
          .filter((file) => file.type.startsWith("image/"))
          .slice(0, Math.max(0, 4 - (item?.photos.length ?? 0))),
      );
      if (!selectedFiles.length)
        return setStatus(
          item?.photos.length === 4
            ? "This item already has four photos."
            : "Choose a supported wardrobe image.",
        );
      setStatus("AI Photo Check is reviewing clarity, lighting, and framing…");
      const checkData = new FormData();
      selectedFiles.forEach((file) => checkData.append("files", file));
      const checkResponse = await fetch("/api/images/photo-check", {
        method: "POST",
        body: checkData,
      });
      const checkBody = await checkResponse.json().catch(() => ({}));
      if (checkResponse.ok) {
        const needsRetake = (checkBody.results ?? []).find(
          (result: { ready: boolean }) => !result.ready,
        );
        setStatus(
          needsRetake
            ? `AI Photo Check suggests a future retake: ${needsRetake.guidance} Preparing the white-background image now…`
            : "Photo review complete. Removing the background and saving privately…",
        );
      } else {
        setStatus(
          `${checkBody.error || "AI Photo Check is unavailable."} Saving this photo without blocking you…`,
        );
      }
      const uploadedIds: string[] = [];
      for (const file of selectedFiles) {
        const data = new FormData();
        data.set("file", file);
        const response = await fetch(`/api/closet-items/${id}/photos`, {
          method: "POST",
          body: data,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) return setStatus(body.error || "We could not upload one of these photos.");
        if (body.id) uploadedIds.push(body.id);
      }
      const refreshed = await fetch(`/api/closet-items/${id}`);
      if (refreshed.ok) setItem(await refreshed.json());
      setStatus("Photos saved. Preparing the white-background versions now…");
      setIsUploading(false);
      for (const photoId of uploadedIds) {
        const standardizeResponse = await fetch(`/api/closet-items/${id}/photos/${photoId}/standardize`, { method: "POST" });
        if (!standardizeResponse.ok) setStatus("Photos are saved. One background could not be removed automatically; you can retry it below.");
      }
      await fetch(`/api/closet-items/${id}/analyze`, { method: "POST" });
      const standardized = await fetch(`/api/closet-items/${id}`, { cache: "no-store" });
      if (standardized.ok) setItem(await standardized.json());
      setStatus((current) => current.includes("could not") ? current : "Photos saved and standardized. Choose any view as the cover photo.");
    } catch {
      setStatus(
        "The photo upload was interrupted. Please try that photo again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handlePhotoInput(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    void upload(selected);
  }

  async function analyzeCurrentPhoto() {
    if (!item?.photos.length || isAnalyzing) return;
    setIsAnalyzing(true);
    setStatus("Curated is reviewing the cover photo…");
    try {
      const response = await fetch(`/api/closet-items/${id}/analyze`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(
          result.error || "Automatic details are unavailable right now.",
        );
        return;
      }
      const refreshed = await fetch(`/api/closet-items/${id}`);
      if (!refreshed.ok) {
        setStatus(
          "The review finished, but the refreshed details could not be opened.",
        );
        return;
      }
      setItem(await refreshed.json());
      setStatus(
        "Curated’s suggestions are ready. Review or edit the details before saving.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function dropPhotos(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    void upload(
      Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/"),
      ),
    );
  }

  async function removePhoto(photoId: string) {
    const response = await fetch(`/api/closet-items/${id}/photos/${photoId}`, {
      method: "DELETE",
    });
    if (response.ok)
      setItem((current) =>
        current
          ? {
              ...current,
              photos: current.photos.filter((photo) => photo.id !== photoId),
            }
          : current,
      );
  }

  async function standardizePhoto(photoId: string) {
    setStandardizingPhotoId(photoId);
    setStatus(
      "Removing the background, trimming the item, and rebuilding the white studio image…",
    );
    try {
      const response = await fetch(
        `/api/closet-items/${id}/photos/${photoId}/standardize`,
        { method: "POST" },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        return setStatus(body.error || "We could not standardize this photo.");
      const refreshed = await fetch(`/api/closet-items/${id}`, {
        cache: "no-store",
      });
      if (refreshed.ok) setItem(await refreshed.json());
      setStatus(
        "Photo standardized: tightly framed on a pure white background.",
      );
    } catch {
      setStatus("The photo standardization was interrupted. Please try again.");
    } finally {
      setStandardizingPhotoId(null);
    }
  }

  async function movePhoto(index: number, direction: -1 | 1) {
    if (!item) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= item.photos.length) return;
    const photos = [...item.photos];
    [photos[index], photos[nextIndex]] = [photos[nextIndex], photos[index]];
    setItem({ ...item, photos });
    await Promise.all(
      photos.map((photo, sortOrder) =>
        fetch(`/api/closet-items/${id}/photos/${photo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder }),
        }),
      ),
    );
  }

  async function makeCover(photoId: string) {
    if (!item) return;
    const photos = [...item.photos];
    const selectedIndex = photos.findIndex((photo) => photo.id === photoId);
    if (selectedIndex <= 0) return;
    const [selected] = photos.splice(selectedIndex, 1);
    photos.unshift(selected);
    setItem({ ...item, photos: photos.map((photo, sortOrder) => ({ ...photo, sortOrder })) });
    setStatus("Saving cover photo…");
    const responses = await Promise.all(photos.map((photo, sortOrder) => fetch(`/api/closet-items/${id}/photos/${photo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder }) })));
    setStatus(responses.every((response) => response.ok) ? "Cover photo updated." : "We could not update the cover photo.");
  }

  const field =
    "mt-2 w-full rounded-xl border border-[#704154]/15 bg-white px-4 py-3 outline-none focus:border-[#704154]/50";

  return (
    <main className="editorial-shell editorial-page min-h-[calc(100vh-97px)]">
      <div className="mx-auto max-w-3xl">
        <Link href={returnTo} className="text-sm text-[#9a6b72]">
          ← {returnLabel}
        </Link>
        <header className="editorial-masthead mt-8">
          <p className="editorial-kicker">Editable wardrobe record</p>
          <h1 className="editorial-title">Review the details</h1>
          <p className="editorial-deck">
            Automatic suggestions are a starting point. Correct or clear
            anything that is not right.
          </p>
        </header>
        {item && (
          <>
            <section
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropPhotos}
              className="paper-panel mt-7 rounded-[1.5rem] p-5 sm:mt-10 sm:rounded-[2rem] sm:p-10"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-3xl text-[#54263a]">Photos</h2>
                  <p className="mt-1 text-xs text-[#8a7c80]">
                    Add up to four views. The first is the cover until you choose another.
                  </p>
                </div>
                <div className="flex gap-2">
                  <CameraCapture
                    disabled={isUploading || item.photos.length >= 4}
                    onCapture={(file) => void upload([file])}
                    className="min-h-11 rounded-full bg-[#54263a] px-4 py-2 text-sm text-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={isUploading || item.photos.length >= 4}
                    onClick={() => libraryInputRef.current?.click()}
                    className="min-h-11 rounded-full border border-[#704154]/20 px-4 py-2 text-sm text-[#54263a] disabled:opacity-50"
                  >
                    Choose photos
                  </button>
                  <input
                    ref={libraryInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoInput}
                  />
                </div>
              </div>
              {item.photos.length ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {item.photos.map((photo, index) => (
                    <div key={photo.id}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] ${index === 0 ? "bg-[#54263a] text-white" : "bg-[#eee3e4] text-[#704154]"}`}>{index === 0 ? "Cover photo" : `View ${index + 1}`}</span>
                        {index > 0 && <button type="button" onClick={() => void makeCover(photo.id)} className="min-h-9 text-xs font-medium text-[#54263a] underline underline-offset-4">Use as cover</button>}
                      </div>
                      {photo.url && (
                        <img
                          src={photo.url}
                          alt={`Garment view ${index + 1}`}
                          className="aspect-square w-full rounded-xl bg-white object-contain"
                        />
                      )}
                      <div className="mt-2 flex justify-between text-xs text-[#9a6b72]">
                        <button
                          className="min-h-11 min-w-11"
                          aria-label="Move photo left"
                          onClick={() => void movePhoto(index, -1)}
                          disabled={index === 0}
                        >
                          ←
                        </button>
                        <button
                          className="min-h-11 px-3"
                          onClick={() => void removePhoto(photo.id)}
                        >
                          Remove
                        </button>
                        <button
                          className="min-h-11 min-w-11"
                          aria-label="Move photo right"
                          onClick={() => void movePhoto(index, 1)}
                          disabled={index === item.photos.length - 1}
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={standardizingPhotoId !== null}
                        onClick={() => void standardizePhoto(photo.id)}
                        className="mt-1 min-h-11 w-full rounded-full border border-[#704154]/15 px-3 text-xs text-[#54263a] disabled:opacity-50"
                      >
                        {standardizingPhotoId === photo.id
                          ? "Standardizing…"
                          : "Crop + white background"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-[#704154]/20 p-8 text-center text-sm text-[#8a7c80]">
                  Drop garment photos here.
                </div>
              )}
              {item.photos.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#704154]/10 pt-6">
                  <p className="max-w-md text-sm leading-6 text-[#8a7c80]">
                    Curated fills only blank details and never replaces
                    information you have already entered.
                  </p>
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => void analyzeCurrentPhoto()}
                    className="rounded-full border border-[#704154]/25 bg-white px-5 py-2.5 text-sm text-[#54263a] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isAnalyzing
                      ? "Curated is reviewing…"
                      : "Ask Curated to review this photo"}
                  </button>
                </div>
              )}
            </section>
            <form
              onSubmit={save}
              className="paper-panel mt-6 grid gap-4 rounded-[1.5rem] p-5 sm:mt-8 sm:grid-cols-2 sm:gap-5 sm:rounded-[2rem] sm:p-10"
            >
              <div className="sm:col-span-2">
                <h2 className="font-serif text-3xl text-[#54263a]">
                  Category and tags
                </h2>
                <p className="mt-2 text-sm text-[#8a7c80]">
                  All fields are optional and editable.
                </p>
              </div>
              <label className="text-sm text-[#665b5e]">
                Item name
                <input
                  className={field}
                  value={item.itemName ?? ""}
                  onChange={(event) =>
                    update("itemName", event.target.value || null)
                  }
                />
              </label>
              <label className="text-sm text-[#665b5e]">
                Brand
                <input
                  className={field}
                  list="existing-wardrobe-brands"
                  value={item.designer ?? ""}
                  onChange={(event) =>
                    update("designer", event.target.value || null)
                  }
                />
                <datalist id="existing-wardrobe-brands">
                  {brandSuggestions.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </label>
              <label className="text-sm text-[#665b5e]">
                Wardrobe section
                <select
                  className={field}
                  value={item.department}
                  onChange={(event) =>
                    setItem({
                      ...item,
                      department: event.target.value as WardrobeDepartment,
                      category: null,
                      subcategory: null,
                      subcategory2: null,
                    })
                  }
                >
                  {WARDROBE_DEPARTMENTS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-[#665b5e]">
                Category
                <select
                  className={field}
                  value={item.category ?? ""}
                  onChange={(event) =>
                    setItem({
                      ...item,
                      category: event.target.value || null,
                      subcategory: null,
                      subcategory2: null,
                    })
                  }
                >
                  <option value="">Leave blank</option>
                  {categoriesForDepartment(item.department).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              {item.department === "Women" && item.category === "Dresses" && (
                <label className="text-sm text-[#665b5e]">
                  Second Dresses subcategory
                  <select className={field} value={item.subcategory2 ?? ""} onChange={(event) => update("subcategory2", event.target.value || null)}>
                    <option value="">Leave blank</option>
                    {subcategoriesFor(item.department, item.category).filter((value) => value !== item.subcategory).map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              )}
              <label className="text-sm text-[#665b5e]">
                Subcategory
                <select
                  className={field}
                  value={item.subcategory ?? ""}
                  onChange={(event) =>
                    update("subcategory", event.target.value || null)
                  }
                  disabled={
                    !item.category ||
                    subcategoriesFor(item.department, item.category).length ===
                      0
                  }
                >
                  <option value="">Leave blank</option>
                  {subcategoriesFor(item.department, item.category).map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="text-sm text-[#665b5e]">
                Size
                <input
                  className={field}
                  value={item.size ?? ""}
                  onChange={(event) =>
                    update("size", event.target.value || null)
                  }
                />
              </label>
              <label className="text-sm text-[#665b5e]">
                Color
                <input
                  className={field}
                  value={item.color ?? ""}
                  onChange={(event) =>
                    update("color", event.target.value || null)
                  }
                />
              </label>
              <label className="text-sm text-[#665b5e]">
                Season 1
                <select
                  className={field}
                  value={item.season ?? ""}
                  onChange={(event) =>
                    update("season", event.target.value || null)
                  }
                >
                  <option value="">Leave blank</option>
                  {CLOTHING_SEASONS.map((value) => (
                    <option
                      key={value}
                      disabled={
                        value === item.season2 || value === item.season3
                      }
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-[#665b5e]">
                Season 2
                <select
                  className={field}
                  value={item.season2 ?? ""}
                  onChange={(event) =>
                    update("season2", event.target.value || null)
                  }
                >
                  <option value="">Leave blank</option>
                  {CLOTHING_SEASONS.map((value) => (
                    <option
                      key={value}
                      disabled={value === item.season || value === item.season3}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-[#665b5e]">
                Season 3
                <select
                  className={field}
                  value={item.season3 ?? ""}
                  onChange={(event) =>
                    update("season3", event.target.value || null)
                  }
                >
                  <option value="">Leave blank</option>
                  {CLOTHING_SEASONS.map((value) => (
                    <option
                      key={value}
                      disabled={value === item.season || value === item.season2}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-3 text-sm text-[#665b5e] sm:col-span-2">
                <input
                  type="checkbox"
                  checked={item.favorite}
                  onChange={(event) => update("favorite", event.target.checked)}
                />
                Mark as a favorite
              </label>
              <div className="rounded-2xl border border-[#704154]/12 bg-[#faf7f2] p-4 sm:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <label className="text-sm text-[#665b5e]">
                    Laundry and availability
                    <select
                      className={`${field} sm:min-w-64`}
                      value={item.availabilityStatus}
                      onChange={(event) => void updateAvailability(event.target.value as AvailabilityStatus)}
                    >
                      {AVAILABILITY_STATUSES.map((value) => (
                        <option key={value} value={value}>{value === "available" ? "Clean and available" : value.charAt(0).toUpperCase() + value.slice(1)}</option>
                      ))}
                    </select>
                  </label>
                  {item.availabilityStatus !== "available" && (
                    <button type="button" onClick={() => void updateAvailability("available")} className="min-h-11 rounded-full bg-[#173d31] px-4 py-2 text-xs text-white">
                      Mark clean and available now
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#8a7c80]">
                  Worn {item.wearCount} {item.wearCount === 1 ? "time" : "times"}. Recommended {item.recommendationCount} {item.recommendationCount === 1 ? "time" : "times"}.
                  {item.lastWornAt ? ` Last worn ${new Date(item.lastWornAt).toLocaleDateString()}.` : " No confirmed wear yet."}
                  {item.unavailableUntil && item.availabilityStatus !== "available" ? ` Automatically excluded through ${new Date(item.unavailableUntil).toLocaleDateString()}.` : ""}
                </p>
              </div>
              <label className="text-sm text-[#665b5e] sm:col-span-2">
                Styling Suggestion
                <textarea
                  rows={4}
                  maxLength={1000}
                  className={`${field} resize-y`}
                  value={item.stylingSuggestion ?? ""}
                  onChange={(event) =>
                    update("stylingSuggestion", event.target.value || null)
                  }
                />
                <span className="mt-2 block text-xs leading-5 text-[#8a7c80]">
                  Curated uses this guidance whenever it considers the piece for
                  an outfit.
                </span>
              </label>
              <div className="flex items-center justify-between gap-4 sm:col-span-2">
                <p aria-live="polite" className="text-sm text-[#805844]">
                  {status}
                </p>
                <button className="brass-button" type="submit">
                  Save details
                </button>
              </div>
            </form>
            <section className="paper-panel mt-6 rounded-[1.5rem] border border-[#704154]/15 p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8">
              <p className="editorial-kicker">Release a piece</p>
              <h2 className="mt-2 font-serif text-2xl text-[#54263a]">Remove it from the wardrobe</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a7c80]">
                Permanent removal also withdraws active recommendations containing this piece. Wardrobe history remains intact, without the deleted item link.
              </p>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void removeFromWardrobe()}
                className="mt-5 min-h-11 rounded-full border border-[#704154]/30 px-5 text-sm text-[#704154] disabled:cursor-wait disabled:opacity-50"
              >
                {isDeleting ? "Removing…" : "Permanently remove this piece"}
              </button>
            </section>
          </>
        )}
        {!item && <p className="mt-8 text-[#805844]">{status}</p>}
      </div>
    </main>
  );
}
