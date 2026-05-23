/**
 * Comprehensive query test — validates all three tools against the live API
 * for 15 London queries and 15 New York queries.
 * Run: npm run query-test
 */

import { searchRestaurants } from '../src/tools/searchRestaurants.js';
import { getRestaurant } from '../src/tools/getRestaurant.js';
import { discoverFilters } from '../src/tools/discoverFilters.js';

interface QueryCase {
  label: string;
  args: Parameters<typeof searchRestaurants>[0];
}

const LONDON_QUERIES: QueryCase[] = [
  {
    label: "Valentine's Day",
    args: { city: 'london', vibe: 'date-night', limit: 5 },
  },
  {
    label: 'Graduation dinner',
    args: { city: 'london', vibe: 'special-occasions', limit: 5 },
  },
  {
    label: "Mother's Day",
    args: { city: 'london', vibe: 'dinner-with-the-parents', limit: 5 },
  },
  {
    label: "Father's Day",
    args: { city: 'london', vibe: 'dinner-with-the-parents', query: 'sunday roast', limit: 5 },
  },
  {
    label: 'Christmas work party',
    args: { city: 'london', vibe: 'big-groups', limit: 5 },
  },
  {
    label: 'Cheap eats in Shoreditch',
    args: { city: 'london', neighborhood: 'shoreditch', vibe: 'cheap-eats', limit: 5 },
  },
  {
    label: 'Japanese in Mayfair',
    args: { city: 'london', neighborhood: 'mayfair', cuisine: 'japanese', limit: 5 },
  },
  {
    label: 'Sunday roast',
    args: { city: 'london', vibe: 'sunday-roast', limit: 5 },
  },
  {
    label: 'Brunch in Notting Hill',
    args: { city: 'london', neighborhood: 'notting-hill', vibe: 'brunch', limit: 5 },
  },
  {
    label: 'Italian date night',
    args: { city: 'london', cuisine: 'italian', vibe: 'date-night', limit: 5 },
  },
  {
    label: 'Corporate dinner',
    args: { city: 'london', vibe: 'corporate-cards', limit: 5 },
  },
  {
    label: 'French restaurant',
    args: { city: 'london', cuisine: 'french', limit: 5 },
  },
  {
    label: 'Indian food in Brixton',
    args: { city: 'london', neighborhood: 'brixton', cuisine: 'indian', limit: 5 },
  },
  {
    label: 'Birthday celebration',
    args: { city: 'london', vibe: 'birthdays', limit: 5 },
  },
  {
    label: 'Cheap lunch',
    args: { city: 'london', vibe: 'lunch', price: 'cheap', limit: 5 },
  },
];

const NEWYORK_QUERIES: QueryCase[] = [
  {
    label: "Valentine's Day",
    args: { city: 'new-york', vibe: 'date-night', limit: 5 },
  },
  {
    label: 'Graduation dinner',
    args: { city: 'new-york', vibe: 'special-occasions', limit: 5 },
  },
  {
    label: "Mother's Day",
    args: { city: 'new-york', vibe: 'dinner-with-the-parents', limit: 5 },
  },
  {
    label: "Father's Day",
    args: { city: 'new-york', vibe: 'dinner-with-the-parents', query: 'steak', limit: 5 },
  },
  {
    label: 'Christmas work party',
    args: { city: 'new-york', vibe: 'big-groups', limit: 5 },
  },
  {
    label: 'Pizza',
    args: { city: 'new-york', cuisine: 'pizza', limit: 5 },
  },
  {
    label: 'Japanese',
    args: { city: 'new-york', cuisine: 'japanese', limit: 5 },
  },
  {
    label: 'Brunch',
    args: { city: 'new-york', vibe: 'brunch', limit: 5 },
  },
  {
    label: 'Cheap eats',
    args: { city: 'new-york', vibe: 'cheap-eats', limit: 5 },
  },
  {
    label: 'Italian',
    args: { city: 'new-york', cuisine: 'italian', limit: 5 },
  },
  {
    label: 'Corporate dinner',
    args: { city: 'new-york', vibe: 'corporate-cards', limit: 5 },
  },
  {
    label: 'Birthday celebration',
    args: { city: 'new-york', vibe: 'birthdays', limit: 5 },
  },
  {
    label: 'Impressing out-of-towners',
    args: { city: 'new-york', vibe: 'impressing-out-of-towners', limit: 5 },
  },
  {
    label: 'Walk-ins only',
    args: { city: 'new-york', vibe: 'walk-ins', limit: 5 },
  },
  {
    label: 'Special occasion (expensive)',
    args: { city: 'new-york', vibe: 'special-occasions', price: 'expensive', limit: 5 },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

type SearchResult = Awaited<ReturnType<typeof searchRestaurants>>;

function assertSearch(label: string, result: SearchResult): boolean {
  if (result.isError) {
    console.error(`  ✗ ERROR: ${result.content[0]?.text ?? 'unknown error'}`);
    return false;
  }
  const sc = result.structuredContent as {
    results: Array<{ name: string; rating: number | null; url: string }>;
    receivedRecordCount: number;
    hasMore: boolean;
  };
  if (!sc?.results) {
    console.error('  ✗ No structuredContent.results');
    return false;
  }
  if (sc.results.length === 0) {
    console.error('  ✗ Zero results');
    return false;
  }

  // Validate each result has required fields
  let sane = true;
  for (const r of sc.results) {
    if (!r.name || typeof r.name !== 'string') { sane = false; break; }
    if (!r.url || !r.url.startsWith('http')) { sane = false; break; }
    if (r.rating !== null && (r.rating < 0 || r.rating > 10)) { sane = false; break; }
  }
  if (!sane) {
    console.error('  ✗ Result fields invalid');
    return false;
  }

  const top3 = sc.results.slice(0, 3).map(r =>
    `${r.name} (${r.rating ?? 'unrated'})`
  );
  console.error(`  ✓ ${sc.results.length} results (${sc.receivedRecordCount} total) — ${top3.join(', ')}`);
  return true;
}

async function runSection(city: string, queries: QueryCase[]): Promise<{ pass: number; fail: number }> {
  let pass = 0;
  let fail = 0;

  console.error(`\n${'═'.repeat(60)}`);
  console.error(`  ${city.toUpperCase()} (${queries.length} queries)`);
  console.error('═'.repeat(60));

  for (const { label, args } of queries) {
    console.error(`\n▶ ${label}`);
    console.error(`  args: ${JSON.stringify(args)}`);
    try {
      const result = await searchRestaurants(args);
      if (assertSearch(label, result)) pass++;
      else fail++;
    } catch (err) {
      console.error(`  ✗ EXCEPTION: ${err instanceof Error ? err.message : String(err)}`);
      fail++;
    }
  }

  return { pass, fail };
}

// ── Additional tool tests ─────────────────────────────────────────────────────

async function testGetRestaurant() {
  console.error(`\n${'═'.repeat(60)}`);
  console.error('  get_restaurant');
  console.error('═'.repeat(60));

  // First get a slug from search, then fetch it
  const search = await searchRestaurants({ city: 'london', cuisine: 'french', limit: 1 });
  const sc = search.structuredContent as { results: Array<{ slugName: string; url: string }> };
  const slug = sc.results[0]?.slugName;
  const url = sc.results[0]?.url;

  if (!slug) {
    console.error('\n▶ get_restaurant by slug: ✗ no slug from search');
    return false;
  }

  // Test by slug
  console.error(`\n▶ get_restaurant by slug: "${slug}"`);
  const bySlug = await getRestaurant({ slugOrUrl: slug, city: 'london' });
  const slugOk = !bySlug.isError && Boolean((bySlug.structuredContent as { name?: string })?.name);
  console.error(slugOk
    ? `  ✓ Found: ${(bySlug.structuredContent as { name: string }).name}`
    : `  ✗ Failed: ${bySlug.content[0]?.text}`);

  // Test by URL
  console.error(`\n▶ get_restaurant by URL: "${url}"`);
  const byUrl = await getRestaurant({ slugOrUrl: url });
  const urlOk = !byUrl.isError && Boolean((byUrl.structuredContent as { name?: string })?.name);
  console.error(urlOk
    ? `  ✓ Found: ${(byUrl.structuredContent as { name: string }).name}`
    : `  ✗ Failed: ${byUrl.content[0]?.text}`);

  // Test not-found
  console.error('\n▶ get_restaurant not-found slug');
  const notFound = await getRestaurant({ slugOrUrl: 'this-slug-does-not-exist-xyzzy', city: 'london' });
  const nfOk = !notFound.isError && (notFound.structuredContent as { found: boolean }).found === false;
  console.error(nfOk ? '  ✓ Graceful not-found response' : `  ✗ ${notFound.content[0]?.text}`);

  return slugOk && urlOk && nfOk;
}

async function testDiscoverFilters() {
  console.error(`\n${'═'.repeat(60)}`);
  console.error('  discover_filters');
  console.error('═'.repeat(60));

  for (const city of ['london', 'new-york']) {
    console.error(`\n▶ discover_filters { city: "${city}" }`);
    try {
      const result = await discoverFilters({ city });
      const sc = result.structuredContent as {
        neighborhoods: unknown[];
        cuisines: unknown[];
        vibes: unknown[];
        sources: string[];
      };
      const ok = sc.neighborhoods.length > 0 && sc.cuisines.length > 0 && sc.vibes.length > 0;
      console.error(ok
        ? `  ✓ ${sc.neighborhoods.length} neighborhoods, ${sc.cuisines.length} cuisines, ${sc.vibes.length} vibes (sources: ${sc.sources.join(', ')})`
        : `  ✗ Missing data — neighborhoods:${sc.neighborhoods.length} cuisines:${sc.cuisines.length} vibes:${sc.vibes.length}`);
    } catch (err) {
      console.error(`  ✗ EXCEPTION: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.error('\n╔══════════════════════════════════════════════════════════╗');
  console.error('║         Infatuation MCP — Comprehensive Query Test        ║');
  console.error('╚══════════════════════════════════════════════════════════╝');

  const londonStats = await runSection('london', LONDON_QUERIES);
  const nyStats = await runSection('new york', NEWYORK_QUERIES);
  await testGetRestaurant();
  await testDiscoverFilters();

  const totalPass = londonStats.pass + nyStats.pass;
  const totalFail = londonStats.fail + nyStats.fail;

  console.error(`\n${'═'.repeat(60)}`);
  console.error('  SUMMARY');
  console.error('═'.repeat(60));
  console.error(`  London:   ${londonStats.pass}/${LONDON_QUERIES.length} passed`);
  console.error(`  New York: ${nyStats.pass}/${NEWYORK_QUERIES.length} passed`);
  console.error(`  Total:    ${totalPass}/${totalPass + totalFail} search queries passed`);

  if (totalFail > 0) {
    console.error('\n  Some queries failed — review output above.\n');
    process.exit(1);
  } else {
    console.error('\n  All queries returned sensible results.\n');
  }
}

main().catch(err => {
  console.error('FATAL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
