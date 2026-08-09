import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readConfirmationCredentials } from "@/lib/auth/confirmation-credentials";
import { confirmationFallback } from "@/lib/auth/confirmation-outcome";

export async function GET(request: NextRequest) {
  const credentials = readConfirmationCredentials(request.nextUrl.searchParams);
  const supabase = await createClient();
  if (!credentials) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(new URL("/today", request.url));
    const fallback = confirmationFallback({
      credentials,
      upstreamError: request.nextUrl.searchParams.get("error_code") || request.nextUrl.searchParams.get("error"),
    });
    return NextResponse.redirect(new URL(
      fallback === "confirmed-sign-in" ? "/auth/sign-in?confirmed=1" : "/auth/sign-in?error=confirmation",
      request.url,
    ));
  }
  const { error } = credentials.kind === "otp"
    ? await supabase.auth.verifyOtp({ type: credentials.type, token_hash: credentials.tokenHash })
    : await supabase.auth.exchangeCodeForSession(credentials.code);

  if (!error) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : null;
      const sex = user.user_metadata?.sex === "male" ? "male" : "female";
      const { error: profileError } = await supabase.from("user_profiles").upsert({
        user_id: user.id,
        display_name: displayName,
        sex,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (profileError) console.error("New-user profile initialization failed.", profileError.code);
    }
    return NextResponse.redirect(new URL("/today", request.url));
  }
  const fallback = confirmationFallback({ credentials, errorCode: error.code });
  return NextResponse.redirect(new URL(
    fallback === "confirmed-sign-in" ? "/auth/sign-in?confirmed=1" : "/auth/sign-in?error=confirmation",
    request.url,
  ));
}
