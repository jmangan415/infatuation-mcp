import { graphqlRequest } from '../graphql/client.js';
import { SEARCH_POSTS } from '../graphql/queries.js';
import { scrapeCities } from '../lib/scrape.js';
import { KNOWN_CITIES, deSlugify, type TaxonomyEntry } from '../lib/taxonomy.js';
import { TtlCache } from '../lib/cache.js';
import type { SearchPostsData, PostReview } from '../types.js';

const cache = new TtlCache<ReturnType<typeof buildResult>>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

/** Aggregate city slugs from a sitewide search via the first segment of neighborhood paths. */
async function aggregateCitiesFromSearch(): Promise<TaxonomyEntry[]> {
  const data = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
    input: {
      sizeNumber: 50,
      enableSitewideSearch: true,
      postCategoryTypeText: ['POST_REVIEW'],
    },
  });

  const slugs = new Set<string>();
  for (const node of data.searchPosts.nodes ?? []) {
    if (node.__typename !== 'PostReview') continue;
    const review = node as PostReview;
    for (const n of review.neighborhoods ?? []) {
      const segments = (n.neighborhoodAttributePathText ?? '').split('/');
      // path looks like "/london/neighborhoods/shoreditch" → first non-empty segment is city
      if (segments.length >= 2 && segments[1]) slugs.add(segments[1]);
    }
  }

  return Array.from(slugs).map(slug => ({ slug, name: deSlugify(slug) }));
}

function buildResult(cities: TaxonomyEntry[], sources: string[]) {
  const markdown = [
    `## Infatuation Cities (${cities.length})`,
    `*(${sources.join(' + ')})*`,
    '',
    cities.map(c => `- \`${c.slug}\` — ${c.name}`).join('\n'),
    '',
    'Pass the slug as the `city` parameter in `search_restaurants` and `discover_filters`.',
    'After choosing a city, call `discover_filters` to get its valid neighborhood, cuisine, and vibe slugs.',
  ].join('\n');

  return {
    content: [{ type: 'text' as const, text: markdown }],
    structuredContent: { cities, sources },
  };
}

export async function listCities() {
  const cached = cache.get('cities');
  if (cached) return cached;

  const [scraped, aggregated] = await Promise.all([
    scrapeCities().catch(() => [] as TaxonomyEntry[]),
    aggregateCitiesFromSearch().catch(() => [] as TaxonomyEntry[]),
  ]);

  const sources: string[] = [];
  const merged = new Map<string, TaxonomyEntry>();

  // Sitemap is the canonical source — keep its display names (e.g. "Washington D.C.")
  for (const c of scraped) merged.set(c.slug, c);
  if (scraped.length > 0) sources.push('sitemap');

  // Aggregation fills in any slugs the sitemap missed
  for (const c of aggregated) {
    if (!merged.has(c.slug)) merged.set(c.slug, c);
  }
  if (aggregated.length > 0) sources.push('search aggregation');

  // Last-resort: bundled list, only if live sources both fail
  if (merged.size === 0) {
    for (const slug of KNOWN_CITIES) merged.set(slug, { slug, name: deSlugify(slug) });
    sources.push('bundled fallback');
  }

  const cities = Array.from(merged.values()).sort((a, b) => a.slug.localeCompare(b.slug));
  const result = buildResult(cities, sources);
  cache.set('cities', result, TTL_MS);
  return result;
}
