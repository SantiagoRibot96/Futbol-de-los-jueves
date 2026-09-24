"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSeasonAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const makeActive = formData.get("makeActive") === "on";

  if (!name) {
    redirect(`/admin/seasons?error=${encodeURIComponent("Poné un nombre para la temporada.")}`);
  }

  await prisma.$transaction(async (tx) => {
    if (makeActive) {
      await tx.season.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    await tx.season.create({ data: { name, isActive: makeActive } });
  });

  revalidatePath("/admin/seasons");
  revalidatePath("/");
  redirect("/admin/seasons");
}

export async function activateSeasonAction(formData: FormData) {
  await requireAdmin();
  const seasonId = String(formData.get("seasonId") ?? "");
  if (!seasonId) return;

  await prisma.$transaction([
    prisma.season.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.season.update({ where: { id: seasonId }, data: { isActive: true } }),
  ]);

  revalidatePath("/admin/seasons");
  revalidatePath("/");
}
