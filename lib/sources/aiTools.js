// lib/sources/aiTools.js
//
// Free AI tools, free tiers, and free API credits:
//  - Product Hunt feed filtered for "AI" + free-language
//  - Hacker News filtered for AI + free
//  - Reddit r/FreeAITools style subs

const { safeFetchFeed } = require('../util/fetchFeed');
const { makeId } = require('../util/deal');

const CATEGORY = 'ai';

const AI_KEYWORDS = ['ai ', 'a.i.', 'gpt', 'llm', 'machine learning', 'ml model'];
const FREE_KEYWORDS = ['free', 'no cost', 'free tier', 'free credits', 'open source'];

function mentions(text, list) {
  const t = (text || '').toLowerCase();
  return list.some((k) => t.includes(k));
}

async function fetchProductHuntAI() {
  const items = await safeFetchFeed(
    'https://www.producthunt.com/feed',
    'producthunt-ai'
  );
  return items
    .filter(
      (item) =>
        (mentions(item.title, AI_KEYWORDS) || mentions(item.content, AI_KEYWORDS)) &&
        (mentions(item.title, FREE_KEYWORDS) || mentions(item.content, FREE_KEYWORDS))
    )
    .slice(0, 15)
    .map((item) => ({
      id: makeId('ph-ai', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Product Hunt',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchHackerNewsAI() {
  const items = await safeFetchFeed('https://hnrss.org/newest', 'hn-ai');
  return items
    .filter(
      (item) => mentions(item.title, AI_KEYWORDS) && mentions(item.title, FREE_KEYWORDS)
    )
    .slice(0, 10)
    .map((item) => ({
      id: makeId('hn-ai', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Hacker News',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchRedditAITools() {
  const subs = ['FreeAITools', 'ArtificialInteligence'];
  const results = await Promise.all(
    subs.map((sub) =>
      safeFetchFeed(`https://www.reddit.com/r/${sub}/.rss`, `reddit-${sub}`)
    )
  );
  return results
    .flat()
    .filter((item) => mentions(item.title, FREE_KEYWORDS))
    .slice(0, 10)
    .map((item) => ({
      id: makeId('reddit-ai', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Reddit',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchAITools() {
  const [ph, hn, reddit] = await Promise.all([
    fetchProductHuntAI(),
    fetchHackerNewsAI(),
    fetchRedditAITools(),
  ]);
  return [...ph, ...hn, ...reddit];
}

module.exports = { fetchAITools };
