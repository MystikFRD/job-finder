import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getValidCanvaAccessToken, importDocxToCanva, isCanvaConfigured } from "@/lib/canva";
import { buildCvDocx } from "@/lib/cv-export";
import { getProfilePhoto, getUserProfile } from "@/lib/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    if (!isCanvaConfigured()) {
      return NextResponse.json(
        { error: "Canva ist auf dem Server nicht konfiguriert." },
        { status: 503 },
      );
    }

    const userId = await requireUserId();
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    const photoRow = await getProfilePhoto(userId);
    const photo =
      photoRow?.profile_photo && photoRow.profile_photo_mime
        ? { mime: photoRow.profile_photo_mime, data: Buffer.from(photoRow.profile_photo) }
        : null;

    const docx = await buildCvDocx(profile, photo);
    const title = `Lebenslauf — ${profile.full_name?.trim() || "Profil"}`.slice(0, 50);

    const accessToken = await getValidCanvaAccessToken(userId);
    const editUrl = await importDocxToCanva({
      accessToken,
      file: docx,
      title,
    });

    return NextResponse.json({ edit_url: editUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canva Import fehlgeschlagen";
    const status = message.includes("nicht verbunden") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
