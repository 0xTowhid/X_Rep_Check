// api/scrape.js — Vercel Serverless Function
// Server-side X reply scraper for admin use.
// Called by admin.html — no Chrome extension needed.
//
// Deploy: just push this file to your Vercel project under /api/scrape.js
// Vercel auto-detects it as a serverless function at /api/scrape

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  // CORS — allow your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const username = (req.query.username || '').replace(/^@/, '').toLowerCase().trim();
  if (!username || !/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  try {
    const ids = await scrapeReplies(username);
    return res.status(200).json({ ids: Array.from(ids), username });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Scrape failed' });
  }
}

// ── Scrape reply IDs from X public profile pages
async function scrapeReplies(username) {
  const ids = new Set();

  // Strategy 1: X syndication API (no auth needed, public endpoint)
  try {
    const syndicationIds = await scrapeViaSyndication(username);
    syndicationIds.forEach(id => ids.add(id));
  } catch (e) {
    console.log('Syndication failed:', e.message);
  }

  // Strategy 2: Nitter public instances (RSS + HTML scrape)
  const nitterInstances = [
    'https://nitter.net',
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
  ];

  for (const instance of nitterInstances) {
    try {
      const nitterIds = await scrapeViaNitter(username, instance);
      nitterIds.forEach(id => ids.add(id));
      if (ids.size > 0) break; // stop once we have results
    } catch (e) {
      console.log(`Nitter ${instance} failed:`, e.message);
      continue;
    }
  }

  return ids;
}

// ── Strategy 1: X syndication endpoint (public, no key required)
async function scrapeViaSyndication(username) {
  const ids = new Set();
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}?count=200&includeRetweets=false`;

  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; bot)',
      'Accept': 'application/json',
    }
  }, 10000);

  if (!res.ok) throw new Error(`Syndication HTTP ${res.status}`);

  const text = await res.text();

  // Parse tweet IDs from the JSON blob
  const matches = [...text.matchAll(/"id_str"\s*:\s*"(\d{10,20})"/g)];
  matches.forEach(m => ids.add(m[1]));

  // Also grab in_reply_to IDs
  const replyMatches = [...text.matchAll(/"in_reply_to_status_id_str"\s*:\s*"(\d{10,20})"/g)];
  replyMatches.forEach(m => ids.add(m[1]));

  const convMatches = [...text.matchAll(/"conversation_id_str"\s*:\s*"(\d{10,20})"/g)];
  convMatches.forEach(m => ids.add(m[1]));

  return ids;
}

// ── Strategy 2: Nitter HTML scrape
async function scrapeViaNitter(username, instance) {
  const ids = new Set();
  const url = `${instance}/${username}/with_replies`;

  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    }
  }, 12000);

  if (!res.ok) throw new Error(`Nitter HTTP ${res.status}`);

  const html = await res.text();

  // Extract tweet IDs from /status/ links
  const statusMatches = [...html.matchAll(/\/status\/(\d{10,20})/g)];
  statusMatches.forEach(m => ids.add(m[1]));

  // Extract from data-id attributes
  const dataIdMatches = [...html.matchAll(/data-id="(\d{10,20})"/g)];
  dataIdMatches.forEach(m => ids.add(m[1]));

  return ids;
}

// ── fetch with timeout
function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}
