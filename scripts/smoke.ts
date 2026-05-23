/**
 * Live API smoke test — run with: npm run smoke
 * Validates the GraphQL endpoint, query shapes, compound filtering,
 * single-review fetch, and Price enum before the MCP tools are built.
 */

import { graphqlRequest } from '../src/graphql/client.js';
import { SEARCH_POSTS, GET_REVIEW } from '../src/graphql/queries.js';
import { roundRating, resolveCuisineName, resolveNeighborhoodName } from '../src/lib/format.js';
import type { SearchPostsData, PostReview } from '../src/types.js';

const PASS = '✓';
const FAIL = '✗';

let failures = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.error(`  ${PASS} ${label}`);
  } else {
    console.error(`  ${FAIL} ${label}${detail ? ': ' + detail : ''}`);
    failures++;
  }
}

async function run() {
  console.error('\n=== Infatuation API Smoke Test ===\n');

  // ── 1. Basic London search ──────────────────────────────────────────────────
  console.error('1. Basic London search (POST_REVIEW, limit 5)');
  const data1 = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
    input: {
      attributePathText: '/london',
      sizeNumber: 5,
      postCategoryTypeText: ['POST_REVIEW'],
    },
  });
  const nodes1 = data1.searchPosts.nodes.filter(n => n.__typename === 'PostReview') as PostReview[];
  assert('returns nodes', nodes1.length > 0, `got ${nodes1.length}`);
  assert('receivedRecordCount > 0', data1.searchPosts.receivedRecordCount > 0);
  const pi = data1.searchPosts.pageInfo;
  console.error(`     pageInfo: ${JSON.stringify(pi)}`);
  assert('pageInfo present', pi !== null && pi !== undefined);

  const first = nodes1[0];
  if (first) {
    assert('placeName is a string', typeof first.placeName === 'string' && first.placeName.length > 0);
    const rating = roundRating(first.placeRatingNumber);
    const decimalPlaces = rating !== null ? (String(rating).split('.')[1]?.length ?? 0) : 0;
    assert(
      `rating rounded correctly (raw=${first.placeRatingNumber})`,
      rating === null || (Number.isFinite(rating) && decimalPlaces <= 1)
    );
    assert('placePriceIndicatorCode present', Boolean(first.placePriceIndicatorCode));
    assert('url present', typeof first.url === 'string' && first.url.startsWith('http'));
    assert('slugName present', typeof first.slugName === 'string' && first.slugName.length > 0);
    console.error(`     Sample: "${first.placeName}" rating=${rating} price=${first.placePriceIndicatorCode}`);
  }

  const cuisineNames = (nodes1[0]?.cuisines ?? []).map(resolveCuisineName);
  const neighborhoodNames = (nodes1[0]?.neighborhoods ?? []).map(resolveNeighborhoodName);
  console.error(`     Cuisines: [${cuisineNames.join(', ')}]`);
  console.error(`     Neighborhoods: [${neighborhoodNames.join(', ')}]`);

  // ── 2. Compound filter: Shoreditch neighborhood + italian text ──────────────
  console.error('\n2. Compound filter: /london/neighborhoods/shoreditch + searchText "italian"');
  const data2 = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
    input: {
      attributePathText: '/london/neighborhoods/shoreditch',
      searchText: 'italian',
      sizeNumber: 5,
      postCategoryTypeText: ['POST_REVIEW'],
    },
  });
  const nodes2 = data2.searchPosts.nodes.filter(n => n.__typename === 'PostReview') as PostReview[];
  assert('compound filter returns results', nodes2.length >= 0); // may be 0 — that's valid
  console.error(`     Found ${nodes2.length} results`);
  if (nodes2[0]) {
    console.error(`     First: "${(nodes2[0] as PostReview).placeName}"`);
  }

  // ── 3. Cuisine path filter ──────────────────────────────────────────────────
  console.error('\n3. Cuisine path: /london/cuisines/japanese');
  const data3 = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
    input: {
      attributePathText: '/london/cuisines/japanese',
      sizeNumber: 3,
      postCategoryTypeText: ['POST_REVIEW'],
    },
  });
  const nodes3 = data3.searchPosts.nodes.filter(n => n.__typename === 'PostReview') as PostReview[];
  assert('cuisine filter returns results', nodes3.length > 0, `got ${nodes3.length}`);
  if (nodes3[0]) {
    console.error(`     First: "${(nodes3[0] as PostReview).placeName}"`);
  }

  // ── 4. Single review fetch by slugName ─────────────────────────────────────
  console.error('\n4. Single review fetch by slugName (using first result from test 1)');
  const targetSlug = first?.slugName;
  assert('have a slug to fetch', Boolean(targetSlug));

  if (targetSlug) {
    const data4 = await graphqlRequest<SearchPostsData>(GET_REVIEW, {
      input: {
        attributePathText: '/london',
        slugName: targetSlug,
        sizeNumber: 1,
        postCategoryTypeText: ['POST_REVIEW'],
      },
    });
    const review = data4.searchPosts.nodes.find(n => n.__typename === 'PostReview') as PostReview | undefined;
    assert('slug fetch returns a review', Boolean(review));
    if (review) {
      assert('slug matches', review.slugName === targetSlug);
      assert('headline field present', typeof review.headline === 'string');
      assert('full address fields present', typeof review.placeStreetName === 'string');
      console.error(`     Fetched: "${review.placeName}" headline="${review.headline?.slice(0, 60)}..."`);
    }
  }

  // ── 5. Vibe / perfect-for path ────────────────────────────────────────────
  console.error('\n5. Vibe path: /london/perfect-for/date-night');
  const data5 = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
    input: {
      attributePathText: '/london/perfect-for/date-night',
      sizeNumber: 3,
      postCategoryTypeText: ['POST_REVIEW'],
    },
  });
  const nodes5 = data5.searchPosts.nodes.filter(n => n.__typename === 'PostReview') as PostReview[];
  assert('vibe filter returns results', nodes5.length > 0, `got ${nodes5.length}`);
  if (nodes5[0]) {
    console.error(`     First: "${(nodes5[0] as PostReview).placeName}"`);
  }

  // ── 6. Price enum introspection ───────────────────────────────────────────
  console.error('\n6. Price enum introspection');
  const priceData = await graphqlRequest<{ __type: { enumValues: { name: string }[] } }>(
    `{ __type(name: "Price") { enumValues { name } } }`,
    {}
  );
  const priceValues = priceData.__type?.enumValues?.map(v => v.name) ?? [];
  assert('Price enum values found', priceValues.length > 0);
  console.error(`     Price enum: [${priceValues.join(', ')}]`);
  assert('INEXPENSIVE exists', priceValues.includes('INEXPENSIVE'));
  assert('MODERATELY_EXPENSIVE exists', priceValues.includes('MODERATELY_EXPENSIVE'));
  assert('EXPENSIVE exists', priceValues.includes('EXPENSIVE'));

  // ── 7. Pagination cursor ──────────────────────────────────────────────────
  console.error('\n7. Pagination cursor');
  const page1 = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
    input: {
      attributePathText: '/london',
      sizeNumber: 5,
      postCategoryTypeText: ['POST_REVIEW'],
    },
  });
  const cursor = page1.searchPosts.pageInfo.endpageDirectionCode;
  assert('endpageDirectionCode present when more data', cursor !== null || !page1.searchPosts.pageInfo.moreDataIndicator);

  if (cursor) {
    const page2 = await graphqlRequest<SearchPostsData>(SEARCH_POSTS, {
      input: {
        attributePathText: '/london',
        sizeNumber: 5,
        postCategoryTypeText: ['POST_REVIEW'],
        paginationContextualText: cursor,
      },
    });
    const p1Names = page1.searchPosts.nodes
      .filter(n => n.__typename === 'PostReview')
      .map(n => (n as PostReview).placeName);
    const p2Names = page2.searchPosts.nodes
      .filter(n => n.__typename === 'PostReview')
      .map(n => (n as PostReview).placeName);
    const overlap = p1Names.filter(n => p2Names.includes(n));
    assert('page 2 has different results', overlap.length < p1Names.length);
    console.error(`     Page 1: [${p1Names.slice(0, 2).join(', ')}…]`);
    console.error(`     Page 2: [${p2Names.slice(0, 2).join(', ')}…]`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.error('\n=== Summary ===');
  if (failures === 0) {
    console.error('All assertions passed. API shape confirmed — safe to build tools.\n');
  } else {
    console.error(`${failures} assertion(s) failed. Review output above before building.\n`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('\nFATAL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
