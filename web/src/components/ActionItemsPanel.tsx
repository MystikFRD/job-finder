"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionItem } from "@/lib/types";

export function ActionItemsPanel({ items }: { items: ActionItem[] }) {
  const router = useRouter();

  async function dismiss(id: string) {
    await fetch("/api/action-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">No action items right now.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100">{item.title}</p>
            {item.description ? (
              <p className="mt-0.5 truncate text-xs text-zinc-400">{item.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {item.application_id ? (
                <Link href={`/applications/${item.application_id}`} className="text-xs text-sky-400 hover:underline">
                  Application →
                </Link>
              ) : null}
              {item.job_id ? (
                <Link href={`/jobs/${item.job_id}`} className="text-xs text-sky-400 hover:underline">
                  Job →
                </Link>
              ) : null}
              {item.email_id ? (
                <Link href={`/inbox/${item.email_id}`} className="text-xs text-sky-400 hover:underline">
                  Email →
                </Link>
              ) : null}
            </div>
          </div>
          <button
            onClick={() => dismiss(item.id)}
            className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </button>
        </li>
      ))}
    </ul>
  );
}
