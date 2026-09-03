"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CORE_STYLE_QUESTION_IDS,
  STYLE_SURVEY_CHAPTERS,
  STYLE_SURVEY_QUESTIONS,
  type SurveyQuestion,
} from "@/lib/style-profile/survey-schema";
import type { StyleSurveyAnswerValue, StyleSurveyDTO } from "@/types/style-profile";

const choiceClass = "flex min-h-12 cursor-pointer items-start gap-3 border border-[#a07c45]/20 bg-[#fffdf8]/85 px-4 py-3 text-left text-sm leading-5 text-[#4f4548] transition hover:border-[#8b6532]/55 has-[:checked]:border-[#704154] has-[:checked]:bg-[#f2e5e6]";

function answerSummary(value: StyleSurveyAnswerValue | undefined, question: SurveyQuestion) {
  if (value == null) return "Not answered";
  if (typeof value === "string") return question.options?.find((option) => option.id === value)?.label ?? value;
  if (Array.isArray(value)) return value.map((id) => question.options?.find((option) => option.id === id)?.label ?? id).join(", ");
  return Object.entries(value).map(([row, answer]) => {
    const rowLabel = question.rows?.find((entry) => entry.id === row)?.label ?? row;
    const valueLabel = question.options?.find((entry) => entry.id === answer)?.label ?? String(answer);
    return `${rowLabel}: ${valueLabel}`;
  }).join("; ");
}

function TextQuestionEditor({
  question,
  value,
  disabled,
  onSave,
}: {
  question: SurveyQuestion;
  value?: StyleSurveyAnswerValue;
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const savedValue = typeof value === "string" ? value : "";
  const [draft, setDraft] = useState(savedValue);

  const maxLength = question.maxLength ?? 2000;
  const changed = draft !== savedValue;

  return <div className="mt-4">
    <textarea
      disabled={disabled}
      maxLength={maxLength}
      rows={6}
      className="w-full border border-[#a07c45]/25 bg-white/80 px-4 py-3 text-base text-[#302a2b] outline-none focus:border-[#704154]"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#74696b]">
      <span>{draft.length.toLocaleString()} of {maxLength.toLocaleString()} characters</span>
      <button
        type="button"
        className="min-h-10 border border-[#a07c45]/35 px-4 py-2 text-[#173d31] disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled || !changed}
        onClick={() => onSave(draft)}
      >
        Save this note
      </button>
    </div>
  </div>;
}

function QuestionEditor({
  question,
  value,
  disabled,
  onChange,
}: {
  question: SurveyQuestion;
  value?: StyleSurveyAnswerValue;
  disabled: boolean;
  onChange: (value: StyleSurveyAnswerValue) => void;
}) {
  if (question.kind === "text") {
    return <TextQuestionEditor question={question} value={value} disabled={disabled} onSave={onChange} />;
  }
  if (question.kind === "matrix") {
    const matrix = value && !Array.isArray(value) && typeof value === "object" ? value : {};
    return <div className="mt-4 space-y-4">
      {question.rows?.map((row) => <fieldset key={row.id} className="border-t border-[#a07c45]/15 pt-3">
        <legend className="pr-3 text-sm font-medium text-[#3f3437]">{row.label}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {question.options?.map((option) => <label key={option.id} className={choiceClass}>
            <input disabled={disabled} type="radio" name={`${question.id}-${row.id}`} checked={matrix[row.id] === option.id} onChange={() => onChange({ ...matrix, [row.id]: option.id })} />
            <span className="capitalize">{option.label}</span>
          </label>)}
        </div>
      </fieldset>)}
    </div>;
  }
  if (question.kind === "multi" || question.kind === "ranked") {
    const selected = Array.isArray(value) ? value : [];
    return <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {question.options?.map((option) => {
        const order = selected.indexOf(option.id);
        return <label key={option.id} className={choiceClass}>
          <input disabled={disabled} type="checkbox" checked={order >= 0} onChange={() => {
            if (order >= 0) onChange(selected.filter((id) => id !== option.id));
            else if (!question.max || selected.length < question.max) onChange([...selected, option.id]);
          }} />
          <span className="flex-1 capitalize">{option.label}</span>
          {question.kind === "ranked" && order >= 0 && order < (question.rankMax ?? 0) ? <span className="text-xs uppercase tracking-[0.16em] text-[#8b6532]">#{order + 1}</span> : null}
        </label>;
      })}
    </div>;
  }
  return <div className="mt-4 grid gap-2 sm:grid-cols-2">
    {question.options?.map((option) => <label key={option.id} className={choiceClass}>
      <input disabled={disabled} type="radio" name={question.id} checked={value === option.id} onChange={() => onChange(option.id)} />
      <span>{option.label}</span>
    </label>)}
  </div>;
}

export function StyleNotes() {
  const [survey, setSurvey] = useState<StyleSurveyDTO | null>(null);
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null);
  const [message, setMessage] = useState("Opening your Style Notes…");
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/style-profile", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSurvey(body);
      setMessage("");
    }).catch(() => setMessage("Your Style Notes will be available after the private Profile migration is applied."));
  }, []);

  const remainingCore = survey ? CORE_STYLE_QUESTION_IDS.length - survey.completedCoreQuestionIds.length : CORE_STYLE_QUESTION_IDS.length;
  const approximateMinutes = Math.max(1, Math.ceil(remainingCore * 0.4));
  const answeredQuestions = useMemo(() => survey ? STYLE_SURVEY_QUESTIONS.filter((q) => survey.answers[q.id] != null) : [], [survey]);

  async function save(questionId: string, value: StyleSurveyAnswerValue, skipped = false) {
    if (!survey || savingQuestion) return;
    const previous = survey;
    setFailedQuestion(null);
    setSavingQuestion(questionId);
    setMessage("Saving privately…");
    setSurvey({ ...survey, answers: skipped ? Object.fromEntries(Object.entries(survey.answers).filter(([id]) => id !== questionId)) : { ...survey.answers, [questionId]: value } });
    try {
      const response = await fetch("/api/style-profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, value, skipped }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSurvey(body);
      setMessage("Saved. Your answer remains yours to change.");
    } catch {
      setSurvey(previous);
      setFailedQuestion(questionId);
      setMessage("This answer was not saved. Your previous answer is unchanged.");
    } finally {
      setSavingQuestion(null);
    }
  }

  async function setLearning(enabled: boolean) {
    if (!survey || savingQuestion) return;
    const previous = survey;
    setSavingQuestion("learning");
    setMessage("Updating your private learning preference…");
    setSurvey({ ...survey, learningEnabled: enabled });
    try {
      const response = await fetch("/api/style-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningEnabled: enabled }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSurvey(body);
      setMessage("Your learning preference has been saved.");
    } catch {
      setSurvey(previous);
      setMessage("That preference was not saved. Your previous setting remains in place.");
    } finally {
      setSavingQuestion(null);
    }
  }

  async function reset() {
    if (!survey || savingQuestion) return;
    if (!window.confirm("Clear all answers in Your Style Notes? Historical recommendations will remain unchanged.")) return;
    setSavingQuestion("reset");
    setMessage("Clearing your Style Notes…");
    try {
      const response = await fetch("/api/style-profile", { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSurvey(body);
      setOpenChapter(null);
      setMessage("Your Style Notes have been cleared.");
    } catch {
      setMessage("Your Style Notes were not cleared. Nothing has been removed.");
    } finally {
      setSavingQuestion(null);
    }
  }

  function exportProfile() {
    if (!survey) return;
    const blob = new Blob([JSON.stringify({ schemaVersion: survey.schemaVersion, status: survey.status, answers: survey.answers, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "curated-style-notes.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  return <section className="mt-10 space-y-6" aria-labelledby="style-notes-title">
    <div className="salon-panel rounded-[1.5rem] p-5 text-white sm:rounded-[2rem] sm:p-9">
      <p className="text-xs uppercase tracking-[0.25em] text-[#d9bd8b]">The Study</p>
      <h2 id="style-notes-title" className="mt-3 font-serif text-4xl">Your Style Notes</h2>
      <p className="mt-3 max-w-2xl leading-7 text-white/78">A short, private consultation about how you like to dress. Every answer remains yours to edit or remove. These notes stay separate from what Curated may notice later.</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.18em]">{survey?.status.replaceAll("_", " ") ?? "Opening"}</span>
        {survey && remainingCore > 0 ? <span className="text-sm text-white/70">About {approximateMinutes} minutes remain in the core consultation.</span> : null}
      </div>
    </div>

    {survey ? <div className="paper-panel rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-8">
      {STYLE_SURVEY_CHAPTERS.map((chapter) => {
        const chapterQuestions = STYLE_SURVEY_QUESTIONS.filter((q) => q.chapter === chapter.id);
        const answered = chapterQuestions.filter((q) => survey.answers[q.id] != null).length;
        const isOpen = openChapter === chapter.id;
        return <section key={chapter.id} className="border-b border-[#a07c45]/20 py-4 last:border-b-0">
          <button type="button" className="flex w-full items-center justify-between gap-4 text-left" aria-expanded={isOpen} onClick={() => setOpenChapter(isOpen ? null : chapter.id)}>
            <span><span className="text-xs uppercase tracking-[0.2em] text-[#9a6b72]">Chapter {chapter.id} of 4</span><span className="mt-1 block font-serif text-2xl text-[#173d31]">{chapter.title}</span><span className="mt-1 block text-sm text-[#756a6c]">{chapter.deck}</span></span>
            <span className="shrink-0 text-sm text-[#8b6532]">{answered}/{chapterQuestions.length} · {isOpen ? "Close" : "Open"}</span>
          </button>
          {isOpen ? <div className="mt-6 space-y-8">
            {chapterQuestions.map((question) => <fieldset key={question.id} className="rounded-[1.25rem] border border-[#a07c45]/18 bg-[#f7f0e6]/45 p-4 sm:p-6">
              <legend className="px-2 text-xs uppercase tracking-[0.18em] text-[#8d6570]">{question.core ? "Core note" : "Optional refinement"}</legend>
              <h3 className="font-serif text-2xl text-[#3d2b32]">{question.title}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f6466]">{question.prompt}</p>
              <QuestionEditor question={question} value={survey.answers[question.id]} disabled={savingQuestion !== null} onChange={(value) => save(question.id, value)} />
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                {!question.core ? <button type="button" className="underline underline-offset-4" disabled={savingQuestion !== null} onClick={() => save(question.id, "", true)}>Skip for now</button> : null}
                {survey.answers[question.id] != null ? <button type="button" className="underline underline-offset-4" disabled={savingQuestion !== null} onClick={() => save(question.id, "", true)}>Clear</button> : null}
                {savingQuestion === question.id ? <span aria-live="polite">Saving…</span> : null}
                {failedQuestion === question.id ? <button type="button" className="text-[#704154] underline" onClick={() => save(question.id, survey.answers[question.id] ?? "")}>Try again</button> : null}
              </div>
            </fieldset>)}
          </div> : null}
        </section>;
      })}
    </div> : null}

    {survey && answeredQuestions.length ? <section className="paper-panel rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-8">
      <p className="text-xs uppercase tracking-[0.22em] text-[#9a6b72]">Review what you shared</p>
      <h2 className="mt-2 font-serif text-3xl text-[#173d31]">{remainingCore === 0 ? "A considered beginning." : "Your notes so far"}</h2>
      <p className="mt-2 text-sm leading-6 text-[#74696b]">{remainingCore === 0 ? "Curated has enough to begin with care. These notes are used only when relevant, and current instructions always come first." : `${remainingCore} core ${remainingCore === 1 ? "note remains" : "notes remain"}. You may continue whenever it is useful.`}</p>
      <div className="mt-6 divide-y divide-[#a07c45]/15">
        {answeredQuestions.map((question) => <article key={question.id} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-[#8b6532]">You told us</p><h3 className="mt-1 font-medium text-[#3d2b32]">{question.title}</h3></div><button type="button" className="text-sm underline underline-offset-4" onClick={() => setOpenChapter(question.chapter)}>Edit</button></div>
          <p className="mt-2 text-sm leading-6 text-[#665b5e]">{answerSummary(survey.answers[question.id], question)}</p>
          <p className="mt-2 text-xs text-[#8a7e80]">Updated {survey.updatedAt ? new Date(survey.updatedAt).toLocaleDateString() : "today"} · Used by {question.id === "q23_budget" ? "Personal Shopper only" : "relevant Curated services"}</p>
        </article>)}
      </div>
    </section> : null}

    {survey ? <section className="grid gap-5 lg:grid-cols-2">
      <div className="paper-panel rounded-[1.5rem] p-5 sm:p-7"><h2 className="font-serif text-3xl text-[#173d31]">What Curated has noticed</h2><p className="mt-2 text-sm leading-6 text-[#74696b]">Observations remain separate from your answers. Nothing inferred can replace what you told us.</p>{survey.noticed.length ? <div className="mt-5 space-y-3">{survey.noticed.map((note) => <div key={note.id} className="border-t border-[#a07c45]/15 pt-3"><p className="font-medium">{note.subject}: {note.value}</p><p className="mt-1 text-sm text-[#74696b]">{note.evidenceSummary}</p><p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9a6b72]">{note.confidence.replace("_", " ")} pattern · Curated noticed</p></div>)}</div> : <p className="mt-5 text-sm italic text-[#74696b]">Nothing has been proposed. Curated will not invent a pattern from silence.</p>}</div>
      <div className="paper-panel rounded-[1.5rem] p-5 sm:p-7"><h2 className="font-serif text-3xl text-[#173d31]">Privacy and learning</h2><label className="mt-5 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={survey.learningEnabled} disabled={savingQuestion !== null} onChange={(event) => setLearning(event.target.checked)} /><span><strong className="block text-[#3d2b32]">Allow Curated to notice repeated choices</strong>Off by default. Observations remain reviewable and never overwrite explicit answers.</span></label><div className="mt-6 flex flex-wrap gap-4"><button type="button" onClick={exportProfile} className="border border-[#a07c45]/35 px-4 py-3 text-sm">Export Style Notes</button><button type="button" disabled={savingQuestion !== null} onClick={reset} className="px-4 py-3 text-sm text-[#704154] underline underline-offset-4">{savingQuestion === "reset" ? "Clearing…" : "Clear Style Notes"}</button></div></div>
    </section> : null}
    <p aria-live="polite" className="min-h-6 text-sm text-[#74696b]">{message}</p>
  </section>;
}
