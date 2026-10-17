#!/usr/bin/env node
// scripts/test-local.js
//
// Runs the full hunt pipeline locally WITHOUT sending Telegram messages
// or touching Redis, so you can sanity-check that sources are returning
// real data before deploying. Loads .env automatically if present.
//
// Usage:
//   node scripts/test-local.js              # dry run, all categories
//   node scripts/test-local.js games,ai     # dry run, specific categories
//   node scripts/test-local.js --send       # also actually send to Telegram

const path = require('path');

// Minimal .env loader (avoids adding a dotenv dependency just for this).
function loadEnvFile() {
  const fs = require('fs');
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const { huntAll, ALL_CATEGORIES } = require('../lib/sources');
const { isWellFormed, looksExpired, tagNigeriaRelevance } = require('../lib/util/deal');

async function main() {
  const args = process.argv.slice(2);
  const shouldSend = args.includes('--send');
  const categoryArg = args.find((a) => !a.startsWith('--'));
  const categories = categoryArg
    ? categoryArg.split(',').filter((c) => ALL_CATEGORIES.includes(c))
    : ALL_CATEGORIES;

  console.log(`Hunting categories: ${categories.join(', ')}\n`);

  const { deals, errors } = await huntAll(categories);

  console.log(`Raw deals found: ${deals.length}`);
  if (errors.length) {
    console.log(`\nSource errors:`);
    errors.forEach((e) => console.log(`  - [${e.category}] ${e.error}`));
  }

  const wellFormed = deals.filter(isWellFormed);
  const notExpired = wellFormed.filter((d) => !looksExpired(d));
  const tagged = notExpired.map(tagNigeriaRelevance);

  console.log(`\nAfter malformed filter: ${wellFormed.length}`);
  console.log(`After expired filter:   ${notExpired.length}`);
  console.log(`\n--- Sample of deals (first 15) ---\n`);

  tagged.slice(0, 15).forEach((d, i) => {
    const ngFlag = d.nigeriaRelevant ? ' 🇳🇬' : '';
    console.log(`${i + 1}. [${d.category}]${ngFlag} ${d.title}`);
    console.log(`   ${d.url}`);
    console.log(`   source: ${d.source}\n`);
  });

  if (shouldSend) {
    console.log('\n--send flag set: sending a dedup check + real Telegram messages...');
    const { processDeals } = require('../lib/util/pipeline');
    const { sendDealAlerts } = require('../lib/util/telegram');
    const { toSend, stats } = await processDeals(deals);
    console.log('Pipeline stats:', stats);
    const result = await sendDealAlerts(toSend);
    console.log('Telegram send result:', result);
  } else {
    console.log(
      '\n(Dry run only — no Telegram messages sent, no Redis writes. Add --send to actually send.)'
    );
  }
}

main().catch((err) => {
  console.error('Fatal error in test run:', err);
  process.exit(1);
});
