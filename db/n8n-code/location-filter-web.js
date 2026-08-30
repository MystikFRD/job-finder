function getWebConfig() {
  const fetchNode = $('Fetch User Config').first()?.json;
  if (fetchNode?.config) return fetchNode.config;
  const legacy = $('Get Search Config').first()?.json;
  return legacy?.config ?? legacy ?? {};
}

const cfg = getWebConfig();
const items = $input.all();

function normText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .trim();
}

const preferred = (Array.isArray(cfg.preferred_locations) ? cfg.preferred_locations : [])
  .map(normText)
  .filter(Boolean);

const allowRemote = cfg.allow_remote_outside_locations !== false;

return items.filter(item => {
  const job = item.json;
  const location = normText(job.location);
  const workMode = normText(job.work_mode);

  const isPreferred = preferred.some(place => location.includes(place));
  if (isPreferred) return true;

  const isRemote =
    workMode === 'remote' ||
    workMode === 'fully remote' ||
    workMode.includes('fully remote');

  if (allowRemote && isRemote) return true;

  return false;
});
