import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type CurrentIdentity = {
  id: string | null;
  firstName: string;
  email: string | null;
  isAuthenticated: boolean;
};

export async function getCurrentIdentity(): Promise<CurrentIdentity> {
  const anonymous: CurrentIdentity = {
    id: null,
    firstName: "You",
    email: null,
    isAuthenticated: false,
  };
  if (!isSupabaseConfigured()) {
    return anonymous;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error) return anonymous;
    const claims = data?.claims;
    const metadata = claims?.user_metadata as Record<string, unknown> | undefined;
    const displayName =
      typeof metadata?.display_name === "string" ? metadata.display_name.trim() : "";
    const email = typeof claims?.email === "string" ? claims.email : null;

    return {
      id: typeof claims?.sub === "string" ? claims.sub : null,
      firstName: displayName || email?.split("@")[0] || "You",
      email,
      isAuthenticated: typeof claims?.sub === "string",
    };
  } catch {
    return anonymous;
  }
}
