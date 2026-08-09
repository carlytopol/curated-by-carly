import test from "node:test";
import assert from "node:assert/strict";
import { readConfirmationCredentials } from "../lib/auth/confirmation-credentials";
import { confirmationFallback } from "../lib/auth/confirmation-outcome";
import fs from "node:fs";

test("accepts Supabase token-hash confirmation links", () => {
  assert.deepEqual(
    readConfirmationCredentials(new URLSearchParams("token_hash=secure-token&type=signup")),
    { kind: "otp", tokenHash: "secure-token", type: "signup" },
  );
});

test("accepts Supabase PKCE confirmation links", () => {
  assert.deepEqual(
    readConfirmationCredentials(new URLSearchParams("code=authorization-code")),
    { kind: "code", code: "authorization-code" },
  );
});

test("rejects incomplete confirmation links", () => {
  assert.equal(readConfirmationCredentials(new URLSearchParams("type=signup")), null);
  assert.equal(readConfirmationCredentials(new URLSearchParams()), null);
});

test("a successful provider redirect without server-readable credentials asks for sign-in, not resend", () => {
  assert.equal(confirmationFallback({ credentials: null }), "confirmed-sign-in");
  assert.equal(confirmationFallback({ credentials: null, upstreamError: "otp_expired" }), "confirmation-error");
});

test("a completed confirmation with a missing PKCE verifier asks for sign-in", () => {
  assert.equal(confirmationFallback({
    credentials: { kind: "code", code: "confirmed-code" },
    errorCode: "flow_state_not_found",
  }), "confirmed-sign-in");
});

test("confirmation email sends the token hash directly to the server callback", () => {
  const template = fs.readFileSync("supabase/auth-confirmation-template.html", "utf8");
  assert.match(template, /RedirectTo.*token_hash=.*TokenHash.*type=signup/);
  assert.doesNotMatch(template, /\.ConfirmationURL/);
});

test("legacy implicit confirmation links can complete their browser session", () => {
  const component = fs.readFileSync("app/auth/_components/auth-hash-completion.tsx", "utf8");
  assert.match(component, /access_token/);
  assert.match(component, /refresh_token/);
  assert.match(component, /setSession/);
  assert.match(component, /location\.replace\("\/today"\)/);
});
