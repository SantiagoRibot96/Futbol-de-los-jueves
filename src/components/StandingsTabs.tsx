"use client";

import { useState } from "react";
import type { PlayerStanding } from "@/lib/stats";
import { ResultBadge } from "./ResultBadge";

export function StandingsTabs({ standings }: { standings: PlayerStanding[] }) {
  const [tab, setTab] = useState<"tabla" | "promedios">("tabla");

  const byPoints = [...standings].sort(
    (a, b) => b.points - a.points || b.average - a.average || b.played - a.played
  );
  const byAverage = [...standings].sort(
    (a, b) => b.average - a.average || b.points - a.points
  );

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={tab === "tabla"} onClick={() => setTab("tabla")}>
          Tabla
        </TabButton>
        <TabButton active={tab === "promedios"} onClick={() => setTab("promedios")}>
          Promedios
        </TabButton>
      </div>

      {standings.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todavia no hay partidos cargados en esta temporada.
        </p>
      ) : tab === "tabla" ? (
        <TablaTable standings={byPoints} />
      ) : (
        <PromediosTable standings={byAverage} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? "border-green-600 text-green-700 dark:text-green-400"
          : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function TablaTable({ standings }: { standings: PlayerStanding[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 pr-2">Jugador</th>
            <th className="px-2 text-center">Pto</th>
            <th className="px-2 text-center">PJ</th>
            <th className="px-2 text-center">PG</th>
            <th className="px-2 text-center">PP</th>
            <th className="px-2 text-center">PE</th>
            <th className="pl-2 text-center">Ultimos 3</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.playerId} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 pr-2 font-medium text-zinc-900 dark:text-zinc-50">{row.name}</td>
              <td className="px-2 text-center font-semibold">{row.points}</td>
              <td className="px-2 text-center text-zinc-600 dark:text-zinc-400">{row.played}</td>
              <td className="px-2 text-center text-zinc-600 dark:text-zinc-400">{row.won}</td>
              <td className="px-2 text-center text-zinc-600 dark:text-zinc-400">{row.lost}</td>
              <td className="px-2 text-center text-zinc-600 dark:text-zinc-400">{row.drawn}</td>
              <td className="pl-2">
                <div className="flex justify-center gap-1">
                  {row.lastResults.map((outcome, i) => (
                    <ResultBadge key={i} outcome={outcome} />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromediosTable({ standings }: { standings: PlayerStanding[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 pr-2">Jugador</th>
            <th className="px-2 text-center">Pts</th>
            <th className="px-2 text-center">Partidos</th>
            <th className="px-2 text-center">Promedio</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.playerId} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 pr-2 font-medium text-zinc-900 dark:text-zinc-50">{row.name}</td>
              <td className="px-2 text-center">{row.points}</td>
              <td className="px-2 text-center text-zinc-600 dark:text-zinc-400">{row.played}</td>
              <td className="px-2 text-center font-semibold">{row.average.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
