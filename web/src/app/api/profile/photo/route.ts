import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getProfilePhoto, updateProfilePhoto } from "@/lib/queries";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);

export async function GET() {
  try {
    const userId = await requireUserId();
    const row = await getProfilePhoto(userId);
    if (!row?.profile_photo || !row.profile_photo_mime) {
      return NextResponse.json({ error: "Kein Profilfoto" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(row.profile_photo), {
      headers: {
        "Content-Type": row.profile_photo_mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { remove?: boolean };
      if (body.remove) {
        await updateProfilePhoto(userId, null, null);
        return NextResponse.json({ ok: true, has_profile_photo: false });
      }
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Nur JPG oder PNG erlaubt" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Foto max. 2 MB" }, { status: 400 });
    }

    await updateProfilePhoto(userId, file.type, buffer);
    return NextResponse.json({ ok: true, has_profile_photo: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
