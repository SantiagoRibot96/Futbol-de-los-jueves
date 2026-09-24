import "server-only";
import { prisma } from "./db";
import type { MatchResult, Team } from "@/generated/prisma/client";

export type Outcome = "G" | "P" | "E";

export type PlayerStanding = {
  playerId: string;
  name: string;
  points: number;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  average: number;
  /** Resultado en cada una de las ultimas fechas de la temporada (mas
   * reciente primero, como maximo 3). null = el jugador no jugo esa fecha. */
  lastResults: (Outcome | null)[];
};

function outcomeFor(team: Team, result: MatchResult): Outcome {
  if (result === "DRAW") return "E";
  return result === team ? "G" : "P";
}

export async function getStandings(seasonId: string): Promise<PlayerStanding[]> {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return [];
  if (season.isLegacy) return getLegacyStandings(seasonId);

  const matches = await prisma.match.findMany({
    where: { seasonId },
    include: { players: { include: { player: true } } },
    orderBy: { date: "asc" },
  });

  const byPlayer = new Map<string, { name: string; won: number; lost: number; drawn: number }>();

  for (const match of matches) {
    for (const mp of match.players) {
      const outcome = outcomeFor(mp.team, match.result);
      const entry = byPlayer.get(mp.playerId) ?? { name: mp.player.name, won: 0, lost: 0, drawn: 0 };
      if (outcome === "G") entry.won++;
      else if (outcome === "P") entry.lost++;
      else entry.drawn++;
      byPlayer.set(mp.playerId, entry);
    }
  }

  // Ultimas 3 fechas de la temporada (mas reciente primero), fijas para
  // todos los jugadores: si alguien no jugo esa fecha, le corresponde null.
  const lastMatches = [...matches].slice(-3).reverse();

  const standings: PlayerStanding[] = [];
  for (const [playerId, { name, won, lost, drawn }] of byPlayer) {
    const played = won + lost + drawn;
    const points = won * 3 + drawn;

    const lastResults = lastMatches.map((match) => {
      const mp = match.players.find((p) => p.playerId === playerId);
      return mp ? outcomeFor(mp.team, match.result) : null;
    });

    standings.push({
      playerId,
      name,
      points,
      played,
      won,
      lost,
      drawn,
      average: played > 0 ? points / played : 0,
      lastResults,
    });
  }

  return standings;
}

async function getLegacyStandings(seasonId: string): Promise<PlayerStanding[]> {
  const rows = await prisma.legacyStanding.findMany({ where: { seasonId } });

  return rows.map((row) => ({
    playerId: row.id,
    name: row.playerName,
    points: row.points,
    played: row.played,
    won: row.won,
    lost: row.lost,
    drawn: row.drawn,
    average: row.played > 0 ? row.points / row.played : 0,
    lastResults: [],
  }));
}

export async function listSeasons() {
  return prisma.season.findMany({ orderBy: { createdAt: "desc" } });
}

export async function listPlayableSeasons() {
  return prisma.season.findMany({ where: { isLegacy: false }, orderBy: { createdAt: "desc" } });
}

export async function getActiveSeason() {
  return prisma.season.findFirst({ where: { isActive: true } });
}
