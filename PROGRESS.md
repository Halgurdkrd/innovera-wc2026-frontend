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

---

## Next: S17b — Tournament Bracket UI
- Full interactive knockout bracket
- Match result entry slots
- Champion prediction flow
