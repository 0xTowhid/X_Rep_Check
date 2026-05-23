# Session Proof Checker — Setup Guide

Zero cost. No server. No backend. 3 files only.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | User portal — check replies, download proof card |
| `admin.html` | Admin dashboard — manage sessions, check any user |
| `schema.sql` | Supabase database schema |

---

## Step 1 — Create Supabase Project (free)

1. Go to https://supabase.com and sign up with GitHub
2. Click **New Project**, give it any name, set a DB password
3. Wait ~2 minutes for it to boot up
4. Go to **SQL Editor** in the left sidebar
5. Paste the entire contents of `schema.sql` and click **Run**

---

## Step 2 — Get your Supabase keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → looks like `https://abcxyz.supabase.co`
   - **anon public** key → long string starting with `eyJ...`

---

## Step 3 — Create your admin account (secure login)

This is how the admin panel stays secure — no hardcoded password.

1. In Supabase, go to **Authentication → Users**
2. Click **Invite user** (or **Add user → Create new user**)
3. Enter your email and a strong password
4. That's it — this is what you'll use to log into `admin.html`

No password is stored in any code file. Authentication is handled entirely by Supabase.

---

## Step 4 — Add your keys to both HTML files

Open `index.html` and `admin.html`. Near the top of the `<script>` section, replace:

```js
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

With your actual values:

```js
const SUPABASE_URL  = 'https://abcxyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...your-key...';
```

> The `anon` key is safe to put in frontend code. It only has the permissions defined in your RLS policies (public read, auth-only write).

---

## Step 5 — Deploy to Netlify (free, takes 1 minute)

1. Go to https://netlify.com and sign up free
2. Drag and drop your project folder onto the Netlify dashboard
3. Done — you get a free URL like `https://your-site.netlify.app`

That's your live site. Share `your-site.netlify.app` with users.
Admin panel is at `your-site.netlify.app/admin.html`.

### Alternative: GitHub Pages (also free)

1. Push the 3 files to a GitHub repo
2. Go to repo **Settings → Pages**
3. Set source to **main branch / root**
4. Your site is live at `https://yourusername.github.io/repo-name`

---

## Step 6 — First use

1. Open `admin.html` on your live site
2. Sign in with the email/password you created in Supabase
3. Click **New Session**
4. Paste your tweet URLs (one per line)
5. Click **Create Session**, then **ACTIVATE**
6. Share the user portal URL with your group

---

## How the scraping works (no server needed)

The app fetches `https://x.com/username/with_replies` through a free public CORS proxy:

```
https://api.allorigins.win/get?url=https://x.com/username/with_replies
```

It then parses the HTML for:
- All `/status/TWEETID` patterns
- Any `"in_reply_to_status_id_str":"TWEETID"` patterns in embedded JSON

These are matched against the session's tweet IDs to determine completion.

> **Note:** This works for public accounts. Private accounts cannot be scraped.
> If `allorigins.win` is slow, alternative free proxies:
> - `https://corsproxy.io/?url=`
> - `https://api.codetabs.com/v1/proxy?quest=`
> Just replace the `CORS_PROXY` constant in both HTML files.

---

## Profile picture fetching

The report card uses https://unavatar.io which is a free service that
fetches profile pictures from X/Twitter by username — no API key needed.
Falls back to a generated avatar if the profile pic can't be loaded.

---

## Total cost: $0

| Service | What it provides | Free limit |
|---|---|---|
| Supabase | Database + Auth | 500MB, 2 projects |
| Netlify / GitHub Pages | Hosting | Unlimited |
| allorigins.win | CORS proxy for scraping | Public/unlimited |
| unavatar.io | Profile picture fetching | Public/unlimited |
| Google Fonts | Fonts | Unlimited |

---

## Status meanings on the proof card

| Status | Condition |
|---|---|
| 🏆 TOP PARTICIPANT | 95%+ completion |
| ✓ COMPLETED | 80–94% completion |
| ◉ VERIFIED | 50–79% completion |
| ✗ INCOMPLETE | Below 50% |
