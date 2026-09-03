"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CameraCapture } from "@/components/closet/CameraCapture";
import { prepareWardrobeImage } from "@/lib/media/prepare-wardrobe-image";

type Outfit = {
  id: string;
  title: string | null;
  occasion: string | null;
  notes: string | null;
  wornAt: string | null;
  archivedAt: string | null;
  imageUrl: string | null;
  useAsStyleSignal: boolean;
  itemIds: string[];
};

type ClosetOption = {
  id: string;
  designer: string | null;
  itemName: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  imageUrl: string | null;
};

function wardrobeItemLabel(item: ClosetOption) {
  return [item.designer, item.itemName].filter(Boolean).join(" — ") || [item.category, item.color].filter(Boolean).join(" — ") || "Untitled piece";
}

export function OutfitCollection({ mode }: { mode: "archive" | "history" }) {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [closet, setCloset] = useState<ClosetOption[]>([]);
  const [status, setStatus] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editOccasion, setEditOccasion] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItemIds, setEditItemIds] = useState<string[]>([]);
  const [editWardrobeQuery, setEditWardrobeQuery] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<Record<string, string>>({});
  const [wardrobeQuery, setWardrobeQuery] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [wardrobeSearchOpen, setWardrobeSearchOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  async function load() {
    const response = await fetch(`/api/outfits?mode=${mode}`);
    if (response.ok) setOutfits(await response.json());
  }

  useEffect(() => {
    let current = true;
    Promise.all([
      fetch(`/api/outfits?mode=${mode}`).then((response) => response.ok ? response.json() : []),
      fetch("/api/closet-items").then((response) => response.ok ? response.json() : []),
    ]).then(([saved, items]) => {
      if (current) {
        setOutfits(saved);
        setCloset(items);
      }
    });
    return () => { current = false; };
  }, [mode]);

  const previewUrl = useMemo(() => selectedPhoto ? URL.createObjectURL(selectedPhoto) : "", [selectedPhoto]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setStatus("Preparing your photo privately…");
    setSelectedPhoto(await prepareWardrobeImage(file));
    setStatus("Photo ready for AI Photo Check.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(selectedPhoto ? "AI Photo Check is reviewing the image before saving…" : "Saving privately…");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("mode", mode);
    if (selectedPhoto) data.set("file", selectedPhoto);
    const response = await fetch("/api/outfits", { method: "POST", body: data });
    const body = await response.json().catch(() => ({}));
    setStatus(response.ok ? "Saved privately." : body.error || "We could not save this outfit yet.");
    if (response.ok) {
      form.reset();
      setSelectedPhoto(null);
      setSelectedItemIds([]);
      setWardrobeQuery("");
      await load();
    }
  }

  function beginEdit(outfit: Outfit) {
    setExpandedIds((current) => new Set(current).add(outfit.id));
    setEditingId(outfit.id);
    setEditTitle(outfit.title || "");
    setEditOccasion(outfit.occasion || "");
    setEditNotes(outfit.notes || "");
    setEditItemIds(outfit.itemIds || []);
    setEditWardrobeQuery("");
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveEdit(id: string) {
    const response = await fetch(`/api/outfits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, occasion: editOccasion, notes: editNotes, itemIds: editItemIds }),
    });
    if (response.ok) {
      setEditingId(null);
      await load();
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/outfits/${id}`, { method: "DELETE" });
    if (response.ok) {
      setOutfits((current) => current.filter((outfit) => outfit.id !== id));
      setConfirmingDeleteId(null);
    }
  }

  async function toggleSignal(outfit: Outfit) {
    const response = await fetch(`/api/outfits/${outfit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useAsStyleSignal: !outfit.useAsStyleSignal }),
    });
    if (response.ok) {
      setOutfits((current) => current.map((saved) => saved.id === outfit.id
        ? { ...saved, useAsStyleSignal: !saved.useAsStyleSignal }
        : saved));
    }
  }

  async function attachOutfitPhoto(outfitId: string, file: File | undefined) {
    if (!file) return;
    setPhotoStatus((current) => ({ ...current, [outfitId]: "Preparing and reviewing your photograph…" }));
    try {
      const prepared = await prepareWardrobeImage(file);
      const data = new FormData();
      data.set("file", prepared);
      const response = await fetch(`/api/outfits/${outfitId}`, { method: "PATCH", body: data });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPhotoStatus((current) => ({ ...current, [outfitId]: body.error || "We could not add this photograph." }));
        return;
      }
      setPhotoStatus((current) => ({ ...current, [outfitId]: "Outfit photograph saved privately." }));
      await load();
    } catch {
      setPhotoStatus((current) => ({ ...current, [outfitId]: "We could not prepare this photograph." }));
    }
  }

  const input = "w-full rounded-xl border border-[#173d31]/15 bg-white px-4 py-3 outline-none focus:border-[#173d31]/50";
  const selectedWardrobeItems = selectedItemIds
    .map((id) => closet.find((item) => item.id === id))
    .filter((item): item is ClosetOption => Boolean(item));
  const normalizedWardrobeQuery = wardrobeQuery.trim().toLocaleLowerCase();
  const wardrobeMatches = normalizedWardrobeQuery
    ? closet.filter((item) => {
        if (selectedItemIds.includes(item.id)) return false;
        return [item.designer, item.itemName, item.category, item.subcategory, item.color]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedWardrobeQuery);
      }).slice(0, 8)
    : [];

  function selectWardrobeItem(itemId: string) {
    setSelectedItemIds((current) => current.includes(itemId) ? current : [...current, itemId]);
    setWardrobeQuery("");
    setWardrobeSearchOpen(false);
  }

  return (
    <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-8 lg:grid-cols-[22rem_1fr] lg:items-start">
      <form onSubmit={submit} className="paper-panel rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-7">
        <h2 className="font-serif text-[1.75rem] text-[#173d31] sm:text-3xl">{mode === "archive" ? "Add a favorite look" : "Remember what you wore"}</h2>
        <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-4">
          <div className="border border-dashed border-[#173d31]/20 bg-white/55 p-3 text-center text-sm text-[#59665f] sm:p-4">
            <p className="font-serif text-xl text-[#20372f]">{mode === "archive" ? "Add an outfit photograph" : "Outfit photograph (optional)"}</p>
            {previewUrl && <img src={previewUrl} alt="Selected outfit preview" className="mx-auto mt-4 aspect-[4/5] max-w-[12rem] border border-[#a07c45]/20 object-cover" />}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <CameraCapture onCapture={(file) => void choosePhoto(file)} className="min-h-12 border border-[#173d31]/25 bg-[#20372f] px-3 text-xs uppercase tracking-[0.1em] text-white" label="Take photo" />
              <label className="flex min-h-12 cursor-pointer items-center justify-center border border-[#173d31]/25 bg-white px-3 text-xs uppercase tracking-[0.1em] text-[#20372f]">
                Choose photo
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => void choosePhoto(event.target.files?.[0])} />
              </label>
            </div>
            {selectedPhoto && <button type="button" onClick={() => setSelectedPhoto(null)} className="mt-3 text-xs underline underline-offset-4">Remove selected photo</button>}
          </div>
          <input className={input} name="title" maxLength={200} placeholder="Outfit title (optional)" />
          <input className={input} name="occasion" maxLength={300} placeholder="Occasion" />
          <input className={input} name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <textarea className={input} name="notes" maxLength={3000} rows={3} placeholder="Notes, mood, or what you loved" />
          {closet.length > 0 && (
            <fieldset className="border-t border-[#a07c45]/20 pt-4">
              <legend className="text-sm text-[#59665f]">Link pieces from your Wardrobe</legend>
              <p className="mt-2 text-xs leading-5 text-[#78817c]">Begin typing an item, brand, category, or color.</p>
              {selectedItemIds.map((id) => <input key={id} type="hidden" name="itemIds" value={id} />)}
              <div className="relative mt-3">
                <label htmlFor={`${mode}-wardrobe-search`} className="sr-only">Search your Wardrobe</label>
                <input
                  id={`${mode}-wardrobe-search`}
                  type="search"
                  role="combobox"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls={`${mode}-wardrobe-results`}
                  aria-expanded={wardrobeSearchOpen && Boolean(normalizedWardrobeQuery)}
                  className={input}
                  value={wardrobeQuery}
                  placeholder="Search your Wardrobe"
                  onFocus={() => setWardrobeSearchOpen(true)}
                  onChange={(event) => { setWardrobeQuery(event.target.value); setWardrobeSearchOpen(true); }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setWardrobeSearchOpen(false);
                    if (event.key === "Enter" && wardrobeMatches[0]) {
                      event.preventDefault();
                      selectWardrobeItem(wardrobeMatches[0].id);
                    }
                  }}
                />
                {wardrobeSearchOpen && normalizedWardrobeQuery && (
                  <div id={`${mode}-wardrobe-results`} role="listbox" className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto border border-[#a07c45]/25 bg-[#fffdf8] p-1 shadow-[0_18px_45px_rgba(36,43,37,0.16)]">
                    {wardrobeMatches.length ? wardrobeMatches.map((item) => (
                      <button key={item.id} type="button" role="option" aria-selected="false" onClick={() => selectWardrobeItem(item.id)} className="flex min-h-14 w-full items-center gap-3 border-b border-[#173d31]/[0.07] px-2 py-2 text-left last:border-0 hover:bg-[#f4ede2] focus:bg-[#f4ede2] focus:outline-none">
                        <span className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden bg-white">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-[9px] uppercase tracking-wider text-[#9b9186]">No photo</span>}
                        </span>
                        <span>
                          <span className="block text-sm text-[#20372f]">{wardrobeItemLabel(item)}</span>
                          <span className="mt-1 block text-xs text-[#78817c]">{[item.category, item.subcategory, item.color].filter(Boolean).join(" · ") || "Wardrobe piece"}</span>
                        </span>
                      </button>
                    )) : <p className="px-3 py-4 text-sm text-[#78817c]">No matching wardrobe pieces.</p>}
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-2" aria-live="polite">
                {selectedWardrobeItems.map((item) => (
                  <div key={item.id} className="flex min-h-12 items-center justify-between gap-3 border border-[#173d31]/10 bg-white/65 px-3 py-2 text-sm">
                    <span>{wardrobeItemLabel(item)}</span>
                    <button type="button" className="min-h-10 shrink-0 px-2 text-xs text-[#8b4655] underline-offset-4 hover:underline" onClick={() => setSelectedItemIds((current) => current.filter((id) => id !== item.id))}>Remove</button>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
          {mode === "archive" && (
            <label className="flex items-start gap-3 text-sm leading-6 text-[#59665f]"><input name="useAsStyleSignal" type="checkbox" defaultChecked className="mt-1" />Let Curated use this confirmed favorite as a style signal.</label>
          )}
          <button className="brass-button w-full" type="submit">Save privately</button>
          <p aria-live="polite" className="text-sm leading-6 text-[#805844]">{status}</p>
        </div>
      </form>

      <section>
        {outfits.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#173d31]/20 p-12 text-center text-[#68736d]">Your {mode === "archive" ? "style archive" : "outfit history"} will grow here.</div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {outfits.map((outfit) => {
              const date = outfit.wornAt || outfit.archivedAt;
              const isExpanded = expandedIds.has(outfit.id) || editingId === outfit.id;
              const entryHeading = mode === "archive"
                ? outfit.title || "Favorite look"
                : outfit.occasion || outfit.title || "Worn look";
              const linkedItems = (outfit.itemIds || []).map((itemId) => closet.find((item) => item.id === itemId)).filter((item): item is ClosetOption => Boolean(item));
              const normalizedEditQuery = editWardrobeQuery.trim().toLocaleLowerCase();
              const editMatches = normalizedEditQuery ? closet.filter((item) => !editItemIds.includes(item.id) && [item.designer, item.itemName, item.category, item.subcategory, item.color].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalizedEditQuery)).slice(0, 5) : [];
              return (
                <article key={outfit.id} className="paper-panel overflow-hidden rounded-[1.25rem] sm:rounded-[1.5rem]">
                  <div className="grid grid-cols-[5.25rem_1fr] items-stretch sm:grid-cols-[7rem_1fr]">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`outfit-details-${outfit.id}`}
                      onClick={() => toggleExpanded(outfit.id)}
                      className="group block min-h-[6.75rem] bg-[#eee8dc] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a07c45] sm:min-h-[8rem]"
                      aria-label={`${isExpanded ? "Close" : "Open"} ${entryHeading}`}
                    >
                      {outfit.imageUrl
                        ? <img src={outfit.imageUrl} alt={outfit.title || outfit.occasion || "Saved outfit"} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                        : <span className="flex h-full min-h-[6.75rem] items-center justify-center px-2 text-center text-[0.62rem] uppercase tracking-[0.12em] text-[#8a6f43] sm:min-h-[8rem]">Add photo</span>}
                    </button>
                    <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`outfit-details-${outfit.id}`}
                        onClick={() => toggleExpanded(outfit.id)}
                        className="min-w-0 text-left focus:outline-none focus-visible:underline focus-visible:underline-offset-4"
                      >
                        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-[#8a6f43] sm:text-xs sm:tracking-[0.18em]">{date ? new Date(date).toLocaleDateString() : "Date not set"}</p>
                        <h3 className="mt-1.5 truncate font-serif text-xl leading-tight text-[#173d31] hover:underline hover:decoration-[#a07c45]/60 hover:underline-offset-4 sm:mt-2 sm:text-2xl">{entryHeading}</h3>
                        {mode === "history" && outfit.title && outfit.title !== outfit.occasion && <p className="mt-1 truncate text-xs text-[#68736d]">{outfit.title}</p>}
                      </button>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`outfit-details-${outfit.id}`}
                        onClick={() => toggleExpanded(outfit.id)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#a07c45]/25 text-xl font-light text-[#6f5734] transition hover:bg-white/60"
                        aria-label={`${isExpanded ? "Close" : "Open"} details`}
                      >
                        <span aria-hidden="true" className={`transition-transform duration-200 ${isExpanded ? "rotate-45" : ""}`}>+</span>
                      </button>
                    </div>
                  </div>
                  {isExpanded && <div id={`outfit-details-${outfit.id}`} className="border-t border-[#a07c45]/15 p-5 sm:p-6">
                    {editingId === outfit.id ? (
                      <div className="mt-4 space-y-3">
                        <input className={input} value={editTitle} maxLength={200} onChange={(event) => setEditTitle(event.target.value)} aria-label="Outfit title" />
                        <input className={input} value={editOccasion} maxLength={300} onChange={(event) => setEditOccasion(event.target.value)} aria-label="Outfit occasion" />
                        <textarea className={input} value={editNotes} maxLength={3000} rows={3} onChange={(event) => setEditNotes(event.target.value)} aria-label="Outfit notes" placeholder="Notes, mood, or what you loved" />
                        <div className="border-t border-[#a07c45]/15 pt-3">
                          <label className="text-xs uppercase tracking-[0.14em] text-[#8a6f43]" htmlFor={`edit-wardrobe-${outfit.id}`}>Linked wardrobe pieces</label>
                          <input id={`edit-wardrobe-${outfit.id}`} className={`${input} mt-2`} value={editWardrobeQuery} autoComplete="off" onChange={(event) => setEditWardrobeQuery(event.target.value)} placeholder="Search to add a piece" />
                          {normalizedEditQuery && <div className="mt-2 border border-[#173d31]/10 bg-white">
                            {editMatches.length ? editMatches.map((item) => <button key={item.id} type="button" className="flex min-h-11 w-full items-center justify-between border-b border-[#173d31]/[0.07] px-3 py-2 text-left text-sm last:border-0 hover:bg-[#f4ede2]" onClick={() => { setEditItemIds((current) => [...current, item.id]); setEditWardrobeQuery(""); }}><span>{wardrobeItemLabel(item)}</span><span className="text-xs text-[#8a6f43]">Add</span></button>) : <p className="px-3 py-3 text-sm text-[#78817c]">No matching pieces.</p>}
                          </div>}
                          <div className="mt-2 space-y-1">
                            {editItemIds.map((itemId) => {
                              const item = closet.find((candidate) => candidate.id === itemId);
                              if (!item) return null;
                              return <div key={itemId} className="flex min-h-11 items-center justify-between gap-3 bg-white/70 px-3 py-2 text-sm"><span>{wardrobeItemLabel(item)}</span><button type="button" className="text-xs text-[#8b4655]" onClick={() => setEditItemIds((current) => current.filter((id) => id !== itemId))}>Unlink</button></div>;
                            })}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2"><button type="button" className="min-h-11 border border-[#173d31]/20" onClick={() => setEditingId(null)}>Cancel</button><button type="button" className="min-h-11 bg-[#20372f] text-white" onClick={() => void saveEdit(outfit.id)}>Save</button></div>
                      </div>
                    ) : (
                      <>
                        {mode === "archive" && outfit.occasion && <p className="text-sm text-[#68736d]">Occasion · {outfit.occasion}</p>}
                        {outfit.notes
                          ? <p className={`${mode === "archive" && outfit.occasion ? "mt-4" : ""} whitespace-pre-line text-sm leading-6 text-[#59665f]`}>{outfit.notes}</p>
                          : <p className="text-sm italic text-[#78817c]">No additional description has been added.</p>}
                        {linkedItems.length > 0 && <div className="mt-4 border-t border-[#a07c45]/15 pt-3"><p className="text-[0.62rem] uppercase tracking-[0.16em] text-[#8a6f43]">Linked wardrobe pieces</p><div className="mt-2 flex flex-wrap gap-2">{linkedItems.map((item) => <span key={item.id} className="bg-white/70 px-3 py-1.5 text-xs text-[#59665f]">{wardrobeItemLabel(item)}</span>)}</div></div>}
                        {mode === "archive" && <p className="mt-3 text-xs text-[#8a6f43]">{outfit.useAsStyleSignal ? "Used as a confirmed style signal" : "Not used for style learning"}</p>}
                        <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-[#8a6f43]">
                          <button type="button" className="min-h-11 border border-[#a07c45]/20" onClick={() => beginEdit(outfit)}>Edit</button>
                          {mode === "archive" && <button type="button" className="min-h-11 border border-[#a07c45]/20" onClick={() => void toggleSignal(outfit)}>{outfit.useAsStyleSignal ? "Stop learning" : "Use for style"}</button>}
                          <label className="flex min-h-11 cursor-pointer items-center justify-center border border-[#a07c45]/20 px-2 text-center">
                              {outfit.imageUrl ? "Replace photo" : "Add outfit photo"}
                              <input className="sr-only" type="file" accept="image/*" onChange={(event) => { void attachOutfitPhoto(outfit.id, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                            </label>
                          <button type="button" className="min-h-11 border border-[#8b4655]/30 bg-[#fff8f7] text-[#8b4655]" onClick={() => setConfirmingDeleteId(outfit.id)}>Delete entry</button>
                        </div>
                        {photoStatus[outfit.id] && <p aria-live="polite" className="mt-3 text-xs leading-5 text-[#805844]">{photoStatus[outfit.id]}</p>}
                        {confirmingDeleteId === outfit.id && <div className="mt-4 border border-[#8b4655]/25 bg-[#fff4f3] p-4 text-sm"><p>Remove this private outfit record permanently?</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="min-h-11" onClick={() => setConfirmingDeleteId(null)}>Keep it</button><button type="button" className="min-h-11 bg-[#8b4655] text-white" onClick={() => void remove(outfit.id)}>Remove</button></div></div>}
                      </>
                    )}
                  </div>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
