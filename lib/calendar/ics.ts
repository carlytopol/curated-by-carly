import { createHmac } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import * as ical from "node-ical";
import type { CalendarEvent } from "@/types/calendar";

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;
export const ICS_FETCH_LIMITS = { maxBytes: MAX_FEED_BYTES, timeoutMs: FETCH_TIMEOUT_MS, maxRedirects: MAX_REDIRECTS } as const;

export class IcsFeedError extends Error {
  constructor(public readonly code: "invalid_link" | "unreachable_feed" | "invalid_feed", message: string) {
    super(message);
    this.name = "IcsFeedError";
  }
}

function ipv4Number(address: string) {
  return address.split(".").reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function inIpv4Range(value: number, base: string, prefix: number) {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (ipv4Number(base) & mask);
}

export function isBlockedIp(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const value = ipv4Number(address);
    return [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ].some(([base, prefix]) => inIpv4Range(value, String(base), Number(prefix)));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) return isBlockedIp(normalized.slice(7));
    return normalized === "::" || normalized === "::1"
      || normalized.startsWith("fc") || normalized.startsWith("fd")
      || /^fe[89ab]/.test(normalized) || normalized.startsWith("ff")
      || normalized.startsWith("2001:db8:");
  }
  return true;
}

export function assertSafeIcsUrl(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new IcsFeedError("invalid_link", "Enter a valid HTTPS calendar subscription URL."); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.port && url.port !== "443") {
    throw new IcsFeedError("invalid_link", "Only standard HTTPS subscription URLs are supported.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || isIP(host) && isBlockedIp(host)) {
    throw new IcsFeedError("invalid_link", "Local and private calendar hosts are not supported.");
  }
  url.hash = "";
  return url;
}

export function assertSafeIcsRedirect(current: URL, location: string | undefined, redirectsRemaining: number) {
  if (!location || redirectsRemaining <= 0) throw new IcsFeedError("unreachable_feed", "The calendar feed redirected unsafely.");
  return assertSafeIcsUrl(new URL(location, current).toString());
}

type ResolvedAddress = { address: string; family: number };

export function selectPublicAddress(addresses: ResolvedAddress[]) {
  if (!addresses.length || addresses.some(({ address }) => isBlockedIp(address))) {
    throw new IcsFeedError("invalid_link", "The calendar host resolves to a private or unsafe address.");
  }
  // Vercel's outbound network can receive an IPv6-first DNS response even when
  // that route is unavailable. Prefer a validated public IPv4 address, while
  // preserving IPv6 as a safe fallback for IPv6-only calendar hosts.
  return addresses.find(({ family }) => family === 4) ?? addresses[0];
}

async function resolvePublicAddress(hostname: string) {
  let addresses: ResolvedAddress[];
  try { addresses = await dnsLookup(hostname, { all: true, verbatim: true }) as Array<{ address: string; family: number }>; }
  catch { throw new IcsFeedError("unreachable_feed", "The calendar host could not be reached."); }
  return selectPublicAddress(addresses);
}

async function requestFeed(url: URL, redirectsRemaining: number): Promise<string> {
  const resolved = await resolvePublicAddress(url.hostname);
  return await new Promise<string>((resolve, reject) => {
    const request = httpsRequest(url, {
      method: "GET",
      family: resolved.family,
      headers: { Accept: "text/calendar, text/plain;q=0.9", "User-Agent": "Curated-Calendar/1.0" },
      lookup: (_hostname, _options, callback) => callback(null, resolved.address, resolved.family),
    }, (response) => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.resume();
        let redirected: URL;
        try { redirected = assertSafeIcsRedirect(url, response.headers.location, redirectsRemaining); }
        catch (error) { return reject(error); }
        return void requestFeed(redirected, redirectsRemaining - 1).then(resolve, reject);
      }
      if (status < 200 || status >= 300) {
        response.resume();
        const message = status === 401 || status === 403
          ? "Apple refused this subscription link. Make sure Public Calendar is enabled and copy a fresh link."
          : status === 404 || status === 410
            ? "Apple could not find this shared calendar. Copy a fresh Public Calendar link and try again."
            : status === 429
              ? "Apple is temporarily limiting calendar requests. Please wait a moment and try again."
              : status >= 500
                ? "Apple's calendar service is temporarily unavailable. Please try again shortly."
                : "The calendar feed returned an unsupported response.";
        return reject(new IcsFeedError("unreachable_feed", message));
      }
      const declaredSize = Number(response.headers["content-length"] || 0);
      if (declaredSize > MAX_FEED_BYTES) { response.resume(); return reject(new IcsFeedError("invalid_feed", "The calendar feed is too large.")); }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_FEED_BYTES) {
          request.destroy(new IcsFeedError("invalid_feed", "The calendar feed is too large."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    request.setTimeout(FETCH_TIMEOUT_MS, () => request.destroy(new IcsFeedError("unreachable_feed", "The calendar feed timed out.")));
    request.on("error", (error) => {
      if (!(error instanceof IcsFeedError)) {
        console.warn("ics_feed_transport_failed", { code: (error as NodeJS.ErrnoException).code || "unknown" });
      }
      reject(error instanceof IcsFeedError ? error : new IcsFeedError("unreachable_feed", "The calendar feed could not be reached."));
    });
    request.end();
  });
}

export async function fetchIcsFeed(input: string) {
  const url = assertSafeIcsUrl(input);
  const body = await requestFeed(url, MAX_REDIRECTS);
  assertValidIcsContent(body);
  return body;
}

export function assertValidIcsContent(body: string) {
  if (Buffer.byteLength(body, "utf8") > MAX_FEED_BYTES) throw new IcsFeedError("invalid_feed", "The calendar feed is too large.");
  if (!/^BEGIN:VCALENDAR\r?$/m.test(body) || !/^VERSION:2\.0\r?$/m.test(body) || !/^END:VCALENDAR\r?$/m.test(body)) {
    throw new IcsFeedError("invalid_feed", "The URL did not return a valid iCalendar feed.");
  }
}

function parameterText(value: ical.ParameterValue | undefined) {
  const text = typeof value === "string" ? value : value?.val;
  return typeof text === "string" ? text.trim() : "";
}

export function parseIcsEvents(input: { body: string; timeMin: string; timeMax: string; hmacKey: string; fallbackCalendarName?: string }) {
  let parsed: ical.CalendarResponse;
  try { parsed = ical.sync.parseICS(input.body); }
  catch { throw new IcsFeedError("invalid_feed", "The iCalendar feed could not be parsed."); }
  const from = new Date(input.timeMin);
  const to = new Date(input.timeMax);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new IcsFeedError("invalid_feed", "The requested calendar window is invalid.");
  const calendarName = String(parsed.vcalendar?.["WR-CALNAME"] || input.fallbackCalendarName || "Apple Calendar").trim().slice(0, 120) || "Apple Calendar";
  const events: CalendarEvent[] = [];
  const seen = new Set<string>();
  const components = Object.values(parsed).filter((component): component is ical.VEvent => component?.type === "VEVENT");
  if (components.length > 20_000) throw new IcsFeedError("invalid_feed", "The iCalendar feed contains too many events.");
  for (const event of components) {
    if (event.status === "CANCELLED") continue;
    let instances: ical.EventInstance[];
    try { instances = ical.expandRecurringEvent(event, { from, to, includeOverrides: true, excludeExdates: true, expandOngoing: true }); }
    catch { throw new IcsFeedError("invalid_feed", "A recurring calendar event could not be expanded."); }
    for (const instance of instances) {
      if (instance.event.status === "CANCELLED" || instance.end <= from || instance.start >= to) continue;
      const startTime = instance.start.toISOString();
      const endTime = instance.end.toISOString();
      const opaqueId = createHmac("sha256", input.hmacKey).update(`${event.uid}\0${startTime}`).digest("base64url");
      if (seen.has(opaqueId)) continue;
      seen.add(opaqueId);
      events.push({
        id: opaqueId,
        title: parameterText(instance.summary) || "Busy",
        startTime,
        endTime,
        location: parameterText(instance.event.location) || null,
        provider: "ics",
        calendarName,
        isAllDay: instance.isFullDay,
      });
      if (events.length >= 1_000) return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
  }
  return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function disconnectBehaviorForProvider(provider: "google" | "microsoft" | "ics") {
  return provider === "google" ? { revokeRemoteToken: true, deleteLocalCredentials: true } : { revokeRemoteToken: false, deleteLocalCredentials: true };
}
