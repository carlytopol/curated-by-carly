"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { isRetryableTravelFailure, TRAVEL_CONVERSATION_LIFETIME_MS } from "@/lib/travel/reliability";

type Message = { role: "user" | "assistant"; content: string };
type SavedMessage = Message & { id: string; createdAt: string };
type SavedConversation = { id: string; title: string; createdAt: string; updatedAt: string; messages: SavedMessage[] };
type RetryRequest = { userText: string; firstRequest: boolean; clientRequestId: string };
type PackingErrorResponse = {
  error?: string;
  code?: string;
  retryable?: boolean;
  conversationId?: string;
};

const cityBackgrounds = [
  ["Paris", "/images/cities/paris.png"], ["New York", "/images/cities/new-york.png"],
  ["London", "/images/cities/london.png"], ["Hong Kong", "/images/cities/hong-kong.png"],
  ["Rome", "/images/cities/rome.png"], ["Tokyo", "/images/cities/tokyo.png"],
  ["Bangkok", "/images/cities/bangkok.png"], ["Amalfi", "/images/cities/amalfi.png"],
  ["Sydney", "/images/cities/sydney.png"], ["Havana", "/images/cities/havana.png"],
  ["Rio de Janeiro", "/images/cities/rio.png"], ["Buenos Aires", "/images/cities/buenos-aires.png"],
] as const;

function moment(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MessageText({ content }: { content: string }) {
  return <div className="space-y-3">{content.split(/\n\s*\n/).filter(Boolean).map((part, index) => <p key={index} className="whitespace-pre-wrap text-sm leading-7">{part}</p>)}</div>;
}

export function PackingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [archived, setArchived] = useState<SavedConversation[]>([]);
  const [archiveStatus, setArchiveStatus] = useState("Loading saved journeys…");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [trip, setTrip] = useState({ destination: "", startDate: "", endDate: "", itinerary: "" });
  const [city, setCity] = useState<(typeof cityBackgrounds)[number]>(cityBackgrounds[0]);
  const [fileName, setFileName] = useState("");
  const [fileStatus, setFileStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const [retryRequest, setRetryRequest] = useState<RetryRequest | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const timer = window.setTimeout(() => setCity(cityBackgrounds[Math.floor(Math.random() * cityBackgrounds.length)]), 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages]);

  async function loadConversations() {
    try {
      const response = await fetch("/api/packing/conversations", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error();
      setArchived(body.archived || []);
      if (body.active && !conversationId && messages.length === 0) {
        setConversationId(body.active.id);
        setMessages(body.active.messages.map(({ role, content }: SavedMessage) => ({ role, content })));
      }
      setArchiveStatus("");
      return body.active as SavedConversation | null;
    } catch { setArchiveStatus("Saved journeys are temporarily unavailable."); return null; }
  }

  useEffect(() => {
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => void loadConversations().then((active) => {
      if (!active) return;
      const remaining = Math.max(1000, new Date(active.updatedAt).getTime() + TRAVEL_CONVERSATION_LIFETIME_MS - Date.now());
      expiry = setTimeout(() => { setConversationId(""); setMessages([]); void loadConversations(); }, remaining);
    }), 0);
    return () => { clearTimeout(timer); if (expiry) clearTimeout(expiry); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importItinerary(file: File | undefined) {
    if (!file) return;
    setFileName(file.name); setFileStatus("Curated is reading your itinerary…");
    const data = new FormData(); data.set("file", file);
    const response = await fetch("/api/packing/itinerary", { method: "POST", body: data });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setFileStatus(body.error || "We could not read that itinerary.");
    setTrip((current) => ({ ...current, itinerary: body.itinerary || current.itinerary }));
    setFileStatus("Itinerary imported. Review the details before sending.");
  }

  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void importItinerary(event.dataTransfer.files[0]); }

  async function submitTravelRequest(userText: string, firstRequest: boolean, appendMessage: boolean, clientRequestId: string) {
    if (isSending) return;
    if (appendMessage) setMessages((current) => [...current, { role: "user", content: userText }]);
    setDraft(""); setStatus("Curating your travel wardrobe…"); setIsSending(true);
    try {
      const response = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trip, message: firstRequest ? "" : userText, conversationId, clientRequestId }),
      });
      const body = await response.json().catch(() => ({})) as PackingErrorResponse & { answer?: string };
      if (!response.ok) {
        if (body.conversationId) setConversationId(body.conversationId);
        if (body.code === "conversation_expired" || body.code === "conversation_unavailable") setConversationId("");
        const error = new Error(body.error || "The connection was interrupted. Your request has been kept.") as Error & {
          retryable?: boolean;
        };
        error.retryable = body.retryable ?? isRetryableTravelFailure(body.code);
        throw error;
      }
      if (!body.conversationId || !body.answer) throw new Error("Travel guidance returned an incomplete response.");
      setConversationId(body.conversationId); setMessages((current) => [...current, { role: "assistant", content: body.answer! }]); setRetryRequest(null); setStatus("");
    } catch (error) {
      if (!firstRequest) setDraft(userText);
      setRetryRequest((error as Error & { retryable?: boolean }).retryable === false ? null : { userText, firstRequest, clientRequestId });
      setStatus(error instanceof Error && error.message ? error.message : "The connection was interrupted. Your request has been kept.");
    }
    finally { setIsSending(false); }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    const firstRequest = messages.length === 0;
    if (firstRequest && (!trip.destination || !trip.startDate || !trip.endDate || !trip.itinerary)) { setStatus("Add your destination, dates, and itinerary first."); return; }
    const userText = firstRequest ? `Plan my wardrobe for ${trip.destination}, ${trip.startDate} through ${trip.endDate}. Itinerary: ${trip.itinerary}` : draft.trim();
    if (!userText) return;
    await submitTravelRequest(userText, firstRequest, true, crypto.randomUUID());
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }
  const input = "mt-2 w-full rounded-2xl border border-[#704154]/20 bg-[#fffdf9] px-4 py-3.5 text-[#3d2b32] outline-none placeholder:text-[#8d7c81] focus:border-[#704154]/55 focus:shadow-[0_0_0_3px_rgba(112,65,84,0.08)]";

  async function rename(id: string, title: string) {
    const response = await fetch("/api/packing/conversations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title }) });
    const body = await response.json(); if (!response.ok) throw new Error(body.error);
    setArchived((current) => current.map((item) => item.id === id ? { ...item, title: body.title } : item));
  }
  async function remove(id: string) { const response = await fetch(`/api/packing/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok) throw new Error("The journey could not be deleted."); setArchived((current) => current.filter((item) => item.id !== id)); }

  return <>
    <section className="relative isolate min-h-[20rem] overflow-hidden rounded-[1.5rem] border border-[#c6a46e]/25 bg-[#241f1d] bg-cover bg-center shadow-[0_18px_50px_rgba(40,29,31,0.12)] sm:min-h-[34rem] sm:rounded-[2.25rem]" style={{ backgroundImage: `linear-gradient(90deg, rgba(24,20,19,.9), rgba(24,20,19,.25)), url('${city[1]}')` }}>
      <div className="absolute inset-3 border border-white/20 sm:inset-7" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[20rem] max-w-3xl flex-col justify-end px-5 pb-7 pt-16 text-white sm:min-h-[34rem] sm:px-14 sm:pb-14">
        <p className="text-[.62rem] uppercase tracking-[.36em] text-[#e0c49a]">Travel wardrobe · {city[0]}</p><h1 className="mt-3 font-serif text-[3.2rem] font-light leading-none text-[#fffaf0] sm:text-8xl">Travel</h1>
        <p className="mt-4 max-w-2xl font-serif text-lg italic leading-6 text-white/80 sm:text-2xl">A considered wardrobe for every place the journey takes you.</p>
      </div>
    </section>

    <section className="paper-panel mx-auto mt-7 max-w-5xl overflow-hidden rounded-[1.5rem] sm:mt-12 sm:rounded-[2rem]">
      {messages.length > 0 && <div className="border-b border-[#a07c45]/20">{messages.map((message, index) => message.role === "user" ?
        <article key={index} className="border-b border-[#173d31]/[.06] px-4 py-5 sm:px-8"><div className="ml-auto max-w-[90%] rounded-[1.25rem] bg-[#eee3e4] px-4 py-3 text-[#3d2b32] sm:max-w-[80%]"><p className="mb-1 text-[.62rem] uppercase tracking-[.16em] text-[#8b6570]">You</p><MessageText content={message.content} /></div></article> :
        <article key={index} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-[#173d31]/[.06] bg-[#fffdf9] px-4 py-5 text-[#3d4541] sm:grid-cols-[2.5rem_1fr] sm:px-8"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#a07c45]/45 font-serif text-[#704154]">C</span><div className="min-w-0"><p className="mb-2 text-[.62rem] uppercase tracking-[.18em] text-[#8a6f43]">Curated</p><MessageText content={message.content} /></div></article>)}
        {isSending && <div className="grid grid-cols-[2rem_1fr] gap-3 bg-[#fffdf9] px-4 py-5 text-sm text-[#805844] sm:px-8"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#a07c45]/45 font-serif text-[#704154]">C</span><p className="pt-1.5">{status}</p></div>}<div ref={endRef} /></div>}

      <form onSubmit={send} className="p-5 sm:p-8">
        <p className="text-[.68rem] uppercase tracking-[.26em] text-[#8a6f43]">Private travel conversation</p><h2 className="mt-2 font-serif text-3xl text-[#173d31] sm:text-4xl">{messages.length ? "Continue your journey" : "Where shall we go?"}</h2>
        {!messages.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-[#5d4d52] sm:col-span-2">Destination<input className={input} value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} placeholder="Portland, Maine" required /></label>
          <label className="block text-sm text-[#5d4d52]">Departure<input className={input} type="date" value={trip.startDate} onChange={(e) => setTrip({ ...trip, startDate: e.target.value })} required /></label>
          <label className="block text-sm text-[#5d4d52]">Return<input className={input} type="date" value={trip.endDate} onChange={(e) => setTrip({ ...trip, endDate: e.target.value })} required /></label>
          <label className="block text-sm text-[#5d4d52] sm:col-span-2">Itinerary<textarea className={`${input} min-h-[8rem]`} value={trip.itinerary} onChange={(e) => setTrip({ ...trip, itinerary: e.target.value })} placeholder="Campfire, casual drinks, shopping, outdoor beer garden, cruise…" required /></label>
          <div onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={(e) => e.preventDefault()} onDrop={drop} className={`rounded-2xl border border-dashed p-4 text-center sm:col-span-2 ${dragging ? "border-[#704154] bg-[#f8eef0]" : "border-[#704154]/20 bg-[#fffdf9]"}`}><p className="text-sm text-[#5d4d52]">Drop an itinerary file here, or <label className="cursor-pointer underline underline-offset-4">choose a file<input className="sr-only" type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.rtf" onChange={(e) => void importItinerary(e.target.files?.[0])} /></label></p>{fileName && <p className="mt-2 text-xs text-[#6c4e57]">{fileName}</p>}{fileStatus && <p className="mt-1 text-xs text-[#805844]">{fileStatus}</p>}</div>
        </div> : <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={submitOnEnter} className={`${input} mt-5 min-h-[7rem]`} placeholder="Ask a follow-up about an event, weather change, or packing choice…" />}
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p aria-live="polite" className="text-xs text-[#805844]">{!isSending ? status : ""}</p>{retryRequest && !isSending && <button type="button" onClick={() => void submitTravelRequest(retryRequest.userText, retryRequest.firstRequest, false, retryRequest.clientRequestId)} className="mt-3 text-xs text-[#704154] underline underline-offset-4">Try this request again</button>}</div><button className="brass-button min-w-[10rem] disabled:opacity-60" disabled={isSending} type="submit">{isSending ? "Curating…" : messages.length ? "Send" : "Plan my wardrobe"}</button></div>
        {messages.length > 0 && <p className="mt-3 text-[.68rem] text-[#8d7c81]">Press Enter to send or Shift + Enter for a new line. This conversation remains active for four hours.</p>}
      </form>

      <div className="border-t border-[#a07c45]/20 bg-white/35 p-5 sm:p-8"><p className="text-[.68rem] uppercase tracking-[.26em] text-[#8a6f43]">Travel archive</p><h2 className="mt-2 font-serif text-2xl text-[#173d31]">Past journeys</h2><p className="mt-2 text-sm text-[#68736d]">After four hours, each private conversation is filed here.</p>
        {archiveStatus && <p className="mt-5 text-sm text-[#805844]">{archiveStatus}</p>}{!archiveStatus && !archived.length && <p className="mt-5 text-sm italic text-[#7d6d72]">No archived journeys yet.</p>}
        <div className="mt-5 space-y-3">{archived.map((conversation) => <Archive key={conversation.id} conversation={conversation} onRename={rename} onDelete={remove} />)}</div>
      </div>
    </section>
  </>;
}

function Archive({ conversation, onRename, onDelete }: { conversation: SavedConversation; onRename: (id: string, title: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false); const [title, setTitle] = useState(conversation.title); const [status, setStatus] = useState("");
  async function save() { try { await onRename(conversation.id, title); setEditing(false); setStatus(""); } catch { setStatus("The name could not be saved."); } }
  async function remove() { if (!window.confirm("Permanently delete this travel conversation?")) return; try { await onDelete(conversation.id); } catch { setStatus("The journey could not be deleted."); } }
  return <details className="rounded-2xl border border-[#704154]/12 bg-[#fffdf9] px-4 py-3 open:pb-5"><summary className="cursor-pointer list-none"><div className="flex justify-between gap-4"><div className="min-w-0"><p className="truncate font-serif text-lg text-[#54263a]">{conversation.title}</p><p className="mt-1 text-[.68rem] uppercase tracking-[.14em] text-[#8a6f43]">{moment(conversation.createdAt)}</p></div><span>⌄</span></div></summary><div className="mt-4 space-y-3 border-t border-[#a07c45]/15 pt-4">{conversation.messages.map((message) => <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[90%] rounded-xl bg-[#eee3e4] px-4 py-3" : "rounded-xl bg-white px-4 py-3"}><p className="mb-1 text-[.58rem] uppercase tracking-[.16em] text-[#8b6570]">{message.role === "user" ? "You" : "Curated"}</p><MessageText content={message.content} /></div>)}
    {editing ? <div className="flex gap-2"><input value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-10 flex-1 rounded-xl border bg-white px-3 text-sm" /><button type="button" onClick={() => void save()} className="rounded-full bg-[#704154] px-4 text-xs text-white">Save</button></div> : <div className="flex gap-4"><button type="button" onClick={() => setEditing(true)} className="text-xs text-[#704154] underline">Rename</button><button type="button" onClick={() => void remove()} className="text-xs text-[#984b43] underline">Delete permanently</button></div>}{status && <p className="text-xs text-[#805844]">{status}</p>}</div></details>;
}
