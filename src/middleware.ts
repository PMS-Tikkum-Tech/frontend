// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_KEY = "kyra_auth";
const AUTH_ROLE_COOKIE_KEY = "kyra_role";

const getDefaultRouteByRole = (role: string) => {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "owner") {
    return "/owner";
  }

  return "/";
};

const getRequiredRole = (pathname: string) => {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/owner")) {
    return "owner";
  }

  if (pathname.startsWith("/tenant")) {
    return "tenant";
  }

  return null;
};

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const requiredRole = getRequiredRole(pathname);
  const hasSession = req.cookies.get(AUTH_COOKIE_KEY)?.value === "1";
  const role = req.cookies.get(AUTH_ROLE_COOKIE_KEY)?.value;

  if (requiredRole) {
    if (!hasSession || !role) {
      const loginUrl = new URL("/auth", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== requiredRole) {
      return NextResponse.redirect(new URL(getDefaultRouteByRole(role), req.url));
    }
  }

  if (pathname === "/auth" && hasSession && role) {
    return NextResponse.redirect(new URL(getDefaultRouteByRole(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/tenant/:path*", "/auth"],
};
