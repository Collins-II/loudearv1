import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ARTIST_PATHS = ["/artist"];
const CREATOR_STUDIO_PATHS = ["/studio/dashboard"];
const PRODUCER_PATHS = [
  "/studio/dashboard/admin/beats",
  "/studio/dashboard/upload/beat",
];
const PROTECTED_PATHS = [
  "/studio/dashboard",
  "/artist",
  "/upload",
  "/profile/edit",
  "/account",
  "/dashboard",
];

function isPathOrChild(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function safeCallbackUrl(value: string | null, origin: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.pathname.startsWith("/auth/") || url.pathname === "/auth") {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isRegistrationRoute = pathname === "/auth/register";

  const token = await getToken({
    req,
    secret: process.env.NEXT_AUTH_SECRET,
  });

  if (!token) {
    if (isRegistrationRoute) {
      return NextResponse.redirect(new URL("/auth", req.url));
    }
    if (!PROTECTED_PATHS.some((path) => isPathOrChild(pathname, path))) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  const isNewUser = token.isNewUser ?? false;
  const role = token.role ?? "fan";

  if (isNewUser) {
    if (!isRegistrationRoute) {
      const registerUrl = new URL("/auth/register", req.url);
      registerUrl.searchParams.set(
        "callbackUrl",
        `${pathname}${req.nextUrl.search}`
      );
      return NextResponse.redirect(registerUrl);
    }
    return NextResponse.next();
  }

  if (isRegistrationRoute) {
    const callbackUrl = safeCallbackUrl(
      req.nextUrl.searchParams.get("callbackUrl"),
      req.nextUrl.origin
    );
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  }

  const isArtistOrProducer = role === "artist" || role === "producer";

  if (
    PRODUCER_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    ) &&
    role !== "producer"
  ) {
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  // Creator studio routes
  if (
    ARTIST_PATHS.some((path) => isPathOrChild(pathname, path)) &&
    role !== "artist"
  ) {
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  if (
    CREATOR_STUDIO_PATHS.some((path) => isPathOrChild(pathname, path)) &&
    !isArtistOrProducer
  ) {
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
