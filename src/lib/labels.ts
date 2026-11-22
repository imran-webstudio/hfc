const LABELS: Record<string, string> = {
  PENDING: "Pending",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  UNPAID: "Unpaid",
  WALLET_CHARGED: "Wallet charged",
  CASH_PAID: "Cash paid",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  WALLET: "Wallet",
  CASH: "Cash",
  DEPOSIT: "Deposit",
  DUE_PAYMENT: "Due payment",
  ADJUSTMENT: "Balance adjustment",
  REFUND: "Refund",
  ORDER_BILL: "Order bill",
  CASH_PAYMENT: "Cash paid",
};

/** Friendly label for an order, payment, slot, or account enum. Unknown values pass through. */
export function statusLabel(value: string): string {
  return LABELS[value] ?? value;
}

/** Human order number as shown to members and staff: #HF000001. */
export function orderNumberLabel(number: number): string {
  return `#HF${String(number).padStart(6, "0")}`;
}
