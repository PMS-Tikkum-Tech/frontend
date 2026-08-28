// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_KEY,
  AUTH_EXPIRES_COOKIE_KEY,
  AUTH_REFRESH_EXPIRES_COOKIE_KEY,
  AUTH_REFRESH_TOKEN_COOKIE_KEY,
  AUTH_ROLE_COOKIE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  isSessionExpired,
} from "@/lib/auth-cookies";

type SessionRole =
  | "admin"
  | "finance"
  | "owner"
  | "tenant"
  | "housekeeper"
  | "technician";
type RequiredRole = "admin" | "finance" | "owner" | "tenant" | "staff";
type AuthMeResponse = {
  data?: {
    role?: string;
  };
};

type AuthRefreshResponse = {
  data?: {
    token?: string;
    refresh_token?: string;
    expires_at?: string | null;
    refresh_token_expires_at?: string | null;
    user?: {
      role?: string;
    };
  };
};

const VALID_ROLES = new Set<SessionRole>([
  "admin",
  "finance",
  "owner",
  "tenant",
  "housekeeper",
  "technician",
]);
const PRODUCTION_API_BASE_URLS: Record<string, string> = {
  "kikost.com": "https://api.kikost.com",
  "www.kikost.com": "https://api.kikost.com",
  "booking.kikost.com": "https://api.kikost.com",
  "app.kikost.com": "https://api.kikost.com",
  "dashboard.kikost.com": "https://api.kikost.com",
};
const ROOT_HOSTNAMES = new Set(["kikost.com", "www.kikost.com"]);
const BOOKING_HOSTNAMES = new Set(["booking.kikost.com"]);
const APP_HOSTNAMES = new Set(["app.kikost.com", "dashboard.kikost.com"]);
const KNOWN_HOSTNAMES = new Set([
  "kikost.com",
  "www.kikost.com",
  "booking.kikost.com",
  "app.kikost.com",
  "dashboard.kikost.com",
  "localhost",
  "127.0.0.1",
  "::1",
]);
const APP_PATH_PREFIXES = [
  "/admin",
  "/owner",
  "/tenant",
  "/staff",
  "/auth",
  "/verifikasi-email",
  "/__/auth/action",
];
const BOOKING_PATH_PREFIXES = ["/booking"];

const isSafeNextPath = (nextPath: string) => {
  try {
    const decodedPath = decodeURIComponent(nextPath);
    if (
      !decodedPath.startsWith("/") ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\")
    ) {
      return false;
    }

    const parsed = new URL(decodedPath, "https://app.kikost.com");
    return parsed.origin === "https://app.kikost.com";
  } catch {
    return false;
  }
};

const getDefaultRouteByRole = (role: string) => {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "finance") {
    return "/admin/financial";
  }

  if (role === "owner") {
    return "/owner";
  }

  if (role === "housekeeper" || role === "technician") {
    return "/staff/tasks";
  }

  return "/tenant/kost-saya";
};

const pathStartsWith = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const isAppPath = (pathname: string) =>
  APP_PATH_PREFIXES.some((prefix) => pathStartsWith(pathname, prefix));

const isBookingPath = (pathname: string) =>
  BOOKING_PATH_PREFIXES.some((prefix) => pathStartsWith(pathname, prefix));

const normalizeHostname = (value?: string | null) => {
  const candidate = value?.split(",")[0]?.trim().toLowerCase() || "";
  if (candidate.startsWith("[")) {
    return candidate.slice(1, candidate.indexOf("]"));
  }

  return candidate.split(":")[0] || "";
};

const getRequestHostname = (req: NextRequest) => {
  const candidates = [
    req.headers.get("host"),
    req.headers.get("x-forwarded-host"),
    req.nextUrl.hostname,
  ];

  for (const candidate of candidates) {
    const hostname = normalizeHostname(candidate);
    if (KNOWN_HOSTNAMES.has(hostname)) {
      return hostname;
    }
  }

  return normalizeHostname(req.nextUrl.hostname);
};

const getRequiredRole = (pathname: string) => {
  if (pathname.startsWith("/admin/financial")) {
    return "finance";
  }

  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/owner")) {
    return "owner";
  }

  if (pathname.startsWith("/tenant")) {
    return "tenant";
  }

  if (pathname.startsWith("/staff")) {
    return "staff";
  }

  return null satisfies RequiredRole | null;
};

const roleMatchesRequirement = (
  role: SessionRole,
  requiredRole: RequiredRole
) =>
  role === requiredRole ||
  (requiredRole === "finance" && role === "admin") ||
  (requiredRole === "staff" &&
    (role === "housekeeper" || role === "technician"));

const resolveRoleRoute = (role: SessionRole, nextPath?: string | null) => {
  if (!nextPath || !isSafeNextPath(nextPath)) {
    return getDefaultRouteByRole(role);
  }

  const pathWithoutQuery = nextPath.split("?")[0]?.split("#")[0] || nextPath;
  if (pathWithoutQuery === "/tenant") {
    return "/";
  }

  const requiredRole = getRequiredRole(pathWithoutQuery);

  if (
    !requiredRole ||
    roleMatchesRequirement(role, requiredRole)
  ) {
    return nextPath;
  }

  return getDefaultRouteByRole(role);
};

const decodeCookieValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getApiBaseUrl = (req: NextRequest) => {
  return req.nextUrl.origin;
};

const buildHostRedirect = (req: NextRequest, hostname: string, pathname: string) => {
  const protocol = PRODUCTION_API_BASE_URLS[hostname]
    ? "https:"
    : req.nextUrl.protocol;
  const redirectUrl = new URL(pathname, `${protocol}//${hostname}`);
  redirectUrl.search = req.nextUrl.search;
  return redirectUrl;
};

const getSessionCookieOptions = (req: NextRequest, maxAge: number) => ({
  path: "/",
  maxAge,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: req.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production",
});

const clearSessionCookies = (response: NextResponse, req: NextRequest) => {
  [
    AUTH_COOKIE_KEY,
    AUTH_ROLE_COOKIE_KEY,
    AUTH_TOKEN_COOKIE_KEY,
    AUTH_EXPIRES_COOKIE_KEY,
    AUTH_REFRESH_TOKEN_COOKIE_KEY,
    AUTH_REFRESH_EXPIRES_COOKIE_KEY,
  ].forEach((name) => {
    response.cookies.set({
      name,
      value: "",
      ...getSessionCookieOptions(req, 0),
    });
  });
};

const buildAuthRedirect = (req: NextRequest, nextPath: string) => {
  const loginUrl = new URL("/auth", req.url);
  loginUrl.searchParams.set("next", nextPath);

  const response = NextResponse.redirect(loginUrl);
  clearSessionCookies(response, req);
  return response;
};

const applyUpstreamSessionCookies = (
  response: NextResponse,
  setCookies?: string[]
) => {
  setCookies?.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
};

const getSetCookieHeaders = (headers: Headers) => {
  const values = (headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie?.() ?? [];
  if (values.length > 0) return values;

  const fallback = headers.get("set-cookie");
  return fallback ? [fallback] : [];
};

const refreshValidatedSession = async (
  req: NextRequest
): Promise<{ role: SessionRole | null; setCookies?: string[] }> => {
  const hasRefreshCookie = Boolean(req.cookies.get(AUTH_REFRESH_TOKEN_COOKIE_KEY)?.value);
  const refreshExpiresAt = decodeCookieValue(
    req.cookies.get(AUTH_REFRESH_EXPIRES_COOKIE_KEY)?.value
  );

  if (!hasRefreshCookie || isSessionExpired(refreshExpiresAt)) {
    return { role: null };
  }

  try {
    const response = await fetch(`${getApiBaseUrl(req)}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (!response.ok) {
      return { role: null };
    }

    const payload = (await response.json()) as AuthRefreshResponse;
    const refreshed = payload.data;
    const role = refreshed?.user?.role;

    if (!refreshed || !role || !VALID_ROLES.has(role as SessionRole)) {
      return { role: null };
    }

    return {
      role: role as SessionRole,
      setCookies: getSetCookieHeaders(response.headers),
    };
  } catch {
    return { role: null };
  }
};

const getValidatedSession = async (
  req: NextRequest
): Promise<{ role: SessionRole | null; setCookies?: string[] }> => {
  const hasAccessCookie = Boolean(req.cookies.get(AUTH_TOKEN_COOKIE_KEY)?.value);
  const expiresAt = decodeCookieValue(req.cookies.get(AUTH_EXPIRES_COOKIE_KEY)?.value);

  if (!hasAccessCookie || isSessionExpired(expiresAt)) {
    return refreshValidatedSession(req);
  }

  try {
    const response = await fetch(`${getApiBaseUrl(req)}/api/v1/auth/me`, {
      headers: {
        Accept: "application/json",
        Cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return refreshValidatedSession(req);
    }

    const payload = (await response.json()) as AuthMeResponse;
    const role = payload.data?.role;

    if (!role || !VALID_ROLES.has(role as SessionRole)) {
      return refreshValidatedSession(req);
    }

    return { role: role as SessionRole };
  } catch {
    return refreshValidatedSession(req);
  }
};

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search;
  const hostname = getRequestHostname(req);

  if (hostname === "www.kikost.com") {
    return NextResponse.redirect(
      buildHostRedirect(req, "kikost.com", pathname),
      308
    );
  }

  if (hostname === "dashboard.kikost.com") {
    return NextResponse.redirect(
      buildHostRedirect(req, "app.kikost.com", pathname),
      308
    );
  }

  if (ROOT_HOSTNAMES.has(hostname)) {
    if (isBookingPath(pathname)) {
      return NextResponse.redirect(
        buildHostRedirect(req, "booking.kikost.com", pathname),
        308
      );
    }

    if (isAppPath(pathname)) {
      return NextResponse.redirect(
        buildHostRedirect(req, "app.kikost.com", pathname),
        308
      );
    }
  }

  if (BOOKING_HOSTNAMES.has(hostname)) {
    if (pathname === "/") {
      return NextResponse.redirect(
        buildHostRedirect(req, hostname, "/booking/v2"),
        308
      );
    }

    if (isAppPath(pathname)) {
      return NextResponse.redirect(
        buildHostRedirect(req, "app.kikost.com", pathname),
        308
      );
    }

    if (!isBookingPath(pathname)) {
      return NextResponse.redirect(
        buildHostRedirect(req, "kikost.com", pathname),
        308
      );
    }
  }

  if (APP_HOSTNAMES.has(hostname)) {
    if (pathname === "/") {
      return NextResponse.redirect(
        buildHostRedirect(req, "app.kikost.com", "/auth")
      );
    }

    if (isBookingPath(pathname)) {
      return NextResponse.redirect(
        buildHostRedirect(req, "booking.kikost.com", pathname),
        308
      );
    }

    if (!isAppPath(pathname)) {
      return NextResponse.redirect(
        buildHostRedirect(req, "kikost.com", pathname),
        308
      );
    }
  }

  const requiredRole = getRequiredRole(pathname);
  if (!requiredRole && pathname !== "/auth") {
    return NextResponse.next();
  }

  const validatedSession = await getValidatedSession(req);
  const validatedRole = validatedSession.role;

  if (requiredRole) {
    if (!validatedRole) {
      return buildAuthRedirect(req, `${pathname}${search}`);
    }

    if (
      !roleMatchesRequirement(validatedRole, requiredRole)
    ) {
      const response = NextResponse.redirect(
        new URL(getDefaultRouteByRole(validatedRole), req.url)
      );
      applyUpstreamSessionCookies(response, validatedSession.setCookies);
      return response;
    }
  }

  if (pathname === "/auth") {
    if (!validatedRole) {
      const response = NextResponse.next();
      clearSessionCookies(response, req);
      return response;
    }

    const response = NextResponse.redirect(
      new URL(
        resolveRoleRoute(validatedRole, req.nextUrl.searchParams.get("next")),
        req.url
      )
    );
    applyUpstreamSessionCookies(response, validatedSession.setCookies);
    return response;
  }

  const response = NextResponse.next();
  if (validatedRole) applyUpstreamSessionCookies(response, validatedSession.setCookies);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon-kikost.png|robots.txt|sitemap.xml).*)",
  ],
};
