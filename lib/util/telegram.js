// lib/util/telegram.js
//
// Sends deal alerts to Telegram using the Bot API directly (no SDK
// needed — it's a simple POST). Handles batching and basic rate-limit
// pacing since Telegram throttles ~30 msgs/sec globally and ~1/sec per
// chat.

const CATEGORY_EMOJI = {
  games: '🎮',
  software: '💻',
  courses: '🎓',
  ai: '🤖',
  samples: '🎁',
  assets: '🎨',
  student: '🧑‍🎓',
  cloud: '☁️',
};

const CATEGORY_LABEL = {
  games: 'Free Game',
  software: 'Free Software',
  courses: 'Free Course',
  ai: 'Free AI Tool',
  samples: 'Freebie/Giveaway',
  assets: 'Free Digital Asset',
  student: 'Student Offer',
  cloud: 'Cloud Credits',
};

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDeal(deal) {
  const emoji = CATEGORY_EMOJI[deal.category] || '🔥';
  const label = CATEGORY_LABEL[deal.category] || 'Free Stuff';
  const ngTag = deal.nigeriaRelevant ? ' 🇳🇬' : '';
  const title = escapeHtml(deal.title);
  const summary = deal.summary ? escapeHtml(deal.summary.trim()) : '';

  let msg = `${emoji} <b>${label}</b>${ngTag}\n<b>${title}</b>\n`;
  if (summary) msg += `${summary}\n`;
  msg += `\n🔗 ${deal.url}\n📡 <i>${escapeHtml(deal.source)}</i>`;
  return msg;
}

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars.');
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    throw new Error(
      `Telegram send failed: ${res.status} ${body.description || ''}`
    );
  }
  return body;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends one Telegram message per deal, paced to respect Telegram's
 * per-chat rate limit (~1 msg/sec). Caps total messages per run to
 * avoid runaway floods if a source misbehaves; the rest roll into the
 * next 5-minute run since dedup means they won't be lost, just delayed.
 *
 * @param {Array} deals
 * @param {number} [maxPerRun=25]
 */
async function sendDealAlerts(deals, maxPerRun = 25) {
  const toSend = deals.slice(0, maxPerRun);
  const overflow = deals.length - toSend.length;

  let sent = 0;
  let failed = 0;

  for (const deal of toSend) {
    try {
      await sendTelegramMessage(formatDeal(deal));
      sent++;
    } catch (err) {
      failed++;
      console.error(`Failed to send deal "${deal.title}":`, err.message);
    }
    // Stay comfortably under Telegram's per-chat rate limit.
    await sleep(350);
  }

  if (overflow > 0) {
    try {
      await sendTelegramMessage(
        `ℹ️ <b>${overflow} more free finds</b> queued for the next scan (to stay within Telegram's rate limits).`
      );
    } catch (err) {
      console.error('Failed to send overflow notice:', err.message);
    }
  }

  return { sent, failed, overflow };
}

module.exports = { sendDealAlerts, sendTelegramMessage, formatDeal };
