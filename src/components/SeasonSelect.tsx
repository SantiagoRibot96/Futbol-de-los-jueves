"use client";

import { useRouter } from "next/navigation";

type Season = { id: string; name: string; isActive: boolean };

export function SeasonSelect({
  seasons,
  selectedSeasonId,
  basePath = "/",
}: {
  seasons: Season[];
  selectedSeasonId: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedSeasonId}
      onChange={(e) => router.push(`${basePath}?season=${e.target.value}`)}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {seasons.map((season) => (
        <option key={season.id} value={season.id}>
          {season.name}
          {season.isActive ? " (activa)" : ""}
        </option>
      ))}
    </select>
  );
}
