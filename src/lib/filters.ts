export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Convert a slug like "date-night" or "cheap-eats" to "date night" for use in searchText. */
function deslugify(s: string): string {
  return s.replace(/-/g, ' ').trim();
}

interface FilterArgs {
  city?: string;
  neighborhood?: string;
  cuisine?: string;
  vibe?: string;
  query?: string;
}

/**
 * Vibes that map directly to a price level rather than a useful search term.
 * When these vibes are used as secondary filters (not the primary path), we
 * translate them to placePriceIndicatorCode instead of putting them in searchText,
 * because "cheap eats" / "corporate cards" rarely appear verbatim in review copy.
 */
const VIBE_TO_PRICE: Record<string, string> = {
  'cheap-eats': 'INEXPENSIVE',
  'corporate-cards': 'EXPENSIVE',
};

export interface PrimaryFilterResult {
  attributePathText: string;
  searchText: string | undefined;
  /** Price enum code derived from a price-indicative vibe used as secondary filter. */
  vibePrice: string | undefined;
}

/**
 * Picks the best single structured filter for attributePathText (neighborhood > cuisine > vibe)
 * and collects any remaining filters + free text into searchText.
 *
 * Special case: price-indicative vibes ("cheap-eats", "corporate-cards") that end up as
 * secondary filters are converted to a price enum instead of searchText, because the
 * phrase "cheap eats" rarely appears verbatim in review copy.
 */
export function pickPrimaryFilter({
  city = 'london',
  neighborhood,
  cuisine,
  vibe,
  query,
}: FilterArgs): PrimaryFilterResult {
  const citySlug = slugify(city);
  const secondary: string[] = [];
  let attributePathText: string;
  let vibePrice: string | undefined;

  // Resolve the vibe slug and check if it maps to a price level
  const vibeSlug = vibe ? slugify(vibe) : undefined;
  const vibePriceCode = vibeSlug ? VIBE_TO_PRICE[vibeSlug] : undefined;

  if (neighborhood) {
    attributePathText = `/${citySlug}/neighborhoods/${slugify(neighborhood)}`;
    if (cuisine) secondary.push(deslugify(slugify(cuisine)));
    if (vibeSlug) {
      if (vibePriceCode) {
        vibePrice = vibePriceCode; // use price filter, not searchText
      } else {
        secondary.push(deslugify(vibeSlug));
      }
    }
  } else if (cuisine) {
    attributePathText = `/${citySlug}/cuisines/${slugify(cuisine)}`;
    if (vibeSlug) {
      if (vibePriceCode) {
        vibePrice = vibePriceCode;
      } else {
        secondary.push(deslugify(vibeSlug));
      }
    }
  } else if (vibeSlug) {
    attributePathText = `/${citySlug}/perfect-for/${vibeSlug}`;
  } else {
    attributePathText = `/${citySlug}`;
  }

  if (query) secondary.push(query);

  return {
    attributePathText,
    searchText: secondary.length > 0 ? secondary.join(' ') : undefined,
    vibePrice,
  };
}

interface ParsedSlug {
  city: string;
  slug: string;
}

/** Accepts a full Infatuation URL or a bare slug. Returns city and slug. */
export function parseSlugFromUrl(input: string, defaultCity = 'london'): ParsedSlug {
  if (input.startsWith('http')) {
    try {
      const url = new URL(input);
      const isInfatuation =
        url.hostname === 'www.theinfatuation.com' || url.hostname === 'theinfatuation.com';
      const parts = url.pathname.split('/').filter(Boolean);
      // /london/reviews/dishoom-covent-garden → ['london', 'reviews', 'dishoom-covent-garden']
      if (isInfatuation && parts.length >= 2) {
        return { city: parts[0], slug: parts[parts.length - 1] };
      }
    } catch {
      // fall through to treat input as a bare slug
    }
  }
  return { city: defaultCity, slug: input };
}
