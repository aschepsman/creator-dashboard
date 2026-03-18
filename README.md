# Creator Dashboard

## Setup (5 minutes)

### 1. Get your Airtable token
Go to **airtable.com** → click your avatar (top-right) → **Developer Hub** → **Personal access tokens** → **Create token**

- Give it any name (e.g. "Creator Dashboard")
- Add scope: `data.records:read`
- Add access: your **Creator Tracking** base
- Copy the token (starts with `pat…`)

### 2. Create your .env file
Copy the example and paste your token:
```
cp .env.example .env
```
Edit `.env`:
```
VITE_AIRTABLE_TOKEN=patXXXXXXXXXXXXXX
```

### 3. Install and run locally
```bash
npm install
npm run dev
```
Open http://localhost:5173

---

## Deploy to Vercel (free, 2 minutes)

1. Push this folder to a GitHub repo
2. Go to **vercel.com** → **Add New Project** → import your repo
3. In **Environment Variables**, add `VITE_AIRTABLE_TOKEN` with your token value
4. Click **Deploy**

Your dashboard will be live at a `*.vercel.app` URL and auto-updates on every push.

---

## What it shows

**Overview** — all creators ranked by total followers (or 7/30-day gain), with per-platform breakdown, gain badges, and a 30-day sparkline showing daily growth rate.

**Detail view** — click any creator to see:
- **Daily gain chart** (bar chart of day-over-day follower change — the real growth signal)
- **Total followers** (cumulative line chart, bad zero-data points are bridged over)
- Date range: 30D / 90D / 6M / 1Y / All
- Platform toggles
- 7D / 30D / 90D gain cards per platform
