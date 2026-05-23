// Shared PostReview fragment fields used in both queries
const NEIGHBORHOOD_FIELDS = `
  ... on Neighborhood {
    neighborhoodIdentifier
    neighborhoodName
    neighborhoodDisplayName
    neighborhoodAttributePathText
  }
`;

const CUISINE_FIELDS = `
  ... on Cuisine {
    cuisineIdentifier
    cuisineName
    cuisineDisplayName
    cuisineAttributePathText
  }
`;

/** Lean query used for search_restaurants — compact PostReview fields. */
export const SEARCH_POSTS = `
  query SearchRestaurants($input: PostSearchInput!) {
    searchPosts(input: $input) {
      nodes {
        __typename
        ... on PostReview {
          placeName
          placeRatingNumber
          placePriceIndicatorCode
          placeStreetName
          placeCityName
          shortDescriptionText
          url
          slugName
          neighborhoods { ${NEIGHBORHOOD_FIELDS} }
          cuisines { ${CUISINE_FIELDS} }
        }
      }
      pageInfo {
        moreDataIndicator
        endpageDirectionCode
      }
      receivedRecordCount
    }
  }
`;

/** Richer query used for get_restaurant — full PostReview fields. */
export const GET_REVIEW = `
  query GetRestaurant($input: PostSearchInput!) {
    searchPosts(input: $input) {
      nodes {
        __typename
        ... on PostReview {
          placeName
          placeRatingNumber
          placePriceIndicatorCode
          placeStreetName
          placeCityName
          placeStateName
          placeCountryName
          placeAddressPostalCode
          placeKnownTelephoneNumber
          placeUrl
          headline
          shortDescriptionText
          url
          slugName
          neighborhoods { ${NEIGHBORHOOD_FIELDS} }
          cuisines { ${CUISINE_FIELDS} }
          categories {
            categoryDocumentIdentifier
            categoryDocumentName
            categoryDisplayName
            categoryAttributePathText
          }
          openTableReservationUrl
          placeReservationPlatformName
          placeReservationUrl
        }
      }
      pageInfo {
        moreDataIndicator
        endpageDirectionCode
      }
      receivedRecordCount
    }
  }
`;
