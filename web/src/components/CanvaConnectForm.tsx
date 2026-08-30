"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function CanvaConnectForm({
  configured,
  initiallyConnected,
  isAdmin = false,
}: {
  configured: boolean;
  initiallyConnected: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(initiallyConnected);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const status = searchParams.get("canva");
    if (status === "connected") {
      setConnected(true);
      setMessage("Canva erfolgreich verbunden.");
      router.replace("/settings");
    } else if (status === "error") {
      const detail = searchParams.get("canva_msg");
      setMessage(detail ? `Canva-Verbindung fehlgeschlagen: ${detail}` : "Canva-Verbindung fehlgeschlagen.");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  async function disconnect() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/canva/disconnect", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Trennen fehlgeschlagen");
      setConnected(false);
      setMessage("Canva getrennt.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Trennen fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  const btn =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50";

  if (!configured) {
    if (isAdmin) {
      return (
        <div className="space-y-3 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-300">Einmalig als Admin:</strong> Canva-App registrieren und
            Server-Credentials eintragen. Das ist <em>nicht</em> dein persönliches Canva-Konto — jeder
            Nutzer verbindet später sein eigenes Canva separat.
          </p>
          <ol className="list-inside list-decimal space-y-1 text-xs text-zinc-500">
            <li>
              App anlegen:{" "}
              <a
                className="text-emerald-400 hover:underline"
                href="https://www.canva.com/developers/"
                target="_blank"
                rel="noreferrer"
              >
                canva.com/developers
              </a>{" "}
              → <strong className="text-zinc-400">Public</strong> Integration (nicht Private)
            </li>
            <li>
              Redirect URL:{" "}
              <code className="text-zinc-300">https://jobs.mubu.dev/api/canva/callback</code>
            </li>
            <li>Scope: <code className="text-zinc-300">design:content:write</code></li>
            <li>
              In <code className="text-zinc-300">/opt/job-finder/deploy/.env</code>:{" "}
              <code className="text-zinc-300">CANVA_CLIENT_ID</code> +{" "}
              <code className="text-zinc-300">CANVA_CLIENT_SECRET</code>, dann Container neu starten
            </li>
          </ol>
        </div>
      );
    }

    return (
      <div className="space-y-2 text-sm text-zinc-400">
        <p>Canva ist noch nicht freigeschaltet — der Admin richtet die App einmalig ein.</p>
        <p className="text-xs text-zinc-500">
          Danach kannst du hier <strong className="text-zinc-400">dein eigenes</strong> Canva-Konto
          verbinden. Anschreiben landen in deinem Canva, nicht im Account des Admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Verbinde <strong className="text-zinc-300">dein</strong> Canva-Konto. Anschreiben werden in
        deinem Canva importiert — Logo, Farben und Layout bearbeitest du dort selbst.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {connected ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Canva verbunden
            </span>
            <button className={btn} disabled={loading} onClick={disconnect} type="button">
              {loading ? "Trenne…" : "Canva trennen"}
            </button>
          </>
        ) : (
          <a className={btn} href="/api/canva/connect">
            Mit Canva verbinden
          </a>
        )}
      </div>

      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}

      <ul className="list-inside list-disc space-y-1 text-xs text-zinc-500">
        <li>Jeder Nutzer verbindet sein eigenes Canva — getrennt voneinander</li>
        <li>Funktioniert mit normalem Canva-Konto (kein Enterprise nötig)</li>
        <li>Anschreiben wird als Word importiert — Button „In Canva öffnen“ beim Entwurf</li>
      </ul>
    </div>
  );
}
