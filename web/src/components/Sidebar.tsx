"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard", icon: "◫" },
  { href: "/jobs", label: "Jobs", icon: "◎" },
  { href: "/applications", label: "Applications", icon: "▤" },
  { href: "/inbox", label: "Inbox", icon: "✉" },
  { href: "/companies", label: "Companies", icon: "▣" },
  { href: "/search-runs", label: "Search Runs", icon: "↻" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    onClose?.();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 ease-out md:relative md:z-auto md:w-56 md:shrink-0 md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className="flex items-start justify-between border-b border-zinc-800 px-5 py-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Job CRM
          </p>
          <h1 className="mt-1 text-lg font-semibold text-zinc-100">Job Finder</h1>
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 md:hidden"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-zinc-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
        >
          Sign out
        </button>
        <p className="text-xs text-zinc-600">n8n · per-user workflows</p>
      </div>
    </aside>
  );
}
