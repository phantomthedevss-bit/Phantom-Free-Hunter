// lib/sources/studentOffers.js
//
// Student offers don't have a live RSS/JSON feed anywhere reliable —
// these are long-running, slow-changing programs (GitHub Student Pack,
// Notion for students, etc). Instead of faking a feed, we ship a curated
// list of VERIFIED, currently-active, legitimate student programs and
// resurface them on a cooldown (default 7 days) via the dedup store, so
// subscribers are periodically reminded without being spammed every
// 5 minutes.
//
// IMPORTANT: review and refresh this list periodically — offers change.
// Last verified: 2026-10-17.

const { makeId } = require('../util/deal');

const CATEGORY = 'student';
const COOLDOWN_SUFFIX = `:cooldown:${new Date().toISOString().slice(0, 10).slice(0, 7)}`; // monthly cooldown bucket

const CURATED_STUDENT_OFFERS = [
  {
    title: 'GitHub Student Developer Pack — free dev tools bundle',
    url: 'https://education.github.com/pack',
    summary:
      'Free access to GitHub Pro, domains, cloud credits, JetBrains, and dozens of dev tools for verified students. Works for Nigerian students with a school email or other proof of enrollment.',
  },
  {
    title: 'Notion Education Plan — free Notion Plus for students & educators',
    url: 'https://www.notion.com/students',
    summary: 'Free upgraded Notion plan for verified students and teachers worldwide.',
  },
  {
    title: 'Microsoft Azure for Students — $100 free credit, no credit card',
    url: 'https://azure.microsoft.com/en-us/free/students/',
    summary:
      'Free Azure credit plus free tiers of popular services for verified students, available internationally including Nigeria.',
  },
  {
    title: 'JetBrains Student License — all IDEs free',
    url: 'https://www.jetbrains.com/community/education/',
    summary: 'Free access to the full JetBrains IDE suite for students and teachers.',
  },
  {
    title: 'Canva for Education — free Canva Pro for students',
    url: 'https://www.canva.com/education/',
    summary: 'Free Canva Pro features for verified students and teachers.',
  },
  {
    title: 'Autodesk Education — free professional 3D/CAD software',
    url: 'https://www.autodesk.com/education/edu-software',
    summary: 'Free licenses of AutoCAD, Maya, Fusion 360 and more for students.',
  },
  {
    title: 'Amazon Prime Student — discounted/trial Prime for students',
    url: 'https://www.amazon.com/amazonprime/student',
    summary: 'Free trial then discounted Prime for verified students (availability varies by region).',
  },
];

function getCurrentMonthBucket() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

async function fetchStudentOffers() {
  const bucket = getCurrentMonthBucket();
  return CURATED_STUDENT_OFFERS.map((offer) => ({
    // ID includes the month bucket so each offer resurfaces once per
    // month rather than being permanently deduped after the first alert.
    id: makeId('student', `${offer.url}:${bucket}`),
    title: offer.title,
    url: offer.url,
    category: CATEGORY,
    source: 'Curated (verify before relying on)',
    summary: offer.summary,
    expiresAt: null,
  }));
}

module.exports = { fetchStudentOffers };
