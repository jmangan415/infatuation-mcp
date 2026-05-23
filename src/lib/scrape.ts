import { deSlugify, type TaxonomyEntry } from './taxonomy.js';

export interface ScrapedFilters {
  neighborhoods: TaxonomyEntry[];
  cuisines: TaxonomyEntry[];
  vibes: TaxonomyEntry[];
}

const EMPTY: ScrapedFilters = { neighborhoods: [], cuisines: [], vibes: [] };

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; infatuation-mcp)',
  Accept: 'text/html,application/xhtml+xml',
  Origin: 'https://www.theinfatuation.com',
  Referer: 'https://www.theinfatuation.com/',
};

/** Fetches the city landing page and regex-extracts filter links. Returns empty on failure. */
export async function scrapeFilters(city: string): Promise<ScrapedFilters> {
  const url = `https://www.theinfatuation.com/${city}`;
  let html: string;

  try {
    const res = await fetch(url, {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return EMPTY;
    }
    html = await res.text();
  } catch {
    return EMPTY;
  }

  const neighborhoods = new Map<string, TaxonomyEntry>();
  const cuisines = new Map<string, TaxonomyEntry>();
  const vibes = new Map<string, TaxonomyEntry>();

  // Escape city before use in RegExp — all known slugs are [a-z0-9-] but be explicit
  const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `/${escapedCity}/(neighborhoods|cuisines|perfect-for)/([a-z0-9][a-z0-9-]*)`,
    'g'
  );

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const [, category, slug] = match;
    const entry: TaxonomyEntry = { slug, name: deSlugify(slug) };
    if (category === 'neighborhoods') neighborhoods.set(slug, entry);
    else if (category === 'cuisines') cuisines.set(slug, entry);
    else if (category === 'perfect-for') vibes.set(slug, entry);
  }

  return {
    neighborhoods: Array.from(neighborhoods.values()),
    cuisines: Array.from(cuisines.values()),
    vibes: Array.from(vibes.values()),
  };
}

/**
 * Fetches the sitemap and extracts cities by harvesting first path-segments
 * of `/{city}/(neighborhoods|cuisines|perfect-for)/...` URLs. Only real cities
 * have those sub-paths, so this is structurally tamper-proof — no risk of
 * non-city links like /about or /careers being picked up. Returns empty on failure.
 */
export async function scrapeCities(): Promise<TaxonomyEntry[]> {
  let html: string;
  try {
    const res = await fetch('https://www.theinfatuation.com/sitemap', {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  const slugs = new Set<string>();
  const pattern = /href="\/([a-z][a-z0-9-]*)\/(?:neighborhoods|cuisines|perfect-for)\//g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    slugs.add(match[1]);
  }

  return Array.from(slugs)
    .sort()
    .map(slug => ({ slug, name: deSlugify(slug) }));
}
