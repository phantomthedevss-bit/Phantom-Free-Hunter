// lib/sources/software.js
//
// Free/freemium software launches and giveaways:
//  - Product Hunt daily launches feed, filtered for free/open-source
//    language in the title or tagline
//  - Hacker News "Show HN" + general new items feed, filtered for
//    "free"/"open source" keywords
//  - Reddit r/FreeSoftwareForPC / r/opensource RSS

const { safeFetchFeed } = require('../util/fetchFeed');
const { makeId } = require('../util/deal');

const CATEGORY = 'software';

const FREE_KEYWORDS = [
  'free',
  'open source',
  'open-source',
  'foss',
  'lifetime deal',
  'free tier',
  'no cost',
];

function mentionsFree(text) {
  const t = (text || '').toLowerCase();
  return FREE_KEYWORDS.some((k) => t.includes(k));
}

async function fetchProductHunt() {
  const items = await safeFetchFeed(
    'https://www.producthunt.com/feed',
    'producthunt'
  );
  return items
    .filter((item) => mentionsFree(item.title) || mentionsFree(item.content))
    .slice(0, 15)
    .map((item) => ({
      id: makeId('producthunt', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Product Hunt',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchHackerNewsFree() {
  const items = await safeFetchFeed('https://hnrss.org/newest', 'hn-newest');
  return items
    .filter((item) => mentionsFree(item.title))
    .slice(0, 15)
    .map((item) => ({
      id: makeId('hn', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Hacker News',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchRedditSoftware() {
  const subs = ['opensource', 'FreeSoftwareForPC'];
  const results = await Promise.all(
    subs.map((sub) =>
      safeFetchFeed(`https://www.reddit.com/r/${sub}/.rss`, `reddit-${sub}`)
    )
  );
  return results
    .flat()
    .slice(0, 15)
    .map((item) => ({
      id: makeId('reddit-software', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Reddit',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchSoftware() {
  const [ph, hn, reddit] = await Promise.all([
    fetchProductHunt(),
    fetchHackerNewsFree(),
    fetchRedditSoftware(),
  ]);
  return [...ph, ...hn, ...reddit];
}

module.exports = { fetchSoftware };
