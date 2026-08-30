import type { UserProfileFull } from "./types";

export type CvWorkEntry = {
  title?: string;
  company?: string;
  location?: string;
  start?: string;
  end?: string;
  description?: string;
};

export type CvEducationEntry = {
  degree?: string;
  institution?: string;
  field?: string;
  start?: string;
  end?: string;
  notes?: string;
};

export type CvProjectEntry = {
  name?: string;
  description?: string;
  technologies?: string[];
  url?: string;
};

export type CvProfileData = UserProfileFull & {
  has_profile_photo?: boolean;
};

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function asWorkEntries(value: unknown): CvWorkEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as CvWorkEntry[];
}

export function asEducationEntries(value: unknown): CvEducationEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as CvEducationEntry[];
}

export function asProjectEntries(value: unknown): CvProjectEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as CvProjectEntry[];
}

export function formatCvAddress(profile: CvProfileData): string | null {
  if (!profile.include_address_on_cv) return null;
  const parts = [
    profile.address_street?.trim(),
    [profile.address_postal_code?.trim(), profile.address_city?.trim()].filter(Boolean).join(" "),
    profile.address_country?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

export function formatDateRange(start?: string, end?: string): string {
  const s = start?.trim() ?? "";
  const e = end?.trim() ?? "heute";
  if (!s && !e) return "";
  if (!s) return e;
  return `${s} – ${e || "heute"}`;
}
