import type { Outcome } from "@/lib/stats";

const STYLES: Record<Outcome, string> = {
  G: "bg-green-500 text-white",
  P: "bg-red-500 text-white",
  E: "bg-yellow-400 text-black",
};

export function ResultBadge({ outcome }: { outcome: Outcome | null }) {
  if (outcome === null) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-xs font-bold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
        --
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${STYLES[outcome]}`}
    >
      {outcome}
    </span>
  );
}
