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
  expiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
};

export type MfaSetupResult = {
  kind: "mfa-setup";
  enrollmentToken: string;
  secret: string;
  provisioningUri: string;
  expiresAt?: string | null;
};

export type MfaChallengeResult = {
  kind: "mfa-challenge";
  challengeToken: string;
  expiresAt?: string | null;
};

export type LoginResult = AuthResult | MfaSetupResult | MfaChallengeResult;

type BackendMfaSetupPayload = {
  mfa_setup_required: true;
  enrollment_token: string;
  secret: string;
  provisioning_uri: string;
  expires_at?: string | null;
};

type BackendMfaChallengePayload = {
  mfa_required: true;
  challenge_token: string;
  expires_at?: string | null;
};

export const TENANT_PENDING_APPROVAL_NOTICE_STORAGE_KEY =
  "kyra.pending.tenant.approval.notice";

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

const getRequiredRoleByPath = (path: string) => {
  if (path.startsWith("/admin/financial")) {
    return "finance";
  }

  if (path.startsWith("/admin")) {
    return "admin";
  }

  if (path.startsWith("/owner")) {
    return "owner";
  }

  if (path.startsWith("/tenant")) {
    return "tenant";
  }

  if (path.startsWith("/staff")) {
    return "staff";
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
  if (role === "admin") {
    return "/admin";
  }

  if (role === "finance") {
    return "/admin/financial";
  }

  if (role === "owner") {
    return "/owner";
  }

  if (role === "technician" || role === "housekeeper") {
    return "/staff/tasks";
  }

  return "/tenant/kost-saya";
};

export const resolveRoleRoute = (role: UserRole, nextPath?: string | null) => {
  if (!nextPath || !isSafeNextPath(nextPath)) {
    return getDefaultRouteByRole(role);
  }

  const pathWithoutQuery = nextPath.split("?")[0]?.split("#")[0] || nextPath;
  if (pathWithoutQuery === "/tenant") {
    return getDefaultRouteByRole(role);
  }

  const requiredRole = getRequiredRoleByPath(pathWithoutQuery);

  if (
    !requiredRole ||
    requiredRole === role ||
    (requiredRole === "finance" && role === "admin") ||
    (requiredRole === "staff" && (role === "technician" || role === "housekeeper"))
  ) {
    return nextPath;
  }

  return getDefaultRouteByRole(role);
};

export const login = async (data: LoginRequest): Promise<LoginResult> => {
  const res = await axiosInstance.post<ApiResponse<
    AuthPayload | BackendMfaSetupPayload | BackendMfaChallengePayload
  >>(
    "/api/v1/auth/login",
    data
  );
  const payload = res.data.data;

  if ("mfa_setup_required" in payload) {
    return {
      kind: "mfa-setup",
      enrollmentToken: payload.enrollment_token,
      secret: payload.secret,
      provisioningUri: payload.provisioning_uri,
      expiresAt: payload.expires_at,
    };
  }

  if ("mfa_required" in payload) {
    return {
      kind: "mfa-challenge",
      challengeToken: payload.challenge_token,
      expiresAt: payload.expires_at,
    };
  }

  return mapAuthPayload(payload);
};

export const confirmMfaEnrollment = async (payload: {
  enrollmentToken: string;
  code: string;
}): Promise<{ auth: AuthResult; recoveryCodes: string[] }> => {
  const res = await axiosInstance.post<ApiResponse<
    AuthPayload & { recovery_codes?: string[] }
  >>("/api/v1/auth/mfa/enrollment/confirm", {
    enrollment_token: payload.enrollmentToken,
    code: payload.code,
  });

  return {
    auth: mapAuthPayload(res.data.data),
    recoveryCodes: res.data.data.recovery_codes ?? [],
  };
};

export const verifyMfaChallenge = async (payload: {
  challengeToken: string;
  code?: string;
  recoveryCode?: string;
}): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/mfa/verify",
    {
      challenge_token: payload.challengeToken,
      code: payload.code,
      recovery_code: payload.recoveryCode,
    }
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

export const refreshAuthSession = async (): Promise<AuthResult> => {
  const res = await axiosInstance.post<ApiResponse<AuthPayload>>(
    "/api/v1/auth/refresh",
    {}
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
