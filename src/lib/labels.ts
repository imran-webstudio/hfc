const LABELS: Record<string, string> = {
  PENDING: "Pending",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  UNPAID: "Unpaid",
  WALLET_CHARGED: "Wallet charged",
  CASH_PAID: "Cash paid",
  DUE: "Due",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  WALLET: "Wallet",
  CASH: "Cash",
  DEPOSIT: "Deposit",
  DUE_PAYMENT: "Due payment",
  ADJUSTMENT: "Balance adjustment",
  REFUND: "Refund",
  REGULAR: "Regular",
  ONE_TIME: "One-time",
};

/** Friendly label for an order, payment, slot, or account enum. Unknown values pass through. */
export function statusLabel(value: string): string {
  return LABELS[value] ?? value;
}
