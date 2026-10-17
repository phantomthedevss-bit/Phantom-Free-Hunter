// lib/sources/digitalAssets.js
//
// Free digital assets: fonts, icons, UI kits, stock photos/music,
// templates, Figma/Canva freebies, sound packs, 3D models.
//  - Reddit r/FreeFontsForDesigners style subs are sparse/inconsistent,
//    so we lean on itch.io's asset marketplace (separate from its game
//    listings) and Product Hunt filtered for design-asset language.

const { safeFetchFeed } = require('../util/fetchFeed');
const { makeId } = require('../util/deal');

const CATEGORY = 'assets';

const ASSET_KEYWORDS = [
  'free font',
  'free icon',
  'free template',
  'free ui kit',
  'free mockup',
  'free texture',
  'free sound',
  'free 3d model',
  'free stock',
  'figma freebie',
  'free asset',
];

function mentionsAsset(text) {
  const t = (text || '').toLowerCase();
  return ASSET_KEYWORDS.some((k) => t.includes(k));
}

async function fetchItchAssets() {
  // itch.io also hosts a general "free" tag across tools/assets, not just games.
  const items = await safeFetchFeed(
    'https://itch.io/game-assets/free/newest.xml',
    'itch-assets'
  );
  return items.slice(0, 15).map((item) => ({
    id: makeId('itch-assets', item.link || item.title),
    title: item.title,
    url: item.link,
    category: CATEGORY,
    source: 'itch.io',
    summary: (item.contentSnippet || '').slice(0, 200),
    expiresAt: null,
  }));
}

async function fetchProductHuntAssets() {
  const items = await safeFetchFeed(
    'https://www.producthunt.com/feed',
    'producthunt-assets'
  );
  return items
    .filter((item) => mentionsAsset(item.title) || mentionsAsset(item.content))
    .slice(0, 10)
    .map((item) => ({
      id: makeId('ph-assets', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Product Hunt',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchRedditAssets() {
  const subs = ['FreeIcons', 'graphic_design'];
  const results = await Promise.all(
    subs.map((sub) =>
      safeFetchFeed(`https://www.reddit.com/r/${sub}/.rss`, `reddit-${sub}`)
    )
  );
  return results
    .flat()
    .filter((item) => mentionsAsset(item.title))
    .slice(0, 10)
    .map((item) => ({
      id: makeId('reddit-assets', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Reddit',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchDigitalAssets() {
  const [itch, ph, reddit] = await Promise.all([
    fetchItchAssets(),
    fetchProductHuntAssets(),
    fetchRedditAssets(),
  ]);
  return [...itch, ...ph, ...reddit];
}

module.exports = { fetchDigitalAssets };
