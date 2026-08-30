export async function readJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();

  if (!contentType.includes("application/json")) {
    if (raw.trimStart().startsWith("<")) {
      if (res.status === 413) {
        throw new Error("Datei ist zu groß für den Server (max. 10 MB). Text einfügen oder kleinere PDF.");
      }
      if (res.status === 504 || res.status === 502) {
        throw new Error("Server-Timeout — bitte erneut versuchen oder kürzeren Text einfügen.");
      }
      throw new Error(`Server-Fehler (${res.status}). Bitte erneut versuchen.`);
    }
    throw new Error(raw.slice(0, 200) || `Unerwartete Antwort (${res.status})`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Ungültige Server-Antwort.");
  }
}
