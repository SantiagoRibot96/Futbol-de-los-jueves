"use server";

import { redirect } from "next/navigation";
import { verifyCredentials, setSessionCookie, clearSessionCookie } from "@/lib/auth";

function safeNextPath(next: FormDataEntryValue | null): string {
  const value = String(next ?? "/");
  return value.startsWith("/") ? value : "/";
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  const role = await verifyCredentials(username, password);
  if (!role) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await setSessionCookie(role);
  redirect(next);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
