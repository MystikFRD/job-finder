import { Suspense } from "react";
import { ApiKeysForm } from "@/components/ApiKeysForm";
import { CanvaConnectForm } from "@/components/CanvaConnectForm";
import { RunSearchButton } from "@/components/RunSearchButton";
import { getManualRunStatus } from "@/lib/n8n-trigger";
import { queryOne } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { ProfileEditor } from "@/components/ProfileEditor";
import { EmailSettingsForm } from "@/components/EmailSettingsForm";
import { SearchSettingsForm } from "@/components/SearchSettingsForm";
import { DbError, PageHeader } from "@/components/ui";
import { getUserProfile } from "@/lib/queries";
import { isAppAdmin } from "@/lib/app-admin";
import { isCanvaConnected } from "@/lib/canva-connection";
import { isCanvaConfigured } from "@/lib/canva";
import { getSearchSettings } from "@/lib/search-settings";

export default async function SettingsPage() {
  try {
    const userId = await requireUserId();
    const manualRun = await getManualRunStatus(userId);
    const profile = await getUserProfile();
    const searchSettings = await getSearchSettings();
    const canvaConnected = await isCanvaConnected(userId);
    const canvaConfigured = isCanvaConfigured();
    const canvaAdmin = await isAppAdmin(userId);
    const emailSettings = await queryOne<{
      imap_host: string | null;
      imap_port: number;
      imap_user: string | null;
      imap_secure: boolean;
      scan_enabled: boolean;
      auto_update_min_confidence: number;
      imap_password_set: boolean;
      last_scan_at: string | null;
      last_scan_status: string | null;
      last_scan_error: string | null;
    }>(
      `SELECT imap_host, imap_port, imap_user, imap_secure, scan_enabled,
              auto_update_min_confidence, last_scan_at, last_scan_status, last_scan_error,
              (imap_password IS NOT NULL AND imap_password <> '') AS imap_password_set
       FROM email_settings WHERE user_id = $1`,
      [userId],
    );

    return (
      <div className="page-container">
        <PageHeader
          title="Settings"
          description="Profile, email scanning, and automation"
        />

        <div className="max-w-3xl space-y-10">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Personal Profile
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Used by the application generator and match analysis. Import your CV below or edit JSON arrays for structured data.
            </p>
            <ProfileEditor profile={profile} />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Job Search (Web Config)
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Configure what the Web Config n8n workflows search for and how jobs
              are filtered and scored. Personal Profile is still used for cover letters.
            </p>
            <SearchSettingsForm settings={searchSettings} />
            <div className="mt-6 border-t border-zinc-800 pt-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Run now
              </h3>
              <RunSearchButton
                canRunToday={manualRun.canRunToday}
                unlimitedManualRuns={manualRun.unlimitedManualRuns}
              />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Canva (Design)
            </h2>
            <Suspense fallback={<p className="text-sm text-zinc-500">Lade Canva…</p>}>
              <CanvaConnectForm
                configured={canvaConfigured}
                initiallyConnected={canvaConnected}
                isAdmin={canvaAdmin}
              />
            </Suspense>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              API Keys (Web Config)
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              DeepSeek and OpenAI power n8n and the assistant. The n8n API key enables
              &quot;Run job search now&quot; from this site.
            </p>
            <ApiKeysForm settings={searchSettings} />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Email Scanner (IMAP)
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Connect your inbox so recruiting emails (interviews, rejections, offers)
              appear in Inbox and can update your applications. Choose your provider
              below for step-by-step instructions.
            </p>
            <EmailSettingsForm settings={emailSettings} />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Automation
            </h2>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>Scheduled job search: once daily at 08:00 UTC (if enabled above)</li>
              <li>Manual “Run job search now”: once per day</li>
              <li>Email scan runs every 15 minutes when enabled above</li>
              <li>AI never sends emails or applications for you — you always review first</li>
            </ul>
          </section>
        </div>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <div className="flex min-h-full items-center justify-center page-container">
        <DbError message={message} />
      </div>
    );
  }
}
