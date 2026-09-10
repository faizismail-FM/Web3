import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Gates the authenticated application shell before a page renders, so an
 * anonymous visitor is redirected rather than briefly served a protected
 * layout. Server components and API routes still perform their own checks —
 * this is a first line of defence, not the only one.
 */
export default async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

/**
 * The landing page, public verification pages, auth screens and API routes are
 * deliberately absent: they must stay reachable without a session.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/organizations/:path*",
    "/activity/:path*",
    "/settings/:path*",
  ],
};
