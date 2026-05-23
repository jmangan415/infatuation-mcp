import { parseReviewPage, type ParsedReviewGuide } from '../lib/reviewPage.js';
import { parseSlugFromUrl } from '../lib/filters.js';
import { roundRating } from '../lib/format.js';
import { TtlCache } from '../lib/cache.js';
import { deSlugify } from '../lib/taxonomy.js';

const cache = new TtlCache<ReturnType<typeof buildResult>>();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

const PAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; infatuation-mcp)',
  Accept: 'text/html,application/xhtml+xml',
  Origin: 'https://www.theinfatuation.com',
  Referer: 'https://www.theinfatuation.com/',
};

interface Args {
  slugOrUrl: string;
  city?: string;
}

function buildUrl(input: string, defaultCity: string): { url: string; slug: string } {
  if (input.startsWith('http')) {
    try {
      const u = new URL(input);
      const isInfatuation =
        u.hostname === 'www.theinfatuation.com' || u.hostname === 'theinfatuation.com';
      if (isInfatuation) {
        const parts = u.pathname.split('/').filter(Boolean);
        const slug = parts[parts.length - 1];
        return { url: `https://www.theinfatuation.com${u.pathname}`, slug };
      }
    } catch {
      // fall through
    }
  }
  const { city, slug } = parseSlugFromUrl(input, defaultCity);
  return {
    url: `https://www.theinfatuation.com/${city}/reviews/${slug}`,
    slug,
  };
}

function notFound(url: string, slug: string) {
  const text = `No review guide found for "${slug}" at ${url}.`;
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: {
      found: false,
      slug,
      url,
    },
  };
}

function buildResult(guide: ParsedReviewGuide, url: string, slug: string) {
  const rating = roundRating(guide.rating);
  const ratingStr = rating !== null ? `${rating}/10` : 'Unrated';

  const lines: string[] = [
    `## ${guide.name}`,
    `**Rating:** ${ratingStr}`,
  ];

  if (guide.perfectFor.length > 0) {
    const tags = guide.perfectFor.map(deSlugify).join(', ');
    lines.push(`**Perfect for:** ${tags}`);
  }

  if (guide.preview) {
    lines.push('', `_${guide.preview.trim()}_`);
  }

  if (guide.reviewProse) {
    lines.push('', '### Review', guide.reviewProse);
  }

  if (guide.foodRundown.length > 0) {
    lines.push('', '### What to order');
    for (const item of guide.foodRundown) {
      lines.push(`- **${item.name}** — ${item.description}`);
    }
  }

  lines.push('', `[View on The Infatuation](${url})`);

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
    structuredContent: {
      found: true,
      name: guide.name,
      rating,
      preview: guide.preview,
      reviewProse: guide.reviewProse,
      perfectFor: guide.perfectFor,
      foodRundown: guide.foodRundown,
      url,
      slug,
    },
  };
}

export async function getRestaurantGuide(args: Args) {
  const { url, slug } = buildUrl(args.slugOrUrl, args.city ?? 'london');
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let html: string;
  try {
    const res = await fetch(url, {
      headers: PAGE_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return notFound(url, slug);
    if (!res.ok) {
      throw new Error(`The Infatuation review page returned HTTP ${res.status}`);
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new Error(`The Infatuation review page timed out after 15s`);
    }
    throw err;
  }

  const guide = parseReviewPage(html, slug);
  if (!guide.found) return notFound(url, slug);

  const result = buildResult(guide, url, slug);
  cache.set(cacheKey, result, TTL_MS);
  return result;
}
