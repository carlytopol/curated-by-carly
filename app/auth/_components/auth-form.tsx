"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendConfirmation, signIn, signUp, type AuthState } from "../actions";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  nextPath?: string;
};

const initialState: AuthState = { message: "" };
const inputClassName =
  "w-full border-b border-[#173d31]/20 bg-transparent px-0 py-3 text-base outline-none transition-colors placeholder:text-[#7b837e] focus:border-[#173d31]";

export function AuthForm({ mode, nextPath = "/today" }: AuthFormProps) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignIn = mode === "sign-in";
  const stateCode = "code" in state ? state.code : undefined;

  return (
    <>
    <form action={formAction} className="mt-10 space-y-7">
      {!isSignIn && (
        <>
          <label className="block text-sm text-[#59665f]">
            Your name
            <input name="displayName" className={inputClassName} autoComplete="name" required />
          </label>
          <fieldset>
            <legend className="text-sm text-[#59665f]">Which profile should Curated prepare?</legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[["female", "Female"], ["male", "Male"]].map(([value, label]) => (
                <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 border border-[#a07c45]/25 bg-white/55 px-4 text-sm text-[#3d2b32] has-[:checked]:border-[#603044] has-[:checked]:bg-[#ead9d8]/55">
                  <input type="radio" name="sex" value={value} required />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <label className="block text-sm text-[#59665f]">
        Email
        <input name="email" type="email" className={inputClassName} autoComplete="email" required />
      </label>
      <label className="block text-sm text-[#59665f]">
        Password
        <input
          name="password"
          type="password"
          minLength={isSignIn ? undefined : 10}
          maxLength={200}
          className={inputClassName}
          autoComplete={isSignIn ? "current-password" : "new-password"}
          required
        />
        {!isSignIn && <span className="mt-2 block text-xs leading-5 text-[#7b746d]">At least 10 characters, including a letter and a number.</span>}
      </label>
      {isSignIn && <input type="hidden" name="next" value={nextPath} />}
      {state.message && <p role={stateCode === "success" ? "status" : "alert"} aria-live="polite" className={`rounded-xl px-4 py-3 text-sm leading-6 ${stateCode === "success" ? "bg-[#edf4ee] text-[#315344]" : "bg-[#fff5f3] text-[#805844]"}`}>{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="brass-button w-full disabled:opacity-60"
      >
        {pending ? "Please wait…" : isSignIn ? "Enter your wardrobe" : "Create your private account"}
      </button>
      <p className="text-center text-sm text-[#68736d]">
        {isSignIn ? "New to Curated?" : "Already have an account?"}{" "}
        <Link className="underline underline-offset-4" href={isSignIn ? "/auth/sign-up" : "/auth/sign-in"}>
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
    {isSignIn && <ConfirmationResend />}
    </>
  );
}

function ConfirmationResend() {
  const [state, action, pending] = useActionState(resendConfirmation, initialState);
  return (
    <div className="mt-7 border-t border-[#a07c45]/20 pt-6">
      <p className="text-center text-xs leading-5 text-[#68736d]">Created an account but cannot sign in?</p>
      <details className="mt-3 rounded-xl border border-[#704154]/15 bg-white/55 px-4 py-3">
        <summary className="cursor-pointer text-center text-sm text-[#704154] underline underline-offset-4">Resend my confirmation email</summary>
        <div className="mt-4 space-y-3 border-t border-[#a07c45]/15 pt-4">
          <label className="block text-xs text-[#59665f]">Account email<input name="email" form="resend-confirmation-form" type="email" className={`${inputClassName} text-sm`} autoComplete="email" required /></label>
          <button form="resend-confirmation-form" disabled={pending} className="min-h-11 w-full rounded-full border border-[#704154]/25 bg-white px-4 text-sm text-[#54263a] disabled:opacity-50">{pending ? "Sending…" : "Send a fresh link"}</button>
          {state.message && <p role={state.code === "success" ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-xs leading-5 ${state.code === "success" ? "bg-[#edf4ee] text-[#315344]" : "bg-[#fff5f3] text-[#805844]"}`}>{state.message}</p>}
        </div>
      </details>
      <form id="resend-confirmation-form" action={action} />
    </div>
  );
}
