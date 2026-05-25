-- ====================================================================
-- matches_seed.sql  --  Insert all 72 WC2026 group stage fixtures
-- into the EXISTING matches table (S02 schema).
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Official FIFA WC2026 draw (December 5, 2025):
-- A: Mexico, South Korea, South Africa, Czech Republic
-- B: Canada, Switzerland, Qatar, Bosnia-Herzegovina
-- C: Brazil, Morocco, Scotland, Haiti
-- D: USA, Paraguay, Australia, Turkey
-- E: Germany, Curaçao, Côte d'Ivoire, Ecuador
-- F: Netherlands, Japan, Tunisia, Sweden
-- G: Belgium, Egypt, Iran, New Zealand
-- H: Spain, Cabo Verde, Saudi Arabia, Uruguay
-- I: France, Senegal, Norway, Iraq
-- J: Argentina, Algeria, Austria, Jordan
-- K: Portugal, Colombia, Uzbekistan, Congo DR
-- L: England, Croatia, Ghana, Panama
--
-- Columns used: match_id, home_team, away_team, match_date,
--               tournament_stage, group_name, venue, status
-- ====================================================================

INSERT INTO public.matches
  (match_id, home_team, away_team, match_date, tournament_stage, group_name, venue, status)
VALUES
  -- ── Matchday 1 ──────────────────────────────────────────────────────────────
  -- Group A
  (gen_random_uuid(),'Mexico','South Korea',         '2026-06-11T18:00:00+00','Group','A','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'South Africa','Czech Republic','2026-06-12T15:00:00+00','Group','A','AT&T Stadium','scheduled'),
  -- Group B
  (gen_random_uuid(),'Canada','Switzerland',         '2026-06-12T18:00:00+00','Group','B','BC Place','scheduled'),
  (gen_random_uuid(),'Qatar','Bosnia-Herzegovina',   '2026-06-12T21:00:00+00','Group','B','AT&T Stadium','scheduled'),
  -- Group C
  (gen_random_uuid(),'Brazil','Morocco',             '2026-06-13T15:00:00+00','Group','C','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Scotland','Haiti',             '2026-06-13T18:00:00+00','Group','C','BMO Field','scheduled'),
  -- Group D
  (gen_random_uuid(),'USA','Paraguay',               '2026-06-13T21:00:00+00','Group','D','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Australia','Turkey',           '2026-06-14T15:00:00+00','Group','D','Camping World Stadium','scheduled'),
  -- Group E
  (gen_random_uuid(),'Germany','Curaçao',            '2026-06-14T18:00:00+00','Group','E','Gillette Stadium','scheduled'),
  (gen_random_uuid(),'Côte d''Ivoire','Ecuador',     '2026-06-14T21:00:00+00','Group','E','Hard Rock Stadium','scheduled'),
  -- Group F
  (gen_random_uuid(),'Netherlands','Japan',          '2026-06-15T15:00:00+00','Group','F','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Tunisia','Sweden',             '2026-06-15T18:00:00+00','Group','F','Estadio BBVA','scheduled'),
  -- Group G
  (gen_random_uuid(),'Belgium','Egypt',              '2026-06-15T21:00:00+00','Group','G','Lincoln Financial Field','scheduled'),
  (gen_random_uuid(),'Iran','New Zealand',           '2026-06-16T15:00:00+00','Group','G','Lumen Field','scheduled'),
  -- Group H
  (gen_random_uuid(),'Spain','Cabo Verde',           '2026-06-16T18:00:00+00','Group','H','Estadio Azteca','scheduled'),
  (gen_random_uuid(),'Saudi Arabia','Uruguay',       '2026-06-16T21:00:00+00','Group','H','Arrowhead Stadium','scheduled'),
  -- Group I
  (gen_random_uuid(),'France','Senegal',             '2026-06-17T15:00:00+00','Group','I','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Norway','Iraq',                '2026-06-17T18:00:00+00','Group','I','Levi''s Stadium','scheduled'),
  -- Group J
  (gen_random_uuid(),'Argentina','Algeria',          '2026-06-17T21:00:00+00','Group','J','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Austria','Jordan',             '2026-06-18T15:00:00+00','Group','J','Rose Bowl','scheduled'),
  -- Group K
  (gen_random_uuid(),'Portugal','Colombia',          '2026-06-18T18:00:00+00','Group','K','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Uzbekistan','Congo DR',        '2026-06-18T21:00:00+00','Group','K','Hard Rock Stadium','scheduled'),
  -- Group L
  (gen_random_uuid(),'England','Croatia',            '2026-06-19T15:00:00+00','Group','L','Lumen Field','scheduled'),
  (gen_random_uuid(),'Ghana','Panama',               '2026-06-19T18:00:00+00','Group','L','Estadio Akron','scheduled'),
  -- ── Matchday 2 ──────────────────────────────────────────────────────────────
  -- Group A
  (gen_random_uuid(),'Mexico','South Africa',        '2026-06-20T15:00:00+00','Group','A','Levi''s Stadium','scheduled'),
  (gen_random_uuid(),'South Korea','Czech Republic', '2026-06-20T18:00:00+00','Group','A','Gillette Stadium','scheduled'),
  -- Group B
  (gen_random_uuid(),'Canada','Qatar',               '2026-06-20T21:00:00+00','Group','B','BC Place','scheduled'),
  (gen_random_uuid(),'Switzerland','Bosnia-Herzegovina','2026-06-21T15:00:00+00','Group','B','Hard Rock Stadium','scheduled'),
  -- Group C
  (gen_random_uuid(),'Brazil','Scotland',            '2026-06-21T18:00:00+00','Group','C','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Morocco','Haiti',              '2026-06-21T21:00:00+00','Group','C','BMO Field','scheduled'),
  -- Group D
  (gen_random_uuid(),'USA','Australia',              '2026-06-22T15:00:00+00','Group','D','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Paraguay','Turkey',            '2026-06-22T18:00:00+00','Group','D','MetLife Stadium','scheduled'),
  -- Group E
  (gen_random_uuid(),'Germany','Côte d''Ivoire',     '2026-06-22T21:00:00+00','Group','E','Gillette Stadium','scheduled'),
  (gen_random_uuid(),'Curaçao','Ecuador',            '2026-06-23T15:00:00+00','Group','E','Estadio BBVA','scheduled'),
  -- Group F
  (gen_random_uuid(),'Netherlands','Tunisia',        '2026-06-23T18:00:00+00','Group','F','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Japan','Sweden',               '2026-06-23T21:00:00+00','Group','F','AT&T Stadium','scheduled'),
  -- Group G
  (gen_random_uuid(),'Belgium','Iran',               '2026-06-24T15:00:00+00','Group','G','Lincoln Financial Field','scheduled'),
  (gen_random_uuid(),'Egypt','New Zealand',          '2026-06-24T18:00:00+00','Group','G','Arrowhead Stadium','scheduled'),
  -- Group H
  (gen_random_uuid(),'Spain','Saudi Arabia',         '2026-06-24T21:00:00+00','Group','H','Estadio Azteca','scheduled'),
  (gen_random_uuid(),'Cabo Verde','Uruguay',         '2026-06-25T15:00:00+00','Group','H','Camping World Stadium','scheduled'),
  -- Group I
  (gen_random_uuid(),'France','Norway',              '2026-06-25T18:00:00+00','Group','I','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Senegal','Iraq',               '2026-06-25T21:00:00+00','Group','I','Lumen Field','scheduled'),
  -- Group J
  (gen_random_uuid(),'Argentina','Austria',          '2026-06-26T15:00:00+00','Group','J','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Algeria','Jordan',             '2026-06-26T18:00:00+00','Group','J','Camping World Stadium','scheduled'),
  -- Group K
  (gen_random_uuid(),'Portugal','Uzbekistan',        '2026-06-26T21:00:00+00','Group','K','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Colombia','Congo DR',          '2026-06-27T15:00:00+00','Group','K','Gillette Stadium','scheduled'),
  -- Group L
  (gen_random_uuid(),'England','Ghana',              '2026-06-27T18:00:00+00','Group','L','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Croatia','Panama',             '2026-06-27T21:00:00+00','Group','L','BC Place','scheduled'),
  -- ── Matchday 3 (simultaneous within each group) ─────────────────────────────
  -- Group A (simultaneous)
  (gen_random_uuid(),'Mexico','Czech Republic',      '2026-06-29T16:00:00+00','Group','A','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'South Korea','South Africa',   '2026-06-29T16:00:00+00','Group','A','AT&T Stadium','scheduled'),
  -- Group B (simultaneous)
  (gen_random_uuid(),'Canada','Bosnia-Herzegovina',  '2026-06-29T18:00:00+00','Group','B','BC Place','scheduled'),
  (gen_random_uuid(),'Switzerland','Qatar',          '2026-06-29T18:00:00+00','Group','B','Hard Rock Stadium','scheduled'),
  -- Group C (simultaneous)
  (gen_random_uuid(),'Brazil','Haiti',               '2026-06-29T20:00:00+00','Group','C','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Morocco','Scotland',           '2026-06-29T20:00:00+00','Group','C','BMO Field','scheduled'),
  -- Group D (simultaneous)
  (gen_random_uuid(),'USA','Turkey',                 '2026-06-30T16:00:00+00','Group','D','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Paraguay','Australia',         '2026-06-30T16:00:00+00','Group','D','Camping World Stadium','scheduled'),
  -- Group E (simultaneous)
  (gen_random_uuid(),'Germany','Ecuador',            '2026-06-30T18:00:00+00','Group','E','Gillette Stadium','scheduled'),
  (gen_random_uuid(),'Curaçao','Côte d''Ivoire',     '2026-06-30T18:00:00+00','Group','E','Estadio BBVA','scheduled'),
  -- Group F (simultaneous)
  (gen_random_uuid(),'Netherlands','Sweden',         '2026-06-30T20:00:00+00','Group','F','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Japan','Tunisia',              '2026-06-30T20:00:00+00','Group','F','AT&T Stadium','scheduled'),
  -- Group G (simultaneous)
  (gen_random_uuid(),'Belgium','New Zealand',        '2026-07-01T16:00:00+00','Group','G','Lincoln Financial Field','scheduled'),
  (gen_random_uuid(),'Egypt','Iran',                 '2026-07-01T16:00:00+00','Group','G','Arrowhead Stadium','scheduled'),
  -- Group H (simultaneous)
  (gen_random_uuid(),'Spain','Uruguay',              '2026-07-01T18:00:00+00','Group','H','Estadio Azteca','scheduled'),
  (gen_random_uuid(),'Cabo Verde','Saudi Arabia',    '2026-07-01T18:00:00+00','Group','H','Levi''s Stadium','scheduled'),
  -- Group I (simultaneous)
  (gen_random_uuid(),'France','Iraq',                '2026-07-01T20:00:00+00','Group','I','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Senegal','Norway',             '2026-07-01T20:00:00+00','Group','I','Estadio Akron','scheduled'),
  -- Group J (simultaneous)
  (gen_random_uuid(),'Argentina','Jordan',           '2026-07-02T16:00:00+00','Group','J','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Algeria','Austria',            '2026-07-02T16:00:00+00','Group','J','AT&T Stadium','scheduled'),
  -- Group K (simultaneous)
  (gen_random_uuid(),'Portugal','Congo DR',          '2026-07-02T18:00:00+00','Group','K','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Colombia','Uzbekistan',        '2026-07-02T18:00:00+00','Group','K','Hard Rock Stadium','scheduled'),
  -- Group L (simultaneous)
  (gen_random_uuid(),'England','Panama',             '2026-07-02T20:00:00+00','Group','L','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Croatia','Ghana',              '2026-07-02T20:00:00+00','Group','L','Camping World Stadium','scheduled');

SELECT COUNT(*) AS total_matches FROM public.matches;
