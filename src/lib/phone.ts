export const normalizePhoneNumber = (value: string) => {
  const compact = value.replace(/\s+/g, "").replace(/-/g, "");

  if (compact.startsWith("+")) {
    return compact;
  }

  if (compact.startsWith("62")) {
    return `+${compact}`;
  }

  if (compact.startsWith("0")) {
    return `+62${compact.slice(1)}`;
  }

  return `+62${compact}`;
};
