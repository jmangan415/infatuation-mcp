export interface CuisineObj {
  cuisineIdentifier: string;
  cuisineName: string;
  cuisineDisplayName: string;
  cuisineAttributePathText: string;
}

export interface NeighborhoodObj {
  neighborhoodIdentifier: string;
  neighborhoodName: string;
  neighborhoodDisplayName: string;
  neighborhoodAttributePathText: string;
}

export interface CategoryObj {
  categoryDocumentIdentifier: string;
  categoryDocumentName: string;
  categoryDisplayName: string;
  categoryAttributePathText: string;
}

export interface PostReview {
  __typename: 'PostReview';
  placeName: string;
  placeRatingNumber: number | null;
  placePriceIndicatorCode: string;
  placeStreetName: string;
  placeCityName: string;
  placeStateName: string;
  placeCountryName: string;
  placeAddressPostalCode: string;
  placeKnownTelephoneNumber: string;
  placeUrl: string;
  headline: string;
  shortDescriptionText: string;
  url: string;
  slugName: string;
  neighborhoods: NeighborhoodObj[];
  cuisines: CuisineObj[];
  categories: CategoryObj[];
  openTableReservationUrl: string;
  placeReservationPlatformName: string;
  placeReservationUrl: string;
}

export interface PostOther {
  __typename: string;
}

export type Post = PostReview | PostOther;

export interface PageInfo {
  moreDataIndicator: boolean | null;
  endpageDirectionCode: string | null;
  startpageDirectionCode: string | null;
}

export interface PostConnection {
  nodes: Post[] | null;
  pageInfo: PageInfo;
  receivedRecordCount: number;
}

export interface SearchPostsData {
  searchPosts: PostConnection;
}
