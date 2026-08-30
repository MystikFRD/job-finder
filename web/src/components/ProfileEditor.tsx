"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CvGenerator } from "@/components/CvGenerator";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ResumeImport } from "@/components/ResumeImport";
import type { UserProfileFull } from "@/lib/types";

const emptyProfile: Partial<UserProfileFull> = {
  education: [],
  work_experience: [],
  skills: [],
  projects: [],
  technologies: [],
  languages: [],
  include_address_on_cv: false,
  address_country: "Deutschland",
};

function profileToForm(profile: UserProfileFull | null) {
  return {
    ...emptyProfile,
    ...profile,
    education_json: JSON.stringify(profile?.education ?? [], null, 2),
    work_experience_json: JSON.stringify(profile?.work_experience ?? [], null, 2),
    skills_json: JSON.stringify(profile?.skills ?? [], null, 2),
    projects_json: JSON.stringify(profile?.projects ?? [], null, 2),
    technologies_json: JSON.stringify(profile?.technologies ?? [], null, 2),
    languages_json: JSON.stringify(profile?.languages ?? [], null, 2),
  };
}

export function ProfileEditor({ profile }: { profile: UserProfileFull | null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => profileToForm(profile));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function applyProfile(next: UserProfileFull) {
    setForm(profileToForm(next));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          location: form.location,
          summary: form.summary,
          linkedin_url: form.linkedin_url,
          github_url: form.github_url,
          portfolio_url: form.portfolio_url,
          address_street: form.address_street,
          address_postal_code: form.address_postal_code,
          address_city: form.address_city,
          address_country: form.address_country,
          include_address_on_cv: form.include_address_on_cv,
          availability: form.availability,
          preferred_hours: form.preferred_hours,
          education: JSON.parse(form.education_json as string),
          work_experience: JSON.parse(form.work_experience_json as string),
          skills: JSON.parse(form.skills_json as string),
          projects: JSON.parse(form.projects_json as string),
          technologies: JSON.parse(form.technologies_json as string),
          languages: JSON.parse(form.languages_json as string),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage("Saved");
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

  return (
    <div className="space-y-6">
      <ResumeImport onApplied={applyProfile} />

      <ProfilePhotoUpload hasPhoto={profile?.has_profile_photo ?? false} />

      <CvGenerator profileName={form.full_name ?? null} />

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={label}>Full name</label>
            <input className={field} value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={field} value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={field} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className={label}>Location (Stadt/Region)</label>
            <input className={field} value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div>
            <label className={label}>LinkedIn</label>
            <input className={field} value={form.linkedin_url ?? ""} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
          </div>
          <div>
            <label className={label}>GitHub</label>
            <input className={field} value={form.github_url ?? ""} onChange={(e) => setForm({ ...form, github_url: e.target.value })} />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Adresse (optional, für Lebenslauf)
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={label}>Straße & Hausnummer</label>
              <input
                className={field}
                value={form.address_street ?? ""}
                onChange={(e) => setForm({ ...form, address_street: e.target.value })}
                placeholder="Musterstraße 12"
              />
            </div>
            <div>
              <label className={label}>PLZ</label>
              <input
                className={field}
                value={form.address_postal_code ?? ""}
                onChange={(e) => setForm({ ...form, address_postal_code: e.target.value })}
                placeholder="50667"
              />
            </div>
            <div>
              <label className={label}>Stadt</label>
              <input
                className={field}
                value={form.address_city ?? ""}
                onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                placeholder="Köln"
              />
            </div>
            <div>
              <label className={label}>Land</label>
              <input
                className={field}
                value={form.address_country ?? "Deutschland"}
                onChange={(e) => setForm({ ...form, address_country: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.include_address_on_cv ?? false}
              onChange={(e) => setForm({ ...form, include_address_on_cv: e.target.checked })}
              className="rounded border-zinc-600"
            />
            Adresse im Lebenslauf anzeigen
          </label>
        </div>

        <div>
          <label className={label}>Portfolio URL</label>
          <input className={field} value={form.portfolio_url ?? ""} onChange={(e) => setForm({ ...form, portfolio_url: e.target.value })} />
        </div>
        <div>
          <label className={label}>Summary</label>
          <textarea className={field + " min-h-[80px]"} value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>
        {(["education", "work_experience", "skills", "projects", "technologies", "languages"] as const).map((key) => (
          <div key={key}>
            <label className={label}>{key.replace(/_/g, " ")} (JSON array)</label>
            <textarea
              className={field + " min-h-[100px] font-mono text-xs"}
              value={form[`${key}_json` as keyof typeof form] as string}
              onChange={(e) => setForm({ ...form, [`${key}_json`]: e.target.value })}
            />
          </div>
        ))}
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg border border-emerald-800/60 bg-emerald-950/50 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
      </div>
    </div>
  );
}
