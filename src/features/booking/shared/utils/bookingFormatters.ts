const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID");

export const formatBookingCurrency = (value?: number | null) => {
  if (!value || value <= 0) {
    return "Hubungi administrator";
  }

  return `Rp ${CURRENCY_FORMATTER.format(value)}`;
};

export const formatBookingLabel = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const formatBookingDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};
