-- ====================================================================
-- matches_seed.sql  --  Create matches table + insert all 72 WC2026
-- group stage fixtures.
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.matches (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name           text,
  home_team            text        NOT NULL,
  away_team            text        NOT NULL,
  home_team_flag       text,
  away_team_flag       text,
  match_date           date        NOT NULL,
  match_time           timestamptz NOT NULL,
  venue                text,
  city                 text,
  status               text        NOT NULL DEFAULT 'scheduled',
  home_win_probability numeric     NOT NULL DEFAULT 0.333,
  draw_probability     numeric     NOT NULL DEFAULT 0.334,
  away_win_probability numeric     NOT NULL DEFAULT 0.333,
  ai_confidence        int         NOT NULL DEFAULT 50,
  home_score           int,
  away_score           int,
  created_at           timestamptz DEFAULT now(),
  UNIQUE (home_team, away_team)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read matches" ON public.matches;
CREATE POLICY "Public read matches" ON public.matches
  FOR SELECT USING (true);

INSERT INTO public.matches
  (group_name, home_team, away_team, home_team_flag, away_team_flag,
   match_date, match_time, venue, city, status,
   home_win_probability, draw_probability, away_win_probability, ai_confidence)
VALUES
  ('A','USA','Panama','US','PA','2026-06-11','2026-06-11T18:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('A','Albania','Ukraine','AL','UA','2026-06-12','2026-06-12T15:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('B','Mexico','Jamaica','MX','JM','2026-06-12','2026-06-12T18:00:00Z','Estadio Azteca','Mexico City','scheduled',0.333,0.334,0.333,50),
  ('B','Venezuela','Ecuador','VE','EC','2026-06-12','2026-06-12T21:00:00Z','Hard Rock Stadium','Miami Gardens','scheduled',0.333,0.334,0.333,50),
  ('C','Canada','Honduras','CA','HN','2026-06-13','2026-06-13T15:00:00Z','BMO Field','Toronto','scheduled',0.333,0.334,0.333,50),
  ('C','Morocco','Portugal','MA','PT','2026-06-13','2026-06-13T18:00:00Z','Rose Bowl','Pasadena','scheduled',0.333,0.334,0.333,50),
  ('D','Spain','Japan','ES','JP','2026-06-13','2026-06-13T21:00:00Z','SoFi Stadium','Inglewood','scheduled',0.333,0.334,0.333,50),
  ('D','Congo DR','New Zealand','CD','NZ','2026-06-14','2026-06-14T15:00:00Z','Camping World Stadium','Orlando','scheduled',0.333,0.334,0.333,50),
  ('E','Germany','Australia','DE','AU','2026-06-14','2026-06-14T18:00:00Z','Gillette Stadium','Foxborough','scheduled',0.333,0.334,0.333,50),
  ('E','Argentina','Chile','AR','CL','2026-06-14','2026-06-14T21:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('F','France','Algeria','FR','DZ','2026-06-15','2026-06-15T15:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('F','Nigeria','Paraguay','NG','PY','2026-06-15','2026-06-15T18:00:00Z','Estadio BBVA','Monterrey','scheduled',0.333,0.334,0.333,50),
  ('G','England','Serbia','GB-ENG','RS','2026-06-15','2026-06-15T21:00:00Z','Lincoln Financial Field','Philadelphia','scheduled',0.333,0.334,0.333,50),
  ('G','Cameroon','Senegal','CM','SN','2026-06-16','2026-06-16T15:00:00Z','Estadio Akron','Guadalajara','scheduled',0.333,0.334,0.333,50),
  ('H','Netherlands','Finland','NL','FI','2026-06-16','2026-06-16T18:00:00Z','Arrowhead Stadium','Kansas City','scheduled',0.333,0.334,0.333,50),
  ('H','Saudi Arabia','Peru','SA','PE','2026-06-16','2026-06-16T21:00:00Z','Levi''s Stadium','Santa Clara','scheduled',0.333,0.334,0.333,50),
  ('I','Brazil','Uruguay','BR','UY','2026-06-17','2026-06-17T15:00:00Z','Hard Rock Stadium','Miami Gardens','scheduled',0.333,0.334,0.333,50),
  ('I','Colombia','South Korea','CO','KR','2026-06-17','2026-06-17T18:00:00Z','Lumen Field','Seattle','scheduled',0.333,0.334,0.333,50),
  ('J','Belgium','Egypt','BE','EG','2026-06-17','2026-06-17T21:00:00Z','Rose Bowl','Pasadena','scheduled',0.333,0.334,0.333,50),
  ('J','Qatar','Slovakia','QA','SK','2026-06-18','2026-06-18T15:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('K','Croatia','Iran','HR','IR','2026-06-18','2026-06-18T18:00:00Z','Camping World Stadium','Orlando','scheduled',0.333,0.334,0.333,50),
  ('K','Poland','Tunisia','PL','TN','2026-06-18','2026-06-18T21:00:00Z','SoFi Stadium','Inglewood','scheduled',0.333,0.334,0.333,50),
  ('L','Italy','Turkey','IT','TR','2026-06-19','2026-06-19T15:00:00Z','Estadio Azteca','Mexico City','scheduled',0.333,0.334,0.333,50),
  ('L','Slovenia','Switzerland','SI','CH','2026-06-19','2026-06-19T18:00:00Z','BC Place','Vancouver','scheduled',0.333,0.334,0.333,50),
  ('A','USA','Albania','US','AL','2026-06-20','2026-06-20T15:00:00Z','Levi''s Stadium','Santa Clara','scheduled',0.333,0.334,0.333,50),
  ('A','Panama','Ukraine','PA','UA','2026-06-20','2026-06-20T18:00:00Z','Gillette Stadium','Foxborough','scheduled',0.333,0.334,0.333,50),
  ('B','Mexico','Venezuela','MX','VE','2026-06-20','2026-06-20T21:00:00Z','Estadio Azteca','Mexico City','scheduled',0.333,0.334,0.333,50),
  ('B','Jamaica','Ecuador','JM','EC','2026-06-21','2026-06-21T15:00:00Z','Hard Rock Stadium','Miami Gardens','scheduled',0.333,0.334,0.333,50),
  ('C','Canada','Morocco','CA','MA','2026-06-21','2026-06-21T18:00:00Z','BC Place','Vancouver','scheduled',0.333,0.334,0.333,50),
  ('C','Honduras','Portugal','HN','PT','2026-06-21','2026-06-21T21:00:00Z','Rose Bowl','Pasadena','scheduled',0.333,0.334,0.333,50),
  ('D','Spain','Congo DR','ES','CD','2026-06-22','2026-06-22T15:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('D','Japan','New Zealand','JP','NZ','2026-06-22','2026-06-22T18:00:00Z','Levi''s Stadium','Santa Clara','scheduled',0.333,0.334,0.333,50),
  ('E','Germany','Argentina','DE','AR','2026-06-22','2026-06-22T21:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('E','Australia','Chile','AU','CL','2026-06-23','2026-06-23T15:00:00Z','Arrowhead Stadium','Kansas City','scheduled',0.333,0.334,0.333,50),
  ('F','France','Nigeria','FR','NG','2026-06-23','2026-06-23T18:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('F','Algeria','Paraguay','DZ','PY','2026-06-23','2026-06-23T21:00:00Z','Estadio BBVA','Monterrey','scheduled',0.333,0.334,0.333,50),
  ('G','England','Cameroon','GB-ENG','CM','2026-06-24','2026-06-24T15:00:00Z','Lumen Field','Seattle','scheduled',0.333,0.334,0.333,50),
  ('G','Serbia','Senegal','RS','SN','2026-06-24','2026-06-24T18:00:00Z','SoFi Stadium','Inglewood','scheduled',0.333,0.334,0.333,50),
  ('H','Netherlands','Saudi Arabia','NL','SA','2026-06-24','2026-06-24T21:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('H','Finland','Peru','FI','PE','2026-06-25','2026-06-25T15:00:00Z','BMO Field','Toronto','scheduled',0.333,0.334,0.333,50),
  ('I','Brazil','Colombia','BR','CO','2026-06-25','2026-06-25T18:00:00Z','Hard Rock Stadium','Miami Gardens','scheduled',0.333,0.334,0.333,50),
  ('I','Uruguay','South Korea','UY','KR','2026-06-25','2026-06-25T21:00:00Z','Estadio Akron','Guadalajara','scheduled',0.333,0.334,0.333,50),
  ('J','Belgium','Qatar','BE','QA','2026-06-26','2026-06-26T15:00:00Z','Rose Bowl','Pasadena','scheduled',0.333,0.334,0.333,50),
  ('J','Egypt','Slovakia','EG','SK','2026-06-26','2026-06-26T18:00:00Z','Camping World Stadium','Orlando','scheduled',0.333,0.334,0.333,50),
  ('K','Croatia','Poland','HR','PL','2026-06-26','2026-06-26T21:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('K','Iran','Tunisia','IR','TN','2026-06-27','2026-06-27T15:00:00Z','Gillette Stadium','Foxborough','scheduled',0.333,0.334,0.333,50),
  ('L','Italy','Slovenia','IT','SI','2026-06-27','2026-06-27T18:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('L','Turkey','Switzerland','TR','CH','2026-06-27','2026-06-27T21:00:00Z','BC Place','Vancouver','scheduled',0.333,0.334,0.333,50),
  ('A','USA','Ukraine','US','UA','2026-06-29','2026-06-29T16:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('A','Panama','Albania','PA','AL','2026-06-29','2026-06-29T16:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('B','Mexico','Ecuador','MX','EC','2026-06-29','2026-06-29T18:00:00Z','Estadio Azteca','Mexico City','scheduled',0.333,0.334,0.333,50),
  ('B','Jamaica','Venezuela','JM','VE','2026-06-29','2026-06-29T18:00:00Z','Hard Rock Stadium','Miami Gardens','scheduled',0.333,0.334,0.333,50),
  ('C','Canada','Portugal','CA','PT','2026-06-29','2026-06-29T20:00:00Z','BC Place','Vancouver','scheduled',0.333,0.334,0.333,50),
  ('C','Honduras','Morocco','HN','MA','2026-06-29','2026-06-29T20:00:00Z','Rose Bowl','Pasadena','scheduled',0.333,0.334,0.333,50),
  ('D','Spain','New Zealand','ES','NZ','2026-06-30','2026-06-30T16:00:00Z','SoFi Stadium','Inglewood','scheduled',0.333,0.334,0.333,50),
  ('D','Japan','Congo DR','JP','CD','2026-06-30','2026-06-30T16:00:00Z','Camping World Stadium','Orlando','scheduled',0.333,0.334,0.333,50),
  ('E','Germany','Chile','DE','CL','2026-06-30','2026-06-30T18:00:00Z','Gillette Stadium','Foxborough','scheduled',0.333,0.334,0.333,50),
  ('E','Australia','Argentina','AU','AR','2026-06-30','2026-06-30T18:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('F','France','Paraguay','FR','PY','2026-06-30','2026-06-30T20:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('F','Algeria','Nigeria','DZ','NG','2026-06-30','2026-06-30T20:00:00Z','Estadio BBVA','Monterrey','scheduled',0.333,0.334,0.333,50),
  ('G','England','Senegal','GB-ENG','SN','2026-07-01','2026-07-01T16:00:00Z','Lincoln Financial Field','Philadelphia','scheduled',0.333,0.334,0.333,50),
  ('G','Serbia','Cameroon','RS','CM','2026-07-01','2026-07-01T16:00:00Z','Arrowhead Stadium','Kansas City','scheduled',0.333,0.334,0.333,50),
  ('H','Netherlands','Peru','NL','PE','2026-07-01','2026-07-01T18:00:00Z','Levi''s Stadium','Santa Clara','scheduled',0.333,0.334,0.333,50),
  ('H','Finland','Saudi Arabia','FI','SA','2026-07-01','2026-07-01T18:00:00Z','Lumen Field','Seattle','scheduled',0.333,0.334,0.333,50),
  ('I','Brazil','South Korea','BR','KR','2026-07-01','2026-07-01T20:00:00Z','Rose Bowl','Pasadena','scheduled',0.333,0.334,0.333,50),
  ('I','Uruguay','Colombia','UY','CO','2026-07-01','2026-07-01T20:00:00Z','Estadio Akron','Guadalajara','scheduled',0.333,0.334,0.333,50),
  ('J','Belgium','Slovakia','BE','SK','2026-07-02','2026-07-02T16:00:00Z','BMO Field','Toronto','scheduled',0.333,0.334,0.333,50),
  ('J','Egypt','Qatar','EG','QA','2026-07-02','2026-07-02T16:00:00Z','AT&T Stadium','Arlington','scheduled',0.333,0.334,0.333,50),
  ('K','Croatia','Tunisia','HR','TN','2026-07-02','2026-07-02T18:00:00Z','Hard Rock Stadium','Miami Gardens','scheduled',0.333,0.334,0.333,50),
  ('K','Iran','Poland','IR','PL','2026-07-02','2026-07-02T18:00:00Z','SoFi Stadium','Inglewood','scheduled',0.333,0.334,0.333,50),
  ('L','Italy','Switzerland','IT','CH','2026-07-02','2026-07-02T20:00:00Z','MetLife Stadium','East Rutherford','scheduled',0.333,0.334,0.333,50),
  ('L','Turkey','Slovenia','TR','SI','2026-07-02','2026-07-02T20:00:00Z','Camping World Stadium','Orlando','scheduled',0.333,0.334,0.333,50)
ON CONFLICT (home_team, away_team) DO NOTHING;

SELECT COUNT(*) AS total_matches FROM public.matches;
