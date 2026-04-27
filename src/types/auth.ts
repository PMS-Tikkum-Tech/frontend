export type UserRole = "admin" | "owner" | "tenant";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
};

export type AuthSession = {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  expiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
};

export type BackendUser = {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  phone_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | number | null;
  relationship?: string | null;
  nik?: string | number | null;
  account_status?: "active" | "inactive" | "pending_verification";
  profile_picture_url?: string | null;
};

export type AuthPayload = {
  user: BackendUser;
  token: string;
  refresh_token: string;
  expires_at?: string | null;
  refresh_token_expires_at?: string | null;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
};
