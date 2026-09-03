"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CameraCapture } from "@/components/closet/CameraCapture";
import { prepareWardrobeImage } from "@/lib/media/prepare-wardrobe-image";
import { stylistChatEndpoint } from "@/lib/recommendations/stylist-chat";
import {
  followUpSubmissionReducer,
  formatRegeneratedOptionsForChat,
  initialFollowUpSubmissionState,
  shouldSubmitFollowUpOnKey,
  suggestedFollowUpAction,
  type FollowUpMessage,
  type RegeneratedChatOption,
} from "@/lib/recommendations/follow-up-state";
import styles from "./dress-my-day.module.css";

const STORAGE_PREFIX = "curated:recommendation-follow-up:";

function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function RecommendationFollowUp({
  recommendationId,
  eventDate,
  onRegenerate,
}: {
  recommendationId: string;
  eventDate: string;
  onRegenerate?: () => Promise<RegeneratedChatOption[] | null> | RegeneratedChatOption[] | null;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [submission, dispatchSubmission] = useReducer(
    followUpSubmissionReducer,
    initialFollowUpSubmissionState,
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inFlightRef = useRef(false);
  const isSending = submission.phase === "loading";
  const question = submission.draft;
  const messages = submission.messages;
  const status = submission.notice;
  const storageKey = `${STORAGE_PREFIX}${eventDate}:${recommendationId}`;
  const previewUrl = useMemo(() => photo ? URL.createObjectURL(photo) : "", [photo]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentDate = todayKey();
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        const match = key?.match(/^curated:recommendation-follow-up:(\d{4}-\d{2}-\d{2}):/);
        if (key && match && match[1] < currentDate) window.localStorage.removeItem(key);
      }
      try {
        const saved = window.localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          dispatchSubmission({ type: "hydrate", messages: parsed
            .filter((message): message is FollowUpMessage =>
              Boolean(message) &&
              (message.role === "user" || message.role === "assistant") &&
              typeof message.content === "string" &&
              Boolean(message.content.trim()),
            )
            .map((message) => ({ ...message, content: message.content.trim() })) });
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
      setHasLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoaded) return;
    if (messages.length) window.localStorage.setItem(storageKey, JSON.stringify(messages));
    else window.localStorage.removeItem(storageKey);
  }, [hasLoaded, messages, storageKey]);

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
      dispatchSubmission({ type: "notice", notice: "Preparing your fit-check photo privately…" });
    try {
      setPhoto(await prepareWardrobeImage(file));
      dispatchSubmission({ type: "notice", notice: "Photo ready for Curated’s fit check." });
    } catch {
      setPhoto(null);
      dispatchSubmission({ type: "notice", notice: "This photo could not be prepared. Please choose another image." });
    }
  }

  async function sendQuestion(submittedQuestion: string) {
    const text = submittedQuestion.trim();
    if ((!text && !photo) || inFlightRef.current) return;
    const requestText = text || "Please perform a fit check on this outfit photo.";
    inFlightRef.current = true;
    dispatchSubmission({
      type: "submit",
      text: requestText,
      notice: photo ? "Curated is reviewing your question and fit…" : "Curated is considering your follow-up…",
    });
    const data = new FormData();
    data.set("question", requestText);
    data.set("history", JSON.stringify(messages.slice(-12)));
    if (photo) data.set("photo", photo);
    try {
      const response = await fetch(stylistChatEndpoint(recommendationId), { method: "POST", body: data });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        dispatchSubmission({
          type: "fail",
          notice: body.error || "Curated could not review this follow-up. Your question has been kept.",
        });
        return;
      }
      let answer = typeof body.answer === "string" ? body.answer.trim() : "";
      if (!answer) {
        dispatchSubmission({
          type: "fail",
          notice: "Curated did not return a visible reply. Your question has been kept; please retry.",
        });
        return;
      }
      let nextStatus = body.fitCheckSaved
        ? "Fit-check photo saved for Wardrobe History."
        : body.pairPreferenceSaved
          ? "Your styling preference was saved for future recommendations."
          : "";
      if (body.shouldRegenerate && onRegenerate) {
        dispatchSubmission({ type: "notice", notice: "Curated heard the correction and is composing new considered looks…" });
        const regenerated = await onRegenerate();
        if (regenerated?.length) answer = formatRegeneratedOptionsForChat(regenerated);
        nextStatus = regenerated?.length
          ? `Your correction has been applied to ${regenerated.length} new outfit ${regenerated.length === 1 ? "option" : "options"}.`
          : "Your correction was saved, but the new looks could not be completed. Please try again.";
      }
      dispatchSubmission({ type: "succeed", answer, notice: nextStatus });
      setPhoto(null);
    } catch {
      dispatchSubmission({
        type: "fail",
        notice: "The connection was interrupted. Your question has been kept; please try again.",
      });
    } finally {
      inFlightRef.current = false;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() && !photo) {
      dispatchSubmission({ type: "notice", notice: "Add a question or an outfit photo first." });
      return;
    }
    await sendQuestion(question);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!shouldSubmitFollowUpOnKey({
      key: event.key,
      shiftKey: event.shiftKey,
      isComposing: event.nativeEvent.isComposing,
    })) return;
    event.preventDefault();
    if (!isSending) formRef.current?.requestSubmit();
  }

  function clearConversation() {
    dispatchSubmission({ type: "clear" });
    window.localStorage.removeItem(storageKey);
  }

  return (
    <details id={`change-${recommendationId}`} className={styles.correction}>
      <summary>Considered correction <span className="sr-only">for this recommendation</span></summary>
      <div className={styles.correctionBody}>
      <p className="max-w-[58ch] text-sm leading-6 text-[#697064]">What would you like to change? Corrections apply to today unless you ask Curated to remember them.</p>
      <div className="mt-3 grid gap-1 sm:grid-cols-2" aria-label="Common corrections">
        {["An item is unavailable", "Too formal / too relaxed", "Not comfortable enough", "Not the mood today", "I want to replace one piece", "Something else"].map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={isSending}
            className="min-h-11 border-b border-[#9a7845]/20 bg-transparent py-2 text-left text-sm text-[#24372f]"
            onClick={() => {
              if (suggestedFollowUpAction(choice) === "focus-custom") {
                dispatchSubmission({ type: "draft", value: "" });
                inputRef.current?.focus();
                return;
              }
              void sendQuestion(choice);
            }}
          >{choice} <span aria-hidden="true" className="float-right text-[#9a7845]">→</span></button>
        ))}
      </div>
      {!messages.length && !isSending && (
        <p className="mt-4 rounded-xl border border-[#173d31]/10 bg-white/60 px-4 py-3 text-xs leading-5 text-[#68736d]">
          Your conversation will appear here after you ask Curated a question.
        </p>
      )}
      {messages.length > 0 && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-5 bg-[#efe4e5] px-4 py-3" : "mr-5 border-l-2 border-[#a07c45] bg-white/75 px-4 py-3"}>
              <p className="text-[0.6rem] uppercase tracking-[0.16em] text-[#8a6f43]">{message.role === "user" ? "You" : "Curated"}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#35443e]">{message.content}</p>
            </div>
          ))}
          <button type="button" onClick={clearConversation} className="text-xs underline underline-offset-4 text-[#765d63]">Clear this conversation</button>
        </div>
      )}
      {isSending && (
        <div role="status" aria-live="polite" className="mt-3 mr-5 animate-pulse border-l-2 border-[#a07c45] bg-white/75 px-4 py-3 text-sm text-[#68736d]">
          Curated is composing a concise reply…
        </div>
      )}
      <form ref={formRef} onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-xs font-medium text-[#173d31]" htmlFor={`follow-up-${recommendationId}`}>Your question</label>
        <textarea
          id={`follow-up-${recommendationId}`}
          ref={inputRef}
          value={question}
          onChange={(event) => dispatchSubmission({ type: "draft", value: event.target.value })}
          onKeyDown={submitOnEnter}
          rows={3}
          maxLength={3000}
          placeholder="Does this work for the dress code? Press Enter to ask."
          className={styles.field}
        />
        <div className="flex flex-wrap gap-2">
          <CameraCapture
            onCapture={(file) => void choosePhoto(file)}
            disabled={isSending}
            label="Take fit-check photo"
            className="min-h-11 border border-[#173d31]/20 bg-white px-3 py-2 text-xs text-[#173d31]"
          />
          <label className="flex min-h-11 cursor-pointer items-center border border-[#173d31]/20 bg-white px-3 py-2 text-xs text-[#173d31]">
            Choose photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="sr-only"
              disabled={isSending}
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void choosePhoto(selected);
              }}
            />
          </label>
        </div>
        {photo && (
          <div className="flex items-center gap-3 rounded-xl border border-[#173d31]/10 bg-white/70 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Fit-check preview" className="h-20 w-16 rounded-lg bg-white object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[#173d31]">{photo.name}</p>
              <button type="button" onClick={() => setPhoto(null)} className="mt-2 text-xs underline underline-offset-4">Remove photo</button>
            </div>
          </div>
        )}
        <button type="submit" disabled={isSending} className={styles.primary}>
          {isSending ? "Curated is reviewing…" : "Ask Curated"}
        </button>
      </form>
      <p className="mt-2 text-[0.65rem] leading-4 text-[#887a75]">Press Enter or Return to send; Shift + Enter adds a new line. This conversation is kept on this device through the selected day, then cleared automatically.</p>
      {status && <p role="status" aria-live="polite" className="mt-3 text-xs leading-5 text-[#805844]">{status}</p>}
      {submission.phase === "error" && !isSending && (
        <button type="button" onClick={() => void sendQuestion(question)} className="mt-3 min-h-11 rounded-full border border-[#8b4655]/25 bg-white px-4 py-2 text-xs font-medium text-[#8b4655]">
          Retry this message
        </button>
      )}
      </div>
    </details>
  );
}
