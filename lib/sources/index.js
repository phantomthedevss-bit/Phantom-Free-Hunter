// lib/sources/index.js
//
// Central registry of every category hunter. Add new sources here.

const { fetchGames } = require('./games');
const { fetchSoftware } = require('./software');
const { fetchCourses } = require('./courses');
const { fetchAITools } = require('./aiTools');
const { fetchSamplesGiveaways } = require('./samplesGiveaways');
const { fetchDigitalAssets } = require('./digitalAssets');
const { fetchStudentOffers } = require('./studentOffers');
const { fetchCloudCredits } = require('./cloudCredits');

const REGISTRY = {
  games: fetchGames,
  software: fetchSoftware,
  courses: fetchCourses,
  ai: fetchAITools,
  samples: fetchSamplesGiveaways,
  assets: fetchDigitalAssets,
  student: fetchStudentOffers,
  cloud: fetchCloudCredits,
};

const ALL_CATEGORIES = Object.keys(REGISTRY);

/**
 * Runs the requested category hunters (or all of them) in parallel.
 * Each hunter already isolates its own source failures, and we wrap
 * each one again here so a bug in one category's module can't take
 * down the others.
 *
 * @param {string[]} categories
 * @returns {Promise<Array>} flattened deals from every requested category
 */
async function huntAll(categories = ALL_CATEGORIES) {
  const results = await Promise.allSettled(
    categories.map((cat) => REGISTRY[cat]?.())
  );

  const deals = [];
  const errors = [];

  results.forEach((result, i) => {
    const cat = categories[i];
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      deals.push(...result.value);
    } else if (result.status === 'rejected') {
      errors.push({ category: cat, error: result.reason?.message || String(result.reason) });
      console.error(`[category:${cat}] failed entirely:`, result.reason);
    }
  });

  return { deals, errors };
}

module.exports = { REGISTRY, ALL_CATEGORIES, huntAll };
