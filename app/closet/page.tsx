"use client";

import { useEffect, useState, type DragEvent } from "react";
import Image from "next/image";
import WardrobeItemCard from "@/components/closet/WardrobeItemCard";
import { CameraCapture } from "@/components/closet/CameraCapture";
import { EditorialPageHero } from "@/components/site/editorial-page-hero";
import { useClothingItems } from "@/hooks/use-clothing-items";
import { prepareWardrobeImages } from "@/lib/media/prepare-wardrobe-image";
import { WARDROBE_DEPARTMENTS, categoriesForDepartment, subcategoriesFor, type WardrobeDepartment } from "@/types/wardrobe";
import { AddClothingForm } from "./_components/add-clothing-form";
import { readWardrobeFilters, wardrobeFilterHref } from "@/lib/wardrobe/filter-state";

const wardrobePhotoTips = [
  ["Use natural light", "Photograph near a window during the day. Avoid flash and harsh shadows."],
  ["Choose a clean background", "A plain white wall, light-colored floor, or simple backdrop works best."],
  ["Fill the frame", "Let the item take up most of the photo while leaving a small border around the edges."],
  ["Photograph items straight on", "Hang clothing flat or on a simple hanger and shoot from directly in front."],
  ["Capture the entire item", "Do not crop sleeves, hems, straps, or shoe toes."],
  ["Keep colors true", "Avoid filters or heavy editing so AI can accurately identify colors and fabrics."],
  ["Smooth wrinkles first", "A quick steam or shake makes items much easier to recognize."],
  ["Photograph one item at a time", "Avoid overlapping clothing or busy backgrounds."],
  ["Include matching pieces separately", "Photograph jackets, pants, skirts, and accessories as individual items."],
  ["Use a consistent angle", "Similar framing across your wardrobe creates a cleaner, more luxurious closet experience."],
  ["Take close-ups when needed", "Capture unique details like embroidery, buttons, hardware, or patterns."],
  ["For handbags, photograph the front", "Keep straps tucked neatly behind the bag."],
  ["For shoes, place the pair together", "Angle them slightly inward so both shoes are visible."],
  ["For jewelry, use a neutral background", "Lay pieces flat with enough space to clearly distinguish each item."],
  ["Retake blurry photos", "Sharp images help Curated identify your wardrobe more accurately and create better outfit recommendations."],
] as const;

type FailedStandardization = {
  photoId: string;
  itemId: string;
  label: string;
  imageUrl: string | null;
};

export default function ClosetPage() {
  const [showForm, setShowForm] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [designer, setDesigner] = useState("");
  const [itemName, setItemName] = useState("");
  const [department, setDepartment] = useState<WardrobeDepartment>("Women");
  const [preferredDepartment, setPreferredDepartment] = useState<WardrobeDepartment>("Women");
  const [openDepartments, setOpenDepartments] = useState<WardrobeDepartment[]>(["Women"]);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [subcategory2, setSubcategory2] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [season, setSeason] = useState("");
  const [season2, setSeason2] = useState("");
  const [season3, setSeason3] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [stylingSuggestion, setStylingSuggestion] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [photosToStandardize, setPhotosToStandardize] = useState<number | null>(null);
  const [isStandardizingCollection, setIsStandardizingCollection] = useState(false);
  const [standardizationStatus, setStandardizationStatus] = useState("");
  const [failedStandardization, setFailedStandardization] = useState<FailedStandardization | null>(null);
  const [showPhotoTips, setShowPhotoTips] = useState(false);
  const { items, isLoading, isSaving, deletingItemId, error, loadItems, createItem, deleteItem } =
    useClothingItems();

  useEffect(() => {
    const timer = setTimeout(() => {
      const filters = readWardrobeFilters(new URLSearchParams(window.location.search));
      setSelectedCategories(filters.categories);
      setSelectedSubcategories(filters.subcategories);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let current = true;
    fetch("/api/profile")
      .then((response) => response.ok ? response.json() : null)
      .then((profile) => {
        if (!current || !profile) return;
        const preference: WardrobeDepartment = profile.sex === "male" ? "Men" : "Women";
        setPreferredDepartment(preference);
        setDepartment(preference);
        setOpenDepartments([preference]);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, []);

  useEffect(() => {
    fetch("/api/closet-items/standardize-existing", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setPhotosToStandardize(typeof result?.pending === "number" ? result.pending : null))
      .catch(() => undefined);
  }, [items.length]);

  async function standardizeExistingCollection() {
    if (isStandardizingCollection) return;
    setIsStandardizingCollection(true);
    setFailedStandardization(null);
    const startingCount = photosToStandardize ?? 0;
    let remaining = startingCount;
    setStandardizationStatus(`Preparing ${startingCount} ${startingCount === 1 ? "photo" : "photos"}… Keep this page open.`);
    try {
      while (remaining > 0) {
        const response = await fetch("/api/closet-items/standardize-existing", { method: "POST" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setFailedStandardization(result.failedPhoto || null);
          throw new Error(result.error || "A wardrobe photo could not be standardized.");
        }
        remaining = typeof result.pending === "number" ? result.pending : Math.max(0, remaining - 1);
        setPhotosToStandardize(remaining);
        const completed = startingCount - remaining;
        setStandardizationStatus(`Standardized ${completed} of ${startingCount} ${startingCount === 1 ? "photo" : "photos"}… Keep this page open.`);
      }
      setStandardizationStatus("Your existing collection now has the same clean white-background presentation.");
      await loadItems();
    } catch (error) {
      setStandardizationStatus(error instanceof Error ? error.message : "The collection update paused. Select the button to continue.");
    } finally {
      setIsStandardizingCollection(false);
    }
  }

  async function handleSave(files: File[], analysisCompleted: boolean) {
    const didCreate = await createItem({
      designer,
      itemName,
      department,
      category,
      subcategory,
      subcategory2,
      size,
      color,
      season,
      season2,
      season3,
      favorite,
      stylingSuggestion,
    }, files, !analysisCompleted);

    if (!didCreate) {
      return;
    }

    setDesigner("");
    setItemName("");
    setDepartment(preferredDepartment);
    setCategory("");
    setSubcategory("");
    setSubcategory2("");
    setSize("");
    setColor("");
    setSeason("");
    setSeason2("");
    setSeason3("");
    setFavorite(false);
    setStylingSuggestion("");
    setPendingFiles([]);
    setShowForm(false);
  }

  function closeForm() {
    setDesigner("");
    setItemName("");
    setDepartment(preferredDepartment);
    setCategory("");
    setSubcategory("");
    setSubcategory2("");
    setSize("");
    setColor("");
    setSeason("");
    setSeason2("");
    setSeason3("");
    setFavorite(false);
    setStylingSuggestion("");
    setPendingFiles([]);
    setShowForm(false);
  }

  async function beginUpload(files: FileList | File[] = []) {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, 4);
    setIsDragging(false);
    if (!images.length) {
      setShowForm(true);
      return;
    }
    setIsPreparingImages(true);
    try {
      setPendingFiles(await prepareWardrobeImages(images));
      setShowForm(true);
    } finally {
      setIsPreparingImages(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void beginUpload(event.dataTransfer.files);
  }

  const categoryCounts = items.reduce<Record<string, number>>((counts, item) => {
    const key = `${item.department}:${item.category || "Uncategorized"}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const subcategoryCounts = items.reduce<Record<string, number>>((counts, item) => {
    [item.subcategory, item.subcategory2].filter(Boolean).forEach((value) => {
      const key = `${item.department}:${item.category}:${value}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, {});
  const filteredItems = selectedCategories.length
    ? items.filter((item) => {
        const categoryKey = `${item.department}:${item.category || "Uncategorized"}`;
        if (!selectedCategories.includes(categoryKey)) return false;
        const scopedSubcategories = selectedSubcategories.filter((value) => value.startsWith(`${categoryKey}:`));
        return scopedSubcategories.length === 0 || [item.subcategory, item.subcategory2].some((value) => scopedSubcategories.includes(`${categoryKey}:${value}`));
      })
    : [];

  function toggleCategory(value: string) {
    const isRemoving = selectedCategories.includes(value);
    const categories = isRemoving ? selectedCategories.filter((category) => category !== value) : [...selectedCategories, value];
    const subcategories = isRemoving ? selectedSubcategories.filter((subcategoryValue) => !subcategoryValue.startsWith(`${value}:`)) : selectedSubcategories;
    setSelectedCategories(categories);
    setSelectedSubcategories(subcategories);
    window.history.replaceState(null, "", wardrobeFilterHref({ categories, subcategories }));
  }

  function toggleSubcategory(value: string, categoryKey: string) {
    const isSelected = selectedSubcategories.includes(value) && selectedCategories.length === 1 && selectedCategories[0] === categoryKey;
    const categories = [categoryKey];
    const subcategories = isSelected ? [] : [value];
    setSelectedCategories(categories);
    setSelectedSubcategories(subcategories);
    window.history.replaceState(null, "", wardrobeFilterHref({ categories, subcategories }));
  }

  const currentWardrobeView = wardrobeFilterHref({ categories: selectedCategories, subcategories: selectedSubcategories });

  return (
    <main className="editorial-shell editorial-page min-h-[calc(100vh-97px)]">
      <div className="mx-auto max-w-7xl">
        <EditorialPageHero
          kicker="Your private collection"
          title="My Wardrobe"
          deck="A living collection of the pieces you own, love, and return to."
          image="/images/editorial/wardrobe-hero.png"
          imageAlt="A private monochrome wardrobe with dark wood cabinetry and tailored clothing"
        />

        <section className="salon-panel relative mt-8 overflow-hidden p-3 sm:mt-12 sm:p-8">
          <div aria-hidden="true" className="curated-watermark right-4 top-0 text-white/[0.055] sm:right-10">C</div>
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className={`relative z-10 flex min-h-64 flex-col items-center justify-center rounded-[1.25rem] border border-dashed px-4 py-7 text-center transition-colors sm:min-h-80 sm:rounded-[1.75rem] sm:px-6 sm:py-10 ${isDragging ? "border-[#ead6d7] bg-white/15" : "border-[#d3b584]/40 bg-white/[0.045]"}`}
          >
            <span className="vine-corner vine-corner-light" aria-hidden="true" />
            <p className="antique-rule text-[0.58rem] uppercase tracking-[0.34em] text-[#d8bd91]">The collection begins here</p>
            <h2 className="mt-4 max-w-xl font-serif text-3xl text-white sm:mt-6 sm:text-6xl">The Wardrobe Door Is Open</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:mt-4 sm:leading-7">Take a photo, choose from your library, or drag images from desktop.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
              <CameraCapture onCapture={(file) => void beginUpload([file])} className="brass-button bg-[#ead6d7] !text-[#54263a] hover:!bg-white" />
              <label className={`cursor-pointer border border-[#d3b584]/50 bg-white/[0.06] px-6 py-3 text-[0.69rem] uppercase tracking-[0.16em] text-white hover:bg-white hover:text-[#54263a] ${isPreparingImages ? "cursor-wait opacity-60" : "cursor-pointer"}`}>
                Choose photos
                <input type="file" accept="image/*" multiple disabled={isPreparingImages} className="sr-only" onChange={(event) => event.target.files && void beginUpload(event.target.files)} />
              </label>
            </div>
            <p className="mt-4 text-xs text-white/45 sm:mt-5">{isPreparingImages ? "Preparing your photos for Curated…" : "Up to four images · choose your cover · HEIC supported"}</p>
          </div>
        </section>

        {showForm && (
          <AddClothingForm
            initialFiles={pendingFiles}
            designer={designer}
            itemName={itemName}
            department={department}
            category={category}
            subcategory={subcategory}
            subcategory2={subcategory2}
            size={size}
            color={color}
            season={season}
            season2={season2}
            season3={season3}
            favorite={favorite}
            stylingSuggestion={stylingSuggestion}
            brandSuggestions={[...new Set(items.map((item) => item.designer?.trim()).filter((brand): brand is string => Boolean(brand)))].sort((a, b) => a.localeCompare(b))}
            onDesignerChange={setDesigner}
            onItemNameChange={setItemName}
            onDepartmentChange={setDepartment}
            onCategoryChange={setCategory}
            onSubcategoryChange={setSubcategory}
            onSubcategory2Change={setSubcategory2}
            onSizeChange={setSize}
            onColorChange={setColor}
            onSeasonChange={setSeason}
            onSeason2Change={setSeason2}
            onSeason3Change={setSeason3}
            onFavoriteChange={setFavorite}
            onStylingSuggestionChange={setStylingSuggestion}
            onCancel={closeForm}
            onSave={handleSave}
            isSaving={isSaving}
            errorMessage={error}
          />
        )}

        {isLoading ? (
          <section className="mt-8 flex min-h-56 items-center justify-center rounded-[1.5rem] bg-[#faf8f4] px-5 text-center shadow-[0_18px_45px_rgba(28,28,27,0.05)] sm:mt-12 sm:min-h-80 sm:rounded-3xl sm:px-6">
            <p className="text-sm text-neutral-500">Preparing your collection...</p>
          </section>
        ) : error && items.length === 0 && !showForm ? (
          <section className="mt-8 flex min-h-56 flex-col items-center justify-center rounded-[1.5rem] bg-[#faf8f4] px-5 text-center shadow-[0_18px_45px_rgba(28,28,27,0.05)] sm:mt-12 sm:min-h-80 sm:rounded-3xl sm:px-6">
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
              Your collection
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-tight">
              We could not open your wardrobe.
            </h2>
            <p className="mt-4 max-w-md leading-7 text-neutral-500">{error}</p>
            <button
              onClick={() => void loadItems()}
              className="mt-8 rounded-full border border-black/15 px-6 py-3 text-sm transition-colors hover:border-black hover:bg-white"
            >
              Try again
            </button>
          </section>
        ) : items.length === 0 && !showForm ? (
          <section className="mt-8 rounded-[1.5rem] border border-[#ead8dd] bg-white/60 px-5 py-8 text-center sm:mt-12 sm:rounded-[2rem] sm:px-6 sm:py-12">
            <p className="text-xs uppercase tracking-[0.24em] text-[#9a6b72]">Your collection</p>
            <h2 className="mt-4 font-serif text-3xl text-[#54263a]">Your first piece will appear here.</h2>
          </section>
        ) : items.length > 0 ? (
          <section className="mt-10 sm:mt-14">
            {error && !showForm && (
              <div
                role="alert"
                className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f3e9e5] px-5 py-4 text-sm text-[#7a362c]"
              >
                <span>{error}</span>
                <button
                  onClick={() => void loadItems()}
                  className="underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            )}
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-light tracking-tight">Collection</h2>
                <p className="mt-1 text-sm text-neutral-500">{items.length} {items.length === 1 ? "piece" : "pieces"}</p>
              </div>
              {typeof photosToStandardize === "number" && photosToStandardize > 0 && (
                <button type="button" disabled={isStandardizingCollection} onClick={() => void standardizeExistingCollection()} className="brass-button disabled:cursor-wait disabled:opacity-60">
                  {isStandardizingCollection ? `Standardizing ${photosToStandardize} remaining…` : `Standardize existing collection (${photosToStandardize})`}
                </button>
              )}
            </div>
            {standardizationStatus && <div role="status" aria-live="polite" className="mb-7 rounded-xl border border-[#aa8752]/20 bg-white/70 px-4 py-3 text-sm leading-6 text-[#74696b]">
              <div className="flex items-center gap-4">
                {failedStandardization?.imageUrl && <Image src={failedStandardization.imageUrl} alt={failedStandardization.label} width={64} height={80} className="h-20 w-16 shrink-0 rounded-lg bg-white object-contain" />}
                <div>
                  <p>{standardizationStatus}</p>
                  {failedStandardization && <p className="mt-1 font-medium text-[#54263a]">Affected item: {failedStandardization.label}</p>}
                  {failedStandardization && <div className="mt-2 flex flex-wrap gap-4"><a href={`/closet/${failedStandardization.itemId}`} className="text-xs text-[#8a6f43] underline underline-offset-4">Open this wardrobe item</a><button type="button" onClick={() => void standardizeExistingCollection()} className="text-xs text-[#8a6f43] underline underline-offset-4">Retry this photo</button></div>}
                </div>
              </div>
            </div>}

            <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
              {selectedCategories.length === 0 && (
                <div className="rounded-2xl border border-[#704154]/15 bg-white/65 px-4 py-4 lg:hidden">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#9a6b72]">Your private collection</p>
                  <p className="mt-2 text-sm leading-6 text-[#74696b]">Choose one or more categories below to reveal just those pieces.</p>
                </div>
              )}
              <aside className="rounded-[1.75rem] border border-[#704154]/15 bg-white/70 p-5 shadow-[0_12px_35px_rgba(84,38,58,0.05)] lg:sticky lg:top-28 lg:max-h-[calc(100vh-8.5rem)] lg:overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#9a6b72]">Show pieces</p>
                    <h3 className="mt-2 font-serif text-2xl text-[#54263a]">By category</h3>
                  </div>
                  {selectedCategories.length > 0 && (
                    <button type="button" onClick={() => { setSelectedCategories([]); setSelectedSubcategories([]); window.history.replaceState(null, "", "/closet"); }} className="text-xs text-[#8a6f43] underline underline-offset-4">Clear</button>
                  )}
                </div>
                <div className="mt-5 space-y-7" aria-label="Wardrobe categories">
                  {WARDROBE_DEPARTMENTS.map((wardrobeDepartment) => (
                    <details
                      key={wardrobeDepartment}
                      open={openDepartments.includes(wardrobeDepartment)}
                      onToggle={(event) => {
                        const isOpen = event.currentTarget.open;
                        setOpenDepartments((current) => isOpen
                          ? current.includes(wardrobeDepartment) ? current : [...current, wardrobeDepartment]
                          : current.filter((value) => value !== wardrobeDepartment));
                      }}
                      className="group rounded-xl border border-[#704154]/15 bg-white/45"
                    >
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-serif text-xl text-[#54263a] marker:content-none">
                        <span>{wardrobeDepartment}</span>
                        <span aria-hidden="true" className="text-lg text-[#aa8752] transition-transform group-open:rotate-180">⌄</span>
                      </summary>
                      <div className="grid gap-2 border-t border-[#704154]/10 p-3 sm:grid-cols-2 lg:grid-cols-1">
                        {[...categoriesForDepartment(wardrobeDepartment), "Uncategorized"].map((value) => {
                          const filterKey = `${wardrobeDepartment}:${value}`;
                          const isSelected = selectedCategories.includes(filterKey);
                          const subcategories = value === "Uncategorized" ? [] : subcategoriesFor(wardrobeDepartment, value);
                          return (
                            <div key={filterKey}>
                              <button
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => toggleCategory(filterKey)}
                                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${isSelected ? "border-[#54263a] bg-[#54263a] text-white" : "border-[#704154]/10 bg-white/55 text-[#4c4144] hover:border-[#704154]/30 hover:bg-white"}`}
                              >
                                <span>{value}</span>
                                <span className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs ${isSelected ? "bg-white/15" : "bg-[#f4e9ec] text-[#805363]"}`}>{categoryCounts[filterKey] ?? 0}</span>
                              </button>
                              {isSelected && subcategories.length > 0 && (
                                <div className="ml-3 mt-2 space-y-1 border-l border-[#aa8752]/25 pl-3">
                                  {subcategories.map((subcategoryValue) => {
                                    const subcategoryKey = `${filterKey}:${subcategoryValue}`;
                                    const subcategorySelected = selectedSubcategories.includes(subcategoryKey);
                                    return (
                                      <button
                                        key={subcategoryKey}
                                        type="button"
                                        aria-pressed={subcategorySelected}
                                        onClick={() => toggleSubcategory(subcategoryKey, filterKey)}
                                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${subcategorySelected ? "bg-[#ead8dd] text-[#54263a]" : "text-[#74696b] hover:bg-white"}`}
                                      >
                                        <span>{subcategoryValue}</span>
                                        <span>{subcategoryCounts[subcategoryKey] ?? 0}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-5 text-[#817477]">Choose one or more categories. Your pieces stay private until you decide what to view.</p>
              </aside>

              <div>
                {selectedCategories.length === 0 ? (
                  <div className="hidden min-h-80 items-center justify-center rounded-[2rem] border border-dashed border-[#704154]/20 bg-white/55 p-10 text-center lg:flex">
                    <div className="max-w-md">
                      <p className="text-xs uppercase tracking-[0.22em] text-[#9a6b72]">Your private collection</p>
                      <h3 className="mt-4 font-serif text-3xl text-[#54263a]">Choose a category to open your wardrobe.</h3>
                      <p className="mt-3 text-sm leading-7 text-[#74696b]">Select one or several clothing types from the menu to reveal only those pieces.</p>
                    </div>
                  </div>
                ) : filteredItems.length > 0 ? (
                  <>
                    <p className="mb-5 text-sm text-[#74696b]">Showing {filteredItems.length} {filteredItems.length === 1 ? "piece" : "pieces"} from {selectedCategories.length} selected {selectedCategories.length === 1 ? "category" : "categories"}.</p>
                    <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredItems.map((item) => (
                        <WardrobeItemCard
                          key={item.id}
                          id={item.id}
                          image={item.imageUrl ?? ""}
                          brand={item.designer}
                          name={item.itemName}
                          department={item.department}
                          category={item.category}
                          subcategory={item.subcategory}
                          subcategory2={item.subcategory2}
                          color={item.color}
                          favorite={item.favorite}
                          isDeleting={deletingItemId === item.id}
                          onDelete={deleteItem}
                          returnTo={currentWardrobeView}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-80 items-center justify-center rounded-[2rem] border border-dashed border-[#704154]/20 bg-white/55 p-10 text-center text-[#74696b]">No pieces match the selected categories yet.</div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="paper-panel garden-panel mt-10 overflow-hidden rounded-[1.5rem] p-5 sm:mt-16 sm:rounded-[2.25rem] sm:p-10">
          <span className="vine-corner" aria-hidden="true" />
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4"><div className="max-w-3xl"><p className="text-xs uppercase tracking-[0.28em] text-[#9a6b72]">Photo reference</p><h2 className="mt-3 font-serif text-3xl text-[#54263a] sm:mt-4 sm:text-5xl">Wardrobe Photo Tips</h2><p className="mt-2 text-sm leading-6 text-[#74696b] sm:mt-4 sm:leading-7">Practical guidance for clear, consistent wardrobe images.</p></div><button type="button" onClick={() => setShowPhotoTips((current) => !current)} aria-expanded={showPhotoTips} className="min-h-11 rounded-full border border-[#704154]/20 bg-white/70 px-5 text-xs uppercase tracking-[0.12em] text-[#54263a]">{showPhotoTips ? "Hide tips" : "View tips"}</button></div>
          {showPhotoTips && <div className="relative z-10 mt-7 grid gap-x-10 gap-y-4 sm:mt-9 sm:gap-y-6 md:grid-cols-2">
            {wardrobePhotoTips.map(([title, description], index) => <article key={title} className="flex gap-4 border-t border-[#704154]/10 pt-5"><span className="font-serif text-2xl text-[#aa8752]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-medium text-[#3d2b32]">{title}.</h3><p className="mt-1 text-sm leading-6 text-[#74696b]">{description}</p></div></article>)}
          </div>}
        </section>
      </div>
    </main>
  );
}
