export const AUTH_COOKIE_KEY = "kyra_auth";
export const AUTH_ROLE_COOKIE_KEY = "kyra_role";
export const AUTH_TOKEN_COOKIE_KEY = "kyra_access_token";
export const AUTH_EXPIRES_COOKIE_KEY = "kyra_expires_at";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const getClientCookieAttributes = (maxAge: number) => {
  const attributes = [`Path=/`, `Max-Age=${maxAge}`, "SameSite=Lax"];

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
};

const setClientCookie = (name: string, value: string, maxAge = SESSION_MAX_AGE_SECONDS) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; ${getClientCookieAttributes(maxAge)}`;
};

const clearClientCookie = (name: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; ${getClientCookieAttributes(0)}`;
};

export const syncClientAuthCookies = ({
  role,
  accessToken,
  expiresAt,
}: {
  role: string;
  accessToken?: string | null;
  expiresAt?: string | null;
}) => {
  setClientCookie(AUTH_COOKIE_KEY, "1");
  setClientCookie(AUTH_ROLE_COOKIE_KEY, role);

  if (accessToken) {
    setClientCookie(AUTH_TOKEN_COOKIE_KEY, accessToken);
  } else {
    clearClientCookie(AUTH_TOKEN_COOKIE_KEY);
  }

  if (expiresAt) {
    setClientCookie(AUTH_EXPIRES_COOKIE_KEY, expiresAt);
  } else {
    clearClientCookie(AUTH_EXPIRES_COOKIE_KEY);
  }
};

export const clearClientAuthCookies = () => {
  clearClientCookie(AUTH_COOKIE_KEY);
  clearClientCookie(AUTH_ROLE_COOKIE_KEY);
  clearClientCookie(AUTH_TOKEN_COOKIE_KEY);
  clearClientCookie(AUTH_EXPIRES_COOKIE_KEY);
};

export const isSessionExpired = (expiresAt?: string | null) => {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return false;
  }

  return Date.now() >= expiresAtMs;
};
