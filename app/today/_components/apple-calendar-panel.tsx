"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SafeCalendarConnection } from "@/lib/calendar/connections";
import type { DailyAgenda } from "@/types/daily-agenda";

type IcsViewState =
  | "loading"
  | "disconnected"
  | "connected"
  | "invalid-link"
  | "unreachable-feed"
  | "empty-calendar"
  | "error";
type ConnectionsResponse = {
  icsConfigured: boolean;
  connections: SafeCalendarConnection[];
  error?: string;
};

export function AppleCalendarPanel({ date }: { date: string }) {
  const [configured, setConfigured] = useState(true);
  const [connections, setConnections] = useState<SafeCalendarConnection[]>([]);
  const [agenda, setAgenda] = useState<DailyAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [reconnectId, setReconnectId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("Apple Calendar");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch("/api/calendar/connections", {
        cache: "no-store",
      });
      const body = (await response.json()) as ConnectionsResponse;
      const icsConnections = (body.connections || []).filter(
        (connection) => connection.provider === "ics",
      );
      setConfigured(body.icsConfigured);
      setConnections(icsConnections);
      if (!response.ok) throw new Error(body.error);
      if (icsConnections.some((connection) => connection.status === "active")) {
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

  const icsItems =
    agenda?.items.filter((item) => item.provider === "ics") ?? [];
  const status =
    connections.find((connection) => connection.status === "active")?.status ||
    connections[0]?.status;
  const state: IcsViewState = loading
    ? "loading"
    : !configured || failed
      ? "error"
      : !connections.length
        ? "disconnected"
        : status === "invalid_link"
          ? "invalid-link"
          : status === "unreachable_feed"
            ? "unreachable-feed"
            : status === "error"
              ? "error"
              : icsItems.length
                ? "connected"
                : "empty-calendar";

  async function submitConnection(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/calendar/connect/ics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, label, connectionId: reconnectId }),
      });
      const body = await response.json();
      if (!response.ok)
        return setMessage(
          body.error || "The subscription could not be connected.",
        );
      setMessage(
        body.state === "empty-calendar"
          ? "Connected securely. No events were found for today."
          : "Apple Calendar connected securely.",
      );
      setUrl("");
      setShowForm(false);
      setReconnectId(null);
      await load();
    } catch {
      setMessage("The subscription could not be connected.");
    } finally {
      setSaving(false);
    }
  }

  async function refresh(connection: SafeCalendarConnection) {
    setMessage("Refreshing the read-only calendar feed…");
    const response = await fetch(
      `/api/calendar/connections/${connection.id}/refresh`,
      { method: "POST" },
    );
    const body = await response.json();
    setMessage(
      response.ok
        ? body.state === "empty-calendar"
          ? "Refreshed. No events were found for today."
          : "Calendar refreshed."
        : body.error || "The feed could not be refreshed.",
    );
    await load();
  }

  async function disconnect(connection: SafeCalendarConnection) {
    setMessage("Disconnecting and deleting the encrypted subscription…");
    const response = await fetch(`/api/calendar/connections/${connection.id}`, {
      method: "DELETE",
    });
    if (!response.ok)
      return setMessage("The calendar could not be disconnected.");
    setMessage(
      "Apple Calendar disconnected. The saved subscription was deleted.",
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
      aria-labelledby="apple-calendar-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#9a6b72]">
            Private read-only subscription
          </p>
          <h2
            id="apple-calendar-heading"
            className="mt-1 font-serif text-2xl text-[#54263a]"
          >
            Apple Calendar / iCal
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#74696b]">
            Encrypted link, selected day’s events only. No Apple ID or password.
          </p>
        </div>
        {(state === "disconnected" ||
          state === "invalid-link" ||
          state === "unreachable-feed") && (
          <button
            type="button"
            onClick={() => {
              setReconnectId(connections[0]?.id || null);
              setShowForm(true);
            }}
            className="brass-button shrink-0"
          >
            {connections.length ? "Reconnect" : "Connect Apple Calendar"}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={submitConnection}
          className="mt-3 grid gap-3 border border-[#a07c45]/20 bg-white/55 p-4"
        >
          <label className="grid gap-2 text-sm text-[#5f5356]">
            Calendar name
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={120}
              className="min-h-12 border border-[#a07c45]/25 bg-white px-4"
            />
          </label>
          <label className="grid gap-2 text-sm text-[#5f5356]">
            HTTPS iCal subscription URL
            <input
              type="url"
              inputMode="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…/calendar.ics"
              autoComplete="off"
              className="min-h-12 border border-[#a07c45]/25 bg-white px-4"
            />
          </label>
          <p className="text-xs leading-5 text-[#817477]">
            The subscription URL may grant access to your calendar. It is
            encrypted and is never shown again after saving.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="brass-button">
              {saving
                ? "Checking feed…"
                : reconnectId
                  ? "Reconnect securely"
                  : "Connect securely"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setUrl("");
              }}
              className="min-h-11 px-4 underline underline-offset-4"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {state === "loading" && (
        <div className="mt-3 border border-[#a07c45]/15 bg-white/55 p-3 text-xs text-[#74696b]">
          Loading your Apple Calendar connection…
        </div>
      )}
      {state === "disconnected" && !showForm && (
        <div className="mt-3 border border-dashed border-[#a07c45]/25 bg-white/45 p-3 text-xs leading-5 text-[#74696b]">
          No Apple/iCal subscription is connected. Your Google and manual
          schedules continue to work independently.
        </div>
      )}
      {state === "invalid-link" && (
        <div className="mt-3 border border-[#8b4655]/20 bg-[#fff4f3] p-3 text-sm text-[#8b4655] sm:mt-7 sm:p-6">
          The saved link is no longer a valid iCalendar feed. Reconnect with a
          current HTTPS subscription URL.
        </div>
      )}
      {state === "unreachable-feed" && (
        <div className="mt-3 border border-[#8b4655]/20 bg-[#fff4f3] p-3 text-sm text-[#8b4655] sm:mt-7 sm:p-6">
          The calendar feed is temporarily unreachable. Refresh it or reconnect
          with a new link.
        </div>
      )}
      {state === "error" && (
        <div className="mt-3 border border-[#8b4655]/20 bg-[#fff4f3] p-3 text-sm text-[#8b4655] sm:mt-7 sm:p-6">
          {configured
            ? "The Apple Calendar connection needs attention."
            : "Apple Calendar subscriptions are not configured for this environment."}
        </div>
      )}
      {state === "empty-calendar" && connections.length > 0 && (
        <div className="mt-3 border border-dashed border-[#a07c45]/25 bg-white/45 p-3 text-sm text-[#74696b] sm:mt-7 sm:p-6">
          Connected successfully. No events were found in this calendar for the
          selected date.
        </div>
      )}
      {state === "connected" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {icsItems.map((item) => (
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
            </article>
          ))}
        </div>
      )}

      {sortedConnections.length > 0 && (
        <div className="mt-3 border-t border-[#a07c45]/15 pt-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8a6f43]">
            Subscriptions
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
                  : "Needs attention"}
              </span>
              <span className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => void refresh(connection)}
                  className="min-h-11 underline underline-offset-4"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReconnectId(connection.id);
                    setLabel(connection.displayLabel);
                    setShowForm(true);
                  }}
                  className="min-h-11 underline underline-offset-4"
                >
                  Reconnect
                </button>
                <button
                  type="button"
                  onClick={() => void disconnect(connection)}
                  className="min-h-11 text-[#8b4655] underline underline-offset-4"
                >
                  Disconnect
                </button>
              </span>
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
