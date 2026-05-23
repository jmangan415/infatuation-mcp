# The Infatuation -- Internal GraphQL API Reference

## Purpose

This document describes an undocumented, public (no auth required) GraphQL API that powers The Infatuation's restaurant review website. The goal is to build an MCP (Model Context Protocol) server that exposes tools for searching and retrieving restaurant reviews, filterable by city, neighborhood, cuisine, vibe/occasion, and free text. The primary city of interest is London, but the API covers all Infatuation cities.

This API is not officially supported. It is the internal backend that their Next.js frontend calls. It could change without notice. No API key or session token is required as of May 2026.

---

## Endpoint

```
POST https://www.theinfatuation.com/direct/api/post-search/public/graphql
```

### Required Headers

```
Content-Type: application/json
Origin: https://www.theinfatuation.com
Referer: https://www.theinfatuation.com/
User-Agent: Mozilla/5.0 (compatible)
```

The `Origin` and `Referer` headers are the ones that actually matter -- without them the API may reject requests. The `User-Agent` just needs to be a non-empty string that doesn't look like a bot scraper. Any reasonable browser-like value works. The specific OS/platform in the UA string is irrelevant.

No API key. No auth token. No cookies.

---

## Schema Overview

### Available Top-Level Queries

| Query | Input Type | Purpose |
|---|---|---|
| `searchPosts` | `PostSearchInput!` | Main search -- restaurants, guides, features |
| `searchPostsV2` | `PostSearchInputV2!` | Newer search variant (not fully explored) |
| `trending` | `TrendingInput!` | Trending restaurants |
| `post` | `PostInput!` | Single post by slug |
| `postById` | `PostByIdInput!` | Single post by ID |
| `forYouFeed` | `ForYouInput!` | Personalized feed (likely requires auth) |

The primary query to use is `searchPosts`.

---

## PostSearchInput Fields

These are the input fields for the `searchPosts` query. All are optional unless noted.

| Field | Type | Description |
|---|---|---|
| `attributePathText` | String | **Primary filter.** Section path like `/london`, `/london/neighborhoods/soho`, `/london/cuisines/italian`, `/london/perfect-for/date-night`. Only accepts a single path. |
| `searchText` | String | Free text search. Searches restaurant names, descriptions, review content. Can combine with `attributePathText` for compound filtering. |
| `sizeNumber` | Int | Results per page. |
| `postCategoryTypeText` | [PostCategoryType] | Filter by content type. Use `[POST_REVIEW]` for restaurant reviews. |
| `cityTypeCode` | String | City slug, e.g. `"new-york"`. **Note:** for London, this returns 0 results. Use `attributePathText: "/london"` instead. `cityTypeCode` works for US cities like `"new-york"`, `"los-angeles"`, `"chicago"`, `"san-francisco"`. |
| `neighborhoodIdentifiers` | [String!] | Array of neighborhood IDs (not tested extensively; `attributePathText` is the proven approach). |
| `cuisineIdentifiers` | [String!] | Array of cuisine IDs. |
| `neighborhoodSectionIdentifiers` | [String!] | Array of neighborhood section IDs. |
| `cuisineSectionIdentifiers` | [String!] | Array of cuisine section IDs. |
| `categoryIdentifiers` | [String] | Category IDs. |
| `categorySectionIdentifiers` | [String!] | Category section IDs. |
| `placeRatingNumberList` | [Float] | Filter by rating values. |
| `placePriceIndicatorCode` | [Price] | Price filter enum. |
| `reservationSearchTypeCode` | ReservationSearchTypeCode | Filter by reservation availability. |
| `placeOpenCategoryTypeName` | Open | Filter open now. Default: `UNSPECIFIED`. |
| `geoBounds` | GeoBounds | Geographic bounding box filter. |
| `placeLocation` | PlaceLocationInput | Location-based filtering. |
| `paginationContextualText` | String | Cursor for pagination. Use the `endpageDirectionCode` value from the previous response's `pageInfo`. |
| `slugName` | String | Filter by slug. |
| `contributorSlugName` | String | Filter by contributor/author. |
| `enableSitewideSearch` | Boolean | Enable cross-city search. |
| `enableContentSearch` | Boolean | Enable full content search. Default: false. |
| `contentSearchTermList` | [String!] | Terms for content search. |
| `includeUnratedSpots` | Boolean | Include unrated restaurants. Default: false. |
| `venueTypeIdentifiers` | [String!] | Filter by venue type. |
| `excludeDocumentIdentifiers` | [String!] | Exclude specific documents by ID. |
| `excludeCategoryNames` | [String] | Exclude categories by name. |
| `excludeReviewStatus` | String | Exclude by review status. |
| `saved` | Boolean | Filter saved items (likely requires auth). |
| `top25SavedSpots` | Boolean | Top 25 saved filter. |
| `postIdentifiers` | [String!] | Filter to specific post IDs. |
| `cityTypeCodeList` | [String!] | Multiple city codes. |
| `gate` | [Gate] | Feature gating. Default: `UNSPECIFIED`. |
| `split` | SplitInput | Split.io A/B test input. |
| `distanceRangeName` | String | Distance range. Default: `"3km"`. |
| `requestSearchText` | SearchTypeCode | Search type modifier. |

### PostCategoryType Enum Values

```
POST_TYPE_UNSPECIFIED
POST_REVIEW        <-- use this for restaurant reviews/spots
POST_GUIDE         <-- editorial guides ("Best Pizza in London")
POST_FEATURE       <-- feature articles
POST_COLLECTION    <-- curated collections
POST_GUIDEBOOK     <-- guidebooks
```

### Price Enum Values

Discovered from responses (not fully enumerated via introspection):

```
INEXPENSIVE
MODERATELY_EXPENSIVE
EXPENSIVE
```

There may be a `VERY_EXPENSIVE` or similar. The exact enum values can be confirmed via introspection:

```graphql
{ __type(name: "Price") { enumValues { name } } }
```

---

## Response Shape

### PostConnection (return type of searchPosts)

| Field | Type | Description |
|---|---|---|
| `nodes` | [Post] | Array of results. Use inline fragments to access type-specific fields. |
| `sitewideNodes` | [Post] | Cross-city results (when `enableSitewideSearch` is true). |
| `pageInfo` | PageInfo! | Pagination info. |
| `receivedRecordCount` | Int | Total matching results. |
| `resultsProperties` | ResultsProperties! | Additional result metadata. |

### PageInfo

| Field | Type | Description |
|---|---|---|
| `moreDataIndicator` | Boolean | Whether more pages exist. |
| `endpageDirectionCode` | String | Cursor to pass as `paginationContextualText` for next page. |
| `startpageDirectionCode` | String | Cursor for previous page. |

### Post Interface

The `Post` interface has these concrete types: `PostReview`, `PostGuide`, `PostFeature`, `PostCollection`, `PostGuidebook`. Use inline fragments (`... on PostReview { }`) to access type-specific fields.

### Common Post Fields (on all types)

| Field | Type |
|---|---|
| `documentTitleText` | String |
| `shortDescriptionText` | String |
| `contentfulEntryIdentifier` | String |
| `contentfulEntryTypeText` | String |
| `cityTypeCode` | String! |
| `canonicalPathText` | String |
| `slugName` | String |
| `postCategoryTypeText` | PostCategoryType |
| `url` | String! |
| `documentIdentifier` | ID! |
| `publishedTimestamp` | DateTime |
| `updateTimestamp` | DateTime |
| `pageViewCount` | Long |
| `last7DaysPageViewCount` | Long |
| `rank` | Int |
| `rankTrend` | Int |
| `saved` | Boolean! |
| `top25SavedSpotsCount` | Long! |
| `previewText` | String |

### PostReview-Specific Fields (restaurant reviews)

| Field | Type | Description |
|---|---|---|
| `placeName` | String! | Restaurant name |
| `placeRatingNumber` | Float | Rating (0-10 scale, one decimal) |
| `placePriceIndicatorCode` | Price! | Price level enum |
| `placeStreetName` | String! | Street address |
| `placeCityName` | String! | City name |
| `placeCountryName` | String! | Country |
| `placeStateName` | String! | State/region |
| `placeAddressPostalCode` | String! | Postal code |
| `placeName` | String! | Restaurant name |
| `placeKnownTelephoneNumber` | String! | Phone number |
| `placeUrl` | String! | Restaurant's own website |
| `placeTimezoneName` | String! | Timezone |
| `placeLocation` | PlaceLocation | Lat/lng coordinates |
| `shortDescriptionText` | String! | One-line review summary |
| `headline` | String! | Review headline |
| `contents` | String | Full review text |
| `reviewStatus` | ReviewStatus! | Review status |
| `cuisines` | [Cuisine!] | Cuisine tags |
| `neighborhoods` | [Neighborhood!] | Neighborhood tags |
| `categories` | [Category!] | Category/vibe tags |
| `placeVenueTypes` | [VenueType!] | Venue type tags |
| `recommendations` | PostConnection | Related/recommended restaurants |
| `openTableReservationIdentifier` | String! | OpenTable ID |
| `openTableReservationUrl` | String! | OpenTable booking URL |
| `placeReservationPlatformName` | String! | Reservation platform name |
| `placeReservationUrl` | String! | Reservation URL |
| `instagramSocialMediaIdentifier` | String! | Instagram handle |
| `xSocialMediaIdentifier` | String! | X/Twitter handle |
| `zagatRatingScores` | ZagatRatingScores | Zagat scores |
| `reservationTipsText` | [String] | Reservation tips |
| `foodRundownItems` | [FoodRundownItem!] | Individual dish reviews |

### Cuisine Object Fields

| Field | Type |
|---|---|
| `cuisineIdentifier` | String! |
| `cuisineName` | String! |
| `cuisineDisplayName` | String |
| `cuisineAttributePathText` | String |

### Neighborhood Object Fields

| Field | Type |
|---|---|
| `neighborhoodIdentifier` | String! |
| `neighborhoodName` | String! |
| `neighborhoodDisplayName` | String |
| `neighborhoodAttributePathText` | String |

---

## Working Query Templates

### Basic Restaurant Search

```graphql
query SearchRestaurants($input: PostSearchInput!) {
  searchPosts(input: $input) {
    nodes {
      ... on PostReview {
        placeName
        placeRatingNumber
        placePriceIndicatorCode
        placeStreetName
        placeCityName
        shortDescriptionText
        url
        neighborhoods {
          ... on Neighborhood { neighborhoodDisplayName }
        }
        cuisines {
          ... on Cuisine { cuisineDisplayName }
        }
      }
    }
    pageInfo {
      moreDataIndicator
      endpageDirectionCode
    }
    receivedRecordCount
  }
}
```

### Example Variables

**All London restaurants (sorted by rating by default):**
```json
{
  "input": {
    "attributePathText": "/london",
    "sizeNumber": 10,
    "postCategoryTypeText": ["POST_REVIEW"]
  }
}
```

**Italian restaurants in London:**
```json
{
  "input": {
    "attributePathText": "/london/cuisines/italian",
    "sizeNumber": 10,
    "postCategoryTypeText": ["POST_REVIEW"]
  }
}
```

**Restaurants in Shoreditch:**
```json
{
  "input": {
    "attributePathText": "/london/neighborhoods/shoreditch",
    "sizeNumber": 10,
    "postCategoryTypeText": ["POST_REVIEW"]
  }
}
```

**Date night restaurants in London:**
```json
{
  "input": {
    "attributePathText": "/london/perfect-for/date-night",
    "sizeNumber": 10,
    "postCategoryTypeText": ["POST_REVIEW"]
  }
}
```

**Compound filter -- Japanese restaurants in Shoreditch (neighborhood path + text search):**
```json
{
  "input": {
    "attributePathText": "/london/neighborhoods/shoreditch",
    "searchText": "japanese",
    "sizeNumber": 10,
    "postCategoryTypeText": ["POST_REVIEW"]
  }
}
```

**Free text search across London:**
```json
{
  "input": {
    "attributePathText": "/london",
    "searchText": "burger",
    "sizeNumber": 10,
    "postCategoryTypeText": ["POST_REVIEW"]
  }
}
```

**Pagination (page 2):**
```json
{
  "input": {
    "attributePathText": "/london",
    "sizeNumber": 10,
    "postCategoryTypeText": ["POST_REVIEW"],
    "paginationContextualText": "<endpageDirectionCode value from previous response>"
  }
}
```

---

## Known London Taxonomy Values

### Neighborhoods (confirmed working as of May 2026)

```
soho, shoreditch, notting-hill, mayfair, farringdon, hackney,
brixton, covent-garden, marylebone, borough, london-fields,
belgravia, newington-green, walthamstow, harringay, queensway, ealing
```

Path format: `/london/neighborhoods/{slug}`

### Cuisines (confirmed working)

```
italian, japanese, french, indian, british, greek, sushi, pizza,
mexican, lebanese, malaysian, caribbean, mediterranean, modern-european,
bbq, afghan, polish, pub, bar, wine-bar, coffee, bakery-cafe, deli,
sandwiches, tacos
```

Path format: `/london/cuisines/{slug}`

### "Perfect For" / Vibes (confirmed working, with result counts)

| Slug | Count | Slug | Count |
|---|---|---|---|
| `casual-dinners` | 926 | `lunch` | 633 |
| `date-night` | 459 | `big-groups` | 408 |
| `cheap-eats` | 313 | `walk-ins` | 252 |
| `dinner-with-the-parents` | 235 | `birthdays` | 203 |
| `brunch` | 184 | `special-occasions` | 168 |
| `impressing-out-of-towners` | 133 | `drinking-great-wine` | 112 |
| `corporate-cards` | 110 | `eating-at-the-bar` | 103 |
| `classic-establishment` | 89 | `sunday-roast` | 45 |
| `unique-dining-experience` | 39 | | |

Path format: `/london/perfect-for/{slug}`

Note: this list is not exhaustive. New vibes may be added over time. There is no API endpoint to list all valid values -- they were discovered by crawling review pages.

---

## Compound Filtering Approach

The `attributePathText` field accepts only a single path, so you cannot directly combine neighborhood + cuisine + vibe as three structured filters in one query. The workaround is:

1. Pick the most specific structured filter as `attributePathText`
2. Use `searchText` for the secondary filter as a keyword

Examples:
- "Italian in Shoreditch" -> `attributePathText: "/london/neighborhoods/shoreditch"`, `searchText: "italian"`
- "Date night Italian" -> `attributePathText: "/london/cuisines/italian"`, `searchText: "date night"`
- "Cheap eats in Brixton" -> `attributePathText: "/london/neighborhoods/brixton"`, `searchText: "cheap"`

The agent/LLM layer should decide which filter to use as the primary path and which to pass as text. Generally, neighborhood is the strongest structured filter and cuisine/vibe work well as text search terms.

---

## Other Supported Cities

The `attributePathText` approach works for all Infatuation cities. For US cities, `cityTypeCode` also works. Known city path slugs:

```
/new-york, /los-angeles, /chicago, /san-francisco, /miami,
/london, /austin, /washington-dc, /boston, /seattle, /nashville,
/dallas, /atlanta, /denver, /portland, /san-antonio, /paris,
/rome, /tokyo, /mexico-city, /toulouse, /burlington, /key-west,
/willamette-valley, /las-vegas
```

Each city has its own set of neighborhoods, cuisines, and perfect-for values following the same path pattern (`/{city}/neighborhoods/{slug}`, etc.).

---

## Introspection

The endpoint supports full GraphQL introspection. Useful queries for discovery:

```graphql
# List all query fields
{ __schema { queryType { fields { name description } } } }

# Inspect any type
{ __type(name: "PostReview") { fields { name type { name kind } } } }

# Get enum values
{ __type(name: "Price") { enumValues { name } } }
{ __type(name: "PostCategoryType") { enumValues { name } } }
```

---

## Caveats and Risks

1. **Undocumented API.** This is not a public API. It is The Infatuation's internal frontend-to-backend communication. It could change field names, add authentication, or be removed entirely without warning.

2. **Owned by JPMorgan Chase.** The infrastructure runs on `infatuation.prod.aws.jpmchase.net`. Enterprise security teams could add WAF rules, rate limiting, or IP blocking at any time.

3. **cuisineDisplayName often returns empty string.** The `cuisineDisplayName` field on `Cuisine` objects frequently returns `""`. The cuisine information is better derived from the `attributePathText` used in the query, or from the restaurant's `shortDescriptionText`. The `cuisineName` and `cuisineIdentifier` fields may have better data -- worth testing.

4. **Rating precision.** Ratings come back as floats like `9.300000190734863` due to floating point. Round to one decimal place for display (9.3).

5. **No authentication for basic search.** The bookmark, saved, and personalized feed features require authentication. Everything in this document works without auth.

6. **Rate limiting unknown.** No rate limiting has been observed during testing, but the endpoint sits behind AWS ALB and Akamai CDN. Aggressive scraping could trigger blocks. Recommend keeping queries reasonable (not more than a few per minute for personal use).

7. **London uses attributePathText, not cityTypeCode.** For London (and likely other non-US cities), `cityTypeCode: "london"` returns 0 results. Always use `attributePathText: "/london"` instead.
