import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

const errorMessages: Record<string, string> = {
  AccessDenied: "This sign-in method could not be approved for your account.",
  Configuration: "Sign-in is temporarily unavailable. Please try again shortly.",
  OAuthAccountNotLinked: "This email is already connected to another sign-in method.",
  OAuthSignin: "We could not start sign-in with that provider. Please try again.",
  OAuthCallback: "The provider could not complete sign-in. Please try again.",
  Verification: "This sign-in link is invalid or has expired.",
  Default: "We could not sign you in. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const message = errorMessages[error ?? ""] ?? errorMessages.Default;

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-16">
      <section className="w-full max-w-md border-t-2 border-destructive pt-8">
        <ShieldAlert className="size-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign-in didn’t work</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <Link
          href="/auth"
          className="mt-7 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}