import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isTrustedMutation(request: NextRequest) {
  if (!unsafeMethods.has(request.method.toUpperCase())) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host === host && parsedOrigin.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export function createSecurityContext(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDevelopment = process.env.NODE_ENV === "development";
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  return { contentSecurityPolicy, requestHeaders };
}

export function secureResponse<T extends NextResponse>(
  response: T,
  request: NextRequest,
  contentSecurityPolicy: string,
) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  );
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  if (request.nextUrl.pathname.startsWith("/api")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return response;
}
