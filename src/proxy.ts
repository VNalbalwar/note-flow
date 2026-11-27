import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Runs before every page. Adds a strict Content-Security-Policy with a one-time
 * nonce, so only this app's own scripts can run, and sends signed-out visitors
 * away from the workspace early. Real access checks happen next to the data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (!getSessionCookie(request, { cookiePrefix: "huddle" })) {
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const dev = process.env.NODE_ENV !== "production";
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const host = process.env.NEXT_PUBLIC_SYNC_HOST || "localhost:8787";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  const sync = `${local ? "ws" : "wss"}://${host}`;

  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // The editor and animations set inline styles.
    "style-src 'self' 'unsafe-inline'",
    // https images: people can embed a picture by its web address.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${sync}${dev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(dev || request.nextUrl.protocol !== "https:" ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes or static files.
      source: "/((?!api|_next/static|_next/image|icon.svg|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
