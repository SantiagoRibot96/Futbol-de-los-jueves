import { loginAction } from "@/app/actions/auth";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");

  const { error, next } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Futbol de los jueves
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Ingresa con el usuario del grupo.
        </p>

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Usuario o clave incorrectos.
          </p>
        ) : null}

        <form action={loginAction} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Clave
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
