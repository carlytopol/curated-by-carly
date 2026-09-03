"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { FormField } from "@/components/ui/FormField";
import { CameraCapture } from "@/components/closet/CameraCapture";
import { prepareWardrobeImages } from "@/lib/media/prepare-wardrobe-image";
import { CLOTHING_SEASONS, WARDROBE_DEPARTMENTS, categoriesForDepartment, subcategoriesFor, type WardrobeDepartment } from "@/types/wardrobe";

type AddClothingFormProps = {
  initialFiles?: File[];
  designer: string;
  itemName: string;
  department: WardrobeDepartment;
  category: string;
  subcategory: string;
  subcategory2: string;
  size: string;
  color: string;
  season: string;
  season2: string;
  season3: string;
  favorite: boolean;
  stylingSuggestion: string;
  brandSuggestions: string[];
  onDesignerChange: (value: string) => void;
  onItemNameChange: (value: string) => void;
  onDepartmentChange: (value: WardrobeDepartment) => void;
  onCategoryChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  onSubcategory2Change: (value: string) => void;
  onSizeChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onSeason2Change: (value: string) => void;
  onSeason3Change: (value: string) => void;
  onFavoriteChange: (value: boolean) => void;
  onStylingSuggestionChange: (value: string) => void;
  onCancel: () => void;
  onSave: (files: File[], analysisCompleted: boolean) => Promise<void>;
  isSaving: boolean;
  errorMessage: string | null;
};

export function AddClothingForm({
  initialFiles = [],
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
  brandSuggestions,
  onDesignerChange,
  onItemNameChange,
  onDepartmentChange,
  onCategoryChange,
  onSubcategoryChange,
  onSubcategory2Change,
  onSizeChange,
  onColorChange,
  onSeasonChange,
  onSeason2Change,
  onSeason3Change,
  onFavoriteChange,
  onStylingSuggestionChange,
  onCancel,
  onSave,
  isSaving,
  errorMessage,
}: AddClothingFormProps) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [photoChecks, setPhotoChecks] = useState<Array<{ index: number; ready: boolean; score: number; issues: string[]; guidance: string }>>([]);
  const [photoCheckStatus, setPhotoCheckStatus] = useState("");
  const [isPhotoChecking, setIsPhotoChecking] = useState(false);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const analyzedFileRef = useRef<string | null>(null);
  const analysisControllerRef = useRef<AbortController | null>(null);
  const currentDetailsRef = useRef({ designer, itemName, department, category, subcategory, size, color, season, season2, season3, stylingSuggestion });
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const dialogRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const inputClassName =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base text-black outline-none transition-shadow placeholder:text-neutral-400 focus:border-black/30 focus:shadow-[0_0_0_3px_rgba(28,28,27,0.06)]";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave(files, analysisCompleted);
  }

  useEffect(() => {
    firstInputRef.current?.focus();
    return () => analysisControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    currentDetailsRef.current = { designer, itemName, department, category, subcategory, size, color, season, season2, season3, stylingSuggestion };
  }, [category, color, department, designer, itemName, season, season2, season3, size, stylingSuggestion, subcategory]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    let active = true;
    queueMicrotask(() => {
      if (active) setPreviewUrls(urls);
    });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const analyzeFile = useCallback(async (file: File) => {
    const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
    if (analyzedFileRef.current === fileKey) return;
    analyzedFileRef.current = fileKey;
    setAnalysisCompleted(false);
    setAnalysisFailed(false);
    setIsAnalyzing(true);
    setAnalysisStatus("Curated is autofilling category, color, and seasons from your photo…");
    analysisControllerRef.current?.abort();
    const controller = new AbortController();
    analysisControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/closet-items/analyze-photo", { method: "POST", body: data, signal: controller.signal });
      const suggestion = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(suggestion.error || "Automatic details are unavailable. You can continue manually.");
      }
      const currentDetails = currentDetailsRef.current;
      if (!currentDetails.designer && suggestion.designer) onDesignerChange(suggestion.designer);
      if (!currentDetails.itemName && suggestion.itemName) onItemNameChange(suggestion.itemName);
      if (!currentDetails.category && suggestion.department) onDepartmentChange(suggestion.department);
      if (!currentDetails.category && suggestion.category) onCategoryChange(suggestion.category);
      if (!currentDetails.subcategory && suggestion.subcategory) onSubcategoryChange(suggestion.subcategory);
      if (!currentDetails.size && suggestion.size) onSizeChange(suggestion.size);
      if (!currentDetails.color && suggestion.color) onColorChange(suggestion.color);
      const suggestedSeasons = Array.isArray(suggestion.seasons) ? suggestion.seasons : [];
      if (!currentDetails.season && suggestedSeasons[0]) onSeasonChange(suggestedSeasons[0]);
      if (!currentDetails.season2 && suggestedSeasons[1]) onSeason2Change(suggestedSeasons[1]);
      if (!currentDetails.season3 && suggestedSeasons[2]) onSeason3Change(suggestedSeasons[2]);
      if (!currentDetails.stylingSuggestion && suggestion.stylingSuggestion) onStylingSuggestionChange(suggestion.stylingSuggestion);
      setAnalysisCompleted(true);
      setAnalysisStatus("Category, color, and seasons are ready. Review or edit the suggestions before saving.");
    } catch (error) {
      analyzedFileRef.current = null;
      setAnalysisFailed(true);
      setAnalysisStatus(error instanceof DOMException && error.name === "AbortError"
        ? "AI suggestions are taking longer than expected. You can save the item now or try AI again."
        : error instanceof Error ? error.message : "Automatic details are unavailable. You can continue manually.");
    } finally {
      window.clearTimeout(timeout);
      if (analysisControllerRef.current === controller) analysisControllerRef.current = null;
      setIsAnalyzing(false);
    }
  }, [onCategoryChange, onColorChange, onDepartmentChange, onDesignerChange, onItemNameChange, onSeasonChange, onSeason2Change, onSeason3Change, onSizeChange, onStylingSuggestionChange, onSubcategoryChange]);

  useEffect(() => {
    if (!files[0]) {
      analyzedFileRef.current = null;
      return;
    }
    const timer = window.setTimeout(() => void analyzeFile(files[0]), 0);
    return () => window.clearTimeout(timer);
  }, [analyzeFile, files]);

  useEffect(() => {
    const controller = new AbortController();
    let requestTimeout: number | null = null;
    let didTimeOut = false;
    const timer = window.setTimeout(async () => {
      if (!files.length) {
        setPhotoChecks([]);
        setPhotoCheckStatus("");
        setIsPhotoChecking(false);
        return;
      }
      setIsPhotoChecking(true);
      setPhotoCheckStatus("AI Photo Check is reviewing clarity, lighting, and framing…");
      const data = new FormData();
      files.forEach((file) => data.append("files", file));
      try {
        requestTimeout = window.setTimeout(() => {
          didTimeOut = true;
          controller.abort();
        }, 45_000);
        const response = await fetch("/api/images/photo-check", { method: "POST", body: data, signal: controller.signal });
        const body = await response.json();
        if (!response.ok) {
          setPhotoChecks([]);
          setPhotoCheckStatus(body.error || "AI Photo Check is unavailable. You can continue and review the photos yourself.");
          return;
        }
        setPhotoChecks(body.results ?? []);
        setPhotoCheckStatus((body.results ?? []).some((result: { ready: boolean }) => !result.ready)
          ? "AI Photo Check recommends retaking or removing at least one photo."
          : "AI Photo Check complete — every selected photo is clear and presentation-ready.");
      } catch (error) {
        if (didTimeOut) {
          setPhotoChecks([]);
          setPhotoCheckStatus("AI Photo Check is taking longer than expected. You can still save this photo now.");
        } else if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPhotoChecks([]);
          setPhotoCheckStatus("AI Photo Check is unavailable. You can continue and review the photos yourself.");
        }
      } finally {
        if (requestTimeout !== null) window.clearTimeout(requestTimeout);
        setIsPhotoChecking(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      if (requestTimeout !== null) window.clearTimeout(requestTimeout);
    };
  }, [files]);

  async function addFiles(incoming: FileList | File[]) {
    const images = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;
    setIsPreparingImages(true);
    try {
      const prepared = await prepareWardrobeImages(images);
      setFiles((current) => [...current, ...prepared].slice(0, 4));
    } finally {
      setIsPreparingImages(false);
    }
  }

  function removeFile(fileIndex: number) {
    setFiles((current) => {
      const next = current.filter((_, index) => index !== fileIndex);
      if (!next.length) {
        analyzedFileRef.current = null;
        setAnalysisCompleted(false);
        setAnalysisFailed(false);
        setAnalysisStatus("");
      }
      return next;
    });
  }

  function makeCover(fileIndex: number) {
    setFiles((current) => {
      if (fileIndex <= 0 || fileIndex >= current.length) return current;
      const next = [...current];
      const [selected] = next.splice(fileIndex, 1);
      next.unshift(selected);
      analyzedFileRef.current = null;
      return next;
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void addFiles(event.dataTransfer.files);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape" && !isSaving) {
      onCancel();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="editorial-shell fixed inset-0 z-50 overflow-y-auto bg-[#231c1c]/45 px-3 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-8 sm:py-12">
      <form
        ref={dialogRef}
        aria-labelledby="add-item-title"
        aria-modal="true"
        role="dialog"
        onSubmit={handleSubmit}
        onKeyDown={handleDialogKeyDown}
        className="paper-panel mx-auto w-full max-w-3xl rounded-[2rem] p-6 sm:p-10"
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
              New piece
            </p>
            <h2 id="add-item-title" className="mt-3 font-serif text-4xl font-light tracking-tight text-[#20372f] sm:text-5xl">
              Add to My Wardrobe
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-white hover:text-black"
          >
            Cancel
          </button>
        </header>

        <div className="mt-10 space-y-10">
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Photograph the piece</p>
              <p className="text-xs text-[#9a6b72]">Private · editable · AI-assisted</p>
            </div>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white/70 px-6 text-center transition-colors hover:border-black/35 hover:bg-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-xl font-light text-neutral-600">
                +
              </span>
              <span className="mt-4 text-sm text-neutral-700">Take a photo, choose from your library, or drop images here</span>
              <span className="mt-2 text-xs text-neutral-500">Up to four JPEG, PNG, WebP, or HEIC images, 10 MB each</span>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <CameraCapture onCapture={(file) => void addFiles([file])} className="rounded-full bg-[#173d31] px-5 py-2.5 text-sm text-white" label="Take photo" />
                <label className={`rounded-full border border-[#173d31]/20 px-5 py-2.5 text-sm text-[#173d31] ${isPreparingImages ? "cursor-wait opacity-50" : "cursor-pointer"}`}>
                  Choose photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isPreparingImages}
                    className="sr-only"
                    onChange={(event) => event.target.files && void addFiles(event.target.files)}
                  />
                </label>
              </div>
              {isPreparingImages && <span className="mt-3 text-xs text-[#8a6f43]">Preparing iPhone photos for upload…</span>}
            </div>
            {previewUrls.length > 0 && (
              <div className="mt-5 rounded-[1.5rem] border border-[#dfccd1] bg-[#fff9f7] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b72]">Wardrobe thumbnail</p><h3 className="mt-1 font-serif text-2xl text-[#54263a]">Your selected item</h3></div><span className="rounded-full bg-[#f3dfe3] px-3 py-1 text-xs text-[#6c4050]">{files.length} {files.length === 1 ? "photo" : "photos"}</span></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(84,38,58,0.1)]">
                    {/* Blob previews are local and intentionally use a native image element. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrls[0]} alt="Selected wardrobe item thumbnail" className="h-full w-full object-cover" />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-white backdrop-blur-sm">Cover photo</span>
                    <button type="button" aria-label="Remove cover photo" onClick={() => removeFile(0)} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-sm shadow">×</button>
                  </div>
                  <div>
                    <p className="text-sm leading-6 text-[#74696b]">This is how the item will begin to appear in My Wardrobe. Curated reviews the cover photo while you continue completing the editable details below.</p>
                    {previewUrls.length > 1 && <div className="mt-4 grid grid-cols-4 gap-2">{previewUrls.slice(1).map((url, previewIndex) => {
                      const fileIndex = previewIndex + 1;
                      return <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-white">
                        {/* Blob previews are local and intentionally use a native image element. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Additional garment view ${fileIndex + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => makeCover(fileIndex)} className="absolute inset-x-1 bottom-1 min-h-9 rounded-full bg-[#54263a]/90 px-2 text-[0.58rem] uppercase tracking-[0.08em] text-white">Use as cover</button>
                        <button type="button" aria-label={`Remove selected image ${fileIndex + 1}`} onClick={() => removeFile(fileIndex)} className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs shadow sm:h-11 sm:w-11">×</button>
                      </div>;
                    })}</div>}
                  </div>
                </div>
              </div>
            )}
            {analysisStatus && <div aria-live="polite" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e8d3d9] bg-[#fff5f6] px-4 py-3 text-sm leading-6 text-[#6c4e57]"><span>{analysisStatus}</span>{isAnalyzing ? <span className="text-xs text-[#8a6f43]">Reviewing…</span> : analysisFailed && files[0] ? <button type="button" onClick={() => void analyzeFile(files[0])} className="rounded-full border border-[#9a6b72]/25 bg-white px-4 py-2 text-xs text-[#704154]">Try AI again</button> : null}</div>}
            {photoCheckStatus && <section aria-live="polite" className="mt-4 rounded-2xl border border-[#d9c5c9] bg-white/80 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.18em] text-[#9a6b72]">AI Photo Check</p>{isPhotoChecking && <span className="text-xs text-[#8a6f43]">Reviewing…</span>}</div><p className="mt-2 text-sm leading-6 text-[#6c4e57]">{photoCheckStatus}</p>{photoChecks.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{photoChecks.map((result) => <div key={result.index} className={`rounded-xl px-3 py-3 text-xs leading-5 ${result.ready ? "bg-[#edf4ee] text-[#315344]" : "bg-[#fff0f1] text-[#7a394b]"}`}><span className="font-medium">Photo {result.index + 1}: {result.ready ? "Ready" : "Please retake"}</span><span className="mt-1 block">{result.guidance}</span></div>)}</div>}</section>}
          </section>

          <fieldset>
            <legend className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Optional details
            </legend>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormField label="Brand">
                <input
                  ref={firstInputRef}
                  type="text"
                  value={designer}
                  onChange={(event) => onDesignerChange(event.target.value)}
                  className={inputClassName}
                  placeholder="Optional"
                  maxLength={100}
                  list="wardrobe-brand-suggestions"
                />
                <datalist id="wardrobe-brand-suggestions">{brandSuggestions.map((brand) => <option key={brand} value={brand} />)}</datalist>
              </FormField>
              <FormField label="Item name">
                <input
                  type="text"
                  value={itemName}
                  onChange={(event) => onItemNameChange(event.target.value)}
                  className={inputClassName}
                  placeholder="Optional"
                  maxLength={100}
                />
              </FormField>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs uppercase tracking-[0.2em] text-neutral-500">Styling Suggestion</legend>
            <p className="mt-3 text-sm leading-6 text-[#74696b]">Curated considers these notes whenever this piece is used in an outfit recommendation.</p>
            <textarea value={stylingSuggestion} onChange={(event) => onStylingSuggestionChange(event.target.value)} maxLength={1000} rows={4} className={`${inputClassName} mt-4 resize-y`} placeholder="Curated will suggest complementary pieces, colors, proportions, and occasions." />
          </fieldset>

          <fieldset>
            <legend className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Category and tags
            </legend>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormField label="Wardrobe section">
                <select
                  value={department}
                  onChange={(event) => {
                    onDepartmentChange(event.target.value as WardrobeDepartment);
                    onCategoryChange("");
                    onSubcategoryChange("");
                    onSubcategory2Change("");
                  }}
                  className={inputClassName}
                >
                  {WARDROBE_DEPARTMENTS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category">
                <select value={category} onChange={(event) => { onCategoryChange(event.target.value); onSubcategoryChange(""); onSubcategory2Change(""); }} className={inputClassName}>
                  <option value="">Let Curated suggest</option>
                  {categoriesForDepartment(department).map((option) => <option key={option}>{option}</option>)}
                </select>
              </FormField>
              {department === "Women" && category === "Dresses" && (
                <FormField label="Second Dresses subcategory">
                  <select value={subcategory2} onChange={(event) => onSubcategory2Change(event.target.value)} className={inputClassName}>
                    <option value="">Optional</option>
                    {subcategoriesFor(department, category).filter((option) => option !== subcategory).map((option) => <option key={option}>{option}</option>)}
                  </select>
                </FormField>
              )}
              <FormField label="Subcategory">
                <select value={subcategory} onChange={(event) => onSubcategoryChange(event.target.value)} className={inputClassName} disabled={!category || subcategoriesFor(department, category).length === 0}>
                  <option value="">Optional</option>
                  {subcategoriesFor(department, category).map((option) => <option key={option}>{option}</option>)}
                </select>
              </FormField>
              <FormField label="Color">
                <input
                  type="text"
                  value={color}
                  onChange={(event) => onColorChange(event.target.value)}
                  className={inputClassName}
                  placeholder="Let Curated suggest"
                  maxLength={100}
                />
              </FormField>
              <FormField label="Size">
                <input
                  type="text"
                  value={size}
                  onChange={(event) => onSizeChange(event.target.value)}
                  className={inputClassName}
                  placeholder="Optional"
                  maxLength={100}
                />
              </FormField>
              <FormField label="Season 1">
                <select
                  value={season}
                  onChange={(event) => onSeasonChange(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">Let Curated suggest</option>
                  {CLOTHING_SEASONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Season 2">
                <select value={season2} onChange={(event) => onSeason2Change(event.target.value)} className={inputClassName}>
                  <option value="">Optional</option>
                  {CLOTHING_SEASONS.map((option) => <option key={option} disabled={option === season || option === season3}>{option}</option>)}
                </select>
              </FormField>
              <FormField label="Season 3">
                <select value={season3} onChange={(event) => onSeason3Change(event.target.value)} className={inputClassName}>
                  <option value="">Optional</option>
                  {CLOTHING_SEASONS.map((option) => <option key={option} disabled={option === season || option === season2}>{option}</option>)}
                </select>
              </FormField>
            </div>
          </fieldset>

          <p className="rounded-2xl border border-[#e8d3d9] bg-[#fff5f6] px-5 py-4 text-sm leading-6 text-[#6c4e57]">
            As soon as you choose any photo, Curated begins filling category, color, and seasons while this form stays open—even while AI Photo Check continues reviewing presentation. AI suggestions are optional and never prevent you from saving. Brand, item name, and size are added only when visible, and every suggestion remains editable.
          </p>

          <section className="border-t border-black/10 pt-7">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Preference
            </p>
            <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(event) => onFavoriteChange(event.target.checked)}
                className="sr-only"
              />
              <span
                className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${
                  favorite ? "bg-[#254235]" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    favorite ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
              Mark as a favorite
            </label>
          </section>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl bg-[#f3e9e5] px-4 py-3 text-sm text-[#7a362c]"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <footer className="sticky bottom-0 z-10 -mx-6 mt-10 flex items-center justify-end gap-3 border-t border-black/10 bg-[#faf8f4]/95 px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:static sm:mx-0 sm:gap-4 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-7 sm:backdrop-blur-none">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full px-5 py-3 text-sm text-neutral-500 transition-colors hover:text-black"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="brass-button min-h-12 flex-1 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-7"
          >
            {isSaving ? "Adding to My Wardrobe..." : "Add to My Wardrobe"}
          </button>
        </footer>
      </form>
    </div>
  );
}
