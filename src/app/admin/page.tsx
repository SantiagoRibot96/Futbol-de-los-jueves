import Link from "next/link";

const LINKS = [
  { href: "/admin/matches", label: "Cargar partidos", description: "Ingresar el resultado de una fecha" },
  { href: "/admin/players", label: "Jugadores", description: "Alta de jugadores nuevos" },
  { href: "/admin/seasons", label: "Temporadas", description: "Crear o activar una temporada" },
];

export default function AdminHome() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-green-500 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{link.label}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{link.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
