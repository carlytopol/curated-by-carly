"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/security/paths";

export type AuthState = { message: string; code?: "confirmation_required" | "invalid_credentials" | "rate_limited" | "success" };

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(_state: AuthState, formData: FormData) {
  const email = formValue(formData, "email").toLowerCase();
  const password = formValue(formData, "password");
  if (!email || email.length > 254 || !password || password.length > 200) return { message: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { message: "Please confirm your email before signing in. Open the message from Curated, or request a fresh confirmation link below.", code: "confirmation_required" as const };
    if (error.code === "over_request_rate_limit" || error.status === 429) return { message: "There have been several sign-in attempts. Please wait a few minutes, then try again.", code: "rate_limited" as const };
    return { message: "That email and password combination was not recognized. Check for typing errors and try again.", code: "invalid_credentials" as const };
  }

  const requestedNext = formValue(formData, "next");
  redirect(safeInternalPath(requestedNext));
}

async function authRedirectOrigin() {
  const requestOrigin = (await headers()).get("origin");
  return process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || (process.env.NODE_ENV === "development" && requestOrigin ? requestOrigin : "http://localhost:3000");
}

export async function resendConfirmation(_state: AuthState, formData: FormData) {
  const email = formValue(formData, "email").toLowerCase();
  if (!email || email.length > 254) return { message: "Enter the email used to create your account." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${await authRedirectOrigin()}/auth/confirm` } });
  if (error?.status === 429 || error?.code === "over_email_send_rate_limit") return { message: "A confirmation email was recently requested. Please wait a minute and check your inbox and spam folder.", code: "rate_limited" as const };
  if (error) return { message: "We could not send a new confirmation email right now. Please try again shortly." };
  return { message: "A fresh confirmation link has been sent. Check your inbox and spam folder, then return here to sign in.", code: "success" as const };
}

export async function signUp(_state: AuthState, formData: FormData) {
  const displayName = formValue(formData, "displayName");
  const sex = formValue(formData, "sex");
  const email = formValue(formData, "email").toLowerCase();
  const password = formValue(formData, "password");

  const hasLetterAndNumber = /[A-Za-z]/.test(password) && /\d/.test(password);
  if (!displayName || displayName.length > 100 || !["female", "male"].includes(sex) || !email || email.length > 254 || password.length < 10 || password.length > 200 || !hasLetterAndNumber) {
    return { message: "Add your name, choose Female or Male, enter a valid email, and use a password of at least 10 characters with a letter and number." };
  }

  const origin = await authRedirectOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: { display_name: displayName, sex },
    },
  });

  if (!error && data.session && data.user) {
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      user_id: data.user.id,
      display_name: displayName,
      sex,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (profileError) console.error("Immediate new-user profile initialization failed.", profileError.code);
    redirect("/today");
  }

  return {
    message: error
      ? error.code === "over_email_send_rate_limit"
        ? "A confirmation email was recently requested. Check your inbox and spam folder before trying again."
        : "We could not create your account. If you have registered before, return to Sign in or request a fresh confirmation email."
      : "Your account has been created. Check your inbox and spam folder for Curated’s confirmation email before signing in.",
  };
}
