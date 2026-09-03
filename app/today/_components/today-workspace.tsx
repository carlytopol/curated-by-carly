"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { DailyEvent, OutfitRecommendation } from "@/types/daily-event";
import { GoogleCalendarPanel } from "./google-calendar-panel";
import { AppleCalendarPanel } from "./apple-calendar-panel";
import { RecommendationFollowUp } from "./recommendation-follow-up";
import { AgendaBrief } from "./agenda-brief";
import { suggestedAvailabilityAfterWear, type WearAvailabilityChoice } from "@/lib/recommendations/wear-review";
import {
  hasUsableRecommendationOptions,
  initialPlanSubmissionState,
  buildDailyEventPayload,
  planSubmissionReducer,
  recoverableOptionsFromEvents,
  shouldSubmitPlanOnEnter,
  type PlanDraft,
} from "@/lib/dress-my-day/submission";
import styles from "./dress-my-day.module.css";

// The governed engine keeps composing and persists the finished set even after
// the browser stops waiting. This bound only decides how long we watch the
// request — never whether the edit succeeded.
const RECOMMENDATION_REQUEST_TIMEOUT_MS = 60_000;

const quotes = [
  {
    text: "Elegance is not standing out, but being remembered.",
    author: "Giorgio Armani",
  },
  {
    text: "Style is a way to say who you are without having to speak.",
    author: "Rachel Zoe",
  },
  {
    text: "Simplicity is the keynote of all true elegance.",
    author: "Coco Chanel",
  },
  { text: "Fashion changes, but style endures.", author: "Coco Chanel" },
  {
    text: "Clothes mean nothing until someone lives in them.",
    author: "Marc Jacobs",
  },
];

type Weather = {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};
type PlaceSuggestion = {
  placeId: string;
  text: string;
  name: string;
  secondaryText: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  provider: "google" | "openstreetmap";
};

function weatherDescription(code = 0) {
  if (code >= 95) return "Storms nearby";
  if (code >= 71) return "Snow in the air";
  if (code >= 51) return "Rain is possible";
  if (code >= 45) return "Soft and misty";
  if (code >= 1) return "Partly clouded";
  return "Clear and bright";
}

function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function LinkedOutfitDescription({
  rationale,
  items,
  returnTo,
}: {
  rationale: string;
  items: NonNullable<DailyEvent["recommendation"]>["wardrobeItems"];
  returnTo: string;
}) {
  const nodes: ReactNode[] = [];
  const lowerRationale = rationale.toLowerCase();
  let cursor = 0;
  let linkedCount = 0;

  while (cursor < rationale.length) {
    const next = items
      .map((item) => {
        const garmentName = item.label.includes(" — ") ? item.label.split(" — ").slice(1).join(" — ") : item.label;
        const fullIndex = lowerRationale.indexOf(item.label.toLowerCase(), cursor);
        const garmentIndex = lowerRationale.indexOf(garmentName.toLowerCase(), cursor);
        return fullIndex >= 0
          ? { item, index: fullIndex, matchLength: item.label.length }
          : { item, index: garmentIndex, matchLength: garmentName.length };
      })
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.index - b.index || b.item.label.length - a.item.label.length)[0];
    if (!next) break;
    if (next.index > cursor) nodes.push(rationale.slice(cursor, next.index));
    nodes.push(
      <Link
        key={`${next.item.id}-${next.index}`}
        href={`/closet/${encodeURIComponent(next.item.id)}?returnTo=${encodeURIComponent(returnTo)}`}
      >
        {next.item.label}
      </Link>,
    );
    linkedCount += 1;
    cursor = next.index + next.matchLength;
  }
  nodes.push(rationale.slice(cursor));

  if (!linkedCount && items.length) {
    nodes.push(" The complete look includes ");
    items.forEach((item, index) => {
      if (index > 0) nodes.push(index === items.length - 1 ? " and " : ", ");
      nodes.push(
        <Link
          key={item.id}
          href={`/closet/${encodeURIComponent(item.id)}?returnTo=${encodeURIComponent(returnTo)}`}
        >
          {item.label}
        </Link>,
      );
    });
    nodes.push(".");
  }
  return <>{nodes}</>;
}

export function TodayWorkspace({ embedded = false }: { embedded?: boolean }) {
  const todayKey = localDateKey();
  const planningLimit = new Date();
  planningLimit.setFullYear(planningLimit.getFullYear() + 1);
  const maxDateKey = localDateKey(planningLimit);
  const [dateKey, setDateKey] = useState(todayKey);
  const date = new Date(`${dateKey}T12:00:00`);
  const isToday = dateKey === todayKey;
  const selectedDateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const quote = quotes[Math.floor(date.getTime() / 86400000) % quotes.length];
  const [events, setEvents] = useState<DailyEvent[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherStatus, setWeatherStatus] = useState(
    "Finding today’s weather for your location…",
  );
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [notes, setNotes] = useState("");
  const [intention, setIntention] = useState("At ease");
  const [scheduleStatus, setScheduleStatus] = useState("");
  const [submission, dispatchSubmission] = useReducer(planSubmissionReducer, initialPlanSubmissionState);
  const [recommendingEventId, setRecommendingEventId] = useState<string | null>(null);
  const [recommendationErrorByEvent, setRecommendationErrorByEvent] = useState<Record<string, string>>({});
  const [activeOptionByEvent, setActiveOptionByEvent] = useState<Record<string, number>>({});
  const [markingWornId, setMarkingWornId] = useState<string | null>(null);
  const [wearReview, setWearReview] = useState<null | {
    eventId: string;
    recommendationId: string;
    summary: string;
    items: Array<{ id: string; label: string; status: WearAvailabilityChoice }>;
  }>(null);
  const [wornFeedback, setWornFeedback] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    const option = Number(params.get("option"));
    if (!eventId || !Number.isInteger(option) || option < 0) return;
    window.setTimeout(() => {
      setActiveOptionByEvent((current) => ({ ...current, [eventId]: option }));
      document.getElementById(`event-${eventId}`)?.scrollIntoView({ block: "start" });
    }, 0);
  }, [events.length]);
  const [manualLocation, setManualLocation] = useState("");
  const [weatherPlaceSuggestions, setWeatherPlaceSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [placeBias, setPlaceBias] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [placeBiasLabel, setPlaceBiasLabel] = useState("");
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const placeSessionToken = useRef(crypto.randomUUID());
  const selectedLocation = useRef("");
  const selectedWeatherLocation = useRef("");
  const scheduleFormRef = useRef<HTMLFormElement>(null);
  const wearReviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const wearReviewReturnFocusRef = useRef<HTMLElement | null>(null);
  const isSubmittingPlan = submission.phase === "saving" || submission.phase === "generating";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const daySummary = events.length
    ? events
        .slice(0, 2)
        .map((event) => `${event.startsAt ? new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " " : ""}${event.title}`)
        .join(events.length > 1 ? ", then " : "") + (events.length > 2 ? `, with ${events.length - 2} more ${events.length - 2 === 1 ? "plan" : "plans"}.` : ".")
    : "Tell me the shape of your day, and I’ll compose one considered answer.";

  useEffect(() => {
    if (!wearReview) return;
    wearReviewReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wearReviewHeadingRef.current?.focus();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setWearReview(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      wearReviewReturnFocusRef.current?.focus();
    };
  }, [wearReview]);

  async function loadEvents() {
    const response = await fetch(`/api/daily-events?date=${dateKey}`);
    if (response.ok) setEvents(await response.json());
  }

  useEffect(() => {
    let current = true;
    fetch(`/api/daily-events?date=${dateKey}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => {
        if (current) setEvents(items);
      });
    return () => {
      current = false;
    };
  }, [dateKey]);

  useEffect(() => {
    const query = location.trim();
    if (query.length < 3 || query === selectedLocation.current) {
      setPlaceSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const parameters = new URLSearchParams({
        input: query,
        sessionToken: placeSessionToken.current,
      });
      if (placeBias) {
        parameters.set("latitude", String(placeBias.latitude));
        parameters.set("longitude", String(placeBias.longitude));
        if (placeBiasLabel && !placeBiasLabel.startsWith("Your ")) parameters.set("locality", placeBiasLabel);
      }
      try {
        const response = await fetch(`/api/places/autocomplete?${parameters}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        setPlaceSuggestions(response.ok ? (body.suggestions ?? []) : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setPlaceSuggestions([]);
      }
    }, 320);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [location, placeBias, placeBiasLabel]);

  useEffect(() => {
    const query = manualLocation.trim();
    if (query.length < 3 || query === selectedWeatherLocation.current) {
      const timer = window.setTimeout(() => setWeatherPlaceSuggestions([]), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const parameters = new URLSearchParams({
        input: query,
        sessionToken: placeSessionToken.current,
      });
      if (placeBias) {
        parameters.set("latitude", String(placeBias.latitude));
        parameters.set("longitude", String(placeBias.longitude));
      }
      try {
        const response = await fetch(`/api/places/autocomplete?${parameters}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        setWeatherPlaceSuggestions(response.ok ? (body.suggestions ?? []) : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setWeatherPlaceSuggestions([]);
      }
    }, 320);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [manualLocation, placeBias]);

  useEffect(() => {
    let active = true;
    async function loadWeather(
      latitude: number,
      longitude: number,
      label = "Your current location",
    ) {
      const response = await fetch(
        `/api/weather?latitude=${latitude}&longitude=${longitude}`,
      );
      if (!active || !response.ok) return false;
      setWeather(await response.json());
      setWeatherStatus(label);
      setPlaceBias({ latitude, longitude });
      setPlaceBiasLabel(label);
      return true;
    }
    async function loadSavedLocation(locationName: string | null) {
      try {
        if (!locationName) throw new Error();
        const locationResponse = await fetch(
          `/api/geocode?q=${encodeURIComponent(locationName)}`,
        );
        const place = await locationResponse.json();
        if (!locationResponse.ok || !active) throw new Error();
        if (
          !(await loadWeather(
            place.latitude,
            place.longitude,
            place.label || locationName,
          ))
        )
          throw new Error();
      } catch {
        if (active)
          setWeatherStatus(
            "Allow location access for automatic local weather, or add a home location in Profile.",
          );
      }
    }
    async function initializeWeather() {
      try {
        const profileResponse = await fetch("/api/profile");
        if (
          !profileResponse.ok ||
          !profileResponse.headers
            .get("content-type")
            ?.includes("application/json")
        ) {
          if (active)
            setWeatherStatus("Sign in to use automatic local weather.");
          return;
        }
        const profile = await profileResponse.json();
        const homeLocation =
          typeof profile.locationName === "string"
            ? profile.locationName
            : null;
        if (!navigator.geolocation) {
          await loadSavedLocation(homeLocation);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => void loadWeather(coords.latitude, coords.longitude),
          () => void loadSavedLocation(homeLocation),
          { enableHighAccuracy: false, maximumAge: 900000, timeout: 10000 },
        );
      } catch {
        if (active) setWeatherStatus("Sign in to use automatic local weather.");
      }
    }
    void initializeWeather();
    return () => {
      active = false;
    };
  }, []);

  function requestWeather() {
    if (!navigator.geolocation)
      return setWeatherStatus("Location is not available in this browser.");
    setWeatherStatus("Finding today’s local weather…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setPlaceBias({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        const response = await fetch(
          `/api/weather?latitude=${coords.latitude}&longitude=${coords.longitude}`,
        );
        if (!response.ok)
          return setWeatherStatus("Weather is unavailable right now.");
        setWeather(await response.json());
        setWeatherStatus("");
        setPlaceBiasLabel("");
      },
      () =>
        setWeatherStatus(
          "Location permission was not granted. Add a home location in Profile instead.",
        ),
      { maximumAge: 900000 },
    );
  }

  async function searchWeather(event: FormEvent) {
    event.preventDefault();
    setWeatherStatus("Finding that location…");
    const locationResponse = await fetch(
      `/api/geocode?q=${encodeURIComponent(manualLocation)}`,
    );
    const place = await locationResponse.json();
    if (!locationResponse.ok)
      return setWeatherStatus(
        place.error || "We could not find that location.",
      );
    const response = await fetch(
      `/api/weather?latitude=${place.latitude}&longitude=${place.longitude}`,
    );
    if (!response.ok)
      return setWeatherStatus("Weather is unavailable right now.");
    setWeather(await response.json());
    setWeatherStatus(place.label);
    setPlaceBiasLabel(place.label || manualLocation);
    setManualLocation("");
    setPlaceBias({ latitude: place.latitude, longitude: place.longitude });
    setWeatherPlaceSuggestions([]);
  }

  async function chooseWeatherPlace(suggestion: PlaceSuggestion) {
    setWeatherStatus("Finding weather for that address…");
    let latitude = suggestion.latitude;
    let longitude = suggestion.longitude;
    let address = suggestion.address;
    if (suggestion.provider === "google") {
      const parameters = new URLSearchParams({
        placeId: suggestion.placeId,
        sessionToken: placeSessionToken.current,
      });
      const response = await fetch(`/api/places/details?${parameters}`);
      const body = await response.json();
      if (response.ok) {
        latitude = typeof body.latitude === "number" ? body.latitude : latitude;
        longitude =
          typeof body.longitude === "number" ? body.longitude : longitude;
        address = body.address || address;
      }
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(address || suggestion.text)}`,
      );
      const place = await response.json();
      if (!response.ok)
        return setWeatherStatus("We could not find weather for that location.");
      latitude = place.latitude;
      longitude = place.longitude;
    }
    const resolvedLatitude = latitude as number;
    const resolvedLongitude = longitude as number;
    const response = await fetch(
      `/api/weather?latitude=${resolvedLatitude}&longitude=${resolvedLongitude}`,
    );
    if (!response.ok)
      return setWeatherStatus("Weather is unavailable right now.");
    setWeather(await response.json());
    setWeatherStatus(address || suggestion.text);
    setPlaceBiasLabel(address || suggestion.secondaryText || suggestion.text);
    setPlaceBias({ latitude: resolvedLatitude, longitude: resolvedLongitude });
    selectedWeatherLocation.current = suggestion.text;
    setManualLocation("");
    setWeatherPlaceSuggestions([]);
    placeSessionToken.current = crypto.randomUUID();
  }

  async function choosePlace(suggestion: PlaceSuggestion) {
    setIsResolvingPlace(true);
    try {
      let address = suggestion.address;
      let latitude = suggestion.latitude;
      let longitude = suggestion.longitude;
      if (suggestion.provider === "google") {
        const parameters = new URLSearchParams({
          placeId: suggestion.placeId,
          sessionToken: placeSessionToken.current,
        });
        const response = await fetch(`/api/places/details?${parameters}`);
        const body = await response.json();
        if (response.ok && body.address) address = body.address;
        if (typeof body.latitude === "number") latitude = body.latitude;
        if (typeof body.longitude === "number") longitude = body.longitude;
      }
      const fullLocation = address
        ? `${suggestion.name} — ${address}`
        : suggestion.text;
      selectedLocation.current = fullLocation;
      setLocation(fullLocation);
      setPlaceSuggestions([]);
      if (typeof latitude === "number" && typeof longitude === "number")
        setPlaceBias({ latitude, longitude });
      placeSessionToken.current = crypto.randomUUID();
    } finally {
      setIsResolvingPlace(false);
    }
  }

  async function addEvent(event: FormEvent) {
    event.preventDefault();
    if (isSubmittingPlan) return;
    const submittedDraft: PlanDraft = { title: title.trim(), time, location: location.trim(), dressCode: dressCode.trim(), notes: notes.trim() };
    if (!submittedDraft.title) {
      setScheduleStatus("Add an event or plan first.");
      return;
    }
    dispatchSubmission({ type: "submit", draft: submittedDraft });
    setScheduleStatus("Saving privately…");
    const startsAt = time
      ? new Date(`${dateKey}T${time}:00`).toISOString()
      : null;
    const eventIdBeingEdited = editingId;
    try {
      const response = await fetch(
        eventIdBeingEdited ? `/api/daily-events/${eventIdBeingEdited}` : "/api/daily-events",
        {
          method: eventIdBeingEdited ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildDailyEventPayload(submittedDraft, dateKey, startsAt)),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.error || "We could not save this event yet.";
        dispatchSubmission({ type: "failed", error: message, eventId: null });
        setScheduleStatus(message);
        return;
      }

      const savedEventId = eventIdBeingEdited || body.id;
      if (!savedEventId) throw new Error("The saved event did not return an identifier.");

      if (!eventIdBeingEdited) {
        setEvents((current) => [...current, body]);
      } else {
        await loadEvents();
      }
      dispatchSubmission({ type: "saved", eventId: savedEventId });

      // The plan is now durably saved and visible in the event list, so the draft fields may clear.
      setTitle("");
      setTime("");
      setLocation("");
      setDressCode("");
      setNotes("");
      setEditingId(null);
      setPlaceSuggestions([]);
      selectedLocation.current = "";
      setScheduleStatus("Plan saved. Composing today’s edit…");

      const generated = await recommend(savedEventId);
      if (generated) {
        dispatchSubmission({ type: "recommendations-ready" });
        setScheduleStatus("Today’s edit is ready.");
      } else {
        const message = "Your plan is saved, but Curated could not generate the outfits yet.";
        dispatchSubmission({ type: "failed", error: message, eventId: savedEventId });
      }
    } catch (error) {
      console.error("Dress My Day submission failed.", error);
      const message = "The submission was interrupted. Your text has been preserved; please retry.";
      dispatchSubmission({ type: "failed", error: message, eventId: eventIdBeingEdited });
      setScheduleStatus(message);
    }
  }

  function submitNotesOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!shouldSubmitPlanOnEnter({
      key: event.key,
      shiftKey: event.shiftKey,
      isComposing: event.nativeEvent.isComposing,
    })) return;
    event.preventDefault();
    if (!isSubmittingPlan) scheduleFormRef.current?.requestSubmit();
  }

  async function retrySubmission() {
    if (isSubmittingPlan) return;
    if (submission.eventId) {
      dispatchSubmission({ type: "saved", eventId: submission.eventId });
      setScheduleStatus("Considering the day once more…");
      const generated = await recommend(submission.eventId);
      if (generated) {
        dispatchSubmission({ type: "recommendations-ready" });
        setScheduleStatus("Today’s edit is ready.");
      } else {
        dispatchSubmission({ type: "failed", error: "Curated could not generate the outfits yet.", eventId: submission.eventId });
      }
      return;
    }
    scheduleFormRef.current?.requestSubmit();
  }

  function changeScheduleDate(nextDate: string) {
    setDateKey(nextDate);
    setEditingId(null);
    setTitle("");
    setTime("");
    setLocation("");
    setDressCode("");
    setNotes("");
    setScheduleStatus("");
    dispatchSubmission({ type: "reset" });
  }

  async function removeEvent(id: string) {
    const response = await fetch(`/api/daily-events/${id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setEvents((current) => current.filter((event) => event.id !== id));
  }

  function editEvent(event: DailyEvent) {
    setEditingId(event.id);
    setTitle(event.title);
    setLocation(event.location || "");
    selectedLocation.current = event.location || "";
    setPlaceSuggestions([]);
    setDressCode(event.dressCode || "");
    setNotes(event.notes || "");
    setTime(
      event.startsAt ? new Date(event.startsAt).toTimeString().slice(0, 5) : "",
    );
  }

  async function moveEvent(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= events.length) return;
    const reordered = [...events];
    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index],
    ];
    setEvents(reordered);
    await Promise.all(
      reordered.map((event, position) =>
        fetch(`/api/daily-events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position }),
        }),
      ),
    );
  }

  // A timed-out request is not a failed one. The server finishes composing and
  // saves the set regardless, so read back the persisted edit before telling the
  // customer that nothing was produced.
  async function recoverPersistedRecommendations(eventId: string) {
    try {
      const response = await fetch(`/api/daily-events?date=${dateKey}`);
      if (!response.ok) return null;
      const items: DailyEvent[] = await response.json();
      setEvents(items);
      const options = recoverableOptionsFromEvents(items, eventId);
      if (!options) return null;
      setActiveOptionByEvent((current) => ({ ...current, [eventId]: 0 }));
      setScheduleStatus("");
      return options;
    } catch {
      return null;
    }
  }

  async function recommend(eventId: string): Promise<OutfitRecommendation[] | null> {
    setRecommendingEventId(eventId);
    setRecommendationErrorByEvent((current) => {
      const next = { ...current };
      delete next[eventId];
      return next;
    });
    setScheduleStatus("Curating a look from your wardrobe…");
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), RECOMMENDATION_REQUEST_TIMEOUT_MS);
      const response = await fetch(
        `/api/daily-events/${eventId}/recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weather: isToday ? weather : null,
            intention,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
          signal: controller.signal,
        },
      ).finally(() => window.clearTimeout(timeout));
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.error || "A recommendation is unavailable.";
        setScheduleStatus(message);
        setRecommendationErrorByEvent((current) => ({ ...current, [eventId]: message }));
        return null;
      }
      const options: OutfitRecommendation[] = Array.isArray(body.options) ? body.options : [];
      if (!hasUsableRecommendationOptions(options)) throw new Error("Recommendation set was incomplete.");
      setEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                recommendationSetId: body.recommendationSetId,
                recommendationOptions: options,
                recommendation: options[0],
              }
            : event,
        ),
      );
      setActiveOptionByEvent((current) => ({ ...current, [eventId]: 0 }));
      setScheduleStatus("");
      return options;
    } catch (error) {
      console.error("Dress My Day recommendation request failed.", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        const recovered = await recoverPersistedRecommendations(eventId);
        if (recovered) return recovered;
      }
      const message = error instanceof DOMException && error.name === "AbortError"
        ? "Curated is still composing this edit. Your plan is saved; open it again in a moment."
        : "The stylist connection was interrupted. Please try again.";
      setScheduleStatus(message);
      setRecommendationErrorByEvent((current) => ({ ...current, [eventId]: message }));
      return null;
    } finally {
      setRecommendingEventId(null);
    }
  }

  function showAnotherOption(eventId: string, optionCount: number) {
    setActiveOptionByEvent((current) => ({
      ...current,
      [eventId]: ((current[eventId] ?? 0) + 1) % optionCount,
    }));
  }

  function openConsideredCorrection(recommendationId: string) {
    const correction = document.getElementById(`change-${recommendationId}`);
    if (!(correction instanceof HTMLDetailsElement)) return;
    correction.open = true;
    window.requestAnimationFrame(() => {
      correction.scrollIntoView({ behavior: "smooth", block: "center" });
      const question = document.getElementById(`follow-up-${recommendationId}`);
      if (question instanceof HTMLTextAreaElement) question.focus({ preventScroll: true });
    });
  }

  function openWearReview(eventId: string, recommendation: NonNullable<DailyEvent["recommendation"]>) {
    setWearReview({
      eventId,
      recommendationId: recommendation.id,
      summary: recommendation.summary,
      items: recommendation.wardrobeItems.map((item) => ({
        id: item.id,
        label: item.label,
        status: suggestedAvailabilityAfterWear(item.category),
      })),
    });
  }

  async function saveWearReview() {
    if (!wearReview || !wearReview.items.length) return;
    const { eventId, recommendationId } = wearReview;
    setMarkingWornId(recommendationId);
    setWornFeedback((current) => {
      const next = { ...current };
      delete next[eventId];
      return next;
    });
    try {
      const response = await fetch(
        `/api/recommendations/${recommendationId}/wore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: wearReview.items.map(({ id, status }) => ({ id, status })) }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setWornFeedback((current) => ({
          ...current,
          [eventId]: {
            type: "error",
            message:
              body.error ||
              "We could not add this look to Wardrobe History. Please try again.",
          },
        }));
        return;
      }
      setEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                recommendationOptions: (event.recommendationOptions ?? []).map((option) =>
                  option.id === recommendationId ? { ...option, status: "worn" } : option,
                ),
                recommendation: event.recommendation?.id === recommendationId
                  ? { ...event.recommendation, status: "worn" }
                  : event.recommendation,
              }
            : event,
        ),
      );
      setWornFeedback((current) => ({
        ...current,
        [eventId]: {
          type: "success",
          message:
            body.status === "already-recorded"
              ? "This look is already in your Wardrobe History."
              : "Remembered for today.",
        },
      }));
      setWearReview(null);
    } catch {
      setWornFeedback((current) => ({
        ...current,
        [eventId]: {
          type: "error",
          message: "Your connection was interrupted. Please try again.",
        },
      }));
    } finally {
      setMarkingWornId(null);
    }
  }

  const fieldClass = `${styles.field} w-full min-w-0`;
  return (
    <main
      className={`${styles.page} ${embedded ? "bg-transparent" : "min-h-[calc(100vh-97px)]"}`}
    >
      <div className={styles.canvas}>
        <header className={styles.opening}>
          <div>
            <p className={styles.rubric}>Today’s Edit</p>
            <p className={styles.date}>{selectedDateLabel}</p>
            <p className={styles.welcome}>{greeting}</p>
            <h1 className={styles.summary}>{daySummary}</h1>
            <a className={styles.reviewLink} href="#review-today" aria-label="Review today’s plans">
              Review today <span aria-hidden="true">→</span>
            </a>
          </div>
          <aside className={styles.rail} aria-label="Weather and daily note">
            <p className={styles.rubric}>For the day</p>
            <section>
              {weather?.current ? (
                <>
                  <p className={styles.weatherLine}>
                    {Math.round(weather.daily?.temperature_2m_min[0] ?? weather.current.temperature_2m)}–{Math.round(weather.daily?.temperature_2m_max[0] ?? weather.current.temperature_2m)}° · {weatherDescription(weather.current.weather_code)}
                  </p>
                  {(weather.daily?.precipitation_probability_max[0] ?? 0) > 20 && <p className={styles.quiet}>{weather.daily?.precipitation_probability_max[0]}% chance of precipitation</p>}
                  {weatherStatus && (
                    <p className={styles.quiet}>
                      {weatherStatus}
                    </p>
                  )}
                  <button
                    onClick={() => setWeather(null)}
                    className={styles.textAction}
                  >
                    Change location
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.weatherLine}>Weather can remain quiet.</p>
                  <p className={styles.quiet}>
                    {weatherStatus}
                  </p>
                  <button
                    onClick={requestWeather}
                    className={styles.textAction}
                  >
                    Use my location
                  </button>
                  <form
                    onSubmit={searchWeather}
                    className={styles.weatherForm}
                  >
                    <div className="relative min-w-0 flex-1">
                      <input
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={weatherPlaceSuggestions.length > 0}
                        aria-controls="weather-location-suggestions"
                        value={manualLocation}
                        onChange={(event) => {
                          selectedWeatherLocation.current = "";
                          setManualLocation(event.target.value);
                        }}
                        className={styles.weatherInput}
                        placeholder="City, hotel, or address"
                        required
                      />
                      {weatherPlaceSuggestions.length > 0 && (
                        <div
                          id="weather-location-suggestions"
                          role="listbox"
                          className="absolute z-30 mt-2 w-[min(22rem,calc(100vw-5rem))] overflow-hidden rounded-2xl bg-white text-[#173d31] shadow-2xl"
                        >
                          {weatherPlaceSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.placeId}
                              type="button"
                              role="option"
                              aria-selected="false"
                              onClick={() =>
                                void chooseWeatherPlace(suggestion)
                              }
                              className="block min-h-11 w-full border-b border-black/[0.07] px-4 py-3 text-left last:border-0 hover:bg-[#f7f3eb]"
                            >
                              <span className="block text-sm font-medium">
                                {suggestion.name}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-[#68736d]">
                                {suggestion.secondaryText}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className={styles.textAction}
                      type="submit"
                    >
                      Find
                    </button>
                  </form>
                </>
              )}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
                className={styles.quiet}
              >
                Weather by Open-Meteo
              </a>
            </section>
            <AgendaBrief date={dateKey} />
            {!embedded && <blockquote className={styles.quote}>“{quote.text}”<footer className="mt-2 font-sans text-[.65rem] not-italic uppercase tracking-[.15em]">{quote.author}</footer></blockquote>}
          </aside>
        </header>

        <div className={styles.consultation} id="review-today">
          <section className={styles.reading}>
              <p className={styles.rubric}>
                Your schedule
              </p>
              <h2 className={styles.sectionTitle}>
                {editingId ? "Refine this event" : "What are you dressing for?"}
              </h2>
              <fieldset className="mt-6">
                <legend className={styles.fieldLabel}>How would you like to feel?</legend>
                <div className={styles.intentionGroup}>
                  {["At ease", "Assured", "Polished", "More expressive"].map((choice) => <button key={choice} type="button" className={styles.choice} aria-pressed={intention === choice} onClick={() => setIntention(choice)}>{choice}</button>)}
                </div>
                <p className={styles.quiet}>For today only.</p>
              </fieldset>
              <form
                ref={scheduleFormRef}
                onSubmit={addEvent}
                className={styles.form}
              >
                <label className={`${styles.fieldLabel} ${styles.full}`}>
                  Date
                  <span className="relative mt-2 block min-w-0 max-w-full overflow-hidden">
                    <input
                      className={`${fieldClass} curated-date-time block max-w-full pr-12`}
                      type="date"
                      min={todayKey}
                      max={maxDateKey}
                      value={dateKey}
                      aria-label="Choose a date to plan"
                      onChange={(event) => changeScheduleDate(event.target.value)}
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-[#8a6f43]">⌄</span>
                  </span>
                </label>
                <input
                  className={`${fieldClass} ${styles.full}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event or occasion"
                  required
                />
                <label className={styles.fieldLabel}>
                  Time <span className="font-normal text-[#8d9691]">(optional)</span>
                  <input
                    className={`${fieldClass} curated-time-input mt-2 block max-w-full`}
                    type="time"
                    value={time}
                    aria-label="Choose an optional event time"
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                <label className={`${styles.fieldLabel} relative min-w-0 max-w-full`}>
                  Venue or address
                  <input
                    role="combobox"
                    className={`${fieldClass} mt-2 block max-w-full`}
                    value={location}
                    onChange={(e) => {
                      selectedLocation.current = "";
                      setLocation(e.target.value);
                    }}
                    placeholder="Optional"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="event-location-suggestions"
                    aria-expanded={placeSuggestions.length > 0}
                  />
                  {placeSuggestions.length > 0 && (
                    <div
                      id="event-location-suggestions"
                      role="listbox"
                      className="absolute z-30 mt-2 w-full min-w-0 overflow-hidden rounded-2xl border border-[#173d31]/10 bg-white shadow-[0_18px_45px_rgba(23,61,49,0.16)] sm:min-w-[20rem]"
                    >
                      {placeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.placeId}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => void choosePlace(suggestion)}
                          className="block min-h-11 w-full border-b border-[#173d31]/[0.07] px-4 py-3 text-left last:border-0 hover:bg-[#f7f3eb]"
                        >
                          <span className="block text-sm font-medium text-[#173d31]">
                            {suggestion.name}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-[#68736d]">
                            {suggestion.secondaryText}
                          </span>
                        </button>
                      ))}
                      {placeSuggestions[0]?.provider === "google" ? (
                        <p className="bg-[#faf8f4] px-4 py-2 text-right text-[0.62rem] text-[#8a7c80]">
                          Powered by Google
                        </p>
                      ) : (
                        <a
                          href="https://www.openstreetmap.org/copyright"
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-[#faf8f4] px-4 py-2 text-right text-[0.62rem] text-[#8a7c80]"
                        >
                          Address data © OpenStreetMap contributors
                        </a>
                      )}
                    </div>
                  )}
                  {isResolvingPlace && (
                    <span className="absolute right-4 top-3 text-xs text-[#8a6f43]">
                      Finding address…
                    </span>
                  )}
                </label>
                <textarea
                  className={`${fieldClass} ${styles.full}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={submitNotesOnEnter}
                  placeholder="Dress expectations or anything else Curated should consider (optional)"
                  aria-label="Dress expectations or anything else Curated should consider"
                  rows={1}
                />
                <p className={`${styles.quiet} ${styles.full}`}>
                  Press Enter to submit. Use Shift+Enter for a new line.
                </p>
                <div className={`${styles.full} flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                  <p aria-live="polite" className={styles.status}>
                    {scheduleStatus}
                  </p>
                  <button
                    className={styles.primary}
                    type="submit"
                    disabled={isSubmittingPlan}
                  >
                    {submission.phase === "saving"
                      ? "Saving plan…"
                      : submission.phase === "generating"
                        ? "Composing the look…"
                        : editingId
                      ? "Save changes"
                      : "Dress me for today"}
                  </button>
                </div>
                {submission.draft && submission.phase !== "idle" && (
                  <div className={`${styles.submitted} ${styles.full}`} aria-live="polite">
                    <p className={styles.rubric}>Submitted plan</p>
                    <p className={styles.submittedTitle}>{submission.draft.title}</p>
                    {(submission.draft.time || submission.draft.location) && (
                      <p className="mt-1 text-sm text-[#68736d]">
                        {[submission.draft.time, submission.draft.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {submission.draft.dressCode && <p className="mt-2 text-sm text-[#68736d]">Dress expectations: {submission.draft.dressCode}</p>}
                    {submission.draft.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#535e58]">{submission.draft.notes}</p>}
                    {submission.phase === "saving" && <p className="mt-3 text-sm text-[#805844]">Saving your plan…</p>}
                    {submission.phase === "generating" && <p className="mt-3 text-sm text-[#805844]" role="status" aria-live="polite">Considering the day → Checking what is available → Composing the look</p>}
                    {submission.phase === "success" && <p className="mt-3 text-sm text-[#173d31]">Saved. Today’s edit is displayed below.</p>}
                    {submission.phase === "error" && (
                      <div className="mt-3 rounded-xl border border-[#8b4655]/20 bg-[#fff4f3] p-3" role="alert">
                        <p className="text-sm text-[#8b4655]">{submission.error}</p>
                        <button type="button" onClick={() => void retrySubmission()} className="mt-3 min-h-10 rounded-full bg-[#54263a] px-4 py-2 text-xs text-white">Retry</button>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </section>
        </div>
          <section className={styles.edits}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className={styles.rubric}>
                  Today’s recommendation
                </p>
                <h2 className={styles.sectionTitle}>
                  One thoughtful answer for the day
                </h2>
              </div>
              <span className="shrink-0 text-sm text-[#68736d]">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </div>
            {events.length === 0 ? (
              <div className={styles.loading}>
                What shape will today take? Add a plan above to begin.
              </div>
            ) : (
              <div>
                {events.map((event, index) => {
                  const options = event.recommendationOptions?.length
                    ? event.recommendationOptions
                    : event.recommendation
                      ? [event.recommendation]
                      : [];
                  const activeOptionIndex = Math.min(activeOptionByEvent[event.id] ?? 0, Math.max(0, options.length - 1));
                  const activeRecommendation = options[activeOptionIndex] ?? null;
                  return (
                  <article
                    key={event.id}
                    id={`event-${event.id}`}
                    className={styles.event}
                  >
                    <div className={styles.eventMeta}>
                      <div>
                        <p className={styles.rubric}>
                          {event.startsAt
                            ? new Date(event.startsAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "Any time"}
                        </p>
                        <h3 className={styles.eventTitle}>
                          {event.title}
                        </h3>
                        {event.location && (
                          <p className={styles.eventText}>
                            {event.location}
                          </p>
                        )}
                        {event.dressCode && (
                          <p className={styles.eventText}>Dress expectations: {event.dressCode}</p>
                        )}
                        {event.notes && (
                          <p className={styles.eventText}>{event.notes}</p>
                        )}
                        {event.occasionClassification && (
                          <p className={styles.quiet}>
                            Treated as {(event.occasionClassification.occasion || event.occasionClassification.kind).replaceAll("_", " ")} · Review if that is not right
                          </p>
                        )}
                      </div>
                      <div className={styles.eventControls}>
                        <button
                          className="min-h-11 min-w-11"
                          aria-label="Move event earlier"
                          onClick={() => void moveEvent(index, -1)}
                          disabled={index === 0}
                        >
                          ↑
                        </button>
                        <button
                          className="min-h-11 min-w-11"
                          aria-label="Move event later"
                          onClick={() => void moveEvent(index, 1)}
                          disabled={index === events.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          className="min-h-11 px-2"
                          onClick={() => editEvent(event)}
                        >
                          Edit
                        </button>
                        <button
                          className="min-h-11 px-2"
                          onClick={() => void removeEvent(event.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className={styles.recommendation}>
                      <p className={styles.rubric}>
                        {options.length
                          ? `Today’s Edit · Option ${activeOptionIndex + 1} of ${options.length}`
                          : "Today’s Edit"}
                      </p>
                      {activeRecommendation ? (
                        <>
                          <h4 className={styles.lookTitle} aria-live="polite">
                            {activeRecommendation.summary}
                          </h4>
                          {activeRecommendation.rationale && (
                            <p className={styles.outfitDescription}>
                              <LinkedOutfitDescription
                                rationale={activeRecommendation.rationale}
                                items={activeRecommendation.wardrobeItems}
                                returnTo={`/today?event=${encodeURIComponent(event.id)}&option=${activeOptionIndex}#event-${encodeURIComponent(event.id)}`}
                              />
                            </p>
                          )}
                          <div className={styles.actions}>
                            <button
                              disabled={activeRecommendation.status === "worn" || markingWornId === activeRecommendation.id}
                              onClick={() => openWearReview(event.id, activeRecommendation)}
                              className={styles.primary}
                            >
                              {markingWornId === activeRecommendation.id ? "Saving…" : activeRecommendation.status === "worn" ? "Saved to History" : "I wore this"}
                            </button>
                            <button
                              onClick={() => options.length > 1 ? showAnotherOption(event.id, options.length) : void recommend(event.id)}
                              disabled={recommendingEventId === event.id}
                              className={styles.secondary}
                            >
                              {recommendingEventId === event.id
                                ? "Composing the look…"
                                : options.length > 1
                                  ? "Another option"
                                  : "Consider again"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openConsideredCorrection(activeRecommendation.id)}
                              className={styles.textAction}
                            >
                              Change something
                            </button>
                          </div>
                          <RecommendationFollowUp
                            recommendationId={activeRecommendation.id}
                            eventDate={dateKey}
                            onRegenerate={() => recommend(event.id)}
                          />
                          {wornFeedback[event.id] && (
                            <div
                              role="status"
                              aria-live="polite"
                              className={wornFeedback[event.id].type === "success" ? styles.saved : styles.error}
                            >
                              <p>{wornFeedback[event.id].message}</p>
                              {wornFeedback[event.id].type === "success" && (
                                <Link
                                  href="/history"
                                  className="mt-2 inline-block font-medium underline underline-offset-4"
                                >
                                  Open Wardrobe History →
                                </Link>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {recommendingEventId === event.id ? (
                            <div className={styles.loading} role="status" aria-live="polite">
                              <p className="text-sm font-medium text-[#173d31]">Considering the day</p>
                              <p className="mt-1 text-xs leading-5 text-[#68736d]">Checking what is available, then composing the look.</p>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm leading-6 text-[#68736d]">
                              Use your event, weather, profile, and owned wardrobe to create a considered look.
                            </p>
                          )}
                          {recommendationErrorByEvent[event.id] && (
                            <div className={styles.error} role="alert">
                              <p className="text-sm text-[#8b4655]">{recommendationErrorByEvent[event.id]}</p>
                              <button type="button" onClick={() => void recommend(event.id)} className="mt-3 min-h-10 rounded-full bg-[#54263a] px-4 py-2 text-xs text-white">Retry</button>
                            </div>
                          )}
                          <button
                            onClick={() => void recommend(event.id)}
                            disabled={recommendingEventId === event.id}
                            className={`${styles.primary} mt-5`}
                          >
                            {recommendingEventId === event.id ? "Composing the look…" : "Dress me for today"}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </section>
          <section className={styles.sourceArea} aria-labelledby="calendar-connections-heading">
            <p className={styles.rubric}>Calendar connections</p>
            <h2 id="calendar-connections-heading" className="mt-2 font-serif text-2xl text-[#24372f]">Keep the day in view</h2>
            <GoogleCalendarPanel date={dateKey} />
            <AppleCalendarPanel date={dateKey} />
          </section>
        </div>
      {wearReview && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !markingWornId) setWearReview(null);
        }}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="wear-review-title" onMouseDown={(event) => event.stopPropagation()}>
           <div className={styles.sheetInner}>
            <div className="flex items-center justify-between gap-4">
              <p className={styles.rubric}>A final look</p>
              <button type="button" aria-label="Close wear review" className={styles.textAction} disabled={Boolean(markingWornId)} onClick={() => setWearReview(null)}>Close</button>
            </div>
            <h2 ref={wearReviewHeadingRef} tabIndex={-1} id="wear-review-title" className={styles.sectionTitle}>Confirm what you wore</h2>
            <p className={styles.eventText}>Remove anything you changed, then choose whether each piece is available again or ready for laundry. Nothing changes until you save.</p>
            <p className={styles.morningNote}>{wearReview.summary}</p>
            <div className="mt-5">
              {wearReview.items.map((item) => (
                <div key={item.id} className={styles.wearItem}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-[#173d31]">{item.label}</span>
                    <button type="button" className="text-xs text-[#704154] underline underline-offset-4" onClick={() => setWearReview((current) => current ? { ...current, items: current.items.filter((candidate) => candidate.id !== item.id) } : current)}>I did not wear this</button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={`Availability for ${item.label}`}>
                    {(["available", "laundry"] as const).map((status) => (
                      <button key={status} type="button" aria-pressed={item.status === status} className={item.status === status ? styles.primary : styles.secondary} onClick={() => setWearReview((current) => current ? { ...current, items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, status } : candidate) } : current)}>
                        {status === "available" ? "Available again" : "Laundry"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className={styles.textAction} onClick={() => setWearReview(null)}>Not yet</button>
              <button type="button" disabled={!wearReview.items.length || Boolean(markingWornId)} className={styles.primary} onClick={() => void saveWearReview()}>{markingWornId ? "Remembering…" : "Save wear"}</button>
            </div>
           </div>
          </section>
        </div>
      )}
    </main>
  );
}
