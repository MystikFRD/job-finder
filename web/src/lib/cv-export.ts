import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  asEducationEntries,
  asProjectEntries,
  asStringArray,
  asWorkEntries,
  formatCvAddress,
  formatDateRange,
  type CvProfileData,
} from "./cv-types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PHOTO_SIZE = 88;

function contactLine(profile: CvProfileData): string {
  return [
    profile.email,
    profile.phone,
    profile.location,
    profile.linkedin_url,
    profile.github_url,
    profile.portfolio_url,
  ]
    .filter(Boolean)
    .join(" · ");
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { color: "CCCCCC", space: 4, size: 6, style: "single" } },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22,
        color: "333333",
        font: "Calibri",
      }),
    ],
  });
}

function bodyParagraph(text: string, opts?: { bold?: boolean; spacingAfter?: number }) {
  return new Paragraph({
    spacing: { after: opts?.spacingAfter ?? 120, line: 276 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: 21,
        font: "Calibri",
      }),
    ],
  });
}

function imageType(mime: string): "jpg" | "png" | "gif" | "bmp" | null {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/bmp") return "bmp";
  return null;
}

export async function buildCvDocx(
  profile: CvProfileData,
  photo?: { mime: string; data: Buffer } | null,
): Promise<Buffer> {
  const children: Paragraph[] = [];
  const name = profile.full_name?.trim() || "Lebenslauf";
  const address = formatCvAddress(profile);
  const contact = contactLine(profile);
  const photoType = photo ? imageType(photo.mime) : null;

  if (photo && photoType) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            type: photoType,
            data: photo.data,
            transformation: { width: PHOTO_SIZE, height: PHOTO_SIZE },
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: name, bold: true, size: 36, font: "Calibri" })],
    }),
  );

  if (contact) children.push(bodyParagraph(contact, { spacingAfter: 80 }));
  if (address) {
    for (const line of address.split("\n")) {
      children.push(bodyParagraph(line, { spacingAfter: 60 }));
    }
  }

  if (profile.summary?.trim()) {
    children.push(sectionTitle("Profil"));
    children.push(bodyParagraph(profile.summary.trim()));
  }

  const work = asWorkEntries(profile.work_experience);
  if (work.length) {
    children.push(sectionTitle("Berufserfahrung"));
    for (const entry of work) {
      const heading = [entry.title, entry.company].filter(Boolean).join(" — ");
      const meta = [formatDateRange(entry.start, entry.end), entry.location].filter(Boolean).join(" · ");
      if (heading) children.push(bodyParagraph(heading, { bold: true, spacingAfter: 40 }));
      if (meta) children.push(bodyParagraph(meta, { spacingAfter: 80 }));
      if (entry.description?.trim()) children.push(bodyParagraph(entry.description.trim()));
    }
  }

  const education = asEducationEntries(profile.education);
  if (education.length) {
    children.push(sectionTitle("Ausbildung"));
    for (const entry of education) {
      const heading = [entry.degree, entry.field].filter(Boolean).join(" — ");
      const meta = [entry.institution, formatDateRange(entry.start, entry.end)].filter(Boolean).join(" · ");
      if (heading) children.push(bodyParagraph(heading, { bold: true, spacingAfter: 40 }));
      if (meta) children.push(bodyParagraph(meta, { spacingAfter: 80 }));
      if (entry.notes?.trim()) children.push(bodyParagraph(entry.notes.trim()));
    }
  }

  const skills = [...asStringArray(profile.skills), ...asStringArray(profile.technologies)];
  if (skills.length) {
    children.push(sectionTitle("Skills"));
    children.push(bodyParagraph(skills.join(" · ")));
  }

  const projects = asProjectEntries(profile.projects);
  if (projects.length) {
    children.push(sectionTitle("Projekte"));
    for (const entry of projects) {
      const heading = entry.name ?? "Projekt";
      const tech = asStringArray(entry.technologies);
      if (heading) children.push(bodyParagraph(heading, { bold: true, spacingAfter: 40 }));
      if (entry.description?.trim()) children.push(bodyParagraph(entry.description.trim(), { spacingAfter: 60 }));
      if (tech.length) children.push(bodyParagraph(tech.join(" · "), { spacingAfter: 80 }));
    }
  }

  const languages = asStringArray(profile.languages);
  if (languages.length) {
    children.push(sectionTitle("Sprachen"));
    children.push(bodyParagraph(languages.join(" · ")));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function wrapText(
  text: string,
  widthOf: (value: string) => number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`;
    if (widthOf(next) <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

export async function buildCvPdf(
  profile: CvProfileData,
  photo?: { mime: string; data: Buffer } | null,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const name = profile.full_name?.trim() || "Lebenslauf";
  const address = formatCvAddress(profile);
  const contact = contactLine(profile);

  const ensureSpace = (height: number) => {
    if (y - height >= MARGIN) return;
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const drawLines = (
    text: string,
    opts: { size?: number; font?: typeof regular; gap?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? regular;
    const gap = opts.gap ?? 14;
    const color = opts.color ?? rgb(0.12, 0.12, 0.12);
    for (const line of wrapText(text, (v) => font.widthOfTextAtSize(v, size), CONTENT_WIDTH)) {
      ensureSpace(gap + size);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color });
      y -= gap;
    }
  };

  if (photo?.data) {
    try {
      const embedded =
        photo.mime === "image/png"
          ? await pdfDoc.embedPng(photo.data)
          : await pdfDoc.embedJpg(photo.data);
      const scale = PHOTO_SIZE / Math.max(embedded.width, embedded.height);
      const w = embedded.width * scale;
      const h = embedded.height * scale;
      page.drawImage(embedded, {
        x: PAGE_WIDTH - MARGIN - w,
        y: y - h,
        width: w,
        height: h,
      });
    } catch {
      // Skip invalid photo
    }
  }

  drawLines(name, { size: 20, font: bold, gap: 22 });
  if (contact) drawLines(contact, { size: 9, color: rgb(0.35, 0.35, 0.35), gap: 12 });
  if (address) {
    for (const line of address.split("\n")) {
      drawLines(line, { size: 10, gap: 12 });
    }
  }
  y -= 8;

  const drawSection = (title: string) => {
    ensureSpace(28);
    y -= 6;
    page.drawText(title.toUpperCase(), {
      x: MARGIN,
      y: y - 11,
      size: 11,
      font: bold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawLine({
      start: { x: MARGIN, y: y - 16 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - 16 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 24;
  };

  if (profile.summary?.trim()) {
    drawSection("Profil");
    drawLines(profile.summary.trim());
    y -= 4;
  }

  const work = asWorkEntries(profile.work_experience);
  if (work.length) {
    drawSection("Berufserfahrung");
    for (const entry of work) {
      const heading = [entry.title, entry.company].filter(Boolean).join(" — ");
      const meta = [formatDateRange(entry.start, entry.end), entry.location].filter(Boolean).join(" · ");
      if (heading) drawLines(heading, { font: bold, size: 10, gap: 12 });
      if (meta) drawLines(meta, { size: 9, color: rgb(0.4, 0.4, 0.4), gap: 10 });
      if (entry.description?.trim()) drawLines(entry.description.trim());
      y -= 4;
    }
  }

  const education = asEducationEntries(profile.education);
  if (education.length) {
    drawSection("Ausbildung");
    for (const entry of education) {
      const heading = [entry.degree, entry.field].filter(Boolean).join(" — ");
      const meta = [entry.institution, formatDateRange(entry.start, entry.end)].filter(Boolean).join(" · ");
      if (heading) drawLines(heading, { font: bold, size: 10, gap: 12 });
      if (meta) drawLines(meta, { size: 9, color: rgb(0.4, 0.4, 0.4), gap: 10 });
      if (entry.notes?.trim()) drawLines(entry.notes.trim());
      y -= 4;
    }
  }

  const skills = [...asStringArray(profile.skills), ...asStringArray(profile.technologies)];
  if (skills.length) {
    drawSection("Skills");
    drawLines(skills.join(" · "));
    y -= 4;
  }

  const projects = asProjectEntries(profile.projects);
  if (projects.length) {
    drawSection("Projekte");
    for (const entry of projects) {
      if (entry.name) drawLines(entry.name, { font: bold, size: 10, gap: 12 });
      if (entry.description?.trim()) drawLines(entry.description.trim(), { gap: 10 });
      const tech = asStringArray(entry.technologies);
      if (tech.length) drawLines(tech.join(" · "), { size: 9, color: rgb(0.4, 0.4, 0.4) });
      y -= 4;
    }
  }

  const languages = asStringArray(profile.languages);
  if (languages.length) {
    drawSection("Sprachen");
    drawLines(languages.join(" · "));
  }

  return Buffer.from(await pdfDoc.save());
}

export async function buildCvExport(
  profile: CvProfileData,
  format: "docx" | "pdf",
  photo?: { mime: string; data: Buffer } | null,
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (format === "docx") {
    return {
      buffer: await buildCvDocx(profile, photo),
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  return {
    buffer: await buildCvPdf(profile, photo),
    mimeType: "application/pdf",
  };
}
