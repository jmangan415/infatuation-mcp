export interface TaxonomyEntry {
  slug: string;
  name: string;
}

/** Convert a slug ("new-york", "washington-dc") into a display name ("New York", "Washington DC"). */
export function deSlugify(slug: string): string {
  const parts = slug.split('-');
  return parts
    .map((p, i) => {
      // 2-letter trailing segment in a multi-part slug = US state code (dc, ga, me)
      if (p.length === 2 && i === parts.length - 1 && parts.length > 1) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

export interface CityTaxonomy {
  neighborhoods: TaxonomyEntry[];
  cuisines: TaxonomyEntry[];
  vibes: TaxonomyEntry[];
}

function e(slug: string, name: string): TaxonomyEntry {
  return { slug, name };
}

const LONDON: CityTaxonomy = {
  neighborhoods: [
    e('soho', 'Soho'),
    e('shoreditch', 'Shoreditch'),
    e('notting-hill', 'Notting Hill'),
    e('mayfair', 'Mayfair'),
    e('farringdon', 'Farringdon'),
    e('hackney', 'Hackney'),
    e('brixton', 'Brixton'),
    e('covent-garden', 'Covent Garden'),
    e('marylebone', 'Marylebone'),
    e('borough', 'Borough'),
    e('london-fields', 'London Fields'),
    e('belgravia', 'Belgravia'),
    e('newington-green', 'Newington Green'),
    e('walthamstow', 'Walthamstow'),
    e('harringay', 'Harringay'),
    e('queensway', 'Queensway'),
    e('ealing', 'Ealing'),
  ],
  cuisines: [
    e('italian', 'Italian'),
    e('japanese', 'Japanese'),
    e('french', 'French'),
    e('indian', 'Indian'),
    e('british', 'British'),
    e('greek', 'Greek'),
    e('sushi', 'Sushi'),
    e('pizza', 'Pizza'),
    e('mexican', 'Mexican'),
    e('lebanese', 'Lebanese'),
    e('malaysian', 'Malaysian'),
    e('caribbean', 'Caribbean'),
    e('mediterranean', 'Mediterranean'),
    e('modern-european', 'Modern European'),
    e('bbq', 'BBQ'),
    e('afghan', 'Afghan'),
    e('polish', 'Polish'),
    e('pub', 'Pub'),
    e('bar', 'Bar'),
    e('wine-bar', 'Wine Bar'),
    e('coffee', 'Coffee'),
    e('bakery-cafe', 'Bakery / Café'),
    e('deli', 'Deli'),
    e('sandwiches', 'Sandwiches'),
    e('tacos', 'Tacos'),
  ],
  vibes: [
    e('casual-dinners', 'Casual Dinners'),
    e('lunch', 'Lunch'),
    e('date-night', 'Date Night'),
    e('big-groups', 'Big Groups'),
    e('cheap-eats', 'Cheap Eats'),
    e('walk-ins', 'Walk-ins'),
    e('dinner-with-the-parents', 'Dinner with the Parents'),
    e('birthdays', 'Birthdays'),
    e('brunch', 'Brunch'),
    e('special-occasions', 'Special Occasions'),
    e('impressing-out-of-towners', 'Impressing Out-of-Towners'),
    e('drinking-great-wine', 'Drinking Great Wine'),
    e('corporate-cards', 'Corporate Cards'),
    e('eating-at-the-bar', 'Eating at the Bar'),
    e('classic-establishment', 'Classic Establishment'),
    e('sunday-roast', 'Sunday Roast'),
    e('unique-dining-experience', 'Unique Dining Experience'),
  ],
};

export const FALLBACK_TAXONOMY: Record<string, CityTaxonomy> = {
  london: LONDON,
};

// Emergency fallback — only used if both the live sitemap scrape and GraphQL
// aggregation fail simultaneously. Should cover the 25 most-searched cities.
export const KNOWN_CITIES = [
  // US — major metros
  'new-york', 'los-angeles', 'chicago', 'san-francisco', 'miami',
  'washington-dc', 'boston', 'seattle', 'austin', 'nashville',
  'atlanta', 'denver', 'portland', 'dallas', 'houston',
  'philadelphia', 'las-vegas', 'new-orleans', 'san-diego', 'minneapolis',
  // International
  'london', 'paris', 'tokyo', 'mexico-city', 'barcelona',
];
