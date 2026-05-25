-- =============================================================================
-- seed.sql — Create tables + insert all 48 WC2026 teams
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- ── group_standings (read by frontend Group Stage tab) ────────────────────────

CREATE TABLE IF NOT EXISTS public.group_standings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name      text NOT NULL,
  team_name       text NOT NULL,
  team_flag       text,
  confederation   text,
  position        int  NOT NULL DEFAULT 0,
  played          int  NOT NULL DEFAULT 0,
  won             int  NOT NULL DEFAULT 0,
  drawn           int  NOT NULL DEFAULT 0,
  lost            int  NOT NULL DEFAULT 0,
  goals_for       int  NOT NULL DEFAULT 0,
  goals_against   int  NOT NULL DEFAULT 0,
  goal_difference int  GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points          int  NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (team_name, group_name)
);

-- ── teams (metadata: confederation, FIFA rank) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name     text NOT NULL,
  team_flag     text,
  group_name    text NOT NULL,
  confederation text,
  fifa_rank     int,
  UNIQUE (team_name, group_name)
);

-- ── Enable Row Level Security + public read ───────────────────────────────────

ALTER TABLE public.group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read group_standings" ON public.group_standings;
CREATE POLICY "Public read group_standings" ON public.group_standings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read teams" ON public.teams;
CREATE POLICY "Public read teams" ON public.teams
  FOR SELECT USING (true);

-- ── Insert all 48 teams ───────────────────────────────────────────────────────
-- ON CONFLICT DO NOTHING = safe to run multiple times

INSERT INTO public.group_standings (group_name, team_name, team_flag, confederation, position, played, won, drawn, lost, goals_for, goals_against, points)
VALUES
  -- Group A: Mexico, South Korea, South Africa, Czech Republic
  ('A','Mexico',              '🇲🇽','CONCACAF', 1,0,0,0,0,0,0,0),
  ('A','South Korea',         '🇰🇷','AFC',      2,0,0,0,0,0,0,0),
  ('A','South Africa',        '🇿🇦','CAF',      3,0,0,0,0,0,0,0),
  ('A','Czech Republic',      '🇨🇿','UEFA',     4,0,0,0,0,0,0,0),
  -- Group B: Canada, Switzerland, Qatar, Bosnia-Herzegovina
  ('B','Canada',              '🇨🇦','CONCACAF', 1,0,0,0,0,0,0,0),
  ('B','Switzerland',         '🇨🇭','UEFA',     2,0,0,0,0,0,0,0),
  ('B','Qatar',               '🇶🇦','AFC',      3,0,0,0,0,0,0,0),
  ('B','Bosnia-Herzegovina',  '🇧🇦','UEFA',     4,0,0,0,0,0,0,0),
  -- Group C: Brazil, Morocco, Scotland, Haiti
  ('C','Brazil',              '🇧🇷','CONMEBOL', 1,0,0,0,0,0,0,0),
  ('C','Morocco',             '🇲🇦','CAF',      2,0,0,0,0,0,0,0),
  ('C','Scotland',            '🏴󠁧󠁢󠁳󠁣󠁴󠁿','UEFA',     3,0,0,0,0,0,0,0),
  ('C','Haiti',               '🇭🇹','CONCACAF', 4,0,0,0,0,0,0,0),
  -- Group D: USA, Paraguay, Australia, Turkey
  ('D','USA',                 '🇺🇸','CONCACAF', 1,0,0,0,0,0,0,0),
  ('D','Paraguay',            '🇵🇾','CONMEBOL', 2,0,0,0,0,0,0,0),
  ('D','Australia',           '🇦🇺','AFC',      3,0,0,0,0,0,0,0),
  ('D','Turkey',              '🇹🇷','UEFA',     4,0,0,0,0,0,0,0),
  -- Group E: Germany, Curaçao, Côte d'Ivoire, Ecuador
  ('E','Germany',             '🇩🇪','UEFA',     1,0,0,0,0,0,0,0),
  ('E','Curaçao',             '🇨🇼','CONCACAF', 2,0,0,0,0,0,0,0),
  ('E','Côte d''Ivoire',      '🇨🇮','CAF',      3,0,0,0,0,0,0,0),
  ('E','Ecuador',             '🇪🇨','CONMEBOL', 4,0,0,0,0,0,0,0),
  -- Group F: Netherlands, Japan, Tunisia, Sweden
  ('F','Netherlands',         '🇳🇱','UEFA',     1,0,0,0,0,0,0,0),
  ('F','Japan',               '🇯🇵','AFC',      2,0,0,0,0,0,0,0),
  ('F','Tunisia',             '🇹🇳','CAF',      3,0,0,0,0,0,0,0),
  ('F','Sweden',              '🇸🇪','UEFA',     4,0,0,0,0,0,0,0),
  -- Group G: Belgium, Egypt, Iran, New Zealand
  ('G','Belgium',             '🇧🇪','UEFA',     1,0,0,0,0,0,0,0),
  ('G','Egypt',               '🇪🇬','CAF',      2,0,0,0,0,0,0,0),
  ('G','Iran',                '🇮🇷','AFC',      3,0,0,0,0,0,0,0),
  ('G','New Zealand',         '🇳🇿','OFC',      4,0,0,0,0,0,0,0),
  -- Group H: Spain, Cabo Verde, Saudi Arabia, Uruguay
  ('H','Spain',               '🇪🇸','UEFA',     1,0,0,0,0,0,0,0),
  ('H','Cabo Verde',          '🇨🇻','CAF',      2,0,0,0,0,0,0,0),
  ('H','Saudi Arabia',        '🇸🇦','AFC',      3,0,0,0,0,0,0,0),
  ('H','Uruguay',             '🇺🇾','CONMEBOL', 4,0,0,0,0,0,0,0),
  -- Group I: France, Senegal, Norway, Iraq
  ('I','France',              '🇫🇷','UEFA',     1,0,0,0,0,0,0,0),
  ('I','Senegal',             '🇸🇳','CAF',      2,0,0,0,0,0,0,0),
  ('I','Norway',              '🇳🇴','UEFA',     3,0,0,0,0,0,0,0),
  ('I','Iraq',                '🇮🇶','AFC',      4,0,0,0,0,0,0,0),
  -- Group J: Argentina, Algeria, Austria, Jordan
  ('J','Argentina',           '🇦🇷','CONMEBOL', 1,0,0,0,0,0,0,0),
  ('J','Algeria',             '🇩🇿','CAF',      2,0,0,0,0,0,0,0),
  ('J','Austria',             '🇦🇹','UEFA',     3,0,0,0,0,0,0,0),
  ('J','Jordan',              '🇯🇴','AFC',      4,0,0,0,0,0,0,0),
  -- Group K: Portugal, Colombia, Uzbekistan, Congo DR
  ('K','Portugal',            '🇵🇹','UEFA',     1,0,0,0,0,0,0,0),
  ('K','Colombia',            '🇨🇴','CONMEBOL', 2,0,0,0,0,0,0,0),
  ('K','Uzbekistan',          '🇺🇿','AFC',      3,0,0,0,0,0,0,0),
  ('K','Congo DR',            '🇨🇩','CAF',      4,0,0,0,0,0,0,0),
  -- Group L: England, Croatia, Ghana, Panama
  ('L','England',             '🏴󠁧󠁢󠁥󠁮󠁧󠁿','UEFA',     1,0,0,0,0,0,0,0),
  ('L','Croatia',             '🇭🇷','UEFA',     2,0,0,0,0,0,0,0),
  ('L','Ghana',               '🇬🇭','CAF',      3,0,0,0,0,0,0,0),
  ('L','Panama',              '🇵🇦','CONCACAF', 4,0,0,0,0,0,0,0)
ON CONFLICT (team_name, group_name) DO NOTHING;

INSERT INTO public.teams (team_name, team_flag, group_name, confederation, fifa_rank)
VALUES
  ('Mexico',             '🇲🇽','A','CONCACAF', 14),
  ('South Korea',        '🇰🇷','A','AFC',      23),
  ('South Africa',       '🇿🇦','A','CAF',      57),
  ('Czech Republic',     '🇨🇿','A','UEFA',     36),
  ('Canada',             '🇨🇦','B','CONCACAF', 24),
  ('Switzerland',        '🇨🇭','B','UEFA',     15),
  ('Qatar',              '🇶🇦','B','AFC',      35),
  ('Bosnia-Herzegovina', '🇧🇦','B','UEFA',     51),
  ('Brazil',             '🇧🇷','C','CONMEBOL',  5),
  ('Morocco',            '🇲🇦','C','CAF',      12),
  ('Scotland',           '🏴󠁧󠁢󠁳󠁣󠁴󠁿','C','UEFA',     42),
  ('Haiti',              '🇭🇹','C','CONCACAF', 79),
  ('USA',                '🇺🇸','D','CONCACAF', 13),
  ('Paraguay',           '🇵🇾','D','CONMEBOL', 40),
  ('Australia',          '🇦🇺','D','AFC',      22),
  ('Turkey',             '🇹🇷','D','UEFA',     32),
  ('Germany',            '🇩🇪','E','UEFA',     16),
  ('Curaçao',            '🇨🇼','E','CONCACAF', 82),
  ('Côte d''Ivoire',     '🇨🇮','E','CAF',      45),
  ('Ecuador',            '🇪🇨','E','CONMEBOL', 21),
  ('Netherlands',        '🇳🇱','F','UEFA',      7),
  ('Japan',              '🇯🇵','F','AFC',      18),
  ('Tunisia',            '🇹🇳','F','CAF',      30),
  ('Sweden',             '🇸🇪','F','UEFA',     36),
  ('Belgium',            '🇧🇪','G','UEFA',      6),
  ('Egypt',              '🇪🇬','G','CAF',      41),
  ('Iran',               '🇮🇷','G','AFC',      25),
  ('New Zealand',        '🇳🇿','G','OFC',      43),
  ('Spain',              '🇪🇸','H','UEFA',      3),
  ('Cabo Verde',         '🇨🇻','H','CAF',      64),
  ('Saudi Arabia',       '🇸🇦','H','AFC',      32),
  ('Uruguay',            '🇺🇾','H','CONMEBOL', 17),
  ('France',             '🇫🇷','I','UEFA',      2),
  ('Senegal',            '🇸🇳','I','CAF',      19),
  ('Norway',             '🇳🇴','I','UEFA',     38),
  ('Iraq',               '🇮🇶','I','AFC',      68),
  ('Argentina',          '🇦🇷','J','CONMEBOL',  1),
  ('Algeria',            '🇩🇿','J','CAF',      37),
  ('Austria',            '🇦🇹','J','UEFA',     28),
  ('Jordan',             '🇯🇴','J','AFC',      74),
  ('Portugal',           '🇵🇹','K','UEFA',      8),
  ('Colombia',           '🇨🇴','K','CONMEBOL',  9),
  ('Uzbekistan',         '🇺🇿','K','AFC',      76),
  ('Congo DR',           '🇨🇩','K','CAF',      72),
  ('England',            '🏴󠁧󠁢󠁥󠁮󠁧󠁿','L','UEFA',      4),
  ('Croatia',            '🇭🇷','L','UEFA',     11),
  ('Ghana',              '🇬🇭','L','CAF',      33),
  ('Panama',             '🇵🇦','L','CONCACAF', 46)
ON CONFLICT (team_name, group_name) DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────

SELECT
  t.group_name,
  t.team_name,
  t.confederation,
  t.fifa_rank,
  gs.played,
  gs.points
FROM public.teams t
LEFT JOIN public.group_standings gs
  ON gs.team_name = t.team_name AND gs.group_name = t.group_name
ORDER BY t.group_name, t.fifa_rank;
