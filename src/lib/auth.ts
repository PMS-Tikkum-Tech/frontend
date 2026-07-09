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

type GoogleLoginRequest = {
  id_token: string;
  google_access_token?: string;
  phone_verification_token?: string;
};

type RegisterRequest = {
  full_name: string;
  email: string;
  password: string;
  firebase_phone_token: string;
};

type OtpRequestPayload = {
  request_id: string;
  phone_number: string;
  expires_at?: string | null;
  resend_available_at?: string | null;
  debug_code?: string | null;
};

type OtpVerifyPayload = {
  phone_number: string;
  phone_verification_token: string;
  expires_at?: string | null;
};

type EmailCodeRequestPayload = {
  request_id: string;
  email: string;
  expires_at?: string | null;
  resend_available_at?: string | null;
  debug_code?: string | null;
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
  token: string;
  refreshToken: string;
  expiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
};

export type FirebaseSyncResult =
  | { requiresVerification: true; email: string }
  | AuthResult;

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
  token: payload.token,
  refreshToken: payload.refresh_token,
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

export const loginWithGoogle = async (
  data: GoogleLoginRequest
): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/google",
    data
  );

  return mapAuthPayload(res.data.data);
};

export const refreshAuthSession = async (refreshToken: string): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/refresh",
    {
      refresh_token: refreshToken,
    }
  );

  return mapAuthPayload(res.data.data);
};

export const requestTenantRegistrationOtp = async (phoneNumber: string) => {
  const res = await axiosInstance.post<ApiResponse<OtpRequestPayload>>(
    "/api/v1/auth/tenant/register/request_otp",
    {
      phone_number: phoneNumber,
    }
  );

  return {
    requestId: res.data.data.request_id,
    phoneNumber: res.data.data.phone_number,
    expiresAt: res.data.data.expires_at ?? null,
    resendAvailableAt: res.data.data.resend_available_at ?? null,
    debugCode: res.data.data.debug_code ?? null,
  };
};

export const resendTenantRegistrationOtp = async (phoneNumber: string) => {
  return requestTenantRegistrationOtp(phoneNumber);
};

export const verifyTenantRegistrationOtp = async (payload: {
  phoneNumber: string;
  code: string;
}) => {
  const res = await axiosInstance.post<ApiResponse<OtpVerifyPayload>>(
    "/api/v1/auth/tenant/register/verify_otp",
    {
      phone_number: payload.phoneNumber,
      code: payload.code,
    }
  );

  return {
    phoneNumber: res.data.data.phone_number,
    phoneVerificationToken: res.data.data.phone_verification_token,
    expiresAt: res.data.data.expires_at ?? null,
  };
};

export const completeTenantPhoneRegistration = async (payload: {
  phoneVerificationToken: string;
  fullName?: string;
}): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/tenant/register/complete_phone",
    {
      phone_verification_token: payload.phoneVerificationToken,
      full_name: payload.fullName?.trim() || undefined,
    }
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
    debugCode: res.data.data.debug_code ?? null,
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
  fullName?: string;
}): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/tenant/register/complete_email",
    {
      email_verification_token: payload.emailVerificationToken,
      full_name: payload.fullName?.trim() || undefined,
    }
  );

  return mapAuthPayload(res.data.data);
};

export const registerTenant = async (data: RegisterRequest): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/tenant/register",
    data
  );
  return mapAuthPayload(res.data.data);
};

export const syncFirebaseUser = async (idToken: string): Promise<FirebaseSyncResult> => {
  const res = await axiosInstance.post<ApiResponse<
    { requires_verification: true; email: string } | AuthPayload
  >>("/api/v1/auth/firebase/sync", { id_token: idToken });

  const data = res.data.data;

  if ("requires_verification" in data && data.requires_verification) {
    return { requiresVerification: true, email: data.email };
  }

  return mapAuthPayload(data as AuthPayload);
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
