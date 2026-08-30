// Reads search config from Fetch User Config HTTP node (falls back to Get Search Config postgres)
function getWebConfig() {
  const fetchNode = $('Fetch User Config').first()?.json;
  if (fetchNode?.config) return fetchNode.config;
  if (fetchNode?.user_id) return fetchNode;
  const legacy = $('Get Search Config').first()?.json;
  return legacy?.config ?? legacy ?? {};
}

const cfg = getWebConfig();
const results = $input.first().json.results ?? [];

const slimResults = results.map(r => ({
  title: r.title,
  content: r.content,
  url: r.url,
  score: r.score
}));

const roleKeywords = String(cfg.role_keywords || 'Werkstudent / Working Student');
const techFocus = String(cfg.tech_focus || 'software development, Python, React, AI');
const maxJobs = Math.min(Math.max(Number(cfg.max_jobs_per_run) || 20, 1), 50);
const locations = Array.isArray(cfg.preferred_locations) ? cfg.preferred_locations : ['Köln', 'Cologne'];
const locationHint = locations.slice(0, 3).join(', ');
const allowRemote = cfg.allow_remote_outside_locations !== false;

const locationRules =
  `Jobs in ${locationHint} may be onsite, hybrid or remote. ` +
  (allowRemote
    ? 'Jobs outside those locations should only be included when the search result clearly indicates remote work from Germany. '
    : 'Only include jobs in the preferred locations. ');

const payload = {
  model: 'deepseek-v4-flash',
  reasoning: { effort: 'none' },
  max_output_tokens: 6000,
  instructions:
    'You are a job result extraction and selection agent. You receive search results from SearXNG. ' +
    `Extract actual ${roleKeywords} job postings relevant to computer science. ` +
    `Prefer ${techFocus}. ` +
    'Exclude internships, full-time jobs and clearly irrelevant results. ' +
    'Every returned job MUST have a URL that points to the individual job posting itself. ' +
    'NEVER return URLs that point only to search result pages, job category pages, career overview pages, ' +
    'company homepages, generic job-board pages, or pages containing multiple different job postings. ' +
    'If no specific individual job posting URL can be identified, DO NOT return that job. ' +
    'Employer diversity is very important. Return a maximum of 2 jobs from the same employer or company group. ' +
    'Detect duplicate or near-duplicate job postings and return each position only once. ' +
    `Aim to return up to ${maxJobs} useful jobs if enough suitable jobs exist. ` +
    'Do not invent information. If location cannot be determined, use unknown. ' +
    'For work_mode use unknown when necessary. A job URL must never be unknown; exclude the job instead. ' +
    'Return only the structured JSON output.',
  input:
    `Analyze the following SearXNG search results and extract relevant ${roleKeywords} jobs. ` +
    locationRules +
    'Create a diverse selection across employers. For every actual job posting return title, company, location, work_mode and URL.\n\n' +
    'SEARXNG RESULTS:\n\n' +
    JSON.stringify(slimResults),
  text: {
    format: {
      type: 'json_schema',
      name: 'job_search_results',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          jobs: {
            type: 'array',
            maxItems: maxJobs,
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                company: { type: 'string' },
                location: { type: 'string' },
                work_mode: {
                  type: 'string',
                  enum: ['onsite', 'hybrid', 'remote', 'unknown']
                },
                url: { type: 'string' }
              },
              required: ['title', 'company', 'location', 'work_mode', 'url'],
              additionalProperties: false
            }
          }
        },
        required: ['jobs'],
        additionalProperties: false
      }
    }
  }
};

return [{ json: { deepseek_body: payload } }];
