import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireCurrentUserId() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      throw new AuthenticationRequiredError();
    }

    return userId;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Authentication is not configured.");
  }

  const userId = process.env.CURATED_DEMO_USER_ID;

  if (!userId) {
    throw new Error(
      "CURATED_DEMO_USER_ID is not configured. Add Auth.js before deploying multi-user access.",
    );
  }

  return userId;
}
