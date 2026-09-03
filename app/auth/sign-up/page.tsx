import { AuthForm } from "../_components/auth-form";

export default function SignUpPage() {
  return (
    <main className="editorial-shell min-h-[calc(100vh-97px)] px-4 py-8 sm:px-6 sm:py-20">
      <section className="paper-panel mx-auto max-w-md rounded-[1.5rem] p-6 sm:rounded-[2rem] sm:p-12">
        <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#a07c45]/45 font-serif text-3xl text-[#173d31] shadow-[inset_0_0_0_5px_rgba(160,124,69,0.05)]">C</div>
        <p className="editorial-kicker mt-6 text-center">Begin privately</p>
        <h1 className="mt-5 text-center font-serif text-5xl text-[#173d31]">Your Curated wardrobe</h1>
        <p className="mt-4 leading-7 text-[#68736d]">A personal space for how you dress, remember, and choose.</p>
        <AuthForm mode="sign-up" />
      </section>
    </main>
  );
}
