"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { coverLetterFilename } from "@/lib/export-filename";
import { readJsonResponse } from "@/lib/read-json-response";
import type { ApplicationDocument, Job } from "@/lib/types";

export function DraftEditor({
  applicationId,
  job,
  initialDocument,
}: {
  applicationId: string;
  job: Job;
  initialDocument: ApplicationDocument | null;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialDocument?.content ?? "");
  const [loading, setLoading] = useState<string | null>(null);

  async function generate(opts?: { tone?: string; length?: "short" | "standard" }) {
    setLoading("generate");
    try {
      const res = await fetch(`/api/applications/${applicationId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: opts?.tone, length: opts?.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.content);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  async function save(createVersion = false) {
    setLoading("save");
    try {
      const res = await fetch(`/api/applications/${applicationId}/generate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          title: `Anschreiben — ${job.company}`,
          createVersion,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function transform(instruction: string) {
    setLoading(instruction);
    try {
      const res = await fetch(`/api/applications/${applicationId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate", content, instruction, createVersion: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.content);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function copyText() {
    navigator.clipboard.writeText(content);
  }

  function downloadTxt() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    triggerDownload(blob, coverLetterFilename(job.company, "txt"));
  }

  async function openInCanva() {
    if (!content.trim()) return;
    setLoading("canva");
    try {
      const res = await fetch(`/api/applications/${applicationId}/canva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await readJsonResponse<{ edit_url?: string; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Canva Import fehlgeschlagen");
      }
      if (!data.edit_url) {
        throw new Error("Keine Canva-Bearbeitungs-URL erhalten");
      }
      window.open(data.edit_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Canva Import fehlgeschlagen");
    } finally {
      setLoading(null);
    }
  }

  async function downloadExport(format: "docx" | "pdf") {
    if (!content.trim()) return;
    setLoading(`export-${format}`);
    try {
      const res = await fetch(`/api/applications/${applicationId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, content }),
      });
      if (!res.ok) {
        const data = await readJsonResponse<{ error?: string }>(res);
        throw new Error(data.error ?? "Export fehlgeschlagen");
      }
      const blob = await res.blob();
      triggerDownload(blob, coverLetterFilename(job.company, format));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setLoading(null);
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const btn =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Job context</h2>
        <p className="font-medium text-zinc-100">{job.job_title}</p>
        <p className="text-sm text-zinc-400">{job.company} · {job.location}</p>
        {job.match_score != null ? (
          <p className="text-sm text-emerald-400">Match: {job.match_score}/100</p>
        ) : null}
        {job.match_positives?.length ? (
          <ul className="text-xs text-zinc-400">
            {job.match_positives.slice(0, 5).map((p) => (
              <li key={p}>+ {p}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button className={btn} disabled={!!loading} onClick={() => generate()}>
            {loading === "generate" ? "Generating…" : "Generate Application"}
          </button>
          <button className={btn} disabled={!!loading} onClick={() => generate({ length: "short" })}>
            Shorter
          </button>
          <button className={btn} disabled={!!loading} onClick={() => transform("Make more professional")}>
            More professional
          </button>
          <button className={btn} disabled={!!loading} onClick={() => transform("Make warmer and more enthusiastic")}>
            Warmer tone
          </button>
          <button className={btn} disabled={!!loading || !content} onClick={() => save(false)}>
            Save draft
          </button>
          <button className={btn} disabled={!!loading || !content} onClick={() => save(true)}>
            Save new version
          </button>
          <button className={btn} disabled={!content} onClick={copyText}>Copy</button>
          <button className={btn} disabled={!content} onClick={downloadTxt}>TXT</button>
          <button
            className={btn}
            disabled={!content || !!loading}
            onClick={() => downloadExport("docx")}
          >
            {loading === "export-docx" ? "Word…" : "Word (.docx)"}
          </button>
          <button
            className={btn}
            disabled={!content || !!loading}
            onClick={() => downloadExport("pdf")}
          >
            {loading === "export-pdf" ? "PDF…" : "PDF"}
          </button>
          <button
            className={`${btn} border-violet-800/60 bg-violet-950/40 text-violet-200 hover:bg-violet-900/50`}
            disabled={!content || !!loading}
            onClick={openInCanva}
            title="Anschreiben in Canva importieren und dort gestalten"
          >
            {loading === "canva" ? "Canva…" : "In Canva öffnen"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Canva: Anschreiben wird als Word importiert — Logo, Farben und Layout im Canva-Editor
          anpassen. Einmalig in Settings verbinden.
        </p>
        <textarea
          className="min-h-[420px] w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-200"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Click Generate Application to create your cover letter…"
        />
        {initialDocument ? (
          <p className="text-xs text-zinc-500">
            Version {initialDocument.version} · last saved {new Date(initialDocument.updated_at).toLocaleString("de-DE")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
