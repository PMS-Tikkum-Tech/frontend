const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_TIME_ZONE = "Asia/Jakarta";

export const getDueDateDeadline = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (DATE_ONLY_PATTERN.test(normalized)) {
    return new Date(`${normalized}T23:59:59.999+07:00`);
  }

  const dueDate = new Date(normalized);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  return dueDate;
};

export const isDueDateReached = (value?: string | null) => {
  const dueDate = getDueDateDeadline(value);
  if (!dueDate) {
    return false;
  }

  return Date.now() > dueDate.getTime();
};

export const formatDueDate = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return "-";
  }

  const dueDate = getDueDateDeadline(normalized);
  if (!dueDate) {
    return normalized;
  }

  const dateLabel = dueDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: PAYMENT_TIME_ZONE,
  });
  const timeLabel = dueDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: PAYMENT_TIME_ZONE,
  });

  return `${dateLabel}, ${timeLabel} WIB`;
};
