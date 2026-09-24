import { prisma } from "@/lib/db";
import { createPlayerAction, setPlayerActiveAction } from "@/app/actions/players";

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Jugadores</h1>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <form action={createPlayerAction} className="mb-8 flex gap-2">
        <input
          name="name"
          type="text"
          placeholder="Nombre del jugador"
          required
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Agregar
        </button>
      </form>

      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
        {players.map((player) => (
          <li key={player.id} className="flex items-center justify-between px-4 py-2.5">
            <span
              className={
                player.active
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 line-through dark:text-zinc-600"
              }
            >
              {player.name}
            </span>
            <form action={setPlayerActiveAction}>
              <input type="hidden" name="playerId" value={player.id} />
              <input type="hidden" name="active" value={(!player.active).toString()} />
              <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                {player.active ? "Desactivar" : "Activar"}
              </button>
            </form>
          </li>
        ))}
        {players.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Todavia no hay jugadores cargados.
          </li>
        ) : null}
      </ul>
    </main>
  );
}
