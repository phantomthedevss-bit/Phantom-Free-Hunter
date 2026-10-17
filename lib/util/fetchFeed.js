// lib/util/fetchFeed.js
//
// Shared helpers for pulling RSS/Atom feeds and plain JSON endpoints
// without ever letting one broken source crash the whole hunt run.

const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; PhantomFreeHunter/1.0; +https://github.com/) RSS reader',
  },
});

/**
 * Fetches and parses an RSS/Atom feed. Never throws — returns an empty
 * array and logs on failure, so one dead source doesn't kill the run.
 * @param {string} url
 * @param {string} label  human name for logging
 */
async function safeFetchFeed(url, label) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (err) {
    console.error(`[feed:${label}] failed: ${err.message}`);
    return [];
  }
}

/**
 * Fetches JSON from a URL with a timeout. Never throws.
 * @param {string} url
 * @param {string} label
 * @param {object} [options] fetch options (headers, etc.)
 */
async function safeFetchJson(url, label, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PhantomFreeHunter/1.0)',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      console.error(`[json:${label}] HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[json:${label}] failed: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { safeFetchFeed, safeFetchJson };
