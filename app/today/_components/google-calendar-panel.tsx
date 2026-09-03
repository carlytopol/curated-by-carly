"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { deriveGoogleCalendarViewState } from "@/lib/calendar/connection-state";
import type { SafeCalendarConnection } from "@/lib/calendar/connections";
import type { DailyAgenda } from "@/types/daily-agenda";

type ConnectionsResponse = {
  configured: boolean;
  connections: SafeCalendarConnection[];
  error?: string;
};

export function GoogleCalendarPanel({ date }: { date: string }) {
  const [configured, setConfigured] = useState(true);
  const [connections, setConnections] = useState<SafeCalendarConnection[]>([]);
  const [agenda, setAgenda] = useState<DailyAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const connectionResponse = await fetch("/api/calendar/connections", {
        cache: "no-store",
      });
      const connectionBody =
        (await connectionResponse.json()) as ConnectionsResponse;
      setConfigured(connectionBody.configured);
      const googleConnections = (connectionBody.connections || []).filter(
        (connection) => connection.provider === "google",
      );
      setConnections(googleConnections);
      if (!connectionResponse.ok) throw new Error(connectionBody.error);
      if (
        googleConnections.some((connection) => connection.status === "active")
      ) {
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const agendaResponse = await fetch(
          `/api/daily-agenda?date=${date}&timezone=${encodeURIComponent(timezone)}`,
          { cache: "no-store" },
        );
        const agendaBody = await agendaResponse.json();
        if (!agendaResponse.ok) throw new Error(agendaBody.error);
        setAgenda(agendaBody.agenda);
        if (Array.isArray(agendaBody.connections)) {
          setConnections((current) =>
            current.map((connection) => {
              const latest = agendaBody.connections.find(
                (state: { id: string }) => state.id === connection.id,
              );
              return latest
                ? { ...connection, status: latest.status }
                : connection;
            }),
          );
        }
        if (
          agendaBody.connections?.some(
            (connection: { status: string }) => connection.status === "error",
          )
        )
          setFailed(true);
      } else setAgenda(null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("calendar");
    const reason = new URLSearchParams(window.location.search).get(
      "calendar_reason",
    );
    const callbackMessage =
      result === "connected"
        ? "Google Calendar connected privately."
        : result === "denied"
          ? "Google Calendar permission was not granted."
          : result === "error"
            ? `The Google Calendar connection could not be completed${reason ? ` (${reason.replaceAll("_", " ")})` : ""}.`
            : "";
    const timer = window.setTimeout(() => {
      if (callbackMessage) setMessage(callbackMessage);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const primaryStatus =
    connections.find((connection) => connection.status === "active")?.status ||
    (connections.some((connection) => connection.status === "needs_reauth")
      ? "needs_reauth"
      : connections[0]?.status);
  const googleItems =
    agenda?.items.filter((item) => item.provider === "google") ?? [];
  const state = deriveGoogleCalendarViewState({
    loading,
    configured,
    status: primaryStatus,
    eventCount: googleItems.length,
    failed,
  });

  async function connect() {
    setMessage("Opening Google’s read-only permission screen…");
    const response = await fetch("/api/calendar/connect/google", {
      method: "POST",
    });
    const body = await response.json();
    if (!response.ok || !body.authorizationUrl)
      return setMessage(body.error || "We could not begin the connection.");
    window.location.assign(body.authorizationUrl);
  }

  async function disconnect(connection: SafeCalendarConnection) {
    setMessage("Disconnecting and deleting stored credentials…");
    const response = await fetch(`/api/calendar/connections/${connection.id}`, {
      method: "DELETE",
    });
    if (!response.ok)
      return setMessage("We could not disconnect this calendar.");
    setMessage(
      "Google Calendar disconnected. Stored credentials were deleted.",
    );
    await load();
  }

  const sortedConnections = useMemo(
    () =>
      [...connections].sort((a, b) =>
        a.displayLabel.localeCompare(b.displayLabel),
      ),
    [connections],
  );

  return (
    <section
      className="paper-panel mt-4 rounded-[1.25rem] p-4 sm:p-5"
      aria-labelledby="google-calendar-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#9a6b72]">
            Read-only
          </p>
          <h2
            id="google-calendar-heading"
            className="mt-1 font-serif text-2xl text-[#54263a]"
          >
            Google Calendar
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#74696b]">
            Selected day’s event details only. No email, contacts, or calendar
            changes.
          </p>
        </div>
        {(state === "disconnected" || state === "expired") && (
          <button
            type="button"
            onClick={() => void connect()}
            className="brass-button shrink-0"
          >
            {state === "expired"
              ? "Reconnect Google"
              : "Connect Google Calendar"}
          </button>
        )}
      </div>

      {state === "loading" && (
        <div className="mt-3 border border-[#a07c45]/15 bg-white/55 p-3 text-xs text-[#74696b]">
          Loading your calendar connection…
        </div>
      )}
      {state === "disconnected" && (
        <div className="mt-3 border border-dashed border-[#a07c45]/25 bg-white/45 p-3 text-xs leading-5 text-[#74696b]">
          No digital calendar is connected. Your manually entered schedule
          continues to work independently.
        </div>
      )}
      {state === "expired" && (
        <div className="mt-3 border border-[#8b4655]/20 bg-[#fff4f3] p-3 text-sm leading-6 text-[#8b4655] sm:mt-7 sm:p-6">
          Google’s permission has expired or was revoked. Reconnect to load
          today’s events again.
        </div>
      )}
      {state === "error" && (
        <div className="mt-3 border border-[#8b4655]/20 bg-[#fff4f3] p-3 text-sm leading-6 text-[#8b4655] sm:mt-7 sm:p-6">
          {configured
            ? "The selected day’s Google Calendar events are temporarily unavailable. Your manual schedule is still available."
            : "Google Calendar is not configured for this Curated environment yet."}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}
      {state === "empty" && (
        <div className="mt-3 border border-dashed border-[#a07c45]/25 bg-white/45 p-3 text-sm leading-6 text-[#74696b] sm:mt-7 sm:p-6">
          Connected successfully. No events were found on your readable Google
          calendars for this date.
        </div>
      )}
      {state === "connected" && agenda && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {googleItems.map((item) => (
            <article
              key={item.id}
              className="border border-[#a07c45]/15 bg-white/65 p-3"
            >
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#8a6f43]">
                {item.isAllDay
                  ? "All day"
                  : item.startTime
                    ? new Date(item.startTime).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Today"}{" "}
                · {item.calendarName}
              </p>
              <h3 className="mt-3 font-serif text-xl text-[#173d31]">
                {item.title}
              </h3>
              {item.location && (
                <p className="mt-2 text-sm text-[#68736d]">{item.location}</p>
              )}
              <p className="mt-3 text-xs text-[#8a6f43]">
                {item.occasionClassification.occasion || "Calendar event"}
                {item.dressCodeInference.dressCode
                  ? ` · ${item.dressCodeInference.dressCode}`
                  : ""}
              </p>
            </article>
          ))}
        </div>
      )}

      {sortedConnections.length > 0 && (
        <div className="mt-3 border-t border-[#a07c45]/15 pt-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8a6f43]">
            Connections
          </p>
          {sortedConnections.map((connection) => (
            <div
              key={connection.id}
              className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span>
                {connection.displayLabel} ·{" "}
                {connection.status === "active"
                  ? "Connected"
                  : connection.status === "needs_reauth"
                    ? "Expired"
                    : "Needs attention"}
              </span>
              <button
                type="button"
                onClick={() => void disconnect(connection)}
                className="min-h-11 text-[#8b4655] underline underline-offset-4"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
      {message && (
        <p className="mt-4 text-sm text-[#805844]" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
