export const AUTH_COOKIE_KEY = "kyra_auth";
export const AUTH_ROLE_COOKIE_KEY = "kyra_role";
export const AUTH_TOKEN_COOKIE_KEY = "kyra_access_token";
export const AUTH_EXPIRES_COOKIE_KEY = "kyra_expires_at";
export const AUTH_REFRESH_TOKEN_COOKIE_KEY = "kyra_refresh_token";
export const AUTH_REFRESH_EXPIRES_COOKIE_KEY = "kyra_refresh_expires_at";
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60;

export const getCookieMaxAgeSeconds = (
  expiresAt?: string | null,
  fallback = DEFAULT_SESSION_MAX_AGE_SECONDS
) => {
  if (!expiresAt) {
    return fallback;
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return fallback;
  }

  const diffSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);
  return Math.max(0, diffSeconds);
};

const getClientCookieAttributes = (maxAge: number) => {
  const attributes = [`Path=/`, `Max-Age=${maxAge}`, "SameSite=Lax"];

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
};

const setClientCookie = (
  name: string,
  value: string,
  maxAge = DEFAULT_SESSION_MAX_AGE_SECONDS
) => {
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
  refreshToken,
  refreshTokenExpiresAt,
}: {
  role: string;
  accessToken?: string | null;
  expiresAt?: string | null;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: string | null;
}) => {
  const accessMaxAge = getCookieMaxAgeSeconds(expiresAt);
  const refreshMaxAge = getCookieMaxAgeSeconds(refreshTokenExpiresAt, accessMaxAge);

  setClientCookie(AUTH_COOKIE_KEY, "1", refreshMaxAge);
  setClientCookie(AUTH_ROLE_COOKIE_KEY, role, refreshMaxAge);

  if (accessToken) {
    setClientCookie(AUTH_TOKEN_COOKIE_KEY, accessToken, accessMaxAge);
  } else {
    clearClientCookie(AUTH_TOKEN_COOKIE_KEY);
  }

  if (expiresAt) {
    setClientCookie(AUTH_EXPIRES_COOKIE_KEY, expiresAt, accessMaxAge);
  } else {
    clearClientCookie(AUTH_EXPIRES_COOKIE_KEY);
  }

  if (refreshToken) {
    setClientCookie(AUTH_REFRESH_TOKEN_COOKIE_KEY, refreshToken, refreshMaxAge);
  } else {
    clearClientCookie(AUTH_REFRESH_TOKEN_COOKIE_KEY);
  }

  if (refreshTokenExpiresAt) {
    setClientCookie(
      AUTH_REFRESH_EXPIRES_COOKIE_KEY,
      refreshTokenExpiresAt,
      refreshMaxAge
    );
  } else {
    clearClientCookie(AUTH_REFRESH_EXPIRES_COOKIE_KEY);
  }
};

export const clearClientAuthCookies = () => {
  clearClientCookie(AUTH_COOKIE_KEY);
  clearClientCookie(AUTH_ROLE_COOKIE_KEY);
  clearClientCookie(AUTH_TOKEN_COOKIE_KEY);
  clearClientCookie(AUTH_EXPIRES_COOKIE_KEY);
  clearClientCookie(AUTH_REFRESH_TOKEN_COOKIE_KEY);
  clearClientCookie(AUTH_REFRESH_EXPIRES_COOKIE_KEY);
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
