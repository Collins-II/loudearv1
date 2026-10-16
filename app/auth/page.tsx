//import { AuthForm } from "@/components/auth/auth-form"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedCallback = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;
  const callbackUrl = requestedCallback?.startsWith("/") &&
    !requestedCallback.startsWith("//") &&
    !requestedCallback.includes("\\") &&
    !requestedCallback.startsWith("/auth/")
    ? requestedCallback
    : "/";

  const enabledProviders = [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? ["google"] : []),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET ? ["apple"] : []),
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? ["facebook"] : []),
  ];

  return <LoginForm callbackUrl={callbackUrl} enabledProviders={enabledProviders} />;
}
