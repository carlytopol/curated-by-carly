import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";
import {
  createSecurityContext,
  isTrustedMutation,
  secureResponse,
} from "@/lib/security/http";

const privatePrefixes = [
  "/closet",
  "/today",
  "/style-archive",
  "/history",
  "/personal-shopper",
  "/packing",
  "/profile",
  "/api",
];

function carrySessionCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  return destination;
}

export async function refreshSession(request: NextRequest) {
  const { contentSecurityPolicy, requestHeaders } = createSecurityContext(request);
  const secure = <T extends NextResponse>(response: T) =>
    secureResponse(response, request, contentSecurityPolicy);
  const isPrivate = privatePrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!isTrustedMutation(request)) {
    return secure(NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 }));
  }

  if (!isSupabaseConfigured()) {
    if (isPrivate && process.env.NODE_ENV === "production") {
      if (request.nextUrl.pathname.startsWith("/api")) {
        return secure(NextResponse.json({ error: "Authentication is unavailable." }, { status: 503 }));
      }
      const unavailableUrl = request.nextUrl.clone();
      unavailableUrl.pathname = "/auth/sign-in";
      unavailableUrl.search = "?error=configuration";
      return secure(NextResponse.redirect(unavailableUrl));
    }
    return secure(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user && isPrivate) {
    if (request.nextUrl.pathname.startsWith("/api")) {
      return secure(carrySessionCookies(
        supabaseResponse,
        NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      ));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", request.nextUrl.pathname);
    return secure(carrySessionCookies(supabaseResponse, NextResponse.redirect(url)));
  }

  return secure(supabaseResponse);
}
