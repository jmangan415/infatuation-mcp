import type { CuisineObj, NeighborhoodObj, PostReview } from '../types.js';

export function roundRating(n: number | null | undefined): number | null {
  // The Infatuation never issues a true 0 rating; the API uses 0 as its unrated
  // sentinel (the Contentful backend uses null for the same thing).
  if (n == null || n === 0) return null;
  return Math.round(n * 10) / 10;
}

const PRICE_DISPLAY: Record<string, string> = {
  INEXPENSIVE: '£',
  MODERATELY_EXPENSIVE: '££',
  EXPENSIVE: '£££',
  VERY_EXPENSIVE: '££££',
};

const PRICE_INPUT: Record<string, string> = {
  cheap: 'INEXPENSIVE',
  moderate: 'MODERATELY_EXPENSIVE',
  expensive: 'EXPENSIVE',
  'very-expensive': 'VERY_EXPENSIVE',
};

export function displayPrice(code: string): string {
  return PRICE_DISPLAY[code] ?? code;
}

export function inputPriceToEnum(p: string): string {
  return PRICE_INPUT[p.toLowerCase()] ?? p.toUpperCase();
}

export function resolveCuisineName(c: CuisineObj): string {
  if (c.cuisineDisplayName?.trim()) return c.cuisineDisplayName.trim();
  if (c.cuisineName?.trim()) return c.cuisineName.trim();
  const seg = c.cuisineAttributePathText?.split('/').pop() ?? '';
  return seg.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

export function resolveNeighborhoodName(n: NeighborhoodObj): string {
  if (n.neighborhoodDisplayName?.trim()) return n.neighborhoodDisplayName.trim();
  if (n.neighborhoodName?.trim()) return n.neighborhoodName.trim();
  const seg = n.neighborhoodAttributePathText?.split('/').pop() ?? '';
  return seg.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

export interface ReviewStructured {
  name: string;
  rating: number | null;
  price: string;
  priceDisplay: string;
  address: string;
  city: string;
  neighborhoods: string[];
  cuisines: string[];
  description: string;
  headline: string | undefined;
  url: string;
  mapsUrl: string;
  slugName: string;
  phone: string | undefined;
  websiteUrl: string | undefined;
  reservationUrl: string | undefined;
  reservationPlatform: string | undefined;
}

function buildMapsUrl(name: string, address: string): string {
  const query = [name, address].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export interface FormattedReview {
  markdown: string;
  structured: ReviewStructured;
}

export function formatReview(node: PostReview, compact = false): FormattedReview {
  const rating = roundRating(node.placeRatingNumber);
  const priceDisplay = displayPrice(node.placePriceIndicatorCode);
  const neighborhoods = (node.neighborhoods ?? []).map(resolveNeighborhoodName);
  const cuisines = (node.cuisines ?? []).map(resolveCuisineName);

  const addressParts = [
    node.placeStreetName,
    node.placeCityName,
    node.placeAddressPostalCode,
  ].filter(Boolean);
  const address = addressParts.join(', ');

  const mapsUrl = buildMapsUrl(node.placeName, address);

  const structured: ReviewStructured = {
    name: node.placeName,
    rating,
    price: node.placePriceIndicatorCode,
    priceDisplay,
    address,
    city: node.placeCityName,
    neighborhoods,
    cuisines,
    description: node.shortDescriptionText,
    headline: node.headline || undefined,
    url: node.url,
    mapsUrl,
    slugName: node.slugName,
    phone: node.placeKnownTelephoneNumber || undefined,
    websiteUrl: node.placeUrl || undefined,
    reservationUrl: node.placeReservationUrl || node.openTableReservationUrl || undefined,
    reservationPlatform: node.placeReservationPlatformName || undefined,
  };

  const ratingStr = rating !== null ? `${rating}/10` : 'Unrated';
  const neighborhoodStr = neighborhoods.join(', ');
  const cuisineStr = cuisines.join(', ');

  let markdown: string;
  if (compact) {
    const meta = [ratingStr, priceDisplay, neighborhoodStr, cuisineStr]
      .filter(Boolean)
      .join(' · ');
    markdown = `**${node.placeName}** (${meta})\n${node.shortDescriptionText}\n[Review](${node.url}) · [Google Maps](${mapsUrl})`;
  } else {
    const lines: string[] = [
      `## ${node.placeName}`,
      `**Rating:** ${ratingStr} | **Price:** ${priceDisplay}`,
    ];
    if (address) lines.push(`**Address:** ${address}`);
    if (neighborhoodStr) lines.push(`**Neighborhood:** ${neighborhoodStr}`);
    if (cuisineStr) lines.push(`**Cuisine:** ${cuisineStr}`);
    if (node.headline) lines.push(`**Headline:** ${node.headline}`);
    lines.push(`**Review:** ${node.shortDescriptionText}`);
    if (node.placeUrl) lines.push(`**Website:** ${node.placeUrl}`);
    if (node.placeReservationUrl) {
      const platform = node.placeReservationPlatformName
        ? ` (${node.placeReservationPlatformName})`
        : '';
      lines.push(`**Reservations:** ${node.placeReservationUrl}${platform}`);
    }
    lines.push(`**Review:** ${node.url}`);
    lines.push(`**Google Maps:** ${mapsUrl}`);
    markdown = lines.join('\n');
  }

  return { markdown, structured };
}
