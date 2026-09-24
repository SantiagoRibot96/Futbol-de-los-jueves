"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MatchResult, Team } from "@/generated/prisma/client";

function fail(message: string): never {
  redirect(`/admin/matches?error=${encodeURIComponent(message)}`);
}

export async function createMatchAction(formData: FormData) {
  await requireAdmin();

  const seasonId = String(formData.get("seasonId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const result = String(formData.get("result") ?? "");
  const teamAIds = formData.getAll("teamA").map(String).filter(Boolean);
  const teamBIds = formData.getAll("teamB").map(String).filter(Boolean);

  if (!seasonId) fail("Elegí la temporada.");
  if (!dateStr) fail("Elegí la fecha.");
  if (result !== "A" && result !== "B" && result !== "DRAW") fail("Elegí quién ganó o si empataron.");
  if (teamAIds.length === 0 || teamBIds.length === 0) fail("Cada equipo necesita al menos un jugador.");
  if (teamAIds.some((id) => teamBIds.includes(id))) fail("Un jugador no puede estar en los dos equipos.");

  await prisma.match.create({
    data: {
      seasonId,
      date: new Date(dateStr),
      result: result as MatchResult,
      players: {
        create: [
          ...teamAIds.map((playerId) => ({ playerId, team: "A" as Team })),
          ...teamBIds.map((playerId) => ({ playerId, team: "B" as Team })),
        ],
      },
    },
  });

  revalidatePath("/admin/matches");
  revalidatePath("/");
  redirect("/admin/matches");
}

export async function deleteMatchAction(formData: FormData) {
  await requireAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return;

  await prisma.match.delete({ where: { id: matchId } });
  revalidatePath("/admin/matches");
  revalidatePath("/");
}
