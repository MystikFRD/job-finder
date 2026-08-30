import { scoreColor } from "@/lib/format";

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return (
      <span className="inline-flex min-w-[2.5rem] justify-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
        —
      </span>
    );
  }
  return (
    <span
      className={`inline-flex min-w-[2.5rem] justify-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold tabular-nums ${scoreColor(score)}`}
    >
      {score}
    </span>
  );
}

const jobStatusStyles: Record<string, string> = {
  new: "bg-sky-950 text-sky-300 border-sky-900",
  reviewed: "bg-zinc-800 text-zinc-300 border-zinc-700",
  interesting: "bg-violet-950 text-violet-300 border-violet-900",
  applied: "bg-blue-950 text-blue-300 border-blue-900",
  interview: "bg-emerald-950 text-emerald-300 border-emerald-900",
  rejected: "bg-red-950 text-red-300 border-red-900",
  ignored: "bg-zinc-900 text-zinc-500 border-zinc-800",
  expired: "bg-orange-950 text-orange-300 border-orange-900",
};

export function JobStatusBadge({ status }: { status: string }) {
  const style = jobStatusStyles[status] ?? jobStatusStyles.reviewed;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const appStatusStyles: Record<string, string> = {
  draft: "bg-zinc-800 text-zinc-300",
  ready: "bg-amber-950 text-amber-300",
  submitted: "bg-blue-950 text-blue-300",
  waiting: "bg-indigo-950 text-indigo-300",
  interview: "bg-emerald-950 text-emerald-300",
  technical_interview: "bg-emerald-900 text-emerald-200",
  final_interview: "bg-emerald-900 text-emerald-200",
  rejected: "bg-red-950 text-red-300",
  offer: "bg-violet-950 text-violet-300",
  accepted: "bg-green-950 text-green-300",
  withdrawn: "bg-zinc-900 text-zinc-500",
};

export function AppStatusBadge({ status }: { status: string }) {
  const style = appStatusStyles[status] ?? appStatusStyles.draft;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function TagList({ items, empty = "—" }: { items: string[]; empty?: string }) {
  if (!items?.length) return <span className="text-zinc-500">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
