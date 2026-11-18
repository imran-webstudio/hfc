"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { config } from "@/lib/config";

export async function signInWithGoogle() {
  if (!config.googleEnabled) redirect("/?error=google");
  await signIn("google", { redirectTo: "/app" });
}

/** Dev-only "sign in as" (requires ENABLE_DEV_LOGIN=true). */
export async function signInAsDev(formData: FormData) {
  if (!config.devLoginEnabled) redirect("/");
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("dev", { email, redirectTo: "/app" });
  } catch (e) {
    if (e instanceof AuthError) redirect("/?error=signin");
    throw e;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
