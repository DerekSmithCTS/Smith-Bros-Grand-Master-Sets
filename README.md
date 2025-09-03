# Mew & Rayquaza — Grand Master Set (Shareable Tracker)

A simple React + Supabase app for you and your brother to track **Mew** and **Rayquaza** Grand Master Sets — singles, sealed, promos, etc. Live **auto‑saving**, **real‑time sync**, **search**, **price totals**, and a **paste-to-import** tool.

## 0) One‑time: create the cloud database (Supabase)
1. Go to https://supabase.com → create a project (free tier is fine).
2. In your project: **Project Settings → API**. Copy **Project URL** and **anon public key**.
3. In the left sidebar: **SQL → New query** → open `supabase/schema.sql` from this repo and paste its contents → **RUN**.

## 1) Local run (optional)
```bash
npm install
npm run dev
```
Open the shown URL (e.g. http://localhost:5173).

## 2) Configure the site
- Create a file `.env` from `.env.example` and fill in:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
- Or, open the site and paste these into **Settings**.

## 3) Create your shared collection
- Click **New Collection** → name it → the URL with code is copied. **Send it to your brother**. Both of you can edit live.

## 4) Import your lists
- Click **Import**, paste lines in the format:
```
Name | Code | Market(optional) | Category(optional)
```
Examples:
```
Rayquaza VMAX (Alt Art) | SWSH07-218/203 | 666.20 | Singles
Mew ex (SAR) | SV2a-205/165 | 695.54 | Singles
```

## 5) Deploy on the internet (GitHub → Vercel in 2 minutes)
- Push this folder to a **GitHub repo**.
- Go to https://vercel.com → **New Project** → Import your repo → Deploy.
- In Vercel **Project Settings → Environment Variables**, add:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Redeploy. Share the public URL with your brother.

### (Alternative) GitHub Pages
- In this repo, Actions workflow `.github/workflows/pages.yml` builds and publishes to Pages.
- Enable **Pages** in repo Settings, and set the branch to `gh-pages` after the first run.

## Safety Notes
- The included Row Level Security policy allows anyone with your collection link to edit. Keep that link private.
- For stricter rules (per-user login), add Supabase Auth later.
