// api/hunt.js
//
// Main entry point, called every 5 minutes by the GitHub Actions
// workflow (.github/workflows/hunt.yml). Protected by a bearer-token
// secret (CRON_SECRET) so randoms on the internet can't trigger it and
// burn your Telegram/Redis quota.
//
// Flow: fetch from all category sources -> filter (expired/malformed)
// -> dedup against Redis -> send new deals to Telegram -> record stats.

const { huntAll, ALL_CATEGORIES } = require('../lib/sources');
const { processDeals } = require('../lib/util/pipeline');
const { sendDealAlerts } = require('../lib/util/telegram');
const { recordRunStats } = require('../lib/util/store');

module.exports = async (req, res) => {
  const startedAt = Date.now();

  // --- Auth: require the shared secret as a Bearer token ---
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    console.error('CRON_SECRET is not set in environment variables.');
    return res.status(500).json({ error: 'Server misconfigured: CRON_SECRET missing.' });
  }
  const authHeader = req.headers['authorization'] || '';
  const providedSecret = authHeader.replace(/^Bearer\s+/i, '');
  if (providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  // --- Optional category override via ?categories=games,ai ---
  const queryCategories = req.query?.categories;
  const envCategories = process.env.HUNT_CATEGORIES;
  const requested =
    (typeof queryCategories === 'string' && queryCategories.split(',')) ||
    (envCategories && envCategories.split(',').filter(Boolean)) ||
    ALL_CATEGORIES;
  const categories = requested
    .map((c) => c.trim())
    .filter((c) => ALL_CATEGORIES.includes(c));

  if (categories.length === 0) {
    return res.status(400).json({
      error: `No valid categories. Valid options: ${ALL_CATEGORIES.join(', ')}`,
    });
  }

  try {
    // 1. Hunt every source for the requested categories.
    const { deals: rawDeals, errors: sourceErrors } = await huntAll(categories);

    // 2. Filter + dedup.
    const { toSend, stats } = await processDeals(rawDeals);

    // 3. Alert.
    const sendResult =
      toSend.length > 0
        ? await sendDealAlerts(toSend)
        : { sent: 0, failed: 0, overflow: 0 };

    const durationMs = Date.now() - startedAt;
    const summary = {
      ok: true,
      categoriesRun: categories,
      durationMs,
      stats,
      sent: sendResult.sent,
      sendFailed: sendResult.failed,
      overflowQueued: sendResult.overflow,
      sourceErrors,
    };

    await recordRunStats(summary);

    console.log('[hunt] run complete:', JSON.stringify(summary));
    return res.status(200).json(summary);
  } catch (err) {
    console.error('[hunt] fatal error:', err);
    await recordRunStats({ ok: false, error: err.message }).catch(() => {});
    return res.status(500).json({ ok: false, error: err.message });
  }
};
