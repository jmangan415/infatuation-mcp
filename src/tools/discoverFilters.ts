import { graphqlRequest } from '../graphql/client.js';
import { SEARCH_POSTS } from '../graphql/queries.js';
import { scrapeFilters } from '../lib/scrape.js';
import { FALLBACK_TAXONOMY, type TaxonomyEntry } from '../lib/taxonomy.js';
import { resolveCuisineName, resolveNeighborhoodName } from '../lib/format.js';
import { TtlCache } from '../lib/cache.js';
import type { SearchPostsData, PostReview } from '../types.js';

const cache = new TtlCache<ReturnType<typeof buildResult>>();

const TTL_MS = 60 * 60 * 1000; // 1 hour

function mergeBySlug(
  a: TaxonomyEntry[],
  b: TaxonomyEntry[]
): TaxonomyEntry[] {
  const map = new Map<string, TaxonomyEntry>();
  for (const entry of [...a, ...b]) map.set(entry.slug, entry);
  return Array.from(map.values()).sort((x, y) => x.slug.localeCompare(y.slug));
}

/** Aggregate neighborhoods and cuisines from a sample of search results. */
async function aggregateFromSearch(city: string): Promise<{
  neighborhoods: TaxonomyEntry[];
  cuisines: TaxonomyEntry[];
}> {
  const data = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
    input: {
      attributePathText: `/${city}`,
      sizeNumber: 50,
      postCategoryTypeText: ['POST_REVIEW'],
    },
  });

  const neighborhoodMap = new Map<string, TaxonomyEntry>();
  const cuisineMap = new Map<string, TaxonomyEntry>();

  for (const node of data.searchPosts.nodes ?? []) {
    if (node.__typename !== 'PostReview') continue;
    const review = node as PostReview;

    for (const n of review.neighborhoods ?? []) {
      const slug = n.neighborhoodAttributePathText?.split('/').pop();
      if (slug) neighborhoodMap.set(slug, { slug, name: resolveNeighborhoodName(n) });
    }
    for (const c of review.cuisines ?? []) {
      const slug = c.cuisineAttributePathText?.split('/').pop();
      if (slug) cuisineMap.set(slug, { slug, name: resolveCuisineName(c) });
    }
  }

  return {
    neighborhoods: Array.from(neighborhoodMap.values()),
    cuisines: Array.from(cuisineMap.values()),
  };
}

function buildResult(
  city: string,
  neighborhoods: TaxonomyEntry[],
  cuisines: TaxonomyEntry[],
  vibes: TaxonomyEntry[],
  sources: string[]
) {
  const fmt = (entries: TaxonomyEntry[]) =>
    entries.map(e => `- \`${e.slug}\` — ${e.name}`).join('\n');

  const text = [
    `## Available filters for **${city}**`,
    `*(${sources.join(' + ')})*`,
    '',
    `### Neighborhoods (${neighborhoods.length})`,
    fmt(neighborhoods) || '_(none found)_',
    '',
    `### Cuisines (${cuisines.length})`,
    fmt(cuisines) || '_(none found)_',
    '',
    `### Vibes / Occasions (${vibes.length})`,
    fmt(vibes) || '_(none found)_',
  ].join('\n');

  const structured = { city, neighborhoods, cuisines, vibes, sources };
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: structured,
  };
}

export async function discoverFilters(args: { city: string }) {
  const { city } = args;
  const cacheKey = city;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const sources: string[] = [];

  // Run scrape and GraphQL aggregate in parallel
  const [scraped, aggregated] = await Promise.all([
    scrapeFilters(city),
    aggregateFromSearch(city).catch(() => ({ neighborhoods: [], cuisines: [] })),
  ]);

  // Vibes: scraping is the primary source (search results don't expose perfect-for categories)
  const fallback = FALLBACK_TAXONOMY[city];

  const neighborhoods = mergeBySlug(scraped.neighborhoods, aggregated.neighborhoods);
  const cuisines = mergeBySlug(scraped.cuisines, aggregated.cuisines);
  let vibes = scraped.vibes;

  if (scraped.neighborhoods.length > 0 || scraped.cuisines.length > 0) sources.push('live city page');
  if (aggregated.neighborhoods.length > 0 || aggregated.cuisines.length > 0) sources.push('search aggregation');

  // Fill any empty categories from bundled fallback
  if (neighborhoods.length === 0 && fallback) {
    neighborhoods.push(...fallback.neighborhoods);
    if (!sources.includes('bundled fallback')) sources.push('bundled fallback');
  }
  if (cuisines.length === 0 && fallback) {
    cuisines.push(...fallback.cuisines);
    if (!sources.includes('bundled fallback')) sources.push('bundled fallback');
  }
  if (vibes.length === 0 && fallback) {
    vibes = [...fallback.vibes];
    if (!sources.includes('bundled fallback')) sources.push('bundled fallback');
  }

  if (sources.length === 0) sources.push('none');

  const result = buildResult(city, neighborhoods, cuisines, vibes, sources);
  cache.set(cacheKey, result, TTL_MS);
  return result;
}
