import { graphqlRequest } from '../graphql/client.js';
import { SEARCH_POSTS } from '../graphql/queries.js';
import { pickPrimaryFilter } from '../lib/filters.js';
import { formatReview, inputPriceToEnum } from '../lib/format.js';
import { TtlCache } from '../lib/cache.js';
import type { SearchPostsData, PostReview } from '../types.js';

const cache = new TtlCache<ReturnType<typeof buildResult>>();

interface SearchArgs {
  city: string;
  neighborhood?: string;
  cuisine?: string;
  vibe?: string;
  query?: string;
  limit: number;
  price?: 'cheap' | 'moderate' | 'expensive' | 'very-expensive';
  minRating?: number;
  cursor?: string;
}

function buildResult(
  reviews: ReturnType<typeof formatReview>[],
  receivedRecordCount: number,
  hasMore: boolean,
  nextCursor: string | null
) {
  const structured = {
    results: reviews.map(r => r.structured),
    receivedRecordCount,
    hasMore,
    nextCursor,
  };

  const headerLine =
    reviews.length === 0
      ? 'No restaurants matched your filters.'
      : `Found ${reviews.length} restaurant${reviews.length !== 1 ? 's' : ''} (${receivedRecordCount} total${hasMore ? ', more available — use the nextCursor to paginate' : ''}):`;

  const text =
    reviews.length === 0
      ? 'No restaurants matched your filters.'
      : [headerLine, ...reviews.map(r => r.markdown)].join('\n\n---\n\n');

  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: structured,
  };
}

export async function searchRestaurants(args: SearchArgs) {
  const cacheKey = JSON.stringify(args);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { attributePathText, searchText, vibePrice } = pickPrimaryFilter(args);

  const input: Record<string, unknown> = {
    attributePathText,
    sizeNumber: args.limit,
    postCategoryTypeText: ['POST_REVIEW'],
  };
  if (searchText) input.searchText = searchText;
  // Explicit price arg takes precedence; vibePrice is a fallback derived from vibe slug
  if (args.price) {
    input.placePriceIndicatorCode = [inputPriceToEnum(args.price)];
  } else if (vibePrice) {
    input.placePriceIndicatorCode = [vibePrice];
  }
  if (args.cursor) input.paginationContextualText = args.cursor;

  const data = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, { input });
  const { nodes, pageInfo, receivedRecordCount } = data.searchPosts;

  let reviews = (nodes ?? [])
    .filter((n): n is PostReview => n.__typename === 'PostReview')
    .map(n => formatReview(n, true));

  // minRating: client-side (API's placeRatingNumberList is exact-match, not a threshold)
  if (args.minRating != null) {
    reviews = reviews.filter(
      r => r.structured.rating !== null && r.structured.rating >= (args.minRating as number)
    );
  }

  const hasMore = pageInfo.endpageDirectionCode !== null;
  const result = buildResult(reviews, receivedRecordCount, hasMore, pageInfo.endpageDirectionCode);

  cache.set(cacheKey, result, 60_000);
  return result;
}
