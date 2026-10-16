import { getCurrentUser } from "@/actions/getCurrentUser";
import { RegisterForm } from "@/components/auth/auth-form"
import { redirect } from "next/navigation";

function safeCallbackUrl(value?: string | string[]) {
  const callbackUrl = Array.isArray(value) ? value[0] : value;
  if (
    !callbackUrl?.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes("\\") ||
    callbackUrl === "/auth" ||
    callbackUrl.startsWith("/auth/")
  ) {
    return "/";
  }
  return callbackUrl;
}

const Register = async ({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) => {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const user = await getCurrentUser();
  if (!user?.isNewUser) {
    redirect(callbackUrl);
  }

  return <RegisterForm user={user} callbackUrl={callbackUrl} />;
}

export default Register;