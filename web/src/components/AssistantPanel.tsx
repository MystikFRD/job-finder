"use client";

import { useState } from "react";

export function AssistantPanel({
  applicationId,
  emailId,
  companyName,
  jobId,
}: {
  applicationId?: string;
  emailId?: string;
  companyName?: string;
  jobId?: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");

  async function run(action: string, extra?: Record<string, string>) {
    setLoading(action);
    setResult("");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, applicationId, emailId, companyName, jobId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(typeof data.content === "string" ? data.content : JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  const btn = "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">AI Assistant</h2>
      <div className="flex flex-wrap gap-2">
        {emailId ? (
          <button className={btn} disabled={!!loading} onClick={() => run("reply_draft")}>
            Draft reply
          </button>
        ) : null}
        {applicationId ? (
          <>
            <button className={btn} disabled={!!loading} onClick={() => run("interview_prep")}>
              Interview prep
            </button>
            <button className={btn} disabled={!!loading} onClick={() => run("follow_up")}>
              Follow-up suggestion
            </button>
          </>
        ) : null}
        {companyName || jobId ? (
          <button className={btn} disabled={!!loading} onClick={() => run("company_research")}>
            Company research
          </button>
        ) : null}
      </div>
      {result ? (
        <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
          {result}
        </pre>
      ) : null}
    </div>
  );
}
