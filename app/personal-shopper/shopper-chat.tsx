"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CameraCapture } from "@/components/closet/CameraCapture";
import { prepareWardrobeImage } from "@/lib/media/prepare-wardrobe-image";

type Message = { role: "user" | "assistant"; content: string; imageUrls?: string[] };
type SavedMessage = Message & { id: string; createdAt: string };
type SavedConversation = { id: string; title: string; createdAt: string; updatedAt: string; messages: SavedMessage[] };

function conversationMoment(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MessageText({ content }: { content: string }) {
  const paragraphs = content.split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex} className="whitespace-pre-wrap text-sm leading-7">
          {paragraph.split(/(https?:\/\/[^\s]+)/g).map((part, index) => part.startsWith("http") ? (
            <a key={`${part}-${index}`} href={part.replace(/[),.;]+$/, "")} target="_blank" rel="noreferrer" className="underline underline-offset-4">{part}</a>
          ) : part)}
        </p>
      ))}
    </div>
  );
}

export function ShopperChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState("");
  const [productImages, setProductImages] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [archived, setArchived] = useState<SavedConversation[]>([]);
  const [archiveStatus, setArchiveStatus] = useState("Loading saved conversations…");
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const previewUrls = useMemo(() => productImages.map((image) => URL.createObjectURL(image)), [productImages]);
  useEffect(() => () => { previewUrls.forEach((url) => URL.revokeObjectURL(url)); }, [previewUrls]);
  useEffect(() => {
    if (messages.length) conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  async function loadConversations() {
    try {
      const response = await fetch("/api/personal-shopper/conversations", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setArchived(body.archived || []);
      if (body.active && !conversationId && messages.length === 0) {
        setConversationId(body.active.id);
        setMessages(body.active.messages.map(({ role, content, imageUrls }: SavedMessage) => ({ role, content, imageUrls })));
      }
      setArchiveStatus("");
      return body.active as SavedConversation | null;
    } catch {
      setArchiveStatus("Saved conversations are temporarily unavailable.");
      return null;
    }
  }

  useEffect(() => {
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const loadTimer = setTimeout(() => {
      void loadConversations().then((active) => {
        if (!active) return;
        const remaining = Math.max(1000, new Date(active.updatedAt).getTime() + 4 * 60 * 60 * 1000 - Date.now());
        expiryTimer = setTimeout(() => {
          setConversationId("");
          setMessages([]);
          void loadConversations();
        }, remaining);
      });
    }, 0);
    return () => {
      clearTimeout(loadTimer);
      if (expiryTimer) clearTimeout(expiryTimer);
    };
    // The initial load deliberately runs once; subsequent updates are handled after actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseProductImage(file: File | undefined) {
    if (!file) return;
    if (productImages.length >= 2) return setStatus("You can compare up to two images at a time.");
    setStatus("Preparing your image privately…");
    const prepared = await prepareWardrobeImage(file);
    setProductImages((current) => [...current, prepared].slice(0, 2));
    setStatus(productImages.length === 0 ? "First image ready. Add a second to compare, or send now." : "Two images ready for comparison.");
  }

  async function chooseProductImages(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files).slice(0, Math.max(0, 2 - productImages.length))) await chooseProductImage(file);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    productImages.forEach((image) => data.append("files", image));
    const message = draft.trim();
    const productUrl = String(data.get("productUrl") || "").trim();
    if (!message && !productUrl && !productImages.length) {
      setStatus("Add a question, product link, or up to two images to begin.");
      return;
    }
    data.set("message", message);
    if (conversationId) data.set("conversationId", conversationId);
    data.set("history", JSON.stringify(messages.slice(-12)));
    setMessages((current) => [...current, { role: "user", content: message || "Please evaluate the attached item." }]);
    setStatus(productImages.length ? `AI Photo Check is reviewing ${productImages.length === 2 ? "both images" : "the image"} before your appointment…` : "Considering this against your wardrobe…");
    setIsSending(true);
    setDraft("");
    setProductImages([]);
    form.reset();
    try {
      const response = await fetch("/api/personal-shopper", { method: "POST", body: data });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setConversationId(body.conversationId);
        setMessages((current) => {
          const next = [...current];
          for (let index = next.length - 1; index >= 0; index--) {
            if (next[index].role === "user") { next[index] = { ...next[index], imageUrls: body.imageUrls || [] }; break; }
          }
          return [...next, { role: "assistant", content: body.answer }];
        });
        setStatus("");
      } else {
        if (body.conversationId) setConversationId(body.conversationId);
        if (body.imageUrls?.length) setMessages((current) => {
          const next = [...current];
          for (let index = next.length - 1; index >= 0; index--) {
            if (next[index].role === "user") { next[index] = { ...next[index], imageUrls: body.imageUrls }; break; }
          }
          return next;
        });
        setStatus(body.error || "The conversation is unavailable.");
      }
    } catch {
      setStatus("The connection was interrupted. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  const input = "w-full rounded-2xl border border-[#704154]/15 bg-white/90 px-4 py-3.5 outline-none placeholder:text-[#8d7c81] focus:border-[#704154]/50";

  async function renameConversation(id: string, title: string) {
    const response = await fetch("/api/personal-shopper/conversations", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "The conversation could not be renamed.");
    setArchived((current) => current.map((conversation) => conversation.id === id ? { ...conversation, title: body.title } : conversation));
  }

  async function deleteConversation(id: string) {
    const response = await fetch(`/api/personal-shopper/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("The conversation could not be deleted.");
    setArchived((current) => current.filter((conversation) => conversation.id !== id));
  }

  return (
    <section className="paper-panel mx-auto mt-8 max-w-4xl overflow-hidden rounded-[1.5rem] sm:mt-12 sm:rounded-[2rem]">
      {messages.length > 0 && (
        <div className="border-b border-[#a07c45]/20" aria-label="Personal Shopper conversation">
          {messages.map((message, index) => message.role === "user" ? (
            <article key={index} className="border-b border-[#173d31]/[0.06] px-4 py-5 sm:px-8 sm:py-7">
              <div className="ml-auto max-w-[90%] rounded-[1.25rem] bg-[#eee3e4] px-4 py-3 text-[#3d2b32] sm:max-w-[80%] sm:px-5 sm:py-4">
                <p className="mb-1 text-[0.62rem] uppercase tracking-[0.16em] text-[#8b6570]">You</p>
                <MessageImages urls={message.imageUrls} />
                <MessageText content={message.content} />
              </div>
            </article>
          ) : (
            <article key={index} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-[#173d31]/[0.06] bg-white/45 px-4 py-5 text-[#3d4541] sm:grid-cols-[2.5rem_1fr] sm:gap-4 sm:px-8 sm:py-7">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#a07c45]/45 font-serif text-[#704154] sm:h-10 sm:w-10">C</span>
              <div className="min-w-0">
                <p className="mb-2 text-[0.62rem] uppercase tracking-[0.18em] text-[#8a6f43]">Curated</p>
                <MessageText content={message.content} />
              </div>
            </article>
          ))}
          {isSending && (
            <div className="grid grid-cols-[2rem_1fr] gap-3 bg-white/45 px-4 py-5 text-sm text-[#805844] sm:grid-cols-[2.5rem_1fr] sm:px-8">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#a07c45]/45 font-serif text-[#704154]">C</span>
              <p aria-live="polite" className="pt-1.5">{status}</p>
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>
      )}

      <form onSubmit={send} className="p-5 sm:p-8">
        <p className="text-[0.68rem] uppercase tracking-[0.26em] text-[#8a6f43]">Private styling conversation</p>
        <h2 className="mt-2 font-serif text-3xl text-[#173d31] sm:text-4xl">Ask a Personal Shopper</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68736d]">Ask about a wardrobe gap, a potential purchase, or how to style something you own.</p>
        <textarea
          name="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={`${input} mt-5 min-h-[8rem] resize-y sm:mt-6`}
          rows={4}
          placeholder="What is missing from my wardrobe? Should I buy this? How would I style it?"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <details className="mt-3 rounded-2xl border border-[#704154]/10 bg-white/55 px-4 py-3 text-[#3d2b32]">
          <summary className="cursor-pointer text-sm text-[#704154]">Add a product link or up to two images <span className="text-[#8d7c81]">(optional)</span></summary>
          <div className="mt-4 space-y-3 border-t border-[#a07c45]/15 pt-4">
            <input name="productUrl" type="url" className={input} placeholder="Product link" />
            {previewUrls.length > 0 && <div className="grid max-w-[19rem] grid-cols-2 gap-2">{previewUrls.map((url, index) => <div key={url} className="relative overflow-hidden border border-[#a07c45]/20 bg-white"><img src={url} alt={`Selected comparison item ${index + 1}`} className="aspect-[4/5] w-full object-cover" /><button type="button" onClick={() => setProductImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} aria-label={`Remove comparison image ${index + 1}`} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#704154] shadow">×</button><span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-1 text-[0.58rem] uppercase tracking-[0.1em] text-white">Item {index + 1}</span></div>)}</div>}
            <div className="grid grid-cols-2 gap-3">
              <CameraCapture disabled={productImages.length >= 2} onCapture={(file) => void chooseProductImage(file)} className="min-h-11 rounded-full border border-[#704154]/20 bg-[#704154] px-3 text-xs uppercase tracking-[0.1em] text-white disabled:opacity-45" label="Take photo" />
              <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[#704154]/20 bg-white px-3 text-center text-xs uppercase tracking-[0.1em] text-[#704154]">
                Choose photos
                <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { void chooseProductImages(event.target.files); event.currentTarget.value = ""; }} />
              </label>
            </div>
            {productImages.length > 0 && <p className="text-xs text-[#805844]">{productImages.length} of 2 images selected. {productImages.length === 1 ? "Add another for a side-by-side comparison." : "Curated will compare and contrast both items."}</p>}
          </div>
        </details>

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-xs leading-5 text-[#805844]">{!isSending ? status : ""}</p>
          <button className="brass-button min-w-[8rem] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={isSending}>{isSending ? "Thinking…" : "Send"}</button>
        </div>
        <p className="mt-4 text-[0.68rem] leading-5 text-[#8d7c81]">Press Enter to send or Shift + Enter for a new line. Product details and availability should be confirmed with the retailer.</p>
      </form>

      <div className="border-t border-[#a07c45]/20 bg-white/35 p-5 sm:p-8">
        <p className="text-[0.68rem] uppercase tracking-[0.26em] text-[#8a6f43]">Conversation archive</p>
        <h2 className="mt-2 font-serif text-2xl text-[#173d31] sm:text-3xl">Past appointments</h2>
        <p className="mt-2 text-sm leading-6 text-[#68736d]">An active conversation remains above for four hours. Afterward, it is filed here privately.</p>
        {archiveStatus && <p className="mt-5 text-sm text-[#805844]">{archiveStatus}</p>}
        {!archiveStatus && archived.length === 0 && <p className="mt-5 text-sm italic text-[#7d6d72]">No archived conversations yet.</p>}
        <div className="mt-5 space-y-3">
          {archived.map((conversation) => (
            <ArchivedConversation key={conversation.id} conversation={conversation} onRename={renameConversation} onDelete={deleteConversation} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchivedConversation({ conversation, onRename, onDelete }: {
  conversation: SavedConversation;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [status, setStatus] = useState("");

  async function saveName() {
    setStatus("Saving…");
    try {
      await onRename(conversation.id, title);
      setEditing(false);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The name could not be saved.");
    }
  }

  async function remove() {
    if (!window.confirm("Permanently delete this Personal Shopper conversation? This cannot be undone.")) return;
    setStatus("Deleting…");
    try { await onDelete(conversation.id); } catch (error) { setStatus(error instanceof Error ? error.message : "The conversation could not be deleted."); }
  }

  return (
    <details className="rounded-2xl border border-[#704154]/12 bg-[#fffdf9]/85 px-4 py-3 open:pb-5">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-serif text-lg text-[#54263a]">{conversation.title}</p>
            <p className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-[#8a6f43]">{conversationMoment(conversation.createdAt)}</p>
          </div>
          <span aria-hidden="true" className="pt-1 text-[#8a6f43]">⌄</span>
        </div>
      </summary>
      <div className="mt-4 space-y-3 border-t border-[#a07c45]/15 pt-4">
        {conversation.messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[90%] rounded-xl bg-[#eee3e4] px-4 py-3" : "rounded-xl bg-white px-4 py-3"}>
            <p className="mb-1 text-[0.58rem] uppercase tracking-[0.16em] text-[#8b6570]">{message.role === "user" ? "You" : "Curated"}</p>
            <MessageImages urls={message.imageUrls} />
            <MessageText content={message.content} />
          </div>
        ))}
        {editing ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className="min-h-10 flex-1 rounded-xl border border-[#704154]/20 bg-white px-3 text-sm outline-none focus:border-[#704154]/50" aria-label="Conversation name" />
            <button type="button" onClick={() => void saveName()} className="rounded-full bg-[#704154] px-4 py-2 text-xs uppercase tracking-[0.1em] text-white">Save name</button>
            <button type="button" onClick={() => { setEditing(false); setTitle(conversation.title); }} className="px-3 py-2 text-xs text-[#704154]">Cancel</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#704154] underline underline-offset-4">Rename</button>
            <button type="button" onClick={() => void remove()} className="text-xs text-[#984b43] underline underline-offset-4">Delete permanently</button>
          </div>
        )}
        {status && <p aria-live="polite" className="text-xs text-[#805844]">{status}</p>}
      </div>
    </details>
  );
}

function MessageImages({ urls = [] }: { urls?: string[] }) {
  if (!urls.length) return null;
  return <div className={`mb-3 grid gap-2 ${urls.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-[10rem]"}`}>{urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl border border-[#a07c45]/20 bg-white"><img src={url} alt={`Referenced item ${index + 1}`} className="aspect-[4/5] w-full object-cover transition-transform group-hover:scale-[1.02]" /><span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-1 text-[0.55rem] uppercase tracking-[0.08em] text-white">Item {index + 1}</span></a>)}</div>;
}
