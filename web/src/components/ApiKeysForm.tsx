"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SearchSettings } from "@/lib/types";

export function ApiKeysForm({ settings }: { settings: SearchSettings | null }) {
  const router = useRouter();
  const [deepseekKey, setDeepseekKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [n8nKey, setN8nKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const body: Record<string, string | null> = {};
      if (deepseekKey.trim()) body.deepseek_api_key = deepseekKey.trim();
      if (openaiKey.trim()) body.openai_api_key = openaiKey.trim();
      if (n8nKey.trim()) body.n8n_api_key = n8nKey.trim();

      if (!Object.keys(body).length) {
        setMessage("Enter at least one API key to save.");
        return;
      }

      const res = await fetch("/api/search-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setDeepseekKey("");
      setOpenaiKey("");
      setN8nKey("");
      setMessage("API keys saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-100";
  const label = "mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500";
  const hint = "text-xs text-zinc-600 mt-1";

  return (
    <div className="space-y-6">
      <p className="text-xs text-zinc-500">
        Keys are encrypted in the database. Leave a field blank to keep the current saved key.
      </p>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-200">n8n (optional)</h3>
        <p className={`${hint} mb-3`}>
          Only needed if you use server-side workflow provisioning on signup. Manual runs use
          the workflow webhook — no n8n API key required for{" "}
          <strong className="text-zinc-400">Run job search now</strong>.
        </p>
        <label className={label}>
          n8n API key{" "}
          {settings?.has_n8n_key ? (
            <span className="text-emerald-500">(saved)</span>
          ) : (
            <span className="text-zinc-500">(optional)</span>
          )}
        </label>
        <input
          type="password"
          className={field}
          value={n8nKey}
          onChange={(e) => setN8nKey(e.target.value)}
          placeholder="n8n_api_..."
          autoComplete="off"
        />
      </div>

      <div>
        <label className={label}>
          DeepSeek API key{" "}
          {settings?.has_deepseek_key ? (
            <span className="text-emerald-500">(saved)</span>
          ) : (
            <span className="text-amber-500">(not set)</span>
          )}
        </label>
        <input
          type="password"
          className={field}
          value={deepseekKey}
          onChange={(e) => setDeepseekKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
        <p className={hint}>Used by n8n to extract jobs from search results.</p>
      </div>

      <div>
        <label className={label}>
          OpenAI API key{" "}
          {settings?.has_openai_key ? (
            <span className="text-emerald-500">(saved)</span>
          ) : (
            <span className="text-amber-500">(not set)</span>
          )}
        </label>
        <input
          type="password"
          className={field}
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
        <p className={hint}>Used for cover letters and the assistant in this app.</p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save API keys"}
      </button>

      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
