import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  type CoverLetterMeta,
  styleCoverLetterLines,
  type CoverLetterLineStyle,
  wrapTextLine,
} from "./cover-letter-layout";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function docxStyleFor(lineStyle: CoverLetterLineStyle) {
  switch (lineStyle) {
    case "sender":
      return { size: 20, color: "444444", spacingAfter: 40 };
    case "recipient":
      return { size: 22, spacingAfter: 60 };
    case "date":
      return { size: 22, align: AlignmentType.RIGHT, spacingAfter: 240 };
    case "subject":
      return { size: 24, bold: true, spacingAfter: 200 };
    case "salutation":
      return { size: 22, spacingAfter: 200 };
    case "body":
      return { size: 22, spacingAfter: 200 };
    case "closing":
      return { size: 22, spacingBefore: 240, spacingAfter: 160 };
    case "signature":
      return { size: 22, spacingAfter: 80 };
    default:
      return { size: 12, spacingAfter: 120 };
  }
}

function styledLinesToDocx(content: string, meta?: CoverLetterMeta): Paragraph[] {
  const styled = styleCoverLetterLines(content, meta);

  return styled.map((line) => {
    if (line.style === "spacer") {
      return new Paragraph({ spacing: { after: 120 } });
    }

    const style = docxStyleFor(line.style);
    return new Paragraph({
      alignment: style.align,
      spacing: {
        after: style.spacingAfter,
        before: style.spacingBefore,
        line: 276,
      },
      children: [
        new TextRun({
          text: line.text,
          bold: style.bold,
          size: style.size,
          color: style.color,
          font: "Calibri",
        }),
      ],
    });
  });
}

export async function buildCoverLetterDocx(
  content: string,
  meta?: CoverLetterMeta,
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1417,
              right: 1134,
              bottom: 1417,
              left: 1417,
            },
          },
        },
        children: styledLinesToDocx(content, meta),
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function pdfStyleFor(lineStyle: CoverLetterLineStyle) {
  switch (lineStyle) {
    case "sender":
      return { size: 9, color: rgb(0.35, 0.35, 0.35), gap: 12 };
    case "recipient":
      return { size: 11, color: rgb(0.1, 0.1, 0.1), gap: 16 };
    case "date":
      return { size: 11, color: rgb(0.1, 0.1, 0.1), gap: 28, alignRight: true };
    case "subject":
      return { size: 12, color: rgb(0.05, 0.05, 0.05), gap: 22, bold: true };
    case "salutation":
      return { size: 11, color: rgb(0.1, 0.1, 0.1), gap: 18 };
    case "body":
      return { size: 11, color: rgb(0.12, 0.12, 0.12), gap: 16 };
    case "closing":
      return { size: 11, color: rgb(0.1, 0.1, 0.1), gap: 18, before: 24 };
    case "signature":
      return { size: 11, color: rgb(0.1, 0.1, 0.1), gap: 14 };
    default:
      return { size: 8, color: rgb(0.5, 0.5, 0.5), gap: 8 };
  }
}

export async function buildCoverLetterPdf(
  content: string,
  meta?: CoverLetterMeta,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const styled = styleCoverLetterLines(content, meta);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (height: number) => {
    if (y - height >= MARGIN) return;
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  for (const line of styled) {
    const style = pdfStyleFor(line.style);
    if (line.style === "spacer") {
      y -= style.gap;
      continue;
    }

    y -= style.before ?? 0;
    const font = style.bold ? bold : regular;
    const wrapped = wrapTextLine(line.text, (value) => font.widthOfTextAtSize(value, style.size), CONTENT_WIDTH);

    for (const part of wrapped) {
      ensureSpace(style.gap + style.size);
      const textWidth = font.widthOfTextAtSize(part, style.size);
      const x = style.alignRight ? PAGE_WIDTH - MARGIN - textWidth : MARGIN;
      page.drawText(part, {
        x,
        y: y - style.size,
        size: style.size,
        font,
        color: style.color,
      });
      y -= style.gap;
    }
  }

  return Buffer.from(await pdfDoc.save());
}

export async function buildCoverLetterExport(
  content: string,
  format: "docx" | "pdf",
  meta?: CoverLetterMeta,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Kein Anschreiben-Text zum Exportieren.");
  }

  if (format === "docx") {
    return {
      buffer: await buildCoverLetterDocx(trimmed, meta),
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  return {
    buffer: await buildCoverLetterPdf(trimmed, meta),
    mimeType: "application/pdf",
  };
}
