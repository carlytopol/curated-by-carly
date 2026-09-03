import type { EmailOtpType } from "@supabase/supabase-js";

export type ConfirmationCredentials =
  | { kind: "otp"; tokenHash: string; type: EmailOtpType }
  | { kind: "code"; code: string }
  | null;

export function readConfirmationCredentials(searchParams: URLSearchParams): ConfirmationCredentials {
  const tokenHash = searchParams.get("token_hash")?.trim();
  const type = searchParams.get("type")?.trim() as EmailOtpType | undefined;
  if (tokenHash && type) return { kind: "otp", tokenHash, type };

  const code = searchParams.get("code")?.trim();
  if (code) return { kind: "code", code };

  return null;
}
