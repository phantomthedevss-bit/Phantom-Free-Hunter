// lib/util/store.js
//
// Thin wrapper around Upstash Redis for "have we already alerted on this
// deal before?" dedup, plus small helpers for tracking run stats.
//
// Why Redis/Upstash: Vercel serverless functions have no persistent disk
// or memory between invocations, so we need an external store to remember
// which deal IDs we've already sent to Telegram.

const { Redis } = require('@upstash/redis');

function getClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars.'
    );
  }
  return new Redis({ url, token });
}

const SEEN_PREFIX = 'pfh:seen:'; // pfh = Phantom Free Hunter
const SEEN_TTL_SECONDS =
  (Number(process.env.SEEN_TTL_DAYS) || 14) * 24 * 60 * 60;

/**
 * Given a list of deal objects (each with a stable `.id`), returns only
 * the ones NOT already marked as seen, and marks all of them as seen
 * (so a second run never re-alerts even if the dedup check and the
 * marking race against a concurrent run).
 *
 * @param {Array<{id: string}>} deals
 * @returns {Promise<Array>} the subset that is new
 */
async function filterUnseenAndMark(deals) {
  if (deals.length === 0) return [];
  const redis = getClient();

  // Check existence in parallel.
  const existsResults = await Promise.all(
    deals.map((d) => redis.exists(SEEN_PREFIX + d.id))
  );

  const fresh = deals.filter((_, i) => existsResults[i] === 0);

  // Mark all incoming deals (fresh ones) as seen with a TTL so the set
  // doesn't grow forever. Use pipelining for efficiency.
  if (fresh.length > 0) {
    const pipeline = redis.pipeline();
    for (const d of fresh) {
      pipeline.set(SEEN_PREFIX + d.id, 1, { ex: SEEN_TTL_SECONDS });
    }
    await pipeline.exec();
  }

  return fresh;
}

/**
 * Records simple run metadata (last run time, counts) for observability.
 * Not required for correctness, just useful for a /api/status check.
 */
async function recordRunStats(stats) {
  try {
    const redis = getClient();
    await redis.set('pfh:last_run', {
      at: new Date().toISOString(),
      ...stats,
    });
  } catch (err) {
    // Non-fatal: stats are diagnostic only.
    console.error('recordRunStats failed:', err.message);
  }
}

async function getRunStats() {
  const redis = getClient();
  return redis.get('pfh:last_run');
}

module.exports = { filterUnseenAndMark, recordRunStats, getRunStats, getClient };
