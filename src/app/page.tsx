import { listSeasons, getStandings } from "@/lib/stats";
import { SeasonSelect } from "@/components/SeasonSelect";
import { StandingsTabs } from "@/components/StandingsTabs";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const seasons = await listSeasons();

  const selectedSeasonId =
    (season && seasons.some((s) => s.id === season) ? season : undefined) ??
    seasons.find((s) => s.isActive)?.id ??
    seasons[0]?.id;

  const standings = selectedSeasonId ? await getStandings(selectedSeasonId) : [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Posiciones
        </h1>
        {seasons.length > 0 && selectedSeasonId ? (
          <SeasonSelect seasons={seasons} selectedSeasonId={selectedSeasonId} />
        ) : null}
      </div>

      {seasons.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todavia no se creo ninguna temporada. Pedile al administrador que cree una desde /admin/seasons.
        </p>
      ) : (
        <StandingsTabs standings={standings} />
      )}
    </main>
  );
}
