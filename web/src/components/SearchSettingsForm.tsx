"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SearchSettings } from "@/lib/types";

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(items: string[] | null | undefined): string {
  return (items ?? []).join("\n");
}

export function SearchSettingsForm({
  settings,
}: {
  settings: SearchSettings | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    search_queries_text: listToLines(settings?.search_queries),
    preferred_locations_text: listToLines(settings?.preferred_locations),
    match_skills_text: listToLines(settings?.match_skills),
    profile_languages_text: listToLines(settings?.profile_languages),
    wants_working_student: settings?.wants_working_student ?? true,
    min_match_score: settings?.min_match_score ?? 40,
    allow_remote_outside_locations:
      settings?.allow_remote_outside_locations ?? true,
    searxng_base_url: settings?.searxng_base_url ?? "",
    role_keywords: settings?.role_keywords ?? "",
    tech_focus: settings?.tech_focus ?? "",
    max_jobs_per_run: settings?.max_jobs_per_run ?? 20,
    schedule_enabled: settings?.schedule_enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/search-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search_queries: linesToList(form.search_queries_text),
          preferred_locations: linesToList(form.preferred_locations_text),
          match_skills: linesToList(form.match_skills_text),
          profile_languages: linesToList(form.profile_languages_text),
          wants_working_student: form.wants_working_student,
          min_match_score: form.min_match_score,
          allow_remote_outside_locations: form.allow_remote_outside_locations,
          searxng_base_url: form.searxng_base_url,
          role_keywords: form.role_keywords,
          tech_focus: form.tech_focus,
          max_jobs_per_run: form.max_jobs_per_run,
          schedule_enabled: form.schedule_enabled,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setMessage("Search settings saved. Web Config n8n workflows use these on the next run.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100";
  const label = "mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500";
  const hint = "text-xs text-zinc-600 mt-1";

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-sky-900/40 bg-sky-950/20 px-3 py-2 text-xs text-sky-100/90">
        These settings apply to the <strong>Web Config</strong> n8n workflows only.
        Your original workflows stay unchanged as a backup.
      </p>

      <div>
        <label className={label}>Search queries (one per line)</label>
        <textarea
          className={field + " min-h-[140px] font-mono text-xs"}
          value={form.search_queries_text}
          onChange={(e) =>
            setForm({ ...form, search_queries_text: e.target.value })
          }
          placeholder={"Werkstudent Python Köln\nWorking Student Software Cologne"}
        />
        <p className={hint}>Sent to SearXNG — one search per line.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label}>Preferred locations (one per line)</label>
          <textarea
            className={field + " min-h-[80px] font-mono text-xs"}
            value={form.preferred_locations_text}
            onChange={(e) =>
              setForm({ ...form, preferred_locations_text: e.target.value })
            }
          />
          <p className={hint}>Jobs in these cities pass the location filter.</p>
        </div>
        <div>
          <label className={label}>Match skills (one per line)</label>
          <textarea
            className={field + " min-h-[80px] font-mono text-xs"}
            value={form.match_skills_text}
            onChange={(e) =>
              setForm({ ...form, match_skills_text: e.target.value })
            }
          />
          <p className={hint}>Used for match scoring. Leave empty to use Personal Profile skills.</p>
        </div>
      </div>

      <div>
        <label className={label}>Languages for match scoring (one per line)</label>
        <textarea
          className={field + " min-h-[60px] font-mono text-xs"}
          value={form.profile_languages_text}
          onChange={(e) =>
            setForm({ ...form, profile_languages_text: e.target.value })
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label}>Role keywords (for AI filter)</label>
          <input
            className={field}
            value={form.role_keywords}
            onChange={(e) =>
              setForm({ ...form, role_keywords: e.target.value })
            }
          />
        </div>
        <div>
          <label className={label}>Tech focus (for AI filter)</label>
          <input
            className={field}
            value={form.tech_focus}
            onChange={(e) => setForm({ ...form, tech_focus: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={label}>SearXNG search URL</label>
        <input
          className={field}
          value={form.searxng_base_url}
          onChange={(e) =>
            setForm({ ...form, searxng_base_url: e.target.value })
          }
        />
      </div>

      <div>
        <label className={label}>
          Minimum match score to keep ({form.min_match_score})
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={form.min_match_score}
          onChange={(e) =>
            setForm({ ...form, min_match_score: Number(e.target.value) })
          }
          className="w-full"
        />
      </div>

      <div>
        <label className={label}>Max jobs per search run ({form.max_jobs_per_run})</label>
        <input
          type="number"
          min={1}
          max={50}
          className={field}
          value={form.max_jobs_per_run}
          onChange={(e) =>
            setForm({ ...form, max_jobs_per_run: Number(e.target.value) })
          }
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={form.wants_working_student}
          onChange={(e) =>
            setForm({ ...form, wants_working_student: e.target.checked })
          }
        />
        Prefer working student / Werkstudent roles
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={form.allow_remote_outside_locations}
          onChange={(e) =>
            setForm({
              ...form,
              allow_remote_outside_locations: e.target.checked,
            })
          }
        />
        Allow remote jobs outside preferred locations
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={form.schedule_enabled}
          onChange={(e) =>
            setForm({ ...form, schedule_enabled: e.target.checked })
          }
        />
        Daily scheduled search at 08:00 UTC (max once per day)
      </label>
      <p className={hint}>
        When enabled, your n8n workflow runs automatically once each morning. Combined with the manual button, each type is limited to one run per day.
      </p>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save search settings"}
      </button>

      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
