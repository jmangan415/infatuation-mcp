import { z } from 'zod';

const citySlug = z
  .string()
  .regex(/^[a-z0-9-]{1,50}$/, 'must be a lowercase slug like "london" or "new-york"');

export const SearchRestaurantsInput = {
  city: citySlug.default('london').describe(
    'City slug, e.g. "london", "new-york", "paris". Defaults to london.'
  ),
  neighborhood: z.string().max(100).optional().describe(
    'Neighborhood name or slug, e.g. "shoreditch", "Notting Hill", "soho". This is the strongest filter.'
  ),
  cuisine: z.string().max(100).optional().describe(
    'Cuisine name or slug, e.g. "italian", "japanese", "modern european".'
  ),
  vibe: z.string().max(100).optional().describe(
    'Occasion or vibe, e.g. "date-night", "cheap-eats", "brunch", "sunday-roast".'
  ),
  query: z.string().max(500).optional().describe(
    'Free text search across restaurant names, descriptions, and review content.'
  ),
  limit: z.number().int().min(1).max(50).default(10).describe(
    'Number of results to return (1-50, default 10).'
  ),
  price: z.enum(['cheap', 'moderate', 'expensive', 'very-expensive']).optional().describe(
    'Price level filter: cheap (£), moderate (££), expensive (£££), very-expensive (££££).'
  ),
  minRating: z.number().min(0).max(10).optional().describe(
    'Minimum rating threshold (0-10 scale). Applied client-side after fetching.'
  ),
  cursor: z.string().max(500).optional().describe(
    'Pagination cursor (nextCursor from a previous search_restaurants call).'
  ),
};

export const GetRestaurantInput = {
  slugOrUrl: z.string().min(1).max(500).describe(
    'Restaurant review slug (e.g. "dishoom-covent-garden") or full Infatuation review URL.'
  ),
  city: citySlug.optional().describe(
    'City slug. Inferred from URL if a full URL is provided; defaults to "london".'
  ),
};

export const DiscoverFiltersInput = {
  city: citySlug.default('london').describe(
    'City slug to discover available filter values for, e.g. "london", "new-york".'
  ),
};

export const GetRestaurantGuideInput = {
  slugOrUrl: z.string().min(1).max(500).describe(
    'Restaurant review slug (e.g. "dishoom-kings-cross") or full Infatuation review URL.'
  ),
  city: citySlug.optional().describe(
    'City slug. Inferred from URL if a full URL is provided; defaults to "london".'
  ),
};
