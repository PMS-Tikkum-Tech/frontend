export type UserRole = "admin" | "finance" | "owner" | "tenant";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  tenantStatus?: "unverified" | "verified" | "basic_completed" | "active" | null;
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
  full_name?: string | null;
  email?: string | null;
  role: UserRole;
  phone_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | number | null;
  relationship?: string | null;
  nik?: string | number | null;
  date_of_birth?: string | null;
  domicile_address?: string | null;
  occupation?: string | null;
  institution_name?: string | null;
  account_status?: "active" | "inactive" | "pending_verification";
  tenant_status?: "unverified" | "verified" | "basic_completed" | "active" | null;
  verification_status?: "UNVERIFIED" | "VERIFIED" | string | null;
  basic_profile_completed?: boolean;
  missing_basic_profile_fields?: string[];
  profile_picture_url?: string | null;
  identity_document_url?: string | null;
  selfie_photo_url?: string | null;
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
