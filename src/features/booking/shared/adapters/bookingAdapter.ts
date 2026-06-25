import type { TenantPayment } from "@/lib/dashboard/tenant.api";

export type BookingV2SubmissionResult = {
  id: number;
  bookingCode: string;
  status: string;
  statusLabel: string;
  totalAmount: number;
  dueDate: string | null;
};

export const adaptTenantPaymentToBookingV2Result = (
  payment: TenantPayment
): BookingV2SubmissionResult => ({
  id: payment.id,
  bookingCode: payment.invoice_id,
  status: payment.booking_status || payment.status,
  statusLabel: payment.booking_status_label || payment.status,
  totalAmount: payment.amount,
  dueDate: payment.due_date || null,
});
