import type { TenantCommunication } from "@/lib/dashboard/tenant.api";

const TENANT_NOTIFICATION_LAST_SEEN_KEY = "kyra.tenant.notifications.lastSeenAt";

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
};

export const getTenantNotificationTimestamp = (
  item: TenantCommunication
): number => {
  return Math.max(
    toTimestamp(item.updated_at),
    toTimestamp(item.sent_at),
    toTimestamp(item.scheduled_at),
    toTimestamp(item.created_at),
    toTimestamp(item.date_time)
  );
};

const getLastSeenAt = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    return toTimestamp(window.localStorage.getItem(TENANT_NOTIFICATION_LAST_SEEN_KEY));
  } catch {
    return 0;
  }
};

export const markTenantNotificationsAsSeen = (timestamp?: number) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextTimestamp =
    typeof timestamp === "number" && Number.isFinite(timestamp)
      ? timestamp
      : Date.now();

  try {
    window.localStorage.setItem(
      TENANT_NOTIFICATION_LAST_SEEN_KEY,
      new Date(nextTimestamp).toISOString()
    );
  } catch {
    // Ignore storage errors to avoid blocking UI updates.
  }
};

export const hasUnreadTenantNotifications = (items: TenantCommunication[]) => {
  if (items.length === 0) {
    return false;
  }

  const lastSeenAt = getLastSeenAt();
  if (lastSeenAt === 0) {
    return true;
  }

  return items.some((item) => getTenantNotificationTimestamp(item) > lastSeenAt);
};

export const getLatestTenantNotificationTimestamp = (
  items: TenantCommunication[]
) => {
  return items.reduce((latest, item) => {
    const current = getTenantNotificationTimestamp(item);
    return current > latest ? current : latest;
  }, 0);
};
