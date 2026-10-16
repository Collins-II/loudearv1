"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { LoaderCircle, ShieldCheck, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const providers = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
] as const;

function ProviderMark({ provider }: { provider: (typeof providers)[number]["id"] }) {
  if (provider === "apple") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
        <path d="M16.7 12.8c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 6.8 1.1 9 .7 1.1 1.5 2.3 2.8 2.2 1.1-.1 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-.9 2.7-2.1.8-1.2 1.1-2.4 1.1-2.5s-2-.8-2-3.1ZM14.5 6.2c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.7-.9 2.6 1 0 1.9-.5 2.5-1.2Z" />
      </svg>
    );
  }
  if (provider === "facebook") {
    return <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[#1877f2] text-sm font-bold text-white">f</span>;
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.3 2.6C7.2 7.8 9.4 6 12 6Z" />
    </svg>
  );
}

export function LoginForm({
  callbackUrl = "/",
  enabledProviders = providers.map(({ id }) => id),
  className,
  ...props
}: React.ComponentProps<"div"> & { callbackUrl?: string; enabledProviders?: string[] }) {
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const continueWithProvider = async (provider: string) => {
    setPendingProvider(provider);
    setError(null);
    try {
      const onboardingUrl = new URL("/auth/register", window.location.origin);
      onboardingUrl.searchParams.set("callbackUrl", callbackUrl);
      const result = await signIn(provider, {
        callbackUrl: `${onboardingUrl.pathname}${onboardingUrl.search}`,
        redirect: false,
      });
      if (result?.error || !result?.url) {
        setError("We couldn't complete sign-in. Check your provider account and try again.");
        setPendingProvider(null);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
      setPendingProvider(null);
    }
  };

  return (
    <main className={cn("min-h-svh overflow-hidden bg-[#101a16] text-white", className)} {...props}>
      <div className="grid min-h-svh lg:grid-cols-[1fr_0.92fr]">
        <section className="relative flex min-h-svh flex-col px-6 py-7 sm:px-10 lg:px-16 xl:px-24">
          <Link href="/" className="inline-flex w-fit items-center gap-2.5" aria-label="LoudEar home">
            <span className="grid size-10 place-items-center rounded-full bg-[#b8f36b] text-[#142116]"><Volume2 className="size-5" /></span>
            <span className="text-lg font-semibold tracking-wide">loudear</span>
          </Link>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b8f36b]">Your sound, your people</p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Come for the music.<br />Stay for the feeling.</h1>
              <p className="mt-4 max-w-sm text-base leading-7 text-white/65">Sign in or create your LoudEar account to find your next favorite sound.</p>
            </div>

            <div className="space-y-3" aria-label="Sign in options">
              {providers.filter(({ id }) => enabledProviders.includes(id)).map((provider) => {
                const isPending = pendingProvider === provider.id;
                return (
                  <Button
                    key={provider.id}
                    type="button"
                    variant="outline"
                    onClick={() => continueWithProvider(provider.id)}
                    disabled={pendingProvider !== null}
                    aria-busy={isPending}
                    className={cn(
                      "h-12 w-full justify-center gap-3 rounded-full border-white/20 bg-transparent text-sm font-medium text-white hover:border-white/40 hover:bg-white/5 hover:text-white",
                      isPending && "border-[#b8f36b]/50 bg-white/5"
                    )}
                  >
                    {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <ProviderMark provider={provider.id} />}
                    {isPending ? `Connecting to ${provider.label}...` : `Continue with ${provider.label}`}
                  </Button>
                );
              })}
              {enabledProviders.length === 0 && <p role="alert" className="rounded-lg border border-rose-300/25 bg-rose-300/10 p-4 text-sm leading-6 text-rose-200">Sign-in is temporarily unavailable. Please try again later.</p>}
            </div>

            <div aria-live="polite" className="min-h-12 pt-4">
              {error ? <p role="alert" className="text-sm leading-6 text-rose-300">{error}</p> : (
                <p className="flex items-start gap-2 text-xs leading-5 text-white/50"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#b8f36b]" />Your provider securely confirms your identity. We never see your password.</p>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-white/45">
              By continuing, you agree to our <Link className="text-white/75 underline underline-offset-4 hover:text-white" href="/legal/terms">Terms</Link> and <Link className="text-white/75 underline underline-offset-4 hover:text-white" href="/legal/privacy-policy">Privacy Policy</Link>.
            </p>
          </div>

          <footer className="flex items-center justify-between gap-4 text-[11px] text-white/40">
            <span>© {new Date().getFullYear()} LoudEar</span>
            <Link href="/legal/privacy-policy" className="hover:text-white/70">Privacy & safety</Link>
          </footer>
        </section>

        <aside className="relative hidden min-h-svh overflow-hidden lg:block" aria-label="LoudEar music community">
          <Image src="/assets/images/yomaps-02.jpg" alt="Artist performing live on stage" fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101a16]/90 via-[#101a16]/15 to-[#101a16]/10" />
          <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
            <div className="mb-5 h-1 w-14 rounded-full bg-[#b8f36b]" />
            <p className="max-w-lg text-3xl font-semibold leading-tight xl:text-4xl">Every scene starts with someone pressing play.</p>
            <p className="mt-4 text-sm text-white/70">Discover artists and sounds from across the community.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}