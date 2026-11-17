/** Central place for env-driven business configuration. */
export const config = {
  /** Regular (wallet) members may not order once their due would exceed this (BDT). */
  maxWalletDue: Number(process.env.MAX_WALLET_DUE ?? 1000),
  /** How far ahead (days) a meal can be pre-ordered. */
  maxAdvanceDays: 42,
  /** Dev-only credentials login. */
  devLoginEnabled: process.env.ENABLE_DEV_LOGIN === "true",
  googleEnabled: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  superAdminEmails: (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  timezone: "Asia/Dhaka",
  defaultMealPrice: 160,
  brand: "Home Flavour Catering",
} as const;
