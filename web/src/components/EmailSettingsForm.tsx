"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmailProviderGuide } from "@/components/EmailProviderGuide";

export function EmailSettingsForm({
  settings,
}: {
  settings: {
    imap_host: string | null;
    imap_port: number;
    imap_user: string | null;
    imap_secure: boolean;
    scan_enabled: boolean;
    auto_update_min_confidence: number;
    imap_password_set?: boolean;
    last_scan_at?: string | null;
    last_scan_status?: string | null;
    last_scan_error?: string | null;
  } | null;
}) {
  const router = useRouter();
  const [guideProvider, setGuideProvider] = useState("gmail");
  const [form, setForm] = useState({
    imap_host: settings?.imap_host ?? "",
    imap_port: settings?.imap_port ?? 993,
    imap_user: settings?.imap_user ?? "",
    imap_password: "",
    imap_secure: settings?.imap_secure ?? true,
    scan_enabled: settings?.scan_enabled ?? false,
    auto_update_min_confidence: settings?.auto_update_min_confidence ?? 0.85,
  });
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    const payload: Record<string, unknown> = { ...form };
    if (!form.imap_password) delete payload.imap_password;
    const res = await fetch("/api/email/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setMessage("Save failed — check your settings and try again.");
      return;
    }
    setMessage("Settings saved.");
    router.refresh();
  }

  async function syncNow() {
    setSyncing(true);
    setMessage("");
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Scan complete: ${data.stored} new email(s), ${data.skipped} already known.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setSyncing(false);
    }
  }

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100";

  return (
    <div className="space-y-6">
      <EmailProviderGuide
        selectedId={guideProvider}
        onSelect={setGuideProvider}
        onApplyPreset={(preset) =>
          setForm((prev) => ({
            ...prev,
            imap_host: preset.imap_host,
            imap_port: preset.imap_port,
            imap_secure: preset.imap_secure,
          }))
        }
      />

      <div className="space-y-4 border-t border-zinc-800 pt-6">
        <h3 className="text-sm font-medium text-zinc-200">Your IMAP settings</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              IMAP server (host)
            </label>
            <input
              className={field}
              value={form.imap_host}
              onChange={(e) => setForm({ ...form, imap_host: e.target.value })}
              placeholder="imap.gmail.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Port</label>
            <input
              className={field}
              type="number"
              value={form.imap_port}
              onChange={(e) =>
                setForm({ ...form, imap_port: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Email address (username)
            </label>
            <input
              className={field}
              value={form.imap_user}
              onChange={(e) => setForm({ ...form, imap_user: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Password{" "}
              {settings?.imap_password_set
                ? "(leave blank to keep current password)"
                : "(app password or Bridge password)"}
            </label>
            <input
              className={field}
              type="password"
              value={form.imap_password}
              onChange={(e) =>
                setForm({ ...form, imap_password: e.target.value })
              }
              autoComplete="off"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.imap_secure}
            onChange={(e) =>
              setForm({ ...form, imap_secure: e.target.checked })
            }
          />
          Use SSL/TLS (turn off for Proton Bridge on port 1143)
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.scan_enabled}
            onChange={(e) =>
              setForm({ ...form, scan_enabled: e.target.checked })
            }
          />
          Scan my inbox automatically (every 15 minutes)
        </label>

        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Auto-update applications when AI is at least{" "}
            {Math.round(form.auto_update_min_confidence * 100)}% confident
          </label>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={form.auto_update_min_confidence}
            onChange={(e) =>
              setForm({
                ...form,
                auto_update_min_confidence: Number(e.target.value),
              })
            }
            className="w-full"
          />
        </div>

        {settings?.last_scan_at ? (
          <p className="text-xs text-zinc-500">
            Last scan:{" "}
            {new Date(settings.last_scan_at).toLocaleString("de-DE")} —{" "}
            {settings.last_scan_status}
            {settings.last_scan_error ? ` (${settings.last_scan_error})` : ""}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={save}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900"
          >
            Save settings
          </button>
          <button
            onClick={syncNow}
            disabled={syncing}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50"
          >
            {syncing ? "Scanning…" : "Scan now"}
          </button>
        </div>

        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
      </div>
    </div>
  );
}
