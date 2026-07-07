// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_KEY,
  AUTH_EXPIRES_COOKIE_KEY,
  AUTH_REFRESH_EXPIRES_COOKIE_KEY,
  AUTH_REFRESH_TOKEN_COOKIE_KEY,
  AUTH_ROLE_COOKIE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  getCookieMaxAgeSeconds,
  isSessionExpired,
} from "@/lib/auth-cookies";

type SessionRole = "admin" | "owner" | "tenant";
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

const VALID_ROLES = new Set<SessionRole>(["admin", "owner", "tenant"]);
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

const isSafeNextPath = (nextPath: string) => {
  return nextPath.startsWith("/") && !nextPath.startsWith("//");
};

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

const resolveRoleRoute = (role: SessionRole, nextPath?: string | null) => {
  if (!nextPath || !isSafeNextPath(nextPath)) {
    return getDefaultRouteByRole(role);
  }

  const pathWithoutQuery = nextPath.split("?")[0]?.split("#")[0] || nextPath;
  if (pathWithoutQuery === "/tenant") {
    return "/";
  }

  const requiredRole = getRequiredRole(pathWithoutQuery);

  if (!requiredRole || requiredRole === role) {
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
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  const hostname = req.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return `${req.nextUrl.protocol}//127.0.0.1:3001`;
  }

  const mappedProductionApiBaseUrl = PRODUCTION_API_BASE_URLS[hostname];
  if (mappedProductionApiBaseUrl) {
    return mappedProductionApiBaseUrl;
  }

  return req.nextUrl.origin;
};

const buildHostRedirect = (req: NextRequest, hostname: string, pathname: string) => {
  const redirectUrl = new URL(pathname, `${req.nextUrl.protocol}//${hostname}`);
  redirectUrl.search = req.nextUrl.search;
  return redirectUrl;
};

const clearSessionCookies = (response: NextResponse) => {
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
      path: "/",
      maxAge: 0,
    });
  });
};

const buildAuthRedirect = (req: NextRequest, nextPath: string) => {
  const loginUrl = new URL("/auth", req.url);
  loginUrl.searchParams.set("next", nextPath);

  const response = NextResponse.redirect(loginUrl);
  clearSessionCookies(response);
  return response;
};

const applySessionCookies = (
  response: NextResponse,
  payload: NonNullable<AuthRefreshResponse["data"]>,
  role: SessionRole
) => {
  const accessMaxAge = getCookieMaxAgeSeconds(payload.expires_at);
  const refreshMaxAge = getCookieMaxAgeSeconds(
    payload.refresh_token_expires_at,
    accessMaxAge
  );

  response.cookies.set({
    name: AUTH_COOKIE_KEY,
    value: "1",
    path: "/",
    maxAge: refreshMaxAge,
  });
  response.cookies.set({
    name: AUTH_ROLE_COOKIE_KEY,
    value: role,
    path: "/",
    maxAge: refreshMaxAge,
  });
  response.cookies.set({
    name: AUTH_TOKEN_COOKIE_KEY,
    value: payload.token || "",
    path: "/",
    maxAge: accessMaxAge,
  });
  response.cookies.set({
    name: AUTH_EXPIRES_COOKIE_KEY,
    value: payload.expires_at || "",
    path: "/",
    maxAge: accessMaxAge,
  });
  response.cookies.set({
    name: AUTH_REFRESH_TOKEN_COOKIE_KEY,
    value: payload.refresh_token || "",
    path: "/",
    maxAge: refreshMaxAge,
  });
  response.cookies.set({
    name: AUTH_REFRESH_EXPIRES_COOKIE_KEY,
    value: payload.refresh_token_expires_at || "",
    path: "/",
    maxAge: refreshMaxAge,
  });
};

const refreshValidatedSession = async (
  req: NextRequest
): Promise<{ role: SessionRole | null; refreshed?: NonNullable<AuthRefreshResponse["data"]> }> => {
  const refreshToken = decodeCookieValue(
    req.cookies.get(AUTH_REFRESH_TOKEN_COOKIE_KEY)?.value
  );
  const refreshExpiresAt = decodeCookieValue(
    req.cookies.get(AUTH_REFRESH_EXPIRES_COOKIE_KEY)?.value
  );

  if (!refreshToken || isSessionExpired(refreshExpiresAt)) {
    return { role: null };
  }

  try {
    const response = await fetch(`${getApiBaseUrl(req)}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
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
      refreshed,
    };
  } catch {
    return { role: null };
  }
};

const getValidatedSession = async (
  req: NextRequest
): Promise<{ role: SessionRole | null; refreshed?: NonNullable<AuthRefreshResponse["data"]> }> => {
  const accessToken = decodeCookieValue(req.cookies.get(AUTH_TOKEN_COOKIE_KEY)?.value);
  const expiresAt = decodeCookieValue(req.cookies.get(AUTH_EXPIRES_COOKIE_KEY)?.value);

  if (!accessToken || isSessionExpired(expiresAt)) {
    return refreshValidatedSession(req);
  }

  try {
    const response = await fetch(`${getApiBaseUrl(req)}/api/v1/auth/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
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

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search;
  const hostname = req.nextUrl.hostname;

  if (ROOT_HOSTNAMES.has(hostname)) {
    if (pathname.startsWith("/booking/v2")) {
      return NextResponse.redirect(
        buildHostRedirect(req, "booking.kikost.com", "/booking/v2")
      );
    }

    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/owner") ||
      pathname.startsWith("/tenant")
    ) {
      return NextResponse.redirect(buildHostRedirect(req, "app.kikost.com", pathname));
    }
  }

  if (BOOKING_HOSTNAMES.has(hostname)) {
    if (pathname === "/") {
      return NextResponse.redirect(
        buildHostRedirect(req, hostname, "/booking/v2")
      );
    }

    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/owner") ||
      pathname.startsWith("/tenant")
    ) {
      return NextResponse.redirect(buildHostRedirect(req, "app.kikost.com", pathname));
    }
  }

  if (APP_HOSTNAMES.has(hostname)) {
    if (pathname === "/") {
      return NextResponse.redirect(buildHostRedirect(req, hostname, "/tenant"));
    }

    if (pathname.startsWith("/booking/v2")) {
      return NextResponse.redirect(
        buildHostRedirect(req, "booking.kikost.com", "/booking/v2")
      );
    }
  }

  if (pathname === "/tenant") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const requiredRole = getRequiredRole(pathname);
  const validatedSession = await getValidatedSession(req);
  const validatedRole = validatedSession.role;

  if (requiredRole) {
    if (!validatedRole) {
      return buildAuthRedirect(req, `${pathname}${search}`);
    }

    if (validatedRole !== requiredRole) {
      const response = NextResponse.redirect(
        new URL(getDefaultRouteByRole(validatedRole), req.url)
      );
      if (validatedSession.refreshed) {
        applySessionCookies(response, validatedSession.refreshed, validatedRole);
      }
      return response;
    }
  }

  if (pathname === "/auth") {
    if (!validatedRole) {
      const response = NextResponse.next();
      clearSessionCookies(response);
      return response;
    }

    const response = NextResponse.redirect(
      new URL(
        resolveRoleRoute(validatedRole, req.nextUrl.searchParams.get("next")),
        req.url
      )
    );
    if (validatedSession.refreshed) {
      applySessionCookies(response, validatedSession.refreshed, validatedRole);
    }
    return response;
  }

  const response = NextResponse.next();
  if (validatedRole && validatedSession.refreshed) {
    applySessionCookies(response, validatedSession.refreshed, validatedRole);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/tenant/:path*", "/auth"],
};
