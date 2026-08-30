"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JobActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: string, body?: Record<string, string>) {
    setLoading(action);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      if (data.redirect) {
        router.push(data.redirect);
      } else {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  const btn =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      <button className={btn} disabled={!!loading} onClick={() => act("apply")}>
        {loading === "apply" ? "Creating…" : "Apply"}
      </button>
      <button
        className={btn}
        disabled={!!loading}
        onClick={() => act("status", { status: "interesting" })}
      >
        Save / Favorite
      </button>
      <button
        className={btn}
        disabled={!!loading}
        onClick={() => act("status", { status: "ignored" })}
      >
        Ignore
      </button>
      <button
        className={btn}
        disabled={!!loading}
        onClick={() => act("status", { status: "applied" })}
      >
        Mark Applied
      </button>
    </div>
  );
}
