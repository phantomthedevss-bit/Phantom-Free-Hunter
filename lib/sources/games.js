// lib/sources/games.js
//
// Free game sources:
//  - Epic Games Store official free-games API (always-legit, first-party,
//    and supports a Nigeria country param directly)
//  - itch.io "free games, newest" RSS feed (first-party, public)
//  - Reddit r/GameDeals and r/FreeGameFindings RSS (community-curated,
//    catches Steam/GOG/other-store freebies Epic/itch won't have)

const { safeFetchFeed, safeFetchJson } = require('../util/fetchFeed');
const { makeId } = require('../util/deal');

const CATEGORY = 'games';

async function fetchEpicGames() {
  const data = await safeFetchJson(
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=NG&allowCountries=NG',
    'epic-games'
  );
  if (!data) return [];

  const elements =
    data?.data?.Catalog?.searchStore?.elements?.filter(Boolean) || [];

  const deals = [];
  for (const el of elements) {
    const promotions = el.promotions;
    const activePromo =
      promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
    const isFreeNow =
      activePromo &&
      el.price?.totalPrice?.discountPrice === 0 &&
      el.price?.totalPrice?.originalPrice > 0;

    if (!isFreeNow) continue;

    const slug =
      el.catalogNs?.mappings?.[0]?.pageSlug ||
      el.offerMappings?.[0]?.pageSlug ||
      el.urlSlug;
    const url = slug
      ? `https://store.epicgames.com/en-US/p/${slug}`
      : 'https://store.epicgames.com/en-US/free-games';

    deals.push({
      id: makeId('epic', el.id || el.title),
      title: `${el.title} — FREE on Epic Games Store`,
      url,
      category: CATEGORY,
      source: 'Epic Games Store',
      summary: el.description?.slice(0, 200) || 'Free for a limited time.',
      expiresAt: activePromo?.endDate ? new Date(activePromo.endDate) : null,
    });
  }
  return deals;
}

async function fetchItchFree() {
  const items = await safeFetchFeed(
    'https://itch.io/games/free/newest.xml',
    'itch-free'
  );
  return items.slice(0, 15).map((item) =>
    normalizeFeedItem(item, {
      source: 'itch.io',
      titlePrefix: '',
    })
  );
}

async function fetchRedditGameDeals() {
  const subs = ['GameDeals', 'FreeGameFindings'];
  const results = await Promise.all(
    subs.map((sub) =>
      safeFetchFeed(`https://www.reddit.com/r/${sub}/.rss`, `reddit-${sub}`)
    )
  );
  const items = results.flat();
  return items.slice(0, 20).map((item) =>
    normalizeFeedItem(item, {
      source: 'Reddit',
    })
  );
}

function normalizeFeedItem(item, { source }) {
  return {
    id: makeId(source, item.link || item.guid || item.title),
    title: item.title,
    url: item.link,
    category: CATEGORY,
    source,
    summary: (item.contentSnippet || item.content || '').slice(0, 200),
    expiresAt: null,
  };
}

async function fetchGames() {
  const [epic, itch, reddit] = await Promise.all([
    fetchEpicGames(),
    fetchItchFree(),
    fetchRedditGameDeals(),
  ]);
  return [...epic, ...itch, ...reddit];
}

module.exports = { fetchGames };
