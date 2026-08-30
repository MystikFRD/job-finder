"use client";

type Preset = {
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
};

type Provider = {
  id: string;
  name: string;
  preset: Preset;
  steps: string[];
  links?: { label: string; href: string }[];
  note?: string;
};

const PROVIDERS: Provider[] = [
  {
    id: "gmail",
    name: "Gmail / Google Workspace",
    preset: {
      imap_host: "imap.gmail.com",
      imap_port: 993,
      imap_secure: true,
    },
    steps: [
      "Turn on 2-step verification in your Google account (required).",
      "Open Google Account → Security → App passwords.",
      "Create a new app password (name it e.g. “Job Finder”).",
      "Copy the 16-character password — paste it into the Password field below.",
      "User: your full Gmail address (e.g. you@gmail.com).",
      "Enable automatic scanning, click Save, then Scan now.",
    ],
    links: [
      {
        label: "Google App passwords",
        href: "https://myaccount.google.com/apppasswords",
      },
    ],
    note: "Your normal Gmail password will not work here. You must use an app password.",
  },
  {
    id: "outlook",
    name: "Outlook / Hotmail / Microsoft 365",
    preset: {
      imap_host: "outlook.office365.com",
      imap_port: 993,
      imap_secure: true,
    },
    steps: [
      "Sign in at outlook.com and enable IMAP if asked (Settings → Mail → Sync email).",
      "If you use two-factor authentication, create an app password in your Microsoft account.",
      "User: your full Outlook address (e.g. you@outlook.com).",
      "Password: your account password, or the app password if 2FA is on.",
      "Enable automatic scanning, click Save, then Scan now.",
    ],
    links: [
      {
        label: "Microsoft account security",
        href: "https://account.microsoft.com/security",
      },
    ],
  },
  {
    id: "proton",
    name: "Proton Mail (@pm.me / @proton.me)",
    preset: {
      imap_host: "host.docker.internal",
      imap_port: 1143,
      imap_secure: false,
    },
    steps: [
      "You need a paid Proton plan (Mail Plus or higher). Free plans cannot use IMAP.",
      "Proton Bridge must be installed and running on this server (ask your admin if unsure).",
      "On the server, run: protonmail-bridge --cli → login → info",
      "Use your full Proton address as User (e.g. you@pm.me).",
      "Password: the Bridge password from the info command — not your Proton login password.",
      "Leave SSL/TLS unchecked (Bridge uses STARTTLS on port 1143).",
      "Enable automatic scanning, click Save, then Scan now.",
    ],
    links: [
      {
        label: "Proton Mail Bridge",
        href: "https://proton.me/mail/bridge",
      },
      {
        label: "Bridge setup guide",
        href: "https://proton.me/support/protonmail-bridge-install",
      },
    ],
    note: "Proton does not support normal IMAP login. Bridge decrypts mail locally on the server.",
  },
  {
    id: "icloud",
    name: "iCloud Mail",
    preset: {
      imap_host: "imap.mail.me.com",
      imap_port: 993,
      imap_secure: true,
    },
    steps: [
      "On your Apple device or at appleid.apple.com, generate an app-specific password.",
      "Name it e.g. “Job Finder” and copy the password.",
      "User: your iCloud email address (e.g. you@icloud.com).",
      "Password: the app-specific password — not your Apple ID password.",
      "Enable automatic scanning, click Save, then Scan now.",
    ],
    links: [
      {
        label: "Apple app-specific passwords",
        href: "https://appleid.apple.com/account/manage",
      },
    ],
  },
  {
    id: "other",
    name: "Other provider",
    preset: {
      imap_host: "",
      imap_port: 993,
      imap_secure: true,
    },
    steps: [
      "Look up “IMAP settings” in your email provider’s help pages.",
      "Most providers use port 993 with SSL/TLS enabled.",
      "Use an app-specific password if your provider offers one (safer than your main password).",
      "User is usually your full email address.",
      "After saving, click Scan now to test the connection.",
    ],
  },
];

export function EmailProviderGuide({
  onApplyPreset,
  selectedId,
  onSelect,
}: {
  onApplyPreset: (preset: Preset) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const provider = PROVIDERS.find((p) => p.id === selectedId) ?? PROVIDERS[0];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <h3 className="text-sm font-medium text-zinc-200">Setup guide</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Pick your email provider. Follow the steps, then use “Fill in settings” to
        pre-fill the form. You still need to enter your email and password yourself.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedId === p.id
                ? "bg-zinc-100 text-zinc-900"
                : "border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {provider.note ? (
          <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
            {provider.note}
          </p>
        ) : null}

        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-300">
          {provider.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {provider.links?.length ? (
          <ul className="flex flex-wrap gap-3 text-xs">
            {provider.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300"
                >
                  {link.label} ↗
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {provider.id !== "other" ? (
          <button
            type="button"
            onClick={() => onApplyPreset(provider.preset)}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Fill in settings for {provider.name}
          </button>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Scans run every 15 minutes when enabled. Emails appear in Inbox; high-confidence
        replies can update application status. Nothing is sent automatically.
      </p>
    </div>
  );
}
