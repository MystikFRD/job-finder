import type { SearchSettings } from "./types";
import { requireUserId } from "./auth";
import { decryptSecret, encryptSecret } from "./crypto";
import { queryOne } from "./db";

const SETTINGS_COLUMNS = `id, search_queries, preferred_locations, match_skills, profile_languages,
  wants_working_student, min_match_score, allow_remote_outside_locations,
  searxng_base_url, role_keywords, tech_focus, max_jobs_per_run, schedule_enabled,
  (deepseek_api_key_enc IS NOT NULL AND deepseek_api_key_enc <> '') AS has_deepseek_key,
  (openai_api_key_enc IS NOT NULL AND openai_api_key_enc <> '') AS has_openai_key,
  (n8n_api_key_enc IS NOT NULL AND n8n_api_key_enc <> '') AS has_n8n_key,
  updated_at`;

export async function getSearchSettings(): Promise<SearchSettings | null> {
  const userId = await requireUserId();
  return queryOne<SearchSettings>(
    `SELECT ${SETTINGS_COLUMNS}
     FROM search_settings WHERE user_id = $1`,
    [userId],
  );
}

export async function getSearchSettingsForUser(userId: string) {
  return queryOne<{
    id: string;
    deepseek_api_key_enc: string | null;
    openai_api_key_enc: string | null;
  } & SearchSettings>(
    `SELECT id, deepseek_api_key_enc, openai_api_key_enc, search_queries, preferred_locations,
            match_skills, profile_languages, wants_working_student, min_match_score,
            allow_remote_outside_locations, searxng_base_url, role_keywords, tech_focus,
            max_jobs_per_run, schedule_enabled, updated_at
     FROM search_settings WHERE user_id = $1`,
    [userId],
  );
}

export async function getDecryptedApiKeys(userId: string) {
  const row = await queryOne<{
    deepseek_api_key_enc: string | null;
    openai_api_key_enc: string | null;
    n8n_api_key_enc: string | null;
  }>(
    `SELECT deepseek_api_key_enc, openai_api_key_enc, n8n_api_key_enc
     FROM search_settings WHERE user_id = $1`,
    [userId],
  );
  return {
    deepseek_api_key: decryptSecret(row?.deepseek_api_key_enc),
    openai_api_key: decryptSecret(row?.openai_api_key_enc),
    n8n_api_key: decryptSecret(row?.n8n_api_key_enc),
  };
}

export async function updateSearchSettings(
  data: Partial<
    Omit<SearchSettings, "id" | "updated_at" | "has_deepseek_key" | "has_openai_key" | "has_n8n_key">
  > & {
    deepseek_api_key?: string | null;
    openai_api_key?: string | null;
    n8n_api_key?: string | null;
  },
): Promise<SearchSettings | null> {
  const userId = await requireUserId();
  const existing = await getSearchSettings();
  if (!existing) return null;

  let deepseekEnc: string | null | undefined;
  let openaiEnc: string | null | undefined;
  let n8nEnc: string | null | undefined;
  let updateDeepseek = false;
  let updateOpenai = false;
  let updateN8n = false;

  if (data.deepseek_api_key !== undefined) {
    updateDeepseek = true;
    deepseekEnc =
      data.deepseek_api_key && data.deepseek_api_key.trim()
        ? encryptSecret(data.deepseek_api_key.trim())
        : null;
  }
  if (data.openai_api_key !== undefined) {
    updateOpenai = true;
    openaiEnc =
      data.openai_api_key && data.openai_api_key.trim()
        ? encryptSecret(data.openai_api_key.trim())
        : null;
  }
  if (data.n8n_api_key !== undefined) {
    updateN8n = true;
    n8nEnc =
      data.n8n_api_key && data.n8n_api_key.trim()
        ? encryptSecret(data.n8n_api_key.trim())
        : null;
  }

  return queryOne<SearchSettings>(
    `UPDATE search_settings SET
       search_queries = coalesce($2::jsonb, search_queries),
       preferred_locations = coalesce($3::jsonb, preferred_locations),
       match_skills = coalesce($4::jsonb, match_skills),
       profile_languages = coalesce($5::jsonb, profile_languages),
       wants_working_student = coalesce($6, wants_working_student),
       min_match_score = coalesce($7, min_match_score),
       allow_remote_outside_locations = coalesce($8, allow_remote_outside_locations),
       searxng_base_url = coalesce($9, searxng_base_url),
       role_keywords = coalesce($10, role_keywords),
       tech_focus = coalesce($11, tech_focus),
       max_jobs_per_run = coalesce($12, max_jobs_per_run),
       schedule_enabled = coalesce($13, schedule_enabled),
       deepseek_api_key_enc = CASE WHEN $14 THEN $15 ELSE deepseek_api_key_enc END,
       openai_api_key_enc = CASE WHEN $16 THEN $17 ELSE openai_api_key_enc END,
       n8n_api_key_enc = CASE WHEN $18 THEN $19 ELSE n8n_api_key_enc END,
       updated_at = timezone('utc', now())
     WHERE id = $1 AND user_id = $20
     RETURNING ${SETTINGS_COLUMNS}`,
    [
      existing.id,
      data.search_queries ? JSON.stringify(data.search_queries) : null,
      data.preferred_locations ? JSON.stringify(data.preferred_locations) : null,
      data.match_skills ? JSON.stringify(data.match_skills) : null,
      data.profile_languages ? JSON.stringify(data.profile_languages) : null,
      data.wants_working_student,
      data.min_match_score,
      data.allow_remote_outside_locations,
      data.searxng_base_url,
      data.role_keywords,
      data.tech_focus,
      data.max_jobs_per_run,
      data.schedule_enabled,
      updateDeepseek,
      updateDeepseek ? deepseekEnc : null,
      updateOpenai,
      updateOpenai ? openaiEnc : null,
      updateN8n,
      updateN8n ? n8nEnc : null,
      userId,
    ],
  );
}

export async function buildN8nUserConfig(userId: string) {
  const settings = await getSearchSettingsForUser(userId);
  if (!settings) return null;

  const keys = await getDecryptedApiKeys(userId);
  const { deepseek_api_key_enc, openai_api_key_enc, id, ...config } = settings;

  return {
    user_id: userId,
    config: {
      ...config,
      search_queries: settings.search_queries,
      preferred_locations: settings.preferred_locations,
      match_skills: settings.match_skills,
      profile_languages: settings.profile_languages,
      wants_working_student: settings.wants_working_student,
      min_match_score: settings.min_match_score,
      allow_remote_outside_locations: settings.allow_remote_outside_locations,
      searxng_base_url: settings.searxng_base_url,
      role_keywords: settings.role_keywords,
      tech_focus: settings.tech_focus,
      max_jobs_per_run: settings.max_jobs_per_run,
      schedule_enabled: settings.schedule_enabled,
      deepseek_api_key: keys.deepseek_api_key,
      openai_api_key: keys.openai_api_key,
    },
  };
}
