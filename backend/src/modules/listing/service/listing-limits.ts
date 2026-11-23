/** DATA-8: cities are reference data, a handful of rows listed whole. */
export const MAX_CITIES = 100;
/** API-22: the strips (similar homes, recently viewed) are short by design, never a page. */
export const MAX_STRIP_CARDS = 12;
/** API-22: "similar homes" is half a strip, closest in price first. */
export const SIMILAR_LIMIT = 6;
/** API-22: the recent homes fill one strip. */
export const RECENT_LIMIT = MAX_STRIP_CARDS;
/** API-22: a visitor's own "recently viewed" ids fill one strip. */
export const MAX_CARD_IDS = MAX_STRIP_CARDS;
/** API-22: each term is one more trigram condition, so the text is cut to a few of them. */
export const MAX_SEARCH_TERMS = 5;
export const PRICE_CONTEXT_MIN_SAMPLE = 3;
/** API-22: a person's export lists their newest saved homes, at most this many. */
export const MAX_EXPORTED_SAVED_HOMES = 500;
/** API-22: a landlord's export lists their newest listings, at most this many. */
export const MAX_EXPORTED_LISTINGS = 500;
