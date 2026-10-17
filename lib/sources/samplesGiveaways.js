// lib/sources/samplesGiveaways.js
//
// Free samples, giveaways, sweepstakes:
//  - Reddit r/freebies, r/Free_Samples, r/giveaways RSS
//  - TechBuild Africa RSS (Nigeria/Africa-focused tech & giveaway news)

const { safeFetchFeed } = require('../util/fetchFeed');
const { makeId } = require('../util/deal');

const CATEGORY = 'samples';

async function fetchRedditFreebies() {
  const subs = ['freebies', 'Free_Samples', 'giveaways'];
  const results = await Promise.all(
    subs.map((sub) =>
      safeFetchFeed(`https://www.reddit.com/r/${sub}/.rss`, `reddit-${sub}`)
    )
  );
  return results
    .flat()
    .slice(0, 20)
    .map((item) => ({
      id: makeId('reddit-freebies', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Reddit',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchTechBuildAfrica() {
  const items = await safeFetchFeed(
    'https://techbuild.africa/feed/',
    'techbuild-africa'
  );
  const GIVEAWAY_WORDS = ['giveaway', 'free', 'win ', 'contest', 'promo'];
  return items
    .filter((item) =>
      GIVEAWAY_WORDS.some((w) => (item.title || '').toLowerCase().includes(w))
    )
    .slice(0, 10)
    .map((item) => ({
      id: makeId('techbuild', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'TechBuild Africa',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchSamplesGiveaways() {
  const [reddit, techbuild] = await Promise.all([
    fetchRedditFreebies(),
    fetchTechBuildAfrica(),
  ]);
  return [...reddit, ...techbuild];
}

module.exports = { fetchSamplesGiveaways };
