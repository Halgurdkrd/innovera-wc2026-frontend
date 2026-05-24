# Innovera World Cup AI Predictor — Build Progress

## S16 — Next.js Setup + Home Page ✅
- Next.js 14 initialized (TypeScript, Tailwind CSS, App Router)
- Supabase client + `.env.local` configured
- Design system: `#0D1117` bg · `#F0A500` gold · `#161B22` cards
- `app/layout.tsx` — Inter font, dark root layout, full metadata
- `types/index.ts` — Match, LuckScore, GroupStanding
- `components/Navbar.tsx` — sticky, EN/KU language toggle, login button
- `components/MatchCard.tsx` — probability bars, confidence badge, Predict button
- `components/LuckScoreSection.tsx` — top 3 luckiest / unluckiest teams
- `components/GroupStandingsPreview.tsx` — first 4 groups preview
- `app/page.tsx` — Home page: Hero, Today's Matches, Luck Scores, Standings

## S17 — Match Detail + Explore Pages ✅
- `types/index.ts` extended: Prediction, ShapReason, Scoreline, TeamMomentum, KeyPlayer, Team, BracketSlot
- `components/ShapCard.tsx` — SHAP factor card with direction arrow + impact bar
- `components/MomentumBar.tsx` — team momentum bar, trend label, recent form dots
- `components/LuckScoreBar.tsx` — animated −10…+10 needle bar
- `components/UserPrediction.tsx` — outcome buttons, score inputs, lock (disabled post-kickoff)
- `components/TeamCard.tsx` — compact team card for explore grid
- `components/TeamProfile.tsx` — full modal: stats, luck avg, momentum, recent form
- `components/FullStandings.tsx` — all 12 groups, GF/GA/GD columns
- `components/Bracket.tsx` — knockout tree R32→R16→QF→SF→Final, TBD slots
- `app/match/[match_id]/page.tsx` — full match detail (SHAP, scorelines, momentum, key player, user prediction, post-match luck + narrative, share card)
- `app/explore/page.tsx` — 48-team grid, search + confederation filter, standings tab, bracket tab
- `app/about/page.tsx` — bilingual about page, Google consent note, disclaimer
- `app/manifest.ts` — PWA manifest (name, short_name, gold theme)
- Navbar updated: Explore link, "Innovera Predictor" logo
- MatchCard: Predict → Link to `/match/[id]`, `innovera.ai` watermark

## Verified ✅ (2026-05-24)
| Route | Status |
|---|---|
| `GET /` | 200 OK |
| `GET /match/test-id` | 200 OK — layout renders with no-data state |
| `GET /explore` | 200 OK — teams grid, search bar, tabs visible |
| `GET /about` | 200 OK |
| `GET /manifest.webmanifest` | 200 OK |

No terminal errors. `themeColor` moved to `viewport` export (Next.js 14 requirement).

## S17b — Tournament Bracket UI ✅

### New types (`types/index.ts`)
- `TournamentGroupTeam`, `TournamentGroup`, `TournamentBracketMatch`, `TournamentChampion`, `TournamentSimulation`
- `UserBracketMatchResult`, `UserBracketResponse`

### New components
- `components/GroupStagePredictions.tsx` — 12 group cards; live standings (Supabase) + AI qualify% when games played; AI-only predicted table otherwise; colour-coded qualify% pills (green/gold/red)
- `components/BracketPredictions.tsx` — Predicted Champion card (trophy + probability bar); horizontal scrollable R32→Final bracket; real winners gold, AI-predicted blue dashed; click-to-open match detail modal with probability bars; **Submit My Bracket** flow: progressive round picker (R32→QF→SF→Final), auto-advances teams, POST `/simulate/user-bracket`, comparison view with per-match score

### Explore page updated (`app/explore/page.tsx`)
- Tabs: `Teams | Group Stage | Bracket` (replaced old Standings tab)
- Fetches `GET /simulate/tournament` from FastAPI on mount
- Passes `simulation` + `realSlots` (Supabase bracket table) to `BracketPredictions`
- Passes `simulation.groups` + `standings` to `GroupStagePredictions`

## Verified ✅ (2026-05-24)
| Route | Status |
|---|---|
| `GET /` | 200 OK |
| `GET /explore` | 200 OK — Teams / Group Stage / Bracket tabs render |
| `GET /about` | 200 OK |
| `GET /match/test-id` | 200 OK |
| `GET /manifest.webmanifest` | 200 OK |

No terminal errors. Build clean. All 4 routes compile on demand.

---

## S18 — Leaderboard + About Redesign + Supabase Auth ✅

### New files
- `context/AuthContext.tsx` — global React context; Google/Facebook OAuth via Supabase; `upsertUserProfile` on first login; `AuthModalPortal` renders globally (no per-page modal setup needed); `openAuthModal(lang)` stores language for bilingual modal
- `app/leaderboard/page.tsx` — top-50 leaderboard; Weekly / Tournament Total tabs; current user row highlighted in gold; user outside top-50 shown in separate card below; Share My Rank (rank-card API → `navigator.share()` → clipboard fallback); login banner for non-authed users

### Modified files
- `app/layout.tsx` — wrapped children with `<AuthProvider>`
- `components/Navbar.tsx` — auth-aware: loading pulse → user avatar+menu dropdown (leaderboard link, sign out) → Login button; outside-click closes dropdown; Leaderboard added to desktop nav
- `components/UserPrediction.tsx` — non-blocking login hint banner when not signed in; saves prediction to `user_predictions` table on lock if signed in
- `app/about/page.tsx` — full redesign: mission statement, 3-step AI explainer (Data Collection → Model Training → Live Predictions), data sources (StatsBomb / FBref / API-Football), updated technology section with OAuth, contact placeholders, "Built with Claude Code" badge

### Supabase tables required
- `user_profiles(id uuid, user_id uuid, username text, avatar_url text, total_points int, weekly_points int, streak int, beat_ai int, created_at timestamptz)` — created on first OAuth login
- `user_predictions(id uuid, user_id uuid, match_id text, predicted_outcome text, predicted_home_score int, predicted_away_score int, created_at timestamptz)` — unique on `(user_id, match_id)`

### Infrastructure note
OAuth providers (Google, Facebook) must be configured in the Supabase dashboard under Authentication → Providers.

## Verified ✅ (2026-05-24)
| Route | Status |
|---|---|
| `GET /` | 200 OK |
| `GET /explore` | 200 OK — 3 tabs render |
| `GET /leaderboard` | 200 OK |
| `GET /about` | 200 OK — redesigned |
| `GET /match/test-id` | 200 OK |
| `GET /manifest.webmanifest` | 200 OK |

`npx next build` passes clean (warnings only: `<img>` vs `<Image/>` — acceptable for external avatar URLs).

---

## S19 — Centralized Translations + CardModal + Vercel Prep ✅

### New files
- `lib/translations.ts` — 85-key EN/KU registry; `tr(key, lang)` helper; single source of truth for all static UI text; `Language` type defined here
- `hooks/useLanguage.ts` — `useLanguage()` hook; reads/writes `localStorage` key `innovera_language`; language preference persists across all pages and page navigations
- `components/CardModal.tsx` — shareable card modal; fetches image as blob for cross-origin download; Web Share API on mobile, clipboard fallback on desktop; "Coming soon" pill pattern matches Facebook button

### Modified files
- `components/Navbar.tsx` — migrated all nav labels to `tr()` from centralized translations; re-exports `Language` type from `lib/translations` (backward-compatible — all existing `import { type Language } from '@/components/Navbar'` still work)
- `app/page.tsx` — `useLanguage()` replaces `useState<Language>('EN')`
- `app/match/[match_id]/page.tsx` — `useLanguage()`, added `CardModal` (auto-opens after card generation, "View Card" button if closed)
- `app/explore/page.tsx` — `useLanguage()`
- `app/leaderboard/page.tsx` — `useLanguage()`
- `app/about/page.tsx` — `useLanguage()`

### How language persistence works
1. User clicks EN or KU in Navbar
2. `onLanguageChange(lang)` → `changeLanguage(lang)` in `useLanguage`
3. `localStorage.setItem('innovera_language', lang)` persists the choice
4. On next page load, `useEffect` reads localStorage and restores the preference
5. All 5 pages share the same hook — preference is consistent site-wide

## Verified ✅ (2026-05-24)
`npx next build` — zero errors. Same `<img>` warnings as before (external avatar/card URLs). All 6 routes build clean.

## Task 3 — Vercel Deploy (manual steps required)
Vercel requires browser OAuth with GitHub — cannot be done via CLI without pre-authenticated credentials.

**Steps to deploy:**
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `Halgurdkrd/innovera-wc2026-frontend` from GitHub
3. Framework: Next.js (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://prxnkjejczvasswhjwxr.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_QZNOIjeSuAdvquNLBZQb0Q_5FjWn0rg`
   - `NEXT_PUBLIC_API_URL` = `https://halgurdkrd-innovera-wc2026-api.hf.space`
5. Click Deploy — auto-deploy on `main` branch push is enabled by default

---

## S20 — Data Seeding + Simulation Verification ✅

### Scripts added (`scripts/`)
- `populate_teams.py` — upserts 48 WC2026 teams to Supabase `teams` + `group_standings` tables
- `seed.sql` — CREATE TABLE + INSERT for `teams` + `group_standings` with RLS public-read policies
- `populate_matches.py` — generates + upserts all 72 group stage fixtures
- `matches_seed.sql` — INSERT for all 72 matches using backend schema (match_id PK, no flag/probability columns)

### Supabase state (2026-05-24)
| Table | Rows | Status |
|---|---|---|
| `teams` | 48 | ✅ populated |
| `group_standings` | 48 | ✅ populated |
| `matches` | 0 | ⚠️ run matches_seed.sql in SQL Editor |
| `simulation_results` | 0 | ⚠️ blocked by RLS — needs service key |

### Bug fixed — backend `app/routers/data.py`
`GET /data/matches/{id}` queried `.eq("id", ...)` but PK column is `match_id` — fixed to `.eq("match_id", ...)`

### Simulation endpoint verified ✅
- `GET /simulate/diag` → `all_ok: true` (CSV 263 rows, model 55 features, simulation runs)
- `GET /simulate/tournament?n=200` → HTTP 200
- **Top 5 winner probabilities (n=200):**
  1. France: 21.5%
  2. Spain: 15.5%
  3. Brazil: 11.5%
  4. Germany: 8.0%
  5. Colombia: 5.0%

### simulation_results insert failing (silent)
Root cause: HF Space uses anon key; no INSERT RLS policy on `simulation_results`. Fix options:
- Add `SUPABASE_SERVICE_KEY` to HF Space → Settings → Variables and Secrets, **OR**
- Run in Supabase SQL Editor: `CREATE POLICY "sim_insert" ON public.simulation_results FOR INSERT WITH CHECK (true);`

### Known issue — simulation uses historical teams (not WC2026 roster)
`winner_probs` includes teams like Sweden, South Africa, Czech Republic that are not at WC2026.
Root cause: `bracket_simulation.py` draws team names from historical CSV instead of the actual 48 teams.
Fix: pass the 48 WC2026 team names to `TournamentSimulator` as a constraint — S21 item.

### Pending manual step
Run `scripts/matches_seed.sql` in [Supabase SQL Editor](https://supabase.com/dashboard/project/prxnkjejczvasswhjwxr/sql/new) to insert all 72 group stage fixtures.

---

## S20b — Frontend Predictions Fix ✅ (2026-05-24)

### Root cause
`explore/page.tsx` stored the raw API response directly as `TournamentSimulation`.
The API returns `group_tables` but the component expected `simulation.groups` — always `undefined` →
`GroupStagePredictions` fell back to the hardcoded 50% for every team.

### Fix (`app/explore/page.tsx`)
- Added `RawSimulation` interface matching actual API shape (`group_tables`, `stage_appearances`, `predicted_bracket`, `winner_probs`)
- Raw response stored in `rawSim` state; `simulation` derived via `useMemo(rawSim + standings)`
- Mapping: `group_tables` → `groups`, `pts/gd/gf` → `predicted_pts/gd/gf`, `stage_appearances[team].R32` → `qualify_prob`
- Bracket rounds (`R32/R16/QF/SF/Final`) mapped to `TournamentBracketMatch[]` with flags from `group_standings`
- `predicted_champion` populated from `predicted_bracket.champion` + `winner_probs`

### Also fixed in backend (same session)
- `WC2026_GROUPS` corrected to actual Dec-2025 FIFA draw — no more phantom teams (Sweden, South Africa, etc.)
- `GET /data/matches/{id}`: `.eq("id", …)` → `.eq("match_id", …)`

## Verified ✅ (2026-05-24)
| Feature | Status |
|---|---|
| Group Stage qualify% | ✅ Real AI predictions (Spain ~85%, New Zealand ~15%, etc.) |
| Bracket tab | ✅ Predicted champion + round-by-round |
| Winner probabilities | ✅ France 21.9%, Spain 16.1%, Germany 9%, Brazil 7.4% |
| simulation_results table | ✅ Writing (RLS INSERT policy active) |
| 50% fallback | ✅ Gone — replaced by simulation data |

`npx next build` — zero errors. All routes clean.

---

## All Systems Operational ✅

| System | Status |
|---|---|
| Frontend (Vercel) | ✅ https://innovera-wc2026-frontend.vercel.app |
| Backend API (HF Space) | ✅ https://halgurdkrd-innovera-wc2026-api.hf.space |
| Supabase | ✅ teams 48 · matches 72 · group_standings 48 · simulation_results 1+ |
| Group Stage predictions | ✅ Real qualify% from AI simulation |
| Bracket predictions | ✅ Champion + all rounds |
| Auth (Google/Facebook) | ✅ OAuth via Supabase |
| Leaderboard | ✅ top-50 + user row |
| Match detail page | ✅ SHAP, scorelines, momentum |
| Language toggle EN/KU | ✅ Persists via localStorage |
| PWA manifest | ✅ |

## Next: S21
<!-- S21 instructions will be pasted here -->
