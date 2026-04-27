// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_KEY,
  AUTH_EXPIRES_COOKIE_KEY,
  AUTH_ROLE_COOKIE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  isSessionExpired,
} from "@/lib/auth-cookies";

type SessionRole = "admin" | "owner" | "tenant";
type AuthMeResponse = {
  data?: {
    role?: string;
  };
};

const VALID_ROLES = new Set<SessionRole>(["admin", "owner", "tenant"]);

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

  return "/tenant";
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

  return `${req.nextUrl.protocol}//${req.nextUrl.hostname}:3001`;
};

const clearSessionCookies = (response: NextResponse) => {
  [AUTH_COOKIE_KEY, AUTH_ROLE_COOKIE_KEY, AUTH_TOKEN_COOKIE_KEY, AUTH_EXPIRES_COOKIE_KEY].forEach(
    (name) => {
      response.cookies.set({
        name,
        value: "",
        path: "/",
        maxAge: 0,
      });
    }
  );
};

const buildAuthRedirect = (req: NextRequest, nextPath: string) => {
  const loginUrl = new URL("/auth", req.url);
  loginUrl.searchParams.set("next", nextPath);

  const response = NextResponse.redirect(loginUrl);
  clearSessionCookies(response);
  return response;
};

const getValidatedRole = async (req: NextRequest): Promise<SessionRole | null> => {
  const accessToken = decodeCookieValue(req.cookies.get(AUTH_TOKEN_COOKIE_KEY)?.value);
  const expiresAt = decodeCookieValue(req.cookies.get(AUTH_EXPIRES_COOKIE_KEY)?.value);

  if (!accessToken || isSessionExpired(expiresAt)) {
    return null;
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
      return null;
    }

    const payload = (await response.json()) as AuthMeResponse;
    const role = payload.data?.role;

    if (!role || !VALID_ROLES.has(role as SessionRole)) {
      return null;
    }

    return role as SessionRole;
  } catch {
    return null;
  }
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search;
  const requiredRole = getRequiredRole(pathname);
  const validatedRole = await getValidatedRole(req);

  if (requiredRole) {
    if (!validatedRole) {
      return buildAuthRedirect(req, `${pathname}${search}`);
    }

    if (validatedRole !== requiredRole) {
      return NextResponse.redirect(
        new URL(getDefaultRouteByRole(validatedRole), req.url)
      );
    }
  }

  if (pathname === "/auth") {
    if (!validatedRole) {
      const response = NextResponse.next();
      clearSessionCookies(response);
      return response;
    }

    return NextResponse.redirect(
      new URL(
        resolveRoleRoute(validatedRole, req.nextUrl.searchParams.get("next")),
        req.url
      )
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/tenant/:path*", "/auth"],
};
