"use client";

import { useState } from "react";
import { cvFilename } from "@/lib/export-filename";
import { readJsonResponse } from "@/lib/read-json-response";

export function CvGenerator({ profileName }: { profileName: string | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function openInCanva() {
    setLoading("canva");
    setMessage("");
    try {
      const res = await fetch("/api/profile/canva", { method: "POST" });
      const data = await readJsonResponse<{ edit_url?: string; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Canva Import fehlgeschlagen");
      }
      if (!data.edit_url) {
        throw new Error("Keine Canva-Bearbeitungs-URL erhalten");
      }
      window.open(data.edit_url, "_blank", "noopener,noreferrer");
      setMessage("Lebenslauf in Canva geöffnet.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Canva Import fehlgeschlagen");
    } finally {
      setLoading(null);
    }
  }

  async function download(format: "docx" | "pdf") {
    setLoading(format);
    setMessage("");
    try {
      const res = await fetch("/api/profile/export-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        const data = await readJsonResponse<{ error?: string }>(res);
        throw new Error(data.error ?? "Export fehlgeschlagen");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cvFilename(profileName ?? "Profil", format);
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Lebenslauf heruntergeladen.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setLoading(null);
    }
  }

  const btn =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-400/80">
        Lebenslauf generieren
      </p>
      <p className="mb-3 text-xs text-zinc-500">
        Erstellt PDF oder Word aus deinem Profil. Optional mit Foto und Adresse (wenn aktiviert).
      </p>
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={!!loading} onClick={() => download("pdf")} type="button">
          {loading === "pdf" ? "PDF…" : "PDF herunterladen"}
        </button>
        <button className={btn} disabled={!!loading} onClick={() => download("docx")} type="button">
          {loading === "docx" ? "Word…" : "Word (.docx)"}
        </button>
        <button
          className={`${btn} border-violet-800/60 bg-violet-950/40 text-violet-200 hover:bg-violet-900/50`}
          disabled={!!loading}
          onClick={openInCanva}
          type="button"
        >
          {loading === "canva" ? "Canva…" : "In Canva öffnen"}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-600">
        Canva: Profil speichern, ggf. Canva in Settings verbinden.
      </p>
      {message ? <p className="mt-2 text-xs text-zinc-500">{message}</p> : null}
    </div>
  );
}
