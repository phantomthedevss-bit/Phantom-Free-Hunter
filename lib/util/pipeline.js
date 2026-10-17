// lib/util/pipeline.js
//
// The processing pipeline every raw deal goes through before it's
// eligible to be sent to Telegram:
//   1. well-formed check (has title + valid url)
//   2. expired-offer filter (text cues or known expiry date)
//   3. Nigeria-relevance tagging (for sorting/labeling, not hard exclusion
//      — the brief asked for worldwide coverage with a Nigeria focus)
//   4. dedup against Redis "seen" set (cross-run, persistent)
//   5. in-run dedup (same URL appearing from two sources in one run)

const { isWellFormed, looksExpired, tagNigeriaRelevance } = require('./deal');
const { filterUnseenAndMark } = require('./store');

function dedupeInRun(deals) {
  const seenUrls = new Set();
  const out = [];
  for (const d of deals) {
    const key = d.url;
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    out.push(d);
  }
  return out;
}

/**
 * @param {Array} rawDeals
 * @returns {Promise<{ toSend: Array, stats: object }>}
 */
async function processDeals(rawDeals) {
  const stats = {
    raw: rawDeals.length,
    malformed: 0,
    expired: 0,
    duplicateInRun: 0,
    alreadySeen: 0,
    new: 0,
  };

  const wellFormed = rawDeals.filter((d) => {
    const ok = isWellFormed(d);
    if (!ok) stats.malformed++;
    return ok;
  });

  const notExpired = wellFormed.filter((d) => {
    const expired = looksExpired(d);
    if (expired) stats.expired++;
    return !expired;
  });

  const deduped = dedupeInRun(notExpired);
  stats.duplicateInRun = notExpired.length - deduped.length;

  const tagged = deduped.map(tagNigeriaRelevance);

  // Nigeria-focus sort: boosted items first, blocked items last, within
  // that preserve original (source) order.
  tagged.sort((a, b) => {
    const score = (d) => (d.nigeriaRelevant ? 2 : d.nigeriaBlocked ? 0 : 1);
    return score(b) - score(a);
  });

  const fresh = await filterUnseenAndMark(tagged);
  stats.alreadySeen = tagged.length - fresh.length;
  stats.new = fresh.length;

  return { toSend: fresh, stats };
}

module.exports = { processDeals };
