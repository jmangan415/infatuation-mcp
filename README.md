# infatuation-mcp

MCP server that exposes The Infatuation restaurant reviews as tools for LLM agents.

> **Note:** This server uses The Infatuation's undocumented public GraphQL API plus the Next.js review pages. It requires no API key, but either source could change without notice.

## Tools

Tools are ordered to match the workflow an agent should follow: find the city, discover its filters, search, then drill into a specific restaurant.

### `list_cities`

Returns all supported city slugs with display names. Call this first if you don't know the correct city slug. The list is built live from The Infatuation's sitemap (~190 cities) plus a GraphQL sample, with a bundled fallback. Cached 1 hour.

No parameters.

### `discover_filters`

List the available neighborhoods, cuisines, and vibes for a city. Call this before `search_restaurants` to map a user's intent to valid slug values. Built live from the city landing page plus a GraphQL aggregation, falling back to bundled defaults. Cached 1 hour.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `city` | string | `"london"` | City slug |

### `search_restaurants`

Search for restaurant reviews with structured filters.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `city` | string | `"london"` | City slug (e.g. `"london"`, `"new-york"`, `"paris"`) |
| `neighborhood` | string | — | Neighborhood slug (e.g. `"shoreditch"`, `"soho"`) — strongest filter |
| `cuisine` | string | — | Cuisine slug (e.g. `"italian"`, `"japanese"`) |
| `vibe` | string | — | Occasion slug (e.g. `"date-night"`, `"cheap-eats"`, `"brunch"`) |
| `query` | string | — | Free text search |
| `limit` | number | `10` | Results per page (1–50) |
| `price` | enum | — | `cheap` / `moderate` / `expensive` / `very-expensive` |
| `minRating` | number | — | Minimum rating threshold (0–10, applied client-side) |
| `cursor` | string | — | Pagination cursor from a previous call's `nextCursor` |

**Filter priority:** neighborhood > cuisine > vibe. When neighborhood is set, cuisine and vibe are added to the text search. Each result includes both an Infatuation review URL and a Google Maps URL.

### `get_restaurant`

Fetch a full review by slug or URL — name, rating, price, address, neighborhoods, cuisines, headline, description, reservation link, website, review URL, and Google Maps URL.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `slugOrUrl` | string | — | Slug (e.g. `"dishoom-covent-garden"`) or full review URL |
| `city` | string | `"london"` | City slug (inferred from URL if provided) |

### `get_restaurant_guide`

Get a deeper guide for a single restaurant: dishes to order ("Food Rundown"), occasions it's suited for, and the full review prose. Use this when the user wants to know what to eat or whether a restaurant fits a specific occasion. For basic metadata (address, phone, reservation link) use `get_restaurant` instead.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `slugOrUrl` | string | — | Slug (e.g. `"dishoom-kings-cross"`) or full review URL |
| `city` | string | `"london"` | City slug (inferred from URL if provided) |

Returns `name`, `rating`, `preview`, `reviewProse`, `perfectFor[]`, and `foodRundown[]` (each item has `name` + `description`). Not every review has a populated food rundown — some restaurants just have a summary. Results cached for 30 minutes.

## Installation

```bash
git clone https://github.com/jmangan415/infatuation-mcp.git
cd infatuation-mcp
npm install
npm run build
```

## Usage

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "infatuation": {
      "command": "node",
      "args": ["/absolute/path/to/infatuation-mcp/dist/index.js"]
    }
  }
}
```

### OpenClaw / other MCP clients

```json
{
  "mcpServers": {
    "infatuation": {
      "command": "node",
      "args": ["/absolute/path/to/infatuation-mcp/dist/index.js"]
    }
  }
}
```

### Dev mode (no build required)

```bash
npm run dev
```

## Verify the API

```bash
npm run smoke
```

Runs a live test against The Infatuation's endpoint and prints results for all query patterns.

## Cities

The Infatuation covers ~190 cities (London, New York, Paris, Tokyo, Mexico City, Las Vegas, Toulouse, plus US regional and travel-destination guides). Call `list_cities` at runtime for the authoritative list with display names — it discovers cities live from the sitemap, so any new city The Infatuation adds is picked up automatically.

## Legal

This project is not affiliated with or endorsed by The Infatuation or JPMorgan Chase. It uses an undocumented public API and is provided for personal/educational use. The API may change or become unavailable without notice.

## License

MIT

## How the data flows

- `search_restaurants`, `get_restaurant`: call The Infatuation's public GraphQL endpoint (`/direct/api/post-search/public/graphql`).
- `list_cities`, `discover_filters`: blend a sitemap/landing-page scrape with a GraphQL aggregation, with a bundled fallback so the tools degrade gracefully if either source breaks.
- `get_restaurant_guide`: parses the review page's `__NEXT_DATA__` Apollo state. The post-search GraphQL exposes a `foodRundownItems` field but never populates it — the real data lives in a separate Contentful backend that the page hits server-side.

## Caveats

- Undocumented API and frontend — field names, URL shapes, or markup could change.
- `moreDataIndicator` in the GraphQL response is unreliable (returns `null`); the server uses the presence of `endpageDirectionCode` to signal more pages.
- `minRating` is applied client-side since the API's `placeRatingNumberList` is an exact-match list, not a range filter.
- Cuisine display names sometimes return as empty strings; the server falls back to `cuisineName` and then derives a name from the path slug.
- `get_restaurant_guide` depends on the Next.js page's Apollo state shape. If The Infatuation rebuilds their frontend, that tool would break while the rest of the server keeps working.
