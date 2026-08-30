import { NextResponse } from "next/server";
import {
  extractTextFromCvFile,
  normalizeCvText,
  parseResumeText,
  sanitizeParsedResume,
} from "@/lib/cv-import";
import { updateUserProfile } from "@/lib/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let cvText = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const pasted = form.get("text");

      if (file instanceof File && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Datei ist zu groß (max. 5 MB)." },
            { status: 400 },
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        cvText = await extractTextFromCvFile(buffer, file.name, file.type);
      } else if (typeof pasted === "string" && pasted.trim()) {
        cvText = normalizeCvText(pasted);
      } else {
        return NextResponse.json(
          { error: "Bitte Lebenslauf-Text einfügen oder Datei hochladen." },
          { status: 400 },
        );
      }
    } else {
      const body = (await request.json()) as { text?: string };
      if (!body.text?.trim()) {
        return NextResponse.json(
          { error: "Bitte Lebenslauf-Text einfügen." },
          { status: 400 },
        );
      }
      cvText = normalizeCvText(body.text);
    }

    const parsed = sanitizeParsedResume(await parseResumeText(cvText));
    const profile = await updateUserProfile(parsed);
    if (!profile) {
      return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
    }

    return NextResponse.json({ profile, parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import fehlgeschlagen";
    const status = message.includes("API key") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
