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
  -- Group A
  ('A','USA',         '🇺🇸','CONCACAF', 1,0,0,0,0,0,0,0),
  ('A','Panama',      '🇵🇦','CONCACAF', 2,0,0,0,0,0,0,0),
  ('A','Albania',     '🇦🇱','UEFA',     3,0,0,0,0,0,0,0),
  ('A','Ukraine',     '🇺🇦','UEFA',     4,0,0,0,0,0,0,0),
  -- Group B
  ('B','Mexico',      '🇲🇽','CONCACAF', 1,0,0,0,0,0,0,0),
  ('B','Jamaica',     '🇯🇲','CONCACAF', 2,0,0,0,0,0,0,0),
  ('B','Venezuela',   '🇻🇪','CONMEBOL', 3,0,0,0,0,0,0,0),
  ('B','Ecuador',     '🇪🇨','CONMEBOL', 4,0,0,0,0,0,0,0),
  -- Group C
  ('C','Canada',      '🇨🇦','CONCACAF', 1,0,0,0,0,0,0,0),
  ('C','Honduras',    '🇭🇳','CONCACAF', 2,0,0,0,0,0,0,0),
  ('C','Morocco',     '🇲🇦','CAF',      3,0,0,0,0,0,0,0),
  ('C','Portugal',    '🇵🇹','UEFA',     4,0,0,0,0,0,0,0),
  -- Group D
  ('D','Spain',       '🇪🇸','UEFA',     1,0,0,0,0,0,0,0),
  ('D','Japan',       '🇯🇵','AFC',      2,0,0,0,0,0,0,0),
  ('D','Congo DR',    '🇨🇩','CAF',      3,0,0,0,0,0,0,0),
  ('D','New Zealand', '🇳🇿','OFC',      4,0,0,0,0,0,0,0),
  -- Group E
  ('E','Germany',     '🇩🇪','UEFA',     1,0,0,0,0,0,0,0),
  ('E','Australia',   '🇦🇺','AFC',      2,0,0,0,0,0,0,0),
  ('E','Argentina',   '🇦🇷','CONMEBOL', 3,0,0,0,0,0,0,0),
  ('E','Chile',       '🇨🇱','CONMEBOL', 4,0,0,0,0,0,0,0),
  -- Group F
  ('F','France',      '🇫🇷','UEFA',     1,0,0,0,0,0,0,0),
  ('F','Algeria',     '🇩🇿','CAF',      2,0,0,0,0,0,0,0),
  ('F','Nigeria',     '🇳🇬','CAF',      3,0,0,0,0,0,0,0),
  ('F','Paraguay',    '🇵🇾','CONMEBOL', 4,0,0,0,0,0,0,0),
  -- Group G
  ('G','England',     '🏴󠁧󠁢󠁥󠁮󠁧󠁿','UEFA',     1,0,0,0,0,0,0,0),
  ('G','Serbia',      '🇷🇸','UEFA',     2,0,0,0,0,0,0,0),
  ('G','Cameroon',    '🇨🇲','CAF',      3,0,0,0,0,0,0,0),
  ('G','Senegal',     '🇸🇳','CAF',      4,0,0,0,0,0,0,0),
  -- Group H
  ('H','Netherlands', '🇳🇱','UEFA',     1,0,0,0,0,0,0,0),
  ('H','Finland',     '🇫🇮','UEFA',     2,0,0,0,0,0,0,0),
  ('H','Saudi Arabia','🇸🇦','AFC',      3,0,0,0,0,0,0,0),
  ('H','Peru',        '🇵🇪','CONMEBOL', 4,0,0,0,0,0,0,0),
  -- Group I
  ('I','Brazil',      '🇧🇷','CONMEBOL', 1,0,0,0,0,0,0,0),
  ('I','Uruguay',     '🇺🇾','CONMEBOL', 2,0,0,0,0,0,0,0),
  ('I','Colombia',    '🇨🇴','CONMEBOL', 3,0,0,0,0,0,0,0),
  ('I','South Korea', '🇰🇷','AFC',      4,0,0,0,0,0,0,0),
  -- Group J
  ('J','Belgium',     '🇧🇪','UEFA',     1,0,0,0,0,0,0,0),
  ('J','Egypt',       '🇪🇬','CAF',      2,0,0,0,0,0,0,0),
  ('J','Qatar',       '🇶🇦','AFC',      3,0,0,0,0,0,0,0),
  ('J','Slovakia',    '🇸🇰','UEFA',     4,0,0,0,0,0,0,0),
  -- Group K
  ('K','Croatia',     '🇭🇷','UEFA',     1,0,0,0,0,0,0,0),
  ('K','Iran',        '🇮🇷','AFC',      2,0,0,0,0,0,0,0),
  ('K','Poland',      '🇵🇱','UEFA',     3,0,0,0,0,0,0,0),
  ('K','Tunisia',     '🇹🇳','CAF',      4,0,0,0,0,0,0,0),
  -- Group L
  ('L','Italy',       '🇮🇹','UEFA',     1,0,0,0,0,0,0,0),
  ('L','Turkey',      '🇹🇷','UEFA',     2,0,0,0,0,0,0,0),
  ('L','Slovenia',    '🇸🇮','UEFA',     3,0,0,0,0,0,0,0),
  ('L','Switzerland', '🇨🇭','UEFA',     4,0,0,0,0,0,0,0)
ON CONFLICT (team_name, group_name) DO NOTHING;

INSERT INTO public.teams (team_name, team_flag, group_name, confederation, fifa_rank)
VALUES
  ('USA',         '🇺🇸','A','CONCACAF', 12),
  ('Panama',      '🇵🇦','A','CONCACAF', 44),
  ('Albania',     '🇦🇱','A','UEFA',     45),
  ('Ukraine',     '🇺🇦','A','UEFA',     26),
  ('Mexico',      '🇲🇽','B','CONCACAF', 16),
  ('Jamaica',     '🇯🇲','B','CONCACAF', 40),
  ('Venezuela',   '🇻🇪','B','CONMEBOL', 33),
  ('Ecuador',     '🇪🇨','B','CONMEBOL', 20),
  ('Canada',      '🇨🇦','C','CONCACAF', 34),
  ('Honduras',    '🇭🇳','C','CONCACAF', 46),
  ('Morocco',     '🇲🇦','C','CAF',      13),
  ('Portugal',    '🇵🇹','C','UEFA',      5),
  ('Spain',       '🇪🇸','D','UEFA',      8),
  ('Japan',       '🇯🇵','D','AFC',      17),
  ('Congo DR',    '🇨🇩','D','CAF',      43),
  ('New Zealand', '🇳🇿','D','OFC',      48),
  ('Germany',     '🇩🇪','E','UEFA',      9),
  ('Australia',   '🇦🇺','E','AFC',      21),
  ('Argentina',   '🇦🇷','E','CONMEBOL',  1),
  ('Chile',       '🇨🇱','E','CONMEBOL', 32),
  ('France',      '🇫🇷','F','UEFA',      2),
  ('Algeria',     '🇩🇿','F','CAF',      27),
  ('Nigeria',     '🇳🇬','F','CAF',      36),
  ('Paraguay',    '🇵🇾','F','CONMEBOL', 35),
  ('England',     '🏴󠁧󠁢󠁥󠁮󠁧󠁿','G','UEFA',      3),
  ('Serbia',      '🇷🇸','G','UEFA',     25),
  ('Cameroon',    '🇨🇲','G','CAF',      42),
  ('Senegal',     '🇸🇳','G','CAF',      18),
  ('Netherlands', '🇳🇱','H','UEFA',      7),
  ('Finland',     '🇫🇮','H','UEFA',     47),
  ('Saudi Arabia','🇸🇦','H','AFC',      39),
  ('Peru',        '🇵🇪','H','CONMEBOL', 31),
  ('Brazil',      '🇧🇷','I','CONMEBOL',  4),
  ('Uruguay',     '🇺🇾','I','CONMEBOL', 15),
  ('Colombia',    '🇨🇴','I','CONMEBOL', 14),
  ('South Korea', '🇰🇷','I','AFC',      24),
  ('Belgium',     '🇧🇪','J','UEFA',      6),
  ('Egypt',       '🇪🇬','J','CAF',      41),
  ('Qatar',       '🇶🇦','J','AFC',      37),
  ('Slovakia',    '🇸🇰','J','UEFA',     30),
  ('Croatia',     '🇭🇷','K','UEFA',     11),
  ('Iran',        '🇮🇷','K','AFC',      38),
  ('Poland',      '🇵🇱','K','UEFA',     22),
  ('Tunisia',     '🇹🇳','K','CAF',      28),
  ('Italy',       '🇮🇹','L','UEFA',     10),
  ('Turkey',      '🇹🇷','L','UEFA',     23),
  ('Slovenia',    '🇸🇮','L','UEFA',     29),
  ('Switzerland', '🇨🇭','L','UEFA',     19)
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
