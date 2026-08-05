import axiosInstance from "./axios";
import type {
  ApiResponse,
  AuthPayload,
  BackendUser,
  SessionUser,
  UserRole,
} from "@/types/auth";

type LoginRequest = {
  email: string;
  password: string;
};

type EmailCodeRequestPayload = {
  request_id: string;
  email: string;
  expires_at?: string | null;
  resend_available_at?: string | null;
};

type EmailCodeVerifyPayload = {
  email: string;
  email_verification_token: string;
  expires_at?: string | null;
};

type ChangePasswordRequest = {
  userId: number;
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
};

export type AuthResult = {
  user: SessionUser;
  expiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
};

export const TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY =
  "kyra.pending.tenant.approval.notice";

const isSafeNextPath = (nextPath: string) => {
  return nextPath.startsWith("/") && !nextPath.startsWith("//");
};

const getRequiredRoleByPath = (path: string) => {
  if (path.startsWith("/admin")) {
    return "admin";
  }

  if (path.startsWith("/owner")) {
    return "owner";
  }

  if (path.startsWith("/tenant")) {
    return "tenant";
  }

  return null;
};

const mapUser = (user: BackendUser): SessionUser => ({
  id: user.id,
  name: user.full_name?.trim() || "Tenant KIKOST",
  email: user.email?.trim() || "",
  role: user.role,
  tenantStatus: user.tenant_status ?? null,
  avatar: user.profile_picture_url ?? null,
});

const mapAuthPayload = (payload: AuthPayload): AuthResult => ({
  user: mapUser(payload.user),
  expiresAt: payload.expires_at,
  refreshTokenExpiresAt: payload.refresh_token_expires_at,
});

export const getDefaultRouteByRole = (role: UserRole) => {
  if (role === "admin" || role === "finance") {
    return "/admin";
  }

  if (role === "owner") {
    return "/owner";
  }

  return "/";
};

export const resolveRoleRoute = (role: UserRole, nextPath?: string | null) => {
  if (!nextPath || !isSafeNextPath(nextPath)) {
    return getDefaultRouteByRole(role);
  }

  const pathWithoutQuery = nextPath.split("?")[0]?.split("#")[0] || nextPath;
  if (pathWithoutQuery === "/tenant") {
    return "/";
  }

  const requiredRole = getRequiredRoleByPath(pathWithoutQuery);

  if (
    !requiredRole ||
    requiredRole === role ||
    (requiredRole === "admin" && role === "finance")
  ) {
    return nextPath;
  }

  return getDefaultRouteByRole(role);
};

export const login = async (data: LoginRequest): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/login",
    data
  );
  return mapAuthPayload(res.data.data);
};

export const refreshAuthSession = async (): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/refresh",
    {}
  );

  return mapAuthPayload(res.data.data);
};

export const requestTenantRegistrationEmailCode = async (email: string) => {
  const res = await axiosInstance.post<ApiResponse<EmailCodeRequestPayload>>(
    "/api/v1/auth/tenant/register/request_email_code",
    {
      email,
    }
  );

  return {
    requestId: res.data.data.request_id,
    email: res.data.data.email,
    expiresAt: res.data.data.expires_at ?? null,
    resendAvailableAt: res.data.data.resend_available_at ?? null,
  };
};

export const verifyTenantRegistrationEmailCode = async (payload: {
  email: string;
  code: string;
}) => {
  const res = await axiosInstance.post<ApiResponse<EmailCodeVerifyPayload>>(
    "/api/v1/auth/tenant/register/verify_email_code",
    {
      email: payload.email,
      code: payload.code,
    }
  );

  return {
    email: res.data.data.email,
    emailVerificationToken: res.data.data.email_verification_token,
    expiresAt: res.data.data.expires_at ?? null,
  };
};

export const completeTenantEmailRegistration = async (payload: {
  emailVerificationToken: string;
  fullName: string;
  password: string;
  passwordConfirmation: string;
}): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/tenant/register/complete_email",
    {
      email_verification_token: payload.emailVerificationToken,
      full_name: payload.fullName.trim(),
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
    }
  );

  return mapAuthPayload(res.data.data);
};

export const requestPasswordReset = async (email: string): Promise<string> => {
  const response = await axiosInstance.post<ApiResponse<never>>(
    "/api/v1/auth/password/request",
    { email }
  );
  return response.data.message;
};

export const resetPassword = async (payload: {
  token: string;
  password: string;
  passwordConfirmation: string;
}): Promise<string> => {
  const response = await axiosInstance.post<ApiResponse<never>>(
    "/api/v1/auth/password/reset",
    {
      token: payload.token,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
    }
  );
  return response.data.message;
};

export const getMe = async (): Promise<SessionUser> => {
  const res = await axiosInstance.get<ApiResponse<BackendUser>>("/api/v1/auth/me");
  return mapUser(res.data.data);
};

export const logoutUser = async (): Promise<void> => {
  await axiosInstance.delete("/api/v1/auth/logout");
};

export const changePassword = async (
  payload: ChangePasswordRequest
): Promise<string> => {
  const res = await axiosInstance.patch<ApiResponse<BackendUser>>(
    `/api/v1/users/${payload.userId}`,
    {
      user: {
        current_password: payload.current_password,
        password: payload.new_password,
      },
    }
  );

  return res.data.message || "Kata sandi berhasil diperbarui.";
};
