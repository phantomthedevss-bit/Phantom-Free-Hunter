// api/status.js
//
// Simple health check: shows when the bot last ran and what happened.
// Protected by the same CRON_SECRET to avoid leaking operational info.

const { getRunStats } = require('../lib/util/store');

module.exports = async (req, res) => {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';
  const providedSecret = authHeader.replace(/^Bearer\s+/i, '');

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const lastRun = await getRunStats();
    return res.status(200).json({
      ok: true,
      lastRun: lastRun || null,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
