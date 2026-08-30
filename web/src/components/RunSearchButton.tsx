"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunSearchButton({
  canRunToday,
  unlimitedManualRuns = false,
  variant = "primary",
  className = "",
}: {
  canRunToday: boolean;
  unlimitedManualRuns?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [usedToday, setUsedToday] = useState(!canRunToday && !unlimitedManualRuns);

  async function runSearch() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/search-run/trigger", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start search");
      setMessage(data.message ?? "Search started.");
      if (!unlimitedManualRuns) setUsedToday(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start search");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || (!unlimitedManualRuns && usedToday);

  const base =
    variant === "primary"
      ? "rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      : "rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={className}>
      <p className="mb-3 text-xs text-zinc-500">
        {unlimitedManualRuns ? (
          <>
            Your account has <strong className="text-zinc-400">unlimited manual runs</strong>{" "}
            for testing. Wait for the current run to finish before starting another.
          </>
        ) : (
          <>
            Manual runs are limited to <strong className="text-zinc-400">one per day</strong>.
            The scheduled search (if enabled) also runs at most once daily at 08:00 UTC.
          </>
        )}
      </p>

      <button
        type="button"
        onClick={runSearch}
        disabled={disabled}
        className={base}
      >
        {loading
          ? "Starting search…"
          : usedToday
            ? "Manual run used today"
            : "Run job search now"}
      </button>

      {usedToday && !loading && !message ? (
        <p className="mt-2 text-sm text-zinc-500">
          You can start another manual search tomorrow. Check{" "}
          <Link href="/search-runs" className="text-sky-400 hover:underline">
            Search Runs
          </Link>{" "}
          for progress.
        </p>
      ) : null}

      {message ? (
        <p className="mt-2 text-sm text-emerald-400">
          {message}{" "}
          <Link href="/search-runs" className="underline hover:text-emerald-300">
            View progress
          </Link>
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
