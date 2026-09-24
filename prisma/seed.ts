import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import type { MatchResult, Team } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Outcome = "G" | "P" | "E" | null;

async function ensurePlayer(name: string) {
  const existing = await prisma.player.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.player.create({ data: { name } });
}

async function ensureSeason(name: string, opts: { isActive?: boolean; isLegacy?: boolean } = {}) {
  const existing = await prisma.season.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.season.create({
    data: { name, isActive: opts.isActive ?? false, isLegacy: opts.isLegacy ?? false },
  });
}

/**
 * Reconstruye una temporada partido a partido a partir de la grilla
 * jugador x fecha de la planilla de Excel (G/P/E/null por celda), validada
 * contra los totales Pto/PJ/PG/PP/PE que ya figuraban ahi.
 */
async function seedMatchSeason(params: {
  seasonName: string;
  isActive?: boolean;
  playerNames: readonly string[];
  results: Outcome[][]; // [indice de jugador][indice de fecha]
  dates: string[];
}) {
  const { seasonName, isActive, playerNames, results, dates } = params;
  const season = await ensureSeason(seasonName, { isActive });

  const playerIds = new Map<string, string>();
  for (const name of playerNames) {
    const player = await ensurePlayer(name);
    playerIds.set(name, player.id);
  }

  for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
    const outcomes = playerNames
      .map((name, playerIndex) => ({ name, outcome: results[playerIndex][dateIndex] }))
      .filter((entry): entry is { name: string; outcome: "G" | "P" | "E" } => entry.outcome !== null);

    if (outcomes.length === 0) continue;

    const isDraw = outcomes.every((entry) => entry.outcome === "E");
    const result: MatchResult = isDraw ? "DRAW" : "A";

    const matchPlayersData = outcomes.map((entry, i) => {
      const team: Team = isDraw ? (i % 2 === 0 ? "A" : "B") : entry.outcome === "G" ? "A" : "B";
      return { playerId: playerIds.get(entry.name)!, team };
    });

    const existingMatch = await prisma.match.findFirst({
      where: { seasonId: season.id, date: new Date(dates[dateIndex]) },
    });
    if (existingMatch) continue;

    await prisma.match.create({
      data: {
        seasonId: season.id,
        date: new Date(dates[dateIndex]),
        result,
        players: { create: matchPlayersData },
      },
    });
  }

  console.log(`Seed: temporada "${seasonName}" (${playerNames.length} jugadores, ${dates.length} fechas).`);
}

/**
 * Temporada "congelada": solo se guarda la tabla final tal cual estaba en
 * la planilla (usada para Apertura 2025, que llevaba otro sistema de
 * puntos). No hay partidos, solo sirve para consulta.
 */
async function seedLegacySeason(params: {
  seasonName: string;
  rows: { name: string; points: number; played: number; won: number; lost: number; drawn: number }[];
}) {
  const { seasonName, rows } = params;
  const season = await ensureSeason(seasonName, { isLegacy: true });

  const existingCount = await prisma.legacyStanding.count({ where: { seasonId: season.id } });
  if (existingCount > 0) {
    console.log(`Seed: temporada congelada "${seasonName}" ya tenia datos, no se toca.`);
    return;
  }

  await prisma.legacyStanding.createMany({
    data: rows.map((row) => ({
      seasonId: season.id,
      playerName: row.name,
      points: row.points,
      played: row.played,
      won: row.won,
      lost: row.lost,
      drawn: row.drawn,
    })),
  });

  console.log(`Seed: temporada congelada "${seasonName}" (${rows.length} jugadores).`);
}

// ---------------------------------------------------------------------------
// Clausura 2026 (temporada activa) - 8 fechas, 14 jugadores.
// ---------------------------------------------------------------------------

const CLAUSURA_2026_PLAYERS = [
  "Timo",
  "Tincho",
  "Mauro",
  "Pela",
  "Pochi",
  "Borsa",
  "Negro",
  "Ronan",
  "Santi (timo)",
  "Rocka",
  "Cepe",
  "Heladio",
  "Javi",
  "Santi R",
] as const;

// Columnas: 02/8 08/8 15/8 22/8 29/8 03/9 10/9 17/9
const CLAUSURA_2026_RESULTS: Outcome[][] = [
  ["G", "P", "G", "P", "G", "G", "E", "G"], // Timo
  ["P", "G", "G", "P", "G", "G", "E", "G"], // Tincho
  [null, "G", "G", "G", "P", "P", "E", "G"], // Mauro
  ["P", "G", "G", "P", "G", "P", "E", "P"], // Pela
  [null, null, "P", "G", null, "G", null, "G"], // Pochi
  ["P", "G", "G", null, null, null, "E", null], // Borsa
  ["G", "P", "P", "G", "P", "P", "E", "P"], // Negro
  ["G", "P", "P", "G", null, "P", "E", "P"], // Ronan
  [null, null, null, "P", "G", null, "E", "G"], // Santi (timo)
  ["G", "P", "P", "G", "P", null, null, null], // Rocka
  ["P", null, null, null, null, "G", "E", "P"], // Cepe
  ["G", "P", "P", null, null, null, null, null], // Heladio
  ["P", "G", null, "P", null, null, null, null], // Javi
  [null, null, null, null, "P", null, null, null], // Santi R
];

const CLAUSURA_2026_DATES = [
  "2026-08-02",
  "2026-08-08",
  "2026-08-15",
  "2026-08-22",
  "2026-08-29",
  "2026-09-03",
  "2026-09-10",
  "2026-09-17",
];

// ---------------------------------------------------------------------------
// Clausura 2025 - 24 fechas, 17 jugadores. Mismo sistema de puntos (3/1/0).
// ---------------------------------------------------------------------------

const CLAUSURA_2025_PLAYERS = [
  "Pela",
  "Pochi",
  "Mauro",
  "Conan",
  "Rocka",
  "Timo",
  "Tincho",
  "Nico",
  "Javi",
  "Negro",
  "Cepe",
  "Santi",
  "Hela",
  "Random random",
  "Tomas",
  "Ramiro",
  "Borsa",
] as const;

// Columnas: 03/8 10/8 17/8 24/8 31/8 07/9 14/9 21/9 28/9 04/10 11/10 18/10
//           25/10 02/11 09/11 16/11 23/11 30/11 06/12 13/12 20/12 27/12
//           04/1 11/1
const CLAUSURA_2025_RESULTS: Outcome[][] = [
  ["P", "E", "G", "P", "G", "P", "E", "G", "P", "P", "G", "G", "E", "G", "G", "E", "E", "G", "P", "G", null, "E", "E", "G"], // Pela
  ["G", "E", "P", "G", "G", null, "E", "G", "P", "P", "G", null, null, null, "G", "E", "E", "G", "G", "G", null, "E", "E", "P"], // Pochi
  [null, "E", "P", "G", "P", "G", "E", "P", "G", "G", "P", "G", "E", "P", "G", "E", "E", "P", "G", "P", null, null, "E", "G"], // Mauro
  ["G", "E", "P", "G", null, "G", "E", "G", "P", "P", "P", "G", "E", "P", "G", "E", "E", "P", null, "G", null, "E", "E", "P"], // Conan
  ["G", "E", "P", "G", "G", "G", null, "P", "G", "G", "G", "P", "E", "P", "P", "E", null, "P", "G", "P", null, null, "E", "P"], // Rocka
  ["P", null, "G", "P", "G", "G", "E", null, "G", "G", "G", null, "E", "P", null, null, null, null, null, "P", null, "E", "E", "G"], // Timo
  ["P", "E", "G", "P", "G", "P", "E", "P", "G", "P", "P", "P", "E", "G", "P", "E", "E", "G", "G", "P", null, null, null, null], // Tincho
  ["G", "E", "P", "G", "P", "G", "E", "G", "P", null, null, "P", null, "G", "G", "E", "E", null, "P", "P", null, "E", null, null], // Nico
  ["P", "E", "G", "P", "P", "P", "E", "G", "P", "G", "G", "P", "E", "P", null, null, null, "G", null, null, null, null, null, null], // Javi
  ["G", "E", null, null, null, null, null, "P", "G", "P", "P", "G", "E", "G", "P", "E", "E", "P", "P", null, null, "E", "E", "P"], // Negro
  ["P", "E", "G", "P", "P", "P", null, null, null, null, "P", "P", "E", "G", "P", "E", null, null, null, null, null, null, "E", "G"], // Cepe
  [null, null, null, null, null, null, "E", "P", null, "G", null, null, "E", null, "P", "E", null, "P", null, "G", null, "E", "E", "G"], // Santi
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "E", null, "P", "G", null, null, "E", "E", "P"], // Hela
  ["G", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], // Random random
  [null, null, null, null, "P", null, "E", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], // Tomas
  [null, null, null, null, "P", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null], // Ramiro
  Array(24).fill(null), // Borsa (no jugo esta temporada)
];

const CLAUSURA_2025_DATES = [
  "2025-08-03",
  "2025-08-10",
  "2025-08-17",
  "2025-08-24",
  "2025-08-31",
  "2025-09-07",
  "2025-09-14",
  "2025-09-21",
  "2025-09-28",
  "2025-10-04",
  "2025-10-11",
  "2025-10-18",
  "2025-10-25",
  "2025-11-02",
  "2025-11-09",
  "2025-11-16",
  "2025-11-23",
  "2025-11-30",
  "2025-12-06",
  "2025-12-13",
  "2025-12-20",
  "2025-12-27",
  "2026-01-04",
  "2026-01-11",
];

// ---------------------------------------------------------------------------
// Apertura 2026 - 11 fechas, mismo sistema de puntos (3/1/0). El resto de las
// fechas de esta temporada quedaron como #REF! en la planilla (formula rota)
// y el usuario confirmo que no tiene forma de recuperar esos resultados, asi
// que se omiten: los totales de esta temporada en la app van a ser mas bajos
// que los que figuraban en la planilla original.
// ---------------------------------------------------------------------------

const APERTURA_2026_PLAYERS = [
  "Cepe",
  "Tincho",
  "Pela",
  "Negro",
  "Heladio",
  "Timo",
  "Ronan",
  "Mauro",
  "Rocka",
  "Santi(Timo)",
  "Brian",
  "Sack(Timo)",
  "Random(Negro)",
  "S. Renzo",
  "Pochi",
  "Alejo",
  "Facu(pochi)",
  "Ismael(timo)",
  "Lentini",
  "Br1an(Negro)",
  "Esteban(santi)",
  "Javi",
  "Amigo(Timo)",
  "Ezequiel(Timo)",
] as const;

// Columnas: 09/3 15/3 22/3 29/3 05/4 12/4 19/4 26/4 05/5 12/5 19/5
const APERTURA_2026_RESULTS: Outcome[][] = [
  ["P", null, "G", null, "G", "G", "P", "G", "P", "G", "P"], // Cepe
  ["G", "P", "P", "G", "P", "G", "G", "G", "G", null, "G"], // Tincho
  ["P", "G", "G", "P", "G", "G", "P", "G", "P", "P", "P"], // Pela
  ["G", "G", "G", "P", "P", "P", "G", "P", "G", "G", "G"], // Negro
  [null, null, null, null, null, null, null, "G", "G", "G", "G"], // Heladio
  ["P", "P", "P", "G", "P", "G", "P", "G", "P", "P", "P"], // Timo
  ["P", "G", "G", "P", "P", null, "P", "P", "P", "G", "G"], // Ronan
  ["G", null, "P", "P", "P", "P", "G", "P", "G", null, "G"], // Mauro
  [null, null, null, null, null, null, null, "P", "G", "P", null], // Rocka
  [null, "P", null, null, "G", "G", "P", "G", null, "P", "P"], // Santi(Timo)
  [null, null, null, null, null, null, null, null, "P", "G", null], // Brian
  [null, "P", "P", "G", null, "P", null, "P", null, null, null], // Sack(Timo)
  [null, null, "G", null, null, null, null, null, null, null, null], // Random(Negro)
  ["G", null, null, null, "G", "P", null, null, null, null, null], // S. Renzo
  ["P", null, null, "P", "G", null, null, null, "G", null, null], // Pochi
  ["G", null, null, null, null, null, null, null, null, null, null], // Alejo
  [null, null, null, null, "G", null, null, null, null, null, null], // Facu(pochi)
  [null, null, null, null, null, null, null, null, "G", null, null], // Ismael(timo)
  [null, "G", null, null, null, null, null, null, null, null, null], // Lentini
  [null, "G", null, "P", null, null, null, null, null, null, null], // Br1an(Negro)
  [null, null, null, null, "G", "P", null, null, null, null, null], // Esteban(santi)
  [null, "P", null, null, null, null, null, null, null, null, null], // Javi
  [null, null, null, null, null, null, null, null, null, null, "P"], // Amigo(Timo)
  [null, null, null, null, null, null, null, null, "P", null, null], // Ezequiel(Timo)
];

const APERTURA_2026_DATES = [
  "2026-03-09",
  "2026-03-15",
  "2026-03-22",
  "2026-03-29",
  "2026-04-05",
  "2026-04-12",
  "2026-04-19",
  "2026-04-26",
  "2026-05-05",
  "2026-05-12",
  "2026-05-19",
];

// ---------------------------------------------------------------------------
// Apertura 2025 - sistema de puntos distinto (Gana 3 / Empata 2 / Pierde 1),
// a pedido del usuario se importa solo como tabla final de consulta.
// ---------------------------------------------------------------------------

const APERTURA_2025_LEGACY_ROWS = [
  { name: "Negro", points: 60, played: 24, won: 17, lost: 5, drawn: 2 },
  { name: "Conan", points: 53, played: 25, won: 13, lost: 10, drawn: 2 },
  { name: "Tincho", points: 48, played: 24, won: 11, lost: 11, drawn: 2 },
  { name: "Mauro", points: 45, played: 22, won: 11, lost: 10, drawn: 1 },
  { name: "Cepe", points: 39, played: 20, won: 9, lost: 10, drawn: 1 },
  { name: "Pela", points: 39, played: 25, won: 6, lost: 17, drawn: 2 },
  { name: "Timo", points: 37, played: 18, won: 9, lost: 8, drawn: 1 },
  { name: "Hela", points: 37, played: 14, won: 11, lost: 2, drawn: 1 },
  { name: "Rocka", points: 35, played: 21, won: 6, lost: 13, drawn: 2 },
  { name: "Nico", points: 31, played: 19, won: 5, lost: 12, drawn: 2 },
  { name: "Pochi", points: 28, played: 13, won: 7, lost: 5, drawn: 1 },
  { name: "Javi", points: 16, played: 7, won: 4, lost: 2, drawn: 1 },
  { name: "Viñas", points: 12, played: 6, won: 3, lost: 3, drawn: 0 },
  { name: "Lentini", points: 10, played: 4, won: 3, lost: 1, drawn: 0 },
  { name: "Benja/Facu", points: 6, played: 3, won: 1, lost: 1, drawn: 1 },
  { name: "Matias (amigo conan)", points: 6, played: 2, won: 2, lost: 0, drawn: 0 },
  { name: "Borsa", points: 4, played: 3, won: 0, lost: 2, drawn: 1 },
  { name: "Bocha", points: 3, played: 1, won: 1, lost: 0, drawn: 0 },
  { name: "Dami", points: 3, played: 1, won: 1, lost: 0, drawn: 0 },
  { name: "Santiago (timo)", points: 3, played: 1, won: 1, lost: 0, drawn: 0 },
  { name: "Agustin (conan)", points: 1, played: 1, won: 0, lost: 1, drawn: 0 },
  { name: "Brian", points: 1, played: 1, won: 0, lost: 1, drawn: 0 },
  { name: "Diego", points: 1, played: 1, won: 0, lost: 1, drawn: 0 },
  { name: "Diego (hermano)", points: 1, played: 1, won: 0, lost: 1, drawn: 0 },
  { name: "Ezequiel (timo)", points: 1, played: 1, won: 0, lost: 1, drawn: 0 },
  { name: "Ramiro", points: 1, played: 1, won: 0, lost: 1, drawn: 0 },
  { name: "Tomas (amigo diego)", points: 1, played: 1, won: 0, lost: 1, drawn: 0 },
];

async function main() {
  await seedMatchSeason({
    seasonName: "Clausura 2026",
    isActive: true,
    playerNames: CLAUSURA_2026_PLAYERS,
    results: CLAUSURA_2026_RESULTS,
    dates: CLAUSURA_2026_DATES,
  });

  await seedMatchSeason({
    seasonName: "Apertura 2026",
    playerNames: APERTURA_2026_PLAYERS,
    results: APERTURA_2026_RESULTS,
    dates: APERTURA_2026_DATES,
  });

  await seedMatchSeason({
    seasonName: "Clausura 2025",
    playerNames: CLAUSURA_2025_PLAYERS,
    results: CLAUSURA_2025_RESULTS,
    dates: CLAUSURA_2025_DATES,
  });

  await seedLegacySeason({
    seasonName: "Apertura 2025",
    rows: APERTURA_2025_LEGACY_ROWS,
  });

  // El plantel actual es el de la temporada activa (Clausura 2026). El resto
  // son invitados o jugadores de temporadas viejas: quedan en el historial
  // pero no deberian aparecer para elegir equipos en partidos nuevos.
  const { count } = await prisma.player.updateMany({
    where: { name: { notIn: [...CLAUSURA_2026_PLAYERS] } },
    data: { active: false },
  });
  console.log(`Marcados como inactivos ${count} jugadores que no son del plantel actual.`);

  console.log("Seed completo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
