import { prisma } from "@/lib/db";
import { createSeasonAction, activateSeasonAction } from "@/app/actions/seasons";

export default async function AdminSeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const seasons = await prisma.season.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Temporadas</h1>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <form action={createSeasonAction} className="mb-8 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            name="name"
            type="text"
            placeholder="Ej: Clausura 2026"
            required
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Crear
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input type="checkbox" name="makeActive" defaultChecked className="rounded" />
          Marcarla como temporada activa
        </label>
      </form>

      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
        {seasons.map((season) => (
          <li key={season.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-zinc-900 dark:text-zinc-50">
              {season.name}
              {season.isActive ? (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                  activa
                </span>
              ) : null}
            </span>
            {!season.isActive ? (
              <form action={activateSeasonAction}>
                <input type="hidden" name="seasonId" value={season.id} />
                <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                  Activar
                </button>
              </form>
            ) : null}
          </li>
        ))}
        {seasons.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Todavia no hay temporadas.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
