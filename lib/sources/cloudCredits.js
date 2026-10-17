// lib/sources/cloudCredits.js
//
// Like student offers, legitimate cloud/startup credit programs are
// long-running and don't have a live feed. Curated list, resurfaced
// monthly via the dedup cooldown bucket so it isn't spammed every 5 min.
//
// IMPORTANT: review and refresh this list periodically — amounts and
// eligibility rules change. Last verified: 2026-10-17.

const { makeId } = require('../util/deal');

const CATEGORY = 'cloud';

const CURATED_CLOUD_CREDITS = [
  {
    title: 'Google Cloud Free Tier + $300 credit for new accounts',
    url: 'https://cloud.google.com/free',
    summary: '$300 in free credit for 90 days plus always-free tiers of core GCP services, available in Nigeria.',
  },
  {
    title: 'AWS Free Tier — 12 months free + always-free services',
    url: 'https://aws.amazon.com/free/',
    summary: 'Free usage tiers across EC2, S3, Lambda and more for new AWS accounts.',
  },
  {
    title: 'Microsoft Azure free account — $200 credit for 30 days',
    url: 'https://azure.microsoft.com/en-us/pricing/free-services/',
    summary: '$200 credit plus 12 months of popular free services for new users.',
  },
  {
    title: 'Oracle Cloud Free Tier — Always Free resources, no time limit',
    url: 'https://www.oracle.com/cloud/free/',
    summary: 'Permanently free compute/storage tier (not just a trial) — notable since it never expires.',
  },
  {
    title: 'DigitalOcean — free credit via GitHub Student Pack / referral promos',
    url: 'https://www.digitalocean.com/github-students',
    summary: 'Free credit for verified students through the GitHub Student Developer Pack.',
  },
  {
    title: 'Cloudflare Workers Free Plan — generous always-free tier',
    url: 'https://www.cloudflare.com/plans/developer-platform/',
    summary: 'Free serverless compute, KV storage and CDN with no card required to start.',
  },
  {
    title: 'Fly.io free allowances for small apps',
    url: 'https://fly.io/docs/about/pricing/',
    summary: 'Small free allowance for hosting apps/VMs, useful for student projects.',
  },
];

function getCurrentMonthBucket() {
  return new Date().toISOString().slice(0, 7);
}

async function fetchCloudCredits() {
  const bucket = getCurrentMonthBucket();
  return CURATED_CLOUD_CREDITS.map((offer) => ({
    id: makeId('cloud', `${offer.url}:${bucket}`),
    title: offer.title,
    url: offer.url,
    category: CATEGORY,
    source: 'Curated (verify before relying on)',
    summary: offer.summary,
    expiresAt: null,
  }));
}

module.exports = { fetchCloudCredits };
