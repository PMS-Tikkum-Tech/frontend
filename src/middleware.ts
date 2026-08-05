import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type SessionRole = "admin" | "finance" | "owner" | "tenant";

const ACCESS_COOKIE = "kyra_access_token";
const REFRESH_COOKIE = "kyra_refresh_token";
const VALID_ROLES = new Set<SessionRole>(["admin", "finance", "owner", "tenant"]);
const PRODUCTION_API_BASE_URLS: Record<string, string> = {
  "kikost.com": "https://api.kikost.com",
  "www.kikost.com": "https://api.kikost.com",
  "booking.kikost.com": "https://api.kikost.com",
  "app.kikost.com": "https://api.kikost.com",
  "dashboard.kikost.com": "https://api.kikost.com",
};

const getApiBaseUrl = (request: NextRequest) => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname)) {
    return "http://127.0.0.1:3002";
  }
  return PRODUCTION_API_BASE_URLS[request.nextUrl.hostname] ?? request.nextUrl.origin;
};

const requiredRoleFor = (pathname: string): SessionRole | null => {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/owner")) return "owner";
  if (pathname.startsWith("/tenant")) return "tenant";
  return null;
};

const defaultRouteFor = (role: SessionRole) => {
  if (role === "admin" || role === "finance") return "/admin";
  if (role === "owner") return "/owner";
  return "/";
};

const safeNextPath = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const fetchValidatedRole = async (request: NextRequest): Promise<SessionRole | null> => {
  if (!request.cookies.has(ACCESS_COOKIE)) return null;
  try {
    const response = await fetch(`${getApiBaseUrl(request)}/api/v1/auth/me`, {
      headers: { Accept: "application/json", Cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: { role?: string } };
    const role = payload.data?.role;
    return role && VALID_ROLES.has(role as SessionRole) ? role as SessionRole : null;
  } catch {
    return null;
  }
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requiredRole = requiredRoleFor(pathname);
  const hasRefreshSession = request.cookies.has(REFRESH_COOKIE);
  const validatedRole = await fetchValidatedRole(request);

  if (requiredRole) {
    if (!validatedRole && !hasRefreshSession) {
      const loginUrl = new URL("/auth", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (
      validatedRole &&
      validatedRole !== requiredRole &&
      !(requiredRole === "admin" && validatedRole === "finance")
    ) {
      return NextResponse.redirect(new URL(defaultRouteFor(validatedRole), request.url));
    }
  }

  if (pathname === "/auth" && validatedRole) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next ?? defaultRouteFor(validatedRole), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/tenant/:path*", "/auth"],
};
