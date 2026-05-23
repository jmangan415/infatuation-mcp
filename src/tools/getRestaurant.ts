import { graphqlRequest } from '../graphql/client.js';
import { GET_REVIEW } from '../graphql/queries.js';
import { parseSlugFromUrl } from '../lib/filters.js';
import { formatReview } from '../lib/format.js';
import type { SearchPostsData, PostReview } from '../types.js';

interface GetArgs {
  slugOrUrl: string;
  city?: string;
}

export async function getRestaurant(args: GetArgs) {
  const { city: inferredCity, slug } = parseSlugFromUrl(args.slugOrUrl, args.city ?? 'london');
  const city = args.city ?? inferredCity;

  const input: Record<string, unknown> = {
    attributePathText: `/${city}`,
    slugName: slug,
    sizeNumber: 1,
    postCategoryTypeText: ['POST_REVIEW'],
  };

  const data = await graphqlRequest<SearchPostsData>(GET_REVIEW, { input });
  const review = (data.searchPosts.nodes ?? []).find(
    (n): n is PostReview => n.__typename === 'PostReview'
  );

  if (!review) {
    const text = `No review found for "${slug}" in ${city}. Check the slug or city slug and try again.`;
    return {
      content: [{ type: 'text' as const, text }],
      structuredContent: { found: false, slug, city },
    };
  }

  const { markdown, structured } = formatReview(review, false);
  return {
    content: [{ type: 'text' as const, text: markdown }],
    structuredContent: { found: true, ...structured },
  };
}
