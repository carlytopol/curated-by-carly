import { AuthForm } from "../_components/auth-form";
import { Wordmark } from "@/components/site/wordmark";
import { AuthHashCompletion } from "../_components/auth-hash-completion";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; confirmed?: string }>;
}) {
  const { next, error, confirmed } = await searchParams;
  return (
    <main className="editorial-shell min-h-[calc(100vh-97px)] px-4 py-8 sm:px-6 sm:py-20">
      <section className="paper-panel mx-auto max-w-md rounded-[1.5rem] p-6 sm:rounded-[2rem] sm:p-12">
        <div className="flex justify-center"><Wordmark byline="Private Wardrobe" /></div>
        <h1 className="mt-5 text-center font-serif text-5xl text-[#173d31]">Welcome back</h1>
        <p className="mt-4 leading-7 text-[#68736d]">Return to the wardrobe curated around you.</p>
        {error === "confirmation" && <p role="alert" className="mt-5 rounded-xl bg-[#fff1f2] px-4 py-3 text-sm leading-6 text-[#805844]">That confirmation link is incomplete or has expired. Request a fresh confirmation email below—there is no need to create another account.</p>}
        {confirmed === "1" && <p role="status" className="mt-5 rounded-xl bg-[#eef7f1] px-4 py-3 text-sm leading-6 text-[#315847]">Your email is confirmed. Sign in with the password you created to enter your private wardrobe.</p>}
        <AuthHashCompletion />
        <AuthForm mode="sign-in" nextPath={next} />
      </section>
    </main>
  );
}
