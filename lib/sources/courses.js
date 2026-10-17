// lib/sources/courses.js
//
// Free courses and certifications:
//  - freeCodeCamp news RSS (frequently posts free-course roundups)
//  - Reddit r/freecourses / r/learnprogramming "free" posts

const { safeFetchFeed } = require('../util/fetchFeed');
const { makeId } = require('../util/deal');

const CATEGORY = 'courses';

const COURSE_KEYWORDS = [
  'free course',
  'free certification',
  'free certificate',
  'udemy free',
  'coursera free',
  'learn for free',
];

function looksLikeCourse(text) {
  const t = (text || '').toLowerCase();
  return COURSE_KEYWORDS.some((k) => t.includes(k)) || t.includes('course');
}

async function fetchFreeCodeCamp() {
  const items = await safeFetchFeed(
    'https://www.freecodecamp.org/news/rss/',
    'freecodecamp'
  );
  return items.slice(0, 15).map((item) => ({
    id: makeId('fcc', item.link || item.title),
    title: item.title,
    url: item.link,
    category: CATEGORY,
    source: 'freeCodeCamp',
    summary: (item.contentSnippet || '').slice(0, 200),
    expiresAt: null,
  }));
}

async function fetchRedditCourses() {
  const subs = ['freecourses', 'FreeCoursesEveryday'];
  const results = await Promise.all(
    subs.map((sub) =>
      safeFetchFeed(`https://www.reddit.com/r/${sub}/.rss`, `reddit-${sub}`)
    )
  );
  return results
    .flat()
    .slice(0, 15)
    .map((item) => ({
      id: makeId('reddit-courses', item.link || item.title),
      title: item.title,
      url: item.link,
      category: CATEGORY,
      source: 'Reddit',
      summary: (item.contentSnippet || '').slice(0, 200),
      expiresAt: null,
    }));
}

async function fetchCourses() {
  const [fcc, reddit] = await Promise.all([
    fetchFreeCodeCamp(),
    fetchRedditCourses(),
  ]);
  return [...fcc, ...reddit];
}

module.exports = { fetchCourses };
