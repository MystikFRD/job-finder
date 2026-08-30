"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { readJsonResponse } from "@/lib/read-json-response";
import type { UserProfileFull } from "@/lib/types";

export function ResumeImport({
  onApplied,
}: {
  onApplied: (profile: UserProfileFull) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function importCv() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const file = fileRef.current?.files?.[0];
      let res: Response;

      if (file) {
        const form = new FormData();
        form.append("file", file);
        if (text.trim()) form.append("text", text);
        res = await fetch("/api/profile/import-cv", { method: "POST", body: form });
      } else if (text.trim()) {
        res = await fetch("/api/profile/import-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      } else {
        throw new Error("Bitte Lebenslauf einfügen oder PDF/TXT hochladen.");
      }

      const data = await readJsonResponse<{ profile?: UserProfileFull; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Import fehlgeschlagen");
      if (!data.profile) throw new Error("Profil konnte nicht geladen werden.");

      onApplied(data.profile);
      setSuccess("Lebenslauf wurde analysiert und ins Profil gespeichert.");
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100";

  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 p-4 sm:p-5">
      <h3 className="text-sm font-medium text-zinc-200">Lebenslauf importieren</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Text einfügen oder PDF/TXT hochladen — OpenAI extrahiert automatisch Name, Erfahrung,
        Skills und mehr ins Personal Profile. OpenAI API Key unter API Keys erforderlich.
      </p>

      <textarea
        className={`${field} mt-4 min-h-[140px] font-mono text-xs`}
        placeholder="Lebenslauf hier einfügen…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,text/plain,application/pdf"
            className="max-w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-zinc-200"
          />
        </label>
        <button
          type="button"
          onClick={importCv}
          disabled={loading}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 sm:ml-auto"
        >
          {loading ? "Wird analysiert…" : "Ins Profil übernehmen"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-400">{success}</p> : null}
    </div>
  );
}
