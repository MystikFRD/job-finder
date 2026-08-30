function getWebConfig() {
  const fetchNode = $('Fetch User Config').first()?.json;
  if (fetchNode?.config) return fetchNode.config;
  const legacy = $('Get Search Config').first()?.json;
  return legacy?.config ?? legacy ?? {};
}

const cfg = getWebConfig();
const queries = Array.isArray(cfg.search_queries) ? cfg.search_queries : [];
const baseUrl = String(cfg.searxng_base_url || 'http://152.53.157.68:8080/search').replace(/\/$/, '');

if (queries.length === 0) {
  throw new Error('No search queries configured. Add them in jobs.mubu.dev/settings → Job Search.');
}

return queries.map(query => ({
  json: {
    query,
    search_url: baseUrl + '?q=' + encodeURIComponent(query) + '&format=json&language=de-DE'
  }
}));
