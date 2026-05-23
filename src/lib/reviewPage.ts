/**
 * Parses an Infatuation review page's Next.js __NEXT_DATA__ JSON blob.
 *
 * The post-search GraphQL API exposes a `foodRundownItems` field but it's
 * always null in practice. The actual rundown/perfect-for/review-prose data
 * lives in a Contentful-backed GraphQL backend that the Next.js page hits
 * server-side. We can't call that endpoint directly (no public credentials),
 * but the rendered data is embedded in the page's Apollo state cache.
 */

export interface FoodRundownItem {
  name: string;
  description: string;
}

export interface ParsedReviewGuide {
  found: boolean;
  name: string;
  rating: number | null;
  preview: string;
  reviewProse: string;
  perfectFor: string[];
  foodRundown: FoodRundownItem[];
}

type ApolloState = Record<string, unknown>;
type Json = unknown;

function isObject(x: Json): x is Record<string, Json> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function resolveRef(state: ApolloState, x: Json): Json {
  if (isObject(x) && typeof x.__ref === 'string') {
    return state[x.__ref] ?? {};
  }
  return x ?? {};
}

const BLOCK_NODES = new Set([
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
  'heading-4',
  'heading-5',
  'heading-6',
  'list-item',
]);

/** Walk a Contentful Rich Text node tree, concatenating text and preserving block breaks. */
function extractRichText(node: Json): string {
  if (!isObject(node)) return '';

  if (node.nodeType === 'text' && typeof node.value === 'string') {
    return node.value;
  }

  const children = Array.isArray(node.content) ? node.content : [];
  const joined = children.map(extractRichText).join('');

  return BLOCK_NODES.has(node.nodeType as string) ? joined + '\n\n' : joined;
}

function findNextData(html: string): string | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return match ? match[1] : null;
}

function findTargetReview(
  state: ApolloState,
  targetSlug: string
): Record<string, Json> | null {
  // Match by resolving the slug ref and comparing slug.current to the target.
  // Fall back to any PostReview if there's only one in the cache.
  const reviews = Object.entries(state).filter(
    ([k, v]) => k.startsWith('PostReview:') && isObject(v)
  ) as Array<[string, Record<string, Json>]>;

  for (const [, review] of reviews) {
    const slugObj = resolveRef(state, review.slug);
    if (isObject(slugObj) && slugObj.name === targetSlug) return review;
  }
  // No slug match — if there's exactly one PostReview, use it
  if (reviews.length === 1) return reviews[0][1];
  return null;
}

function extractFoodRundown(
  state: ApolloState,
  review: Record<string, Json>
): FoodRundownItem[] {
  const content = resolveRef(state, review.content);
  if (!isObject(content)) return [];
  const links = resolveRef(state, content.links);
  if (!isObject(links)) return [];
  const entries = resolveRef(state, links.entries);
  if (!isObject(entries)) return [];
  const blocks = entries.block;
  if (!Array.isArray(blocks)) return [];

  const items: FoodRundownItem[] = [];
  for (const block of blocks) {
    if (!isObject(block) || block.__typename !== 'FoodRundown') continue;
    const collKey = Object.keys(block).find(k => k.startsWith('foodRundownItemCollection'));
    if (!collKey) continue;
    const coll = block[collKey];
    if (!isObject(coll) || !Array.isArray(coll.items)) continue;
    for (const it of coll.items) {
      if (!isObject(it)) continue;
      const name = typeof it.name === 'string' ? it.name.trim() : '';
      const description = typeof it.description === 'string' ? it.description.trim() : '';
      if (name) items.push({ name, description });
    }
  }
  return items;
}

function extractPerfectFor(
  state: ApolloState,
  review: Record<string, Json>
): string[] {
  // sectionsCollection items include navigational sections whose `path` tells us
  // which perfect-for categories this review is tagged with.
  const sectionsKey = Object.keys(review).find(k => k.startsWith('sectionsCollection'));
  if (!sectionsKey) return [];
  const sc = review[sectionsKey];
  if (!isObject(sc) || !Array.isArray(sc.items)) return [];

  const slugs = new Set<string>();
  for (const ref of sc.items) {
    const section = resolveRef(state, ref);
    if (!isObject(section)) continue;
    const path = section.path;
    if (typeof path !== 'string') continue;
    const m = path.match(/\/perfect-for\/([a-z0-9-]+)$/);
    if (m) slugs.add(m[1]);
  }
  return Array.from(slugs).sort();
}

function extractReviewProse(
  state: ApolloState,
  review: Record<string, Json>
): string {
  const content = resolveRef(state, review.content);
  if (!isObject(content)) return '';
  const json = content.json;
  if (!json) return '';
  return extractRichText(json).replace(/\n{3,}/g, '\n\n').trim();
}

/** Parses a review page's HTML into a structured guide. */
export function parseReviewPage(html: string, targetSlug: string): ParsedReviewGuide {
  const nextDataRaw = findNextData(html);
  if (!nextDataRaw) {
    return emptyGuide();
  }

  let nextData: Json;
  try {
    nextData = JSON.parse(nextDataRaw);
  } catch {
    return emptyGuide();
  }

  const state = (isObject(nextData) &&
    isObject(nextData.props) &&
    isObject((nextData.props as Record<string, Json>).pageProps) &&
    ((nextData.props as Record<string, Json>).pageProps as Record<string, Json>)
      .initialApolloState) as ApolloState | undefined;
  if (!state) return emptyGuide();

  const review = findTargetReview(state, targetSlug);
  if (!review) return emptyGuide();

  return {
    found: true,
    name: typeof review.title === 'string' ? review.title : '',
    rating: typeof review.rating === 'number' ? review.rating : null,
    preview: typeof review.preview === 'string' ? review.preview : '',
    reviewProse: extractReviewProse(state, review),
    perfectFor: extractPerfectFor(state, review),
    foodRundown: extractFoodRundown(state, review),
  };
}

function emptyGuide(): ParsedReviewGuide {
  return {
    found: false,
    name: '',
    rating: null,
    preview: '',
    reviewProse: '',
    perfectFor: [],
    foodRundown: [],
  };
}
