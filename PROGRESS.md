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

---

## S21 — Official WC2026 Groups + /standings Fix ✅ (2026-05-25)

### Root cause
All hardcoded group/team data was using guessed/placeholder teams, not the official FIFA WC2026 draw from December 5, 2025.

### Fixed files — Frontend
- `components/GroupStagePredictions.tsx` — FALLBACK_GROUPS rewritten to official 48 teams (A–L)
- `components/GroupStandingsPreview.tsx` — "View All Groups" link: `/standings` → `/explore?tab=group_stage`
- `app/explore/page.tsx` — CONFEDERATION_MAP updated (added South Africa, Czech Republic, Bosnia-Herzegovina, Scotland, Haiti, Curaçao, Côte d'Ivoire, Sweden, Cabo Verde, Norway, Iraq, Austria, Jordan, Uzbekistan, Congo DR, Ghana, Panama); URL `?tab=` param read on mount via `window.location.search`
- `scripts/seed.sql` — INSERT for correct 48 teams in official groups
- `scripts/populate_teams.py` — TEAMS list updated
- `scripts/matches_seed.sql` — all 72 fixtures regenerated with official team matchups
- `scripts/populate_matches.py` — FLAGS + MATCHES updated

### Fixed files — Backend (previous session)
- `app/ml/bracket_simulation.py` — `WC2026_GROUPS` corrected to official draw
- `app/ml/features.py` — `_FIFA_RANKINGS` updated with all 48 WC2026 teams

### Official WC2026 Groups (Dec 5, 2025 draw)
| Group | Teams |
|---|---|
| A | Mexico · South Korea · South Africa · Czech Republic |
| B | Canada · Switzerland · Qatar · Bosnia-Herzegovina |
| C | Brazil · Morocco · Scotland · Haiti |
| D | USA · Paraguay · Australia · Turkey |
| E | Germany · Curaçao · Côte d'Ivoire · Ecuador |
| F | Netherlands · Japan · Tunisia · Sweden |
| G | Belgium · Egypt · Iran · New Zealand |
| H | Spain · Cabo Verde · Saudi Arabia · Uruguay |
| I | France · Senegal · Norway · Iraq |
| J | Argentina · Algeria · Austria · Jordan |
| K | Portugal · Colombia · Uzbekistan · Congo DR |
| L | England · Croatia · Ghana · Panama |

### Pending manual steps (Supabase SQL Editor)
1. Delete old group data:
   ```sql
   DELETE FROM public.group_standings;
   DELETE FROM public.teams;
   ```
2. Run `scripts/seed.sql` — inserts correct 48 teams
3. Delete old matches:
   ```sql
   DELETE FROM public.matches;
   ```
4. Run `scripts/matches_seed.sql` — inserts correct 72 fixtures
5. Trigger new simulation: `GET /simulate/update?n=1000`

### Git
- Frontend pushed to GitHub (`main`) ✅
- Backend already pushed to GitHub + HF Space (`master`/`main`) ✅

## S23 — Switch frontend: WC2026 → Premier League 2026-27 🚧 IN PROGRESS

### Task
Migrate the live frontend from showing FIFA World Cup 2026 data to Premier League 2026-27 data.
Full instructions given by user (verbatim intent): add `competition` filter to every matches query,
rebrand all "FIFA World Cup 2026" / "Ennovera Predictor" strings → "Premier League 2026-27" / "Ennovera AI",
replace "Group Stage" → "Gameweek X" display, remove group tables + bracket/knockout UI, home page shows
today's/tomorrow's PL matches + current gameweek header, keep auth/predictions/leaderboard/H2H/My Predictions
working, then `git commit -am "switch: WC2026 → Premier League 2026-27"` and `git push origin main`.

### User decisions (confirmed via AskUserQuestion, 2026-08-24)
1. **Competition column**: Already added by user to Supabase — VERIFIED via direct REST query:
   - `matches.competition` column exists. Values seen: `"WC2026"` (old rows) and `"PL2026-27"` (new rows).
   - PL2026-27 row count: **380 matches** total in table.
   - PL rows have `tournament_stage: "Gameweek 1"` (confirmed pattern), `group_name: null`.
   - Sample PL teams confirmed in DB: Arsenal, Coventry City, Hull City, Manchester United, Ipswich Town,
     Sunderland, Nottingham Forest, Leeds United, Everton, Crystal Palace, Brentford, Tottenham,
     Manchester City, Bournemouth, Brighton and Hove Albion, Aston Villa, Newcastle United, Liverpool,
     Fulham, Chelsea (real 2026-27 PL fixtures, not placeholders).
2. **Missing PL backend** (Top 4 / Relegation probabilities, league table endpoint): backend/VPS API
   (`/simulate/tournament`) does NOT have PL-shaped endpoints yet (still WC-shaped: `group_tables`,
   `stage_appearances`, `bracket`, `winner_probs` for 48 teams). Decision: **hide/remove these sections
   entirely for this pass** rather than show wrong/misleading WC-shaped data under PL labels. Champion
   Probability, group qualification %, and the bracket tab should be removed/hidden, not adapted.
3. **Rollout**: user said **implement and push automatically** (skip the "stop before push" option) —
   i.e. after making changes, commit AND `git push origin main` without pausing for review.

### Codebase survey (via Explore agent, before edits — see below for what needs to change)

**Matches queries needing `.eq('competition', 'PL2026-27')` added:**
- `app/page.tsx:76-79` — home page today/tomorrow matches fetch (`supabasePublic.from('matches')...`)
- `app/match/[match_id]/page.tsx:277-278` — single match fetch (`.eq('match_id', match_id)`); the probe
  query at 265-266 is just a health-check, can leave as-is or filter too (low priority)
- `app/team/[team_name]/page.tsx:246-251` — team's matches (`.or('home_team.eq.X,away_team.eq.X')`);
  also has a `group_standings` query here — group_standings is WC-only concept, needs rethink (see below)
- `app/my-predictions/page.tsx:354-357` — matches by `.in('match_id', matchIds)` — matchIds come from
  user's own predictions so already scoped, but add filter for safety/consistency

**Branding strings to update** ("FIFA World Cup 2026" → "Premier League 2026-27", "Ennovera Predictor" →
"Ennovera AI", "WC2026" → "PL2026-27" where used as a tag/label, NOT as a literal DB value):
- `app/layout.tsx:16,19,22,39,53` — metadata title template, description, keywords
- `app/manifest.ts:6,8` — PWA manifest short_name/description
- `app/page.tsx:22-23` (labels obj), `182-183` (hero `<h1>` "Ennovera World Cup 2026 AI Predictor"), `341` (footer)
- `app/about/page.tsx:10,16,73`
- `app/explore/page.tsx:87-88`
- `app/h2h/page.tsx:102-103` ("WC2026 H2H Challenge")
- `app/leaderboard/page.tsx:31,183`
- `app/my-predictions/page.tsx:70,98,429,465-466,528`
- `app/scorers/page.tsx:33`
- `context/AuthContext.tsx:174` ("Sign in to Ennovera Predictor")
- `components/Navbar.tsx:69` ("FIFA World Cup 2026" nav subtitle)
- `components/PredictionCard.tsx:68,271,415` ("#WC2026" share tags → "#PL2026")
- `components/GroupStagePredictions.tsx:9` (comment only)
- `lib/translations.ts:18,84,95,112,117,128-129` (central EN/KU i18n dict — important, drives multiple pages)
- NOT touching: `PROGRESS.md`, `scripts/*.py`, `scripts/seed.sql`, `scripts/matches_seed.sql` (seed/backend
  scripts, not runtime frontend; out of scope for "frontend" rebrand task)

**tournament_stage / group_name**: `tournament_stage` field exists on `Match` type but was previously
unused in rendering (dead field) — now it's the "Gameweek N" display source, needs to be wired into
match cards / home page header where currently no stage label is shown, or where "Group Stage" text
literal exists. `group_name` is `null` for PL rows — every component reading `group_name` needs to
either hide the group badge/column when null, or those components get removed entirely per decision #2.

**To remove/hide (per decision #2 — WC-shaped, no PL equivalent yet):**
- `components/GroupStandingsPreview.tsx` — home page group standings teaser (uses `group_standings` table)
- `components/FullStandings.tsx` — full 12-group standings tables (in `app/explore/page.tsx`)
- `components/GroupPreviewTeaser.tsx` — hardcoded 48-team WC groups teaser (home page, pre-tournament block)
- `components/GroupStagePredictions.tsx` — has `FALLBACK_GROUPS` hardcoded WC teams
- `components/BracketPredictions.tsx` + `components/Bracket.tsx` — bracket/knockout UI (bracket tab in
  `app/explore/page.tsx`, `ENABLE_BRACKET` flag already `false` at line 318 — can likely just remove the
  tab/UI entirely rather than leave dead code)
- `components/WinnerProbsList.tsx` — "Tournament Win Probability" list (home page) — no PL winner_probs yet
- `app/page.tsx` pre-tournament block: `CountdownTimer`, `PickWinner` (winnerProbs), `GroupPreviewTeaser`
  — all WC-specific (countdown to WC kickoff, pick tournament winner) — PL already started (fixtures from
  2026-08-21), so this whole pre-tournament section is moot and should be removed
- `app/my-predictions/page.tsx:568-583` — "Bracket Status" section, link to `/explore?tab=bracket`
- `app/team/[team_name]/page.tsx` — group_standings query + winner_probs usage (line ~273-274) — remove/hide
- `app/explore/page.tsx` — heaviest WC-simulation usage (`stage_appearances`, `winner_probs`, "🏆 Champion
  Probability Changes" heading at line 595, bracket tab, standings tab) — needs the most rework; likely
  simplify to just team grid (48-team grid also wrong — needs to become 20 PL clubs, TBD if team data
  exists in Supabase `teams` table for PL — NOT YET VERIFIED, check before assuming)

### NOT yet verified (check before/while implementing)
- Does Supabase `teams` table have PL club rows (20 clubs), or only WC48 teams? Needed for `explore/page.tsx`
  team grid, `team/[team_name]/page.tsx`, `TeamCard.tsx`.
- Does `group_standings` table matter at all for PL, or is it purely WC and should be fully ignored for PL?
- Home page hero stats strip ("48 Matches / 32 Teams / 3 Host Nations") needs new PL-accurate numbers
  (380 matches confirmed; team count needs `teams` table check).
- `user_predictions`/`user_brackets`/`leaderboard`/`h2h` tables — do they need a competition filter too,
  or are they competition-agnostic (keyed by match_id which is already competition-scoped)? Likely fine
  as-is since they reference match_id, but worth a quick check per table.

### Status: ✅ COMPLETE (2026-08-24)

Verified `teams` and `group_standings` tables: both contain ONLY the 48 WC2026 national teams,
zero PL club rows. `luck_scores` also WC-only. Backend endpoints `/scorers/*`, `/simulate/tournament`,
and `/h2h/*` are all still WC-hardcoded (H2H rounds even have 2026 WC dates, `/h2h/teams` returns the
48 nations). Per decision #2, these were hidden rather than shown with wrong data:

- **Deleted** (dead, WC-only, zero remaining references): `GroupStagePredictions.tsx`, `GroupPreviewTeaser.tsx`,
  `GroupStandingsPreview.tsx`, `FullStandings.tsx`, `BracketPredictions.tsx`, `Bracket.tsx`,
  `WinnerProbsList.tsx`, `PickWinner.tsx`, `CountdownTimer.tsx`, `LuckScoreSection.tsx`.
- **`app/page.tsx`** — rewritten: competition filter added, pre-tournament block/group standings/winner
  probs/luck scores all removed, gameweek badge added (reads `tournament_stage` from fetched matches),
  hero + stats strip rebranded (380 matches / 20 clubs / 38 gameweeks).
- **`app/explore/page.tsx`** — rewritten from teams/group-stage/bracket tabs into a single PL Fixtures &
  Results browser (search by team, filter by gameweek) — the only real PL data available is `matches`.
- **`app/team/[team_name]/page.tsx`** — simplified to fixture list only (no FIFA rank/style/standings/
  win-prob — none of that data exists for PL clubs).
- **`app/match/[match_id]/page.tsx`** — added `.eq('competition','PL2026-27')`. SHAP/scorelines/momentum
  sections already degrade gracefully (conditional render) since `/predictions/{id}` 404s for PL matches;
  the core win/draw/away prob card still works since `matches` table has real per-match probabilities.
- **`app/my-predictions/page.tsx`** — competition filter added, Bracket Status section + `user_brackets`
  fetch removed, branding + share text updated.
- **`app/h2h/page.tsx`**, **`app/scorers/page.tsx`** — replaced with lightweight "coming soon" placeholders
  (backend has no PL data for either; nav links kept, pages just don't call the WC-shaped endpoints).
- **`lib/flags.ts`** — fallback changed from `'🏳️'` (used as a broken `<img src>` for any unmapped team)
  to `'⚽'`; `MatchCard.tsx` and `my-predictions` `PredCard` now check `.startsWith('http')` before
  rendering `<img>` vs an emoji span, so PL clubs (no flag mapping) render cleanly instead of broken images.
  `PredictionCard.tsx`'s `FlagDisplay` already had this guard, no fix needed there.
- Branding pass: `app/layout.tsx`, `app/manifest.ts`, `components/Navbar.tsx`, `context/AuthContext.tsx`,
  `lib/translations.ts`, `app/about/page.tsx`, `app/leaderboard/page.tsx`, `components/PredictionCard.tsx`
  — "FIFA World Cup 2026" → "Premier League 2026-27", "Ennovera Predictor" → "Ennovera AI", "#WC2026" → "#PL2026".
- Verified with `npx tsc --noEmit` (clean) and `npx next build` (compiles, all 12 routes generate).
  Smoke-tested `/`, `/explore`, `/h2h`, `/scorers`, `/leaderboard`, `/about`, `/team/Arsenal`,
  `/team/Arsenal/squad`, and a real match detail page on local dev server — all 200, home page confirmed
  rendering "Premier League" text.

**Known gaps / out of scope for this pass** (flagged to user, not silently fixed):
- H2H and Scorers need backend work (new endpoints / PL team pool / gameweek round schedule) before they
  can go live — currently "coming soon" placeholders.
- `/team/[team_name]/squad` page was left untouched (not mentioned in original instructions); renders
  200 for a PL club name but wasn't deeply audited for WC-specific assumptions.
- `about/page.tsx`'s Google consent-screen note still says "Ennovera World Cup AI Predictor" — that's
  describing the actual registered OAuth app name in Google Cloud Console, not app copy; left alone since
  changing the text without changing the Google Console registration would be inaccurate.
- Backend `techBody` copy on About page still says "Hugging Face Spaces" (stale even before this task —
  the backend is actually on the Hostinger VPS) — not touched, out of scope.

## Next: S24
<!-- S24 instructions will be pasted here -->
