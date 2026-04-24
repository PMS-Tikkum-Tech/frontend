const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const EMAIL_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;
export const PHONE_DIGIT_MIN_LENGTH = 10;
export const PHONE_DIGIT_MAX_LENGTH = 14;
export const PHONE_INPUT_MAX_LENGTH = 16;
export const OTP_CODE_LENGTH = 6;
export const NIK_LENGTH = 16;

export const normalizeTextInput = (value: string) =>
  value.replace(/\s+/g, " ").trim();

export const sanitizeEmailInput = (value: string) =>
  value.replace(/\s+/g, "").trim().toLowerCase();

export const sanitizePhoneInput = (value: string) => {
  const trimmed = value.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "").slice(0, 15);

  if (!digits) {
    return hasLeadingPlus ? "+" : "";
  }

  return hasLeadingPlus ? `+${digits}` : digits;
};

export const sanitizeOtpInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH);

export const sanitizeNumericInput = (value: string, maxLength?: number) => {
  const digitsOnly = value.replace(/\D/g, "");
  return typeof maxLength === "number"
    ? digitsOnly.slice(0, maxLength)
    : digitsOnly;
};

export const sanitizeNikInput = (value: string) =>
  sanitizeNumericInput(value, NIK_LENGTH);

export const normalizePhoneNumber = (value: string) => {
  const sanitized = sanitizePhoneInput(value);

  if (!sanitized) {
    return "";
  }

  if (sanitized.startsWith("+")) {
    return sanitized;
  }

  if (sanitized.startsWith("62")) {
    return `+${sanitized}`;
  }

  if (sanitized.startsWith("0")) {
    return `+62${sanitized.slice(1)}`;
  }

  return `+62${sanitized}`;
};

export const isValidIndonesianMobileNumber = (value: string) => {
  const normalized = normalizePhoneNumber(value);
  const digits = normalized.replace(/\D/g, "");

  if (!digits.startsWith("62")) {
    return false;
  }

  const localNumber = digits.slice(2);

  return (
    /^8\d+$/.test(localNumber) &&
    localNumber.length >= PHONE_DIGIT_MIN_LENGTH - 1 &&
    localNumber.length <= PHONE_DIGIT_MAX_LENGTH - 1
  );
};

export const isStrongPassword = (value: string) =>
  value.length >= PASSWORD_MIN_LENGTH &&
  value.length <= PASSWORD_MAX_LENGTH &&
  STRONG_PASSWORD_PATTERN.test(value);

export const getTextValidationMessage = (
  value: string,
  options: {
    label: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  }
) => {
  const {
    label,
    required = false,
    minLength = 2,
    maxLength = 100,
  } = options;
  const normalized = normalizeTextInput(value);

  if (!normalized) {
    return required ? `${label} wajib diisi.` : null;
  }

  if (normalized.length < minLength) {
    return `${label} minimal ${minLength} karakter.`;
  }

  if (normalized.length > maxLength) {
    return `${label} maksimal ${maxLength} karakter.`;
  }

  return null;
};

export const getEmailValidationMessage = (
  value: string,
  options?: {
    label?: string;
    required?: boolean;
  }
) => {
  const label = options?.label || "Email";
  const required = options?.required ?? true;
  const normalized = sanitizeEmailInput(value);

  if (!normalized) {
    return required ? `${label} wajib diisi.` : null;
  }

  if (normalized.length > EMAIL_MAX_LENGTH) {
    return `${label} maksimal ${EMAIL_MAX_LENGTH} karakter.`;
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return `Format ${label.toLowerCase()} tidak valid.`;
  }

  return null;
};

export const getPhoneValidationMessage = (
  value: string,
  options?: {
    label?: string;
    required?: boolean;
  }
) => {
  const label = options?.label || "Nomor HP";
  const required = options?.required ?? false;
  const sanitized = sanitizePhoneInput(value);

  if (!sanitized || sanitized === "+") {
    return required ? `${label} wajib diisi.` : null;
  }

  if (
    !sanitized.startsWith("0") &&
    !sanitized.startsWith("62") &&
    !sanitized.startsWith("+62")
  ) {
    return `${label} harus diawali 08, 62, atau +62.`;
  }

  if (!isValidIndonesianMobileNumber(sanitized)) {
    return `${label} harus berupa nomor ponsel Indonesia yang valid, misalnya 081234567890.`;
  }

  return null;
};

export const getPasswordValidationMessage = (
  value: string,
  options?: {
    label?: string;
    required?: boolean;
  }
) => {
  const label = options?.label || "Kata sandi";
  const required = options?.required ?? true;

  if (!value) {
    return required ? `${label} wajib diisi.` : null;
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `${label} minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }

  if (value.length > PASSWORD_MAX_LENGTH) {
    return `${label} maksimal ${PASSWORD_MAX_LENGTH} karakter.`;
  }

  if (!STRONG_PASSWORD_PATTERN.test(value)) {
    return `${label} harus mengandung huruf besar, huruf kecil, dan angka.`;
  }

  return null;
};

export const getNikValidationMessage = (
  value: string,
  options?: {
    label?: string;
    required?: boolean;
  }
) => {
  const label = options?.label || "NIK";
  const required = options?.required ?? false;
  const sanitized = sanitizeNikInput(value);

  if (!sanitized) {
    return required ? `${label} wajib diisi.` : null;
  }

  if (sanitized.length !== NIK_LENGTH) {
    return `${label} harus terdiri dari ${NIK_LENGTH} digit.`;
  }

  return null;
};
