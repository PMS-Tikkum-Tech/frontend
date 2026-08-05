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

const buildContentSecurityPolicy = (nonce: string) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const connectSources = ["'self'", "https://api.kikost.com"];
  if (isDevelopment) {
    connectSources.push("http://localhost:3002", "http://127.0.0.1:3002");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDevelopment ? " 'unsafe-eval'" : ""
    }`,
    `style-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-inline'" : ""}`,
    `style-src-attr ${
      isDevelopment
        ? "'unsafe-inline'"
        : "'unsafe-hashes' 'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='"
    }`,
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
};

const applyReportOnlyCsp = (response: NextResponse, policy: string) => {
  response.headers.set("Content-Security-Policy-Report-Only", policy);
  return response;
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
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const pathname = request.nextUrl.pathname;
  const requiredRole = requiredRoleFor(pathname);
  const hasRefreshSession = request.cookies.has(REFRESH_COOKIE);
  const validatedRole = await fetchValidatedRole(request);

  if (requiredRole) {
    if (!validatedRole && !hasRefreshSession) {
      const loginUrl = new URL("/auth", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return applyReportOnlyCsp(
        NextResponse.redirect(loginUrl),
        contentSecurityPolicy,
      );
    }

    if (
      validatedRole &&
      validatedRole !== requiredRole &&
      !(requiredRole === "admin" && validatedRole === "finance")
    ) {
      return applyReportOnlyCsp(
        NextResponse.redirect(new URL(defaultRouteFor(validatedRole), request.url)),
        contentSecurityPolicy,
      );
    }
  }

  if (pathname === "/auth" && validatedRole) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return applyReportOnlyCsp(
      NextResponse.redirect(
        new URL(next ?? defaultRouteFor(validatedRole), request.url),
      ),
      contentSecurityPolicy,
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  return applyReportOnlyCsp(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy,
  );
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
