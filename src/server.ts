import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  SearchRestaurantsInput,
  GetRestaurantInput,
  DiscoverFiltersInput,
  GetRestaurantGuideInput,
} from './schemas.js';
import { searchRestaurants } from './tools/searchRestaurants.js';
import { getRestaurant } from './tools/getRestaurant.js';
import { discoverFilters } from './tools/discoverFilters.js';
import { listCities } from './tools/listCities.js';
import { getRestaurantGuide } from './tools/getRestaurantGuide.js';

function wrapError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text' as const, text: `Error: ${msg}` }],
    isError: true as const,
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'infatuation-mcp',
    version: '1.0.0',
  });

  server.tool(
    'list_cities',
    `List all cities covered by The Infatuation, returning the slug for each.

Call this first when you don't know the correct city slug to use. The slug is required by
search_restaurants and discover_filters (e.g. "new-york", "london", "paris").

After picking a city, call discover_filters to get that city's valid neighborhood,
cuisine, and vibe slugs before searching.`,
    {},
    async () => {
      try {
        return await listCities();
      } catch (err) {
        return wrapError(err);
      }
    }
  );

  server.tool(
    'discover_filters',
    `Return all valid filter slugs (neighborhoods, cuisines, vibes/occasions) for a given city.

ALWAYS call this before search_restaurants when you are unsure of valid slug values —
it returns the authoritative live list scraped directly from The Infatuation, which is
more complete than any hardcoded list. Results are cached per city for 1 hour.

The vibe slugs returned map to user intents like:
  "Valentine's Day / romantic"    → look for date-night
  "graduation / big celebration"  → look for special-occasions
  "Mother's Day / Father's Day"   → look for dinner-with-the-parents
  "birthday"                      → look for birthdays
  "work party / Christmas party"  → look for big-groups
  "business dinner"               → look for corporate-cards
  "lazy weekend meal"             → look for brunch or casual-dinners
  "budget / inexpensive"          → look for cheap-eats
  "no reservation"                → look for walk-ins
  "Sunday lunch"                  → look for sunday-roast

Use the slug exactly as returned — slugs are hyphen-separated lowercase strings.
Neighborhood and cuisine inputs to search_restaurants accept natural language
("Notting Hill", "modern European") and are auto-slugified, but vibe must match a valid slug.`,
    DiscoverFiltersInput,
    async (args) => {
      try {
        return await discoverFilters(args as Parameters<typeof discoverFilters>[0]);
      } catch (err) {
        return wrapError(err);
      }
    }
  );

  server.tool(
    'search_restaurants',
    `Search for restaurant reviews on The Infatuation.

RECOMMENDED WORKFLOW for best results:
  1. If you don't know the city slug → call list_cities
  2. Call discover_filters for the city to get valid neighborhood, cuisine, and vibe slugs
  3. Map the user's intent to the closest slug from those lists
  4. Call this tool with the matched slugs

Filter priority: neighborhood is the strongest structured filter. When neighborhood is
provided alongside cuisine or vibe, cuisine/vibe are added as text search terms.
Cuisine and neighborhood inputs accept natural language and are auto-slugified.
Vibe must be a valid slug — use discover_filters to get the list.

Examples (after calling discover_filters to confirm slugs):
  Valentine's Day dinner:    vibe="date-night"
  Graduation meal:           vibe="special-occasions"
  Mother's or Father's Day:  vibe="dinner-with-the-parents"
  Christmas work party:      vibe="big-groups"
  Japanese in Shoreditch:    neighborhood="shoreditch", cuisine="japanese"
  Cheap Italian:             cuisine="italian", vibe="cheap-eats"
  Free text:                 query="burger"

Returns a paginated list with ratings (0–10), price, neighborhood, cuisine, and review URL.
Use the returned nextCursor to fetch additional pages.`,
    SearchRestaurantsInput,
    async (args) => {
      try {
        return await searchRestaurants(args as Parameters<typeof searchRestaurants>[0]);
      } catch (err) {
        return wrapError(err);
      }
    }
  );

  server.tool(
    'get_restaurant',
    `Fetch a single restaurant review from The Infatuation by slug or URL.

Accepts either:
  - A full review URL: "https://www.theinfatuation.com/london/reviews/dishoom-covent-garden"
  - A bare slug:       "dishoom-covent-garden" (with optional city parameter)

Returns the full review: rating, price, address, neighborhoods, cuisines, headline,
description, website, reservation link, and review URL.`,
    GetRestaurantInput,
    async (args) => {
      try {
        return await getRestaurant(args as Parameters<typeof getRestaurant>[0]);
      } catch (err) {
        return wrapError(err);
      }
    }
  );

  server.tool(
    'get_restaurant_guide',
    `Get a deeper guide for a single restaurant: dishes to order, occasions it's
suited for, and the full review summary.

Accepts either:
  - A full review URL: "https://www.theinfatuation.com/london/reviews/dishoom-kings-cross"
  - A bare slug:       "dishoom-kings-cross" (with optional city parameter)

Use this when the user wants to know WHAT to eat, or whether a restaurant fits
a specific occasion (date night, big groups, brunch, etc.). For basic metadata
(rating, address, phone, reservation link) use get_restaurant instead.

Returns: review summary, perfect-for tags, and a "what to order" list with
descriptions for each dish. Not every review has a populated food rundown — if
the result has an empty foodRundown array, the restaurant doesn't have one.`,
    GetRestaurantGuideInput,
    async (args) => {
      try {
        return await getRestaurantGuide(args as Parameters<typeof getRestaurantGuide>[0]);
      } catch (err) {
        return wrapError(err);
      }
    }
  );

  return server;
}
