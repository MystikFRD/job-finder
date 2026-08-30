"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Application, ApplicationStatus } from "@/lib/types";
import { AppStatusBadge } from "./badges";

const columns: { status: ApplicationStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "ready", label: "Ready to Send" },
  { status: "submitted", label: "Applied" },
  { status: "waiting", label: "Waiting" },
  { status: "interview", label: "Interview" },
  { status: "rejected", label: "Rejected" },
  { status: "offer", label: "Offer" },
];

export function KanbanBoard({ applications }: { applications: Application[] }) {
  const router = useRouter();

  async function move(id: string, status: ApplicationStatus) {
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 md:gap-4">
      {columns.map((col) => {
        const cards = applications.filter((a) => a.status === col.status);
        return (
          <div
            key={col.status}
            className="w-[min(85vw,240px)] shrink-0 snap-start rounded-xl border border-zinc-800 bg-zinc-900/40 md:min-w-[220px] md:flex-1"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {col.label}
              </h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {cards.length}
              </span>
            </div>
            <div className="space-y-2 p-2">
              {cards.map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                >
                  <Link href={`/applications/${app.id}`} className="block">
                    <p className="text-sm font-medium text-zinc-100">{app.company}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                      {app.job_title}
                    </p>
                  </Link>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <AppStatusBadge status={app.status} />
                    <select
                      className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-[10px] text-zinc-400"
                      value={app.status}
                      onChange={(e) =>
                        move(app.id, e.target.value as ApplicationStatus)
                      }
                    >
                      {columns.map((c) => (
                        <option key={c.status} value={c.status}>
                          → {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {!cards.length ? (
                <p className="px-2 py-4 text-center text-xs text-zinc-600">Empty</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
