# infatuation-mcp

MCP server that exposes The Infatuation restaurant reviews as tools for LLM agents.

> **Note:** This server uses The Infatuation's undocumented internal GraphQL API. It requires no API key, but it could change without notice.

## Tools

### `list_cities`

Returns all supported city slugs with display names. Call this first if you don't know the correct city slug.

No parameters.

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

**Filter priority:** neighborhood > cuisine > vibe. When neighborhood is set, cuisine and vibe are added to the text search.

### `get_restaurant`

Fetch a full review by slug or URL.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `slugOrUrl` | string | — | Slug (e.g. `"dishoom-covent-garden"`) or full review URL |
| `city` | string | `"london"` | City slug (inferred from URL if provided) |

### `discover_filters`

List the available neighborhoods, cuisines, and vibes for a city. Call this first to find valid slug values.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `city` | string | `"london"` | City slug |

Results are cached for 1 hour.

## Installation

```bash
git clone <repo>
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

## Known cities

```
london, new-york, los-angeles, chicago, san-francisco, miami,
austin, washington-dc, boston, seattle, nashville, dallas, atlanta,
denver, portland, san-antonio, paris, rome, tokyo, mexico-city,
toulouse, burlington, key-west, willamette-valley, las-vegas
```

Or call `list_cities` at runtime — it returns the authoritative list with display names.

## Legal

This project is not affiliated with or endorsed by The Infatuation or JPMorgan Chase. It uses an undocumented public API and is provided for personal/educational use. The API may change or become unavailable without notice.

## License

MIT

## Caveats

- Undocumented API — field names or auth requirements could change.
- `moreDataIndicator` in the API is unreliable (returns `null`); the server uses the presence of `endpageDirectionCode` to signal more pages.
- `minRating` is applied client-side since the API's `placeRatingNumberList` is an exact-match list, not a range filter.
- Cuisine display names sometimes return as empty strings from the API; the server falls back to `cuisineName` and then derives a name from the path slug.
