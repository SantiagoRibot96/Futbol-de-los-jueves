import { prisma } from "@/lib/db";
import { listPlayableSeasons } from "@/lib/stats";
import { SeasonSelect } from "@/components/SeasonSelect";
import { createMatchAction, deleteMatchAction } from "@/app/actions/matches";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function resultLabel(result: "A" | "B" | "DRAW") {
  if (result === "DRAW") return "Empate";
  return `Gana Equipo ${result}`;
}

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; error?: string }>;
}) {
  const { season, error } = await searchParams;
  const seasons = await listPlayableSeasons();

  const selectedSeasonId =
    (season && seasons.some((s) => s.id === season) ? season : undefined) ??
    seasons.find((s) => s.isActive)?.id ??
    seasons[0]?.id;

  const [players, matches] = await Promise.all([
    prisma.player.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    selectedSeasonId
      ? prisma.match.findMany({
          where: { seasonId: selectedSeasonId },
          include: { players: { include: { player: true } } },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Partidos</h1>
        {seasons.length > 0 && selectedSeasonId ? (
          <SeasonSelect seasons={seasons} selectedSeasonId={selectedSeasonId} basePath="/admin/matches" />
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {!selectedSeasonId ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Primero creá una temporada en /admin/seasons.
        </p>
      ) : (
        <>
          <form
            action={createMatchAction}
            className="mb-8 flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <input type="hidden" name="seasonId" value={selectedSeasonId} />

            <div className="flex flex-col gap-1">
              <label htmlFor="date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Fecha
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={todayISO()}
                className="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PlayerChecklist name="teamA" label="Equipo A" players={players} />
              <PlayerChecklist name="teamB" label="Equipo B" players={players} />
            </div>

            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Resultado</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="result" value="A" required /> Gana Equipo A
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="result" value="DRAW" /> Empate
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="result" value="B" /> Gana Equipo B
                </label>
              </div>
            </fieldset>

            <button
              type="submit"
              className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Guardar partido
            </button>
          </form>

          <ul className="flex flex-col gap-3">
            {matches.map((match) => {
              const teamA = match.players.filter((p) => p.team === "A").map((p) => p.player.name);
              const teamB = match.players.filter((p) => p.team === "B").map((p) => p.player.name);
              return (
                <li key={match.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "UTC" }).format(match.date)}
                      {" — "}
                      {resultLabel(match.result)}
                    </span>
                    <form action={deleteMatchAction}>
                      <input type="hidden" name="matchId" value={match.id} />
                      <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                        Eliminar
                      </button>
                    </form>
                  </div>
                  <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                    <p>
                      <span className="font-medium">Equipo A:</span> {teamA.join(", ")}
                    </p>
                    <p>
                      <span className="font-medium">Equipo B:</span> {teamB.join(", ")}
                    </p>
                  </div>
                </li>
              );
            })}
            {matches.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Todavia no hay partidos cargados en esta temporada.
              </p>
            ) : null}
          </ul>
        </>
      )}
    </main>
  );
}

function PlayerChecklist({
  name,
  label,
  players,
}: {
  name: string;
  label: string;
  players: { id: string; name: string }[];
}) {
  return (
    <fieldset className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</legend>
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {players.map((player) => (
          <label key={player.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} value={player.id} />
            {player.name}
          </label>
        ))}
        {players.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay jugadores activos.</p>
        ) : null}
      </div>
    </fieldset>
  );
}
