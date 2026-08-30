import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { buildCvExport } from "@/lib/cv-export";
import { cvFilename } from "@/lib/export-filename";
import { getProfilePhoto, getUserProfile } from "@/lib/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { format?: "docx" | "pdf" };
    if (body.format !== "docx" && body.format !== "pdf") {
      return NextResponse.json({ error: "Format muss docx oder pdf sein." }, { status: 400 });
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

    const { buffer, mimeType } = await buildCvExport(profile, body.format, photo);
    const filename = cvFilename(profile.full_name ?? "Profil", body.format);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CV-Export fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
