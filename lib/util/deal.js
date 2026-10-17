// lib/util/deal.js
//
// Shared shape for every "deal" the hunters produce, plus helpers for
// building a stable dedup ID and for filtering out junk/expired items.

const crypto = require('crypto');

/**
 * @typedef {Object} Deal
 * @property {string} id           stable hash, used for dedup
 * @property {string} title
 * @property {string} url
 * @property {string} category     games|software|courses|ai|samples|assets|student|cloud
 * @property {string} source       human-readable source name, e.g. "r/GameDeals"
 * @property {string} [summary]    short description, optional
 * @property {Date}   [expiresAt]  if known
 * @property {boolean} [nigeriaRelevant] true if flagged as NG-specific/available
 */

/** Build a stable id from a source + url (or title if no url). */
function makeId(source, uniquePart) {
  const hash = crypto
    .createHash('sha1')
    .update(`${source}::${uniquePart}`)
    .digest('hex');
  return hash.slice(0, 20);
}

// Keywords that suggest an offer is region-locked AWAY from Nigeria/Africa,
// used to deprioritize (not hard-exclude, since worldwide coverage was
// requested) — we just tag them so the message is honest about reach.
const NON_NG_REGION_HINTS = [
  'us only',
  'u.s. only',
  'usa only',
  'uk only',
  'us residents only',
  'eu only',
  'not available in nigeria',
  'excludes nigeria',
];

// Keywords that boost NG relevance/visibility.
const NG_HINTS = [
  'nigeria',
  'nigerian',
  'naira',
  'africa',
  'african',
  'ng ',
  '.ng',
  'lagos',
  'abuja',
];

function tagNigeriaRelevance(deal) {
  const haystack = `${deal.title} ${deal.summary || ''}`.toLowerCase();
  const blocked = NON_NG_REGION_HINTS.some((h) => haystack.includes(h));
  const boosted = NG_HINTS.some((h) => haystack.includes(h));
  return {
    ...deal,
    nigeriaRelevant: boosted && !blocked,
    nigeriaBlocked: blocked,
  };
}

/** Returns true if a deal looks expired based on title/summary text cues. */
function looksExpired(deal, now = new Date()) {
  if (deal.expiresAt instanceof Date && !isNaN(deal.expiresAt)) {
    return deal.expiresAt.getTime() < now.getTime();
  }
  const text = `${deal.title} ${deal.summary || ''}`.toLowerCase();
  return (
    text.includes('expired') ||
    text.includes('ended') ||
    text.includes('no longer available') ||
    text.includes('offer has ended')
  );
}

/** Basic sanity filter: has a title and a working-looking URL. */
function isWellFormed(deal) {
  return (
    !!deal.title &&
    deal.title.trim().length > 3 &&
    !!deal.url &&
    /^https?:\/\//.test(deal.url)
  );
}

module.exports = {
  makeId,
  tagNigeriaRelevance,
  looksExpired,
  isWellFormed,
};
