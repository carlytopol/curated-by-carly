"use client";

import { useEffect, useState } from "react";
import type { DailyAgendaItem } from "@/types/daily-agenda";
import styles from "./dress-my-day.module.css";

export function AgendaBrief({ date }: { date: string }) {
  const [items, setItems] = useState<DailyAgendaItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    fetch(`/api/daily-agenda?date=${date}&timezone=${encodeURIComponent(timezone)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setItems(Array.isArray(body?.agenda?.items) ? body.agenda.items : []))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, [date]);

  if (!loaded || items.length === 0) return null;

  return (
    <div className={styles.agendaBrief} aria-label="Calendar plans for the selected day">
      <p className={styles.rubric}>On your calendar</p>
      <ul>
        {items.slice(0, 4).map((item) => (
          <li key={item.id}>
            <time dateTime={item.startTime ?? undefined}>
              {item.isAllDay
                ? "All day"
                : item.startTime
                  ? new Date(item.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : "Today"}
            </time>
            <span>{item.title}</span>
          </li>
        ))}
      </ul>
      {items.length > 4 && <p className={styles.quiet}>And {items.length - 4} more.</p>}
    </div>
  );
}
