export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-äöüÄÖÜß]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "Anschreiben";
}

export function cvFilename(name: string, format: "docx" | "pdf"): string {
  return `Lebenslauf-${sanitizeFilename(name || "Profil")}.${format}`;
}

export function coverLetterFilename(company: string, format: "docx" | "pdf" | "txt"): string {
  return `Anschreiben-${sanitizeFilename(company)}.${format}`;
}
