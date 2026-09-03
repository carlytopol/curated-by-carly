export function dateInTimeZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localMidnightUtc(date: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    guess += desired - represented;
  }
  return new Date(guess);
}

export function localDayUtcBounds(date: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid_agenda_date");
  const start = localMidnightUtc(date, timeZone);
  const nextDate = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + 1)).toISOString().slice(0, 10);
  const end = localMidnightUtc(nextDate, timeZone);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

export function isSupportedCalendarPlanningDate(requestedDate: string, today: string, maxFutureDays = 365) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return false;
  const requested = Date.parse(`${requestedDate}T00:00:00.000Z`);
  const current = Date.parse(`${today}T00:00:00.000Z`);
  if (!Number.isFinite(requested) || !Number.isFinite(current)) return false;
  const differenceInDays = Math.round((requested - current) / 86_400_000);
  return differenceInDays >= 0 && differenceInDays <= maxFutureDays;
}
