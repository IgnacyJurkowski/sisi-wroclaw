// robots.txt parsing: which user agents are explicitly allowed the whole site.

/** @returns {{ groups: {agents:string[], allow:string[], disallow:string[]}[], sitemaps:string[] }} */
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value);
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === 'sitemap') sitemaps.push(value);
    else if (current && field === 'allow') current.allow.push(value);
    else if (current && field === 'disallow') current.disallow.push(value);
  }
  return { groups, sitemaps };
}

/** User agents whose group allows "/" and does not disallow "/". */
export function allowedAgents(parsed) {
  const out = new Set();
  for (const group of parsed.groups) {
    const blocked = group.disallow.some((rule) => rule === '/');
    const allowsRoot = group.allow.includes('/') || group.disallow.every((rule) => rule === '');
    if (!blocked && allowsRoot) for (const agent of group.agents) out.add(agent);
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

/** Agents that are named in a group that blocks the whole site. */
export function blockedAgents(parsed) {
  const out = new Set();
  for (const group of parsed.groups) {
    if (group.disallow.includes('/') && !group.allow.includes('/')) for (const agent of group.agents) out.add(agent);
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}
