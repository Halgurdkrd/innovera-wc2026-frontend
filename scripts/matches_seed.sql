-- ====================================================================
-- matches_seed.sql  --  Insert all 72 WC2026 group stage fixtures
-- into the EXISTING matches table (S02 schema).
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Columns used: match_id, home_team, away_team, match_date,
--               tournament_stage, group_name, venue, status
-- ====================================================================

INSERT INTO public.matches
  (match_id, home_team, away_team, match_date, tournament_stage, group_name, venue, status)
VALUES
  -- ── Matchday 1 ──────────────────────────────────────────────────────────────
  (gen_random_uuid(),'USA','Panama',         '2026-06-11T18:00:00+00','Group','A','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Albania','Ukraine',    '2026-06-12T15:00:00+00','Group','A','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Mexico','Jamaica',     '2026-06-12T18:00:00+00','Group','B','Estadio Azteca','scheduled'),
  (gen_random_uuid(),'Venezuela','Ecuador',  '2026-06-12T21:00:00+00','Group','B','Hard Rock Stadium','scheduled'),
  (gen_random_uuid(),'Canada','Honduras',    '2026-06-13T15:00:00+00','Group','C','BMO Field','scheduled'),
  (gen_random_uuid(),'Morocco','Portugal',   '2026-06-13T18:00:00+00','Group','C','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Spain','Japan',        '2026-06-13T21:00:00+00','Group','D','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Congo DR','New Zealand','2026-06-14T15:00:00+00','Group','D','Camping World Stadium','scheduled'),
  (gen_random_uuid(),'Germany','Australia',  '2026-06-14T18:00:00+00','Group','E','Gillette Stadium','scheduled'),
  (gen_random_uuid(),'Argentina','Chile',    '2026-06-14T21:00:00+00','Group','E','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'France','Algeria',     '2026-06-15T15:00:00+00','Group','F','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Nigeria','Paraguay',   '2026-06-15T18:00:00+00','Group','F','Estadio BBVA','scheduled'),
  (gen_random_uuid(),'England','Serbia',     '2026-06-15T21:00:00+00','Group','G','Lincoln Financial Field','scheduled'),
  (gen_random_uuid(),'Cameroon','Senegal',   '2026-06-16T15:00:00+00','Group','G','Estadio Akron','scheduled'),
  (gen_random_uuid(),'Netherlands','Finland','2026-06-16T18:00:00+00','Group','H','Arrowhead Stadium','scheduled'),
  (gen_random_uuid(),'Saudi Arabia','Peru',  '2026-06-16T21:00:00+00','Group','H','Levi''s Stadium','scheduled'),
  (gen_random_uuid(),'Brazil','Uruguay',     '2026-06-17T15:00:00+00','Group','I','Hard Rock Stadium','scheduled'),
  (gen_random_uuid(),'Colombia','South Korea','2026-06-17T18:00:00+00','Group','I','Lumen Field','scheduled'),
  (gen_random_uuid(),'Belgium','Egypt',      '2026-06-17T21:00:00+00','Group','J','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Qatar','Slovakia',     '2026-06-18T15:00:00+00','Group','J','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Croatia','Iran',       '2026-06-18T18:00:00+00','Group','K','Camping World Stadium','scheduled'),
  (gen_random_uuid(),'Poland','Tunisia',     '2026-06-18T21:00:00+00','Group','K','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Italy','Turkey',       '2026-06-19T15:00:00+00','Group','L','Estadio Azteca','scheduled'),
  (gen_random_uuid(),'Slovenia','Switzerland','2026-06-19T18:00:00+00','Group','L','BC Place','scheduled'),
  -- ── Matchday 2 ──────────────────────────────────────────────────────────────
  (gen_random_uuid(),'USA','Albania',        '2026-06-20T15:00:00+00','Group','A','Levi''s Stadium','scheduled'),
  (gen_random_uuid(),'Panama','Ukraine',     '2026-06-20T18:00:00+00','Group','A','Gillette Stadium','scheduled'),
  (gen_random_uuid(),'Mexico','Venezuela',   '2026-06-20T21:00:00+00','Group','B','Estadio Azteca','scheduled'),
  (gen_random_uuid(),'Jamaica','Ecuador',    '2026-06-21T15:00:00+00','Group','B','Hard Rock Stadium','scheduled'),
  (gen_random_uuid(),'Canada','Morocco',     '2026-06-21T18:00:00+00','Group','C','BC Place','scheduled'),
  (gen_random_uuid(),'Honduras','Portugal',  '2026-06-21T21:00:00+00','Group','C','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Spain','Congo DR',     '2026-06-22T15:00:00+00','Group','D','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Japan','New Zealand',  '2026-06-22T18:00:00+00','Group','D','Levi''s Stadium','scheduled'),
  (gen_random_uuid(),'Germany','Argentina',  '2026-06-22T21:00:00+00','Group','E','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Australia','Chile',    '2026-06-23T15:00:00+00','Group','E','Arrowhead Stadium','scheduled'),
  (gen_random_uuid(),'France','Nigeria',     '2026-06-23T18:00:00+00','Group','F','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Algeria','Paraguay',   '2026-06-23T21:00:00+00','Group','F','Estadio BBVA','scheduled'),
  (gen_random_uuid(),'England','Cameroon',   '2026-06-24T15:00:00+00','Group','G','Lumen Field','scheduled'),
  (gen_random_uuid(),'Serbia','Senegal',     '2026-06-24T18:00:00+00','Group','G','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Netherlands','Saudi Arabia','2026-06-24T21:00:00+00','Group','H','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Finland','Peru',       '2026-06-25T15:00:00+00','Group','H','BMO Field','scheduled'),
  (gen_random_uuid(),'Brazil','Colombia',    '2026-06-25T18:00:00+00','Group','I','Hard Rock Stadium','scheduled'),
  (gen_random_uuid(),'Uruguay','South Korea','2026-06-25T21:00:00+00','Group','I','Estadio Akron','scheduled'),
  (gen_random_uuid(),'Belgium','Qatar',      '2026-06-26T15:00:00+00','Group','J','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Egypt','Slovakia',     '2026-06-26T18:00:00+00','Group','J','Camping World Stadium','scheduled'),
  (gen_random_uuid(),'Croatia','Poland',     '2026-06-26T21:00:00+00','Group','K','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Iran','Tunisia',       '2026-06-27T15:00:00+00','Group','K','Gillette Stadium','scheduled'),
  (gen_random_uuid(),'Italy','Slovenia',     '2026-06-27T18:00:00+00','Group','L','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Turkey','Switzerland', '2026-06-27T21:00:00+00','Group','L','BC Place','scheduled'),
  -- ── Matchday 3 (simultaneous within each group) ─────────────────────────────
  (gen_random_uuid(),'USA','Ukraine',        '2026-06-29T16:00:00+00','Group','A','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Panama','Albania',     '2026-06-29T16:00:00+00','Group','A','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Mexico','Ecuador',     '2026-06-29T18:00:00+00','Group','B','Estadio Azteca','scheduled'),
  (gen_random_uuid(),'Jamaica','Venezuela',  '2026-06-29T18:00:00+00','Group','B','Hard Rock Stadium','scheduled'),
  (gen_random_uuid(),'Canada','Portugal',    '2026-06-29T20:00:00+00','Group','C','BC Place','scheduled'),
  (gen_random_uuid(),'Honduras','Morocco',   '2026-06-29T20:00:00+00','Group','C','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Spain','New Zealand',  '2026-06-30T16:00:00+00','Group','D','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Japan','Congo DR',     '2026-06-30T16:00:00+00','Group','D','Camping World Stadium','scheduled'),
  (gen_random_uuid(),'Germany','Chile',      '2026-06-30T18:00:00+00','Group','E','Gillette Stadium','scheduled'),
  (gen_random_uuid(),'Australia','Argentina','2026-06-30T18:00:00+00','Group','E','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'France','Paraguay',    '2026-06-30T20:00:00+00','Group','F','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Algeria','Nigeria',    '2026-06-30T20:00:00+00','Group','F','Estadio BBVA','scheduled'),
  (gen_random_uuid(),'England','Senegal',    '2026-07-01T16:00:00+00','Group','G','Lincoln Financial Field','scheduled'),
  (gen_random_uuid(),'Serbia','Cameroon',    '2026-07-01T16:00:00+00','Group','G','Arrowhead Stadium','scheduled'),
  (gen_random_uuid(),'Netherlands','Peru',   '2026-07-01T18:00:00+00','Group','H','Levi''s Stadium','scheduled'),
  (gen_random_uuid(),'Finland','Saudi Arabia','2026-07-01T18:00:00+00','Group','H','Lumen Field','scheduled'),
  (gen_random_uuid(),'Brazil','South Korea', '2026-07-01T20:00:00+00','Group','I','Rose Bowl','scheduled'),
  (gen_random_uuid(),'Uruguay','Colombia',   '2026-07-01T20:00:00+00','Group','I','Estadio Akron','scheduled'),
  (gen_random_uuid(),'Belgium','Slovakia',   '2026-07-02T16:00:00+00','Group','J','BMO Field','scheduled'),
  (gen_random_uuid(),'Egypt','Qatar',        '2026-07-02T16:00:00+00','Group','J','AT&T Stadium','scheduled'),
  (gen_random_uuid(),'Croatia','Tunisia',    '2026-07-02T18:00:00+00','Group','K','Hard Rock Stadium','scheduled'),
  (gen_random_uuid(),'Iran','Poland',        '2026-07-02T18:00:00+00','Group','K','SoFi Stadium','scheduled'),
  (gen_random_uuid(),'Italy','Switzerland',  '2026-07-02T20:00:00+00','Group','L','MetLife Stadium','scheduled'),
  (gen_random_uuid(),'Turkey','Slovenia',    '2026-07-02T20:00:00+00','Group','L','Camping World Stadium','scheduled');

SELECT COUNT(*) AS total_matches FROM public.matches;
