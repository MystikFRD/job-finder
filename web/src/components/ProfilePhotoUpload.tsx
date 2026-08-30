"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function ProfilePhotoUpload({ hasPhoto }: { hasPhoto: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [showPhoto, setShowPhoto] = useState(hasPhoto);

  async function upload(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");
      setShowPhoto(true);
      setPreviewKey((k) => k + 1);
      setMessage("Foto gespeichert.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setUploading(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Entfernen fehlgeschlagen");
      setShowPhoto(false);
      setMessage("Foto entfernt.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Entfernen fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  const btn =
    "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Profilfoto (optional)
      </p>
      <p className="mb-3 text-xs text-zinc-500">
        Wird im Lebenslauf angezeigt, wenn du eins hochlädst. JPG oder PNG, max. 2 MB.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={previewKey}
            src={`/api/profile/photo?k=${previewKey}`}
            alt="Profilfoto"
            className="h-24 w-24 rounded-lg border border-zinc-700 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-600">
            Kein Foto
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Lädt…" : showPhoto ? "Foto ersetzen" : "Foto hochladen"}
          </button>
          {showPhoto ? (
            <button type="button" className={btn} disabled={uploading} onClick={removePhoto}>
              Entfernen
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>
      {message ? <p className="mt-2 text-xs text-zinc-500">{message}</p> : null}
    </div>
  );
}
