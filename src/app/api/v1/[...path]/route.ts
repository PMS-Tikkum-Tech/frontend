import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "content-encoding",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const getBackendOrigin = () => {
  const configured =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return process.env.NODE_ENV === "production"
    ? "https://api.kikost.com"
    : "http://127.0.0.1:3001";
};

const getSetCookieHeaders = (headers: Headers) => {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = withGetSetCookie.getSetCookie?.() ?? [];
  if (values.length > 0) return values;

  const fallback = headers.get("set-cookie");
  return fallback ? [fallback] : [];
};

const appendLogoutCookieExpiry = (headers: Headers, secure: boolean) => {
  ["kyra_access_token", "kyra_refresh_token"].forEach((name) => {
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`
    );
  });
};

const proxyRequest = async (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) => {
  const { path } = await context.params;
  const isLogout = request.method === "DELETE" && path.join("/") === "auth/logout";
  const secureCookies =
    request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
  const target = new URL(`/api/v1/${path.join("/")}`, getBackendOrigin());
  target.search = request.nextUrl.search;

  const headers = new Headers();
  [
    "accept",
    "accept-language",
    "authorization",
    "content-type",
    "cookie",
    "if-none-match",
    "origin",
    "user-agent",
    "x-request-id",
  ].forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      cache: "no-store",
      redirect: "manual",
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit & { duplex?: "half" });
  } catch {
    const failureHeaders = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type": "application/json",
    });
    if (isLogout) appendLogoutCookieExpiry(failureHeaders, secureCookies);

    return new Response(
      JSON.stringify({ success: false, message: "Backend service unavailable" }),
      { status: 502, headers: failureHeaders }
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      responseHeaders.set(name, value);
    }
  });
  getSetCookieHeaders(upstream.headers).forEach((cookie) => {
    responseHeaders.append("Set-Cookie", cookie);
  });
  if (isLogout) appendLogoutCookieExpiry(responseHeaders, secureCookies);
  responseHeaders.set("Cache-Control", "private, no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
