export function safeInternalPath(value: string, fallback = "/today") {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://curated.invalid");
    return parsed.origin === "https://curated.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}
