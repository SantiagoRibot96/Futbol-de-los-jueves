"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPlayerAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect(`/admin/players?error=${encodeURIComponent("Poné un nombre.")}`);
  }

  await prisma.player.create({ data: { name } });
  revalidatePath("/admin/players");
  revalidatePath("/");
  redirect("/admin/players");
}

export async function setPlayerActiveAction(formData: FormData) {
  await requireAdmin();
  const playerId = String(formData.get("playerId") ?? "");
  const active = formData.get("active") === "true";
  if (!playerId) return;

  await prisma.player.update({ where: { id: playerId }, data: { active } });
  revalidatePath("/admin/players");
  revalidatePath("/admin/matches");
}
