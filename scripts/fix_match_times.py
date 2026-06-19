"""
fix_match_times.py — Audit ALL match dates/times in the DB.

Sources of truth (in priority order):
  1. worldcup26.ir  GET https://worldcup26.ir/get/games  (live external)
  2. CANONICAL list below (matches populate_matches.py, times confirmed UTC)

Steps:
  - Fetch DB matches via Supabase REST
  - Fetch worldcup26.ir games (optional; graceful if unavailable)
  - Auto-detect worldcup26.ir timezone by comparing a known reference match
  - Print a full comparison table: DB | Canonical | WC26.ir | Status
  - Print SQL UPDATE statements for every mismatch

NO changes are written to the DB.  Review the SQL, then run manually in
Supabase Dashboard → SQL Editor.

Run:
    cd <project-root>
    python scripts/fix_match_times.py
"""

import os, sys, json, pathlib, requests
from datetime import datetime, timezone, timedelta

# Windows consoles (cp1252) can't print Persian characters from the API response.
# Reconfigure stdout to UTF-8 so the script doesn't crash on non-ASCII content.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT     = pathlib.Path(__file__).parent.parent
ENV_PATH = ROOT / ".env.local"

# ── Load .env.local ───────────────────────────────────────────────────────────
env: dict[str, str] = {}
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")

SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
ANON_KEY     = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SERVICE_KEY  = env.get("SUPABASE_SERVICE_KEY", "") or ANON_KEY

if not SUPABASE_URL:
    sys.exit("[ERR] NEXT_PUBLIC_SUPABASE_URL not found in .env.local")
if not ANON_KEY:
    sys.exit("[ERR] NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local")

# ── Canonical schedule — all 72 group stage matches, times in UTC ─────────────
# Source: official FIFA WC2026 draw / populate_matches.py
# Format: (group, home_team, away_team, YYYY-MM-DD, HH:MM UTC)
CANONICAL = [
    # ── Matchday 1 ────────────────────────────────────────────────────────────
    ("A", "Mexico",          "South Korea",         "2026-06-11", "18:00"),
    ("A", "South Africa",    "Czech Republic",      "2026-06-12", "15:00"),
    ("B", "Canada",          "Switzerland",         "2026-06-12", "18:00"),
    ("B", "Qatar",           "Bosnia-Herzegovina",  "2026-06-12", "21:00"),
    ("C", "Brazil",          "Morocco",             "2026-06-13", "15:00"),
    ("C", "Scotland",        "Haiti",               "2026-06-13", "18:00"),
    ("D", "USA",             "Paraguay",            "2026-06-13", "21:00"),
    ("D", "Australia",       "Turkey",              "2026-06-14", "15:00"),
    ("E", "Germany",         "Curaçao",             "2026-06-14", "18:00"),
    ("E", "Côte d'Ivoire",   "Ecuador",             "2026-06-14", "21:00"),
    ("F", "Netherlands",     "Japan",               "2026-06-15", "15:00"),
    ("F", "Tunisia",         "Sweden",              "2026-06-15", "18:00"),
    ("G", "Belgium",         "Egypt",               "2026-06-15", "21:00"),
    ("G", "Iran",            "New Zealand",         "2026-06-16", "15:00"),
    ("H", "Spain",           "Cabo Verde",          "2026-06-16", "18:00"),
    ("H", "Saudi Arabia",    "Uruguay",             "2026-06-16", "21:00"),
    ("I", "France",          "Senegal",             "2026-06-17", "15:00"),
    ("I", "Norway",          "Iraq",                "2026-06-17", "18:00"),
    ("J", "Argentina",       "Algeria",             "2026-06-17", "21:00"),
    ("J", "Austria",         "Jordan",              "2026-06-18", "15:00"),
    ("K", "Portugal",        "Colombia",            "2026-06-18", "18:00"),
    ("K", "Uzbekistan",      "Congo DR",            "2026-06-18", "21:00"),
    ("L", "England",         "Croatia",             "2026-06-19", "15:00"),
    ("L", "Ghana",           "Panama",              "2026-06-19", "18:00"),
    # ── Matchday 2 ────────────────────────────────────────────────────────────
    ("A", "Mexico",          "South Africa",        "2026-06-20", "15:00"),
    ("A", "South Korea",     "Czech Republic",      "2026-06-20", "18:00"),
    ("B", "Canada",          "Qatar",               "2026-06-20", "21:00"),
    ("B", "Switzerland",     "Bosnia-Herzegovina",  "2026-06-21", "15:00"),
    ("C", "Brazil",          "Scotland",            "2026-06-21", "18:00"),
    ("C", "Morocco",         "Haiti",               "2026-06-21", "21:00"),
    ("D", "USA",             "Australia",           "2026-06-22", "15:00"),
    ("D", "Paraguay",        "Turkey",              "2026-06-22", "18:00"),
    ("E", "Germany",         "Côte d'Ivoire",       "2026-06-22", "21:00"),
    ("E", "Curaçao",         "Ecuador",             "2026-06-23", "15:00"),
    ("F", "Netherlands",     "Tunisia",             "2026-06-23", "18:00"),
    ("F", "Japan",           "Sweden",              "2026-06-23", "21:00"),
    ("G", "Belgium",         "Iran",                "2026-06-24", "15:00"),
    ("G", "Egypt",           "New Zealand",         "2026-06-24", "18:00"),
    ("H", "Spain",           "Saudi Arabia",        "2026-06-24", "21:00"),
    ("H", "Cabo Verde",      "Uruguay",             "2026-06-25", "15:00"),
    ("I", "France",          "Norway",              "2026-06-25", "18:00"),
    ("I", "Senegal",         "Iraq",                "2026-06-25", "21:00"),
    ("J", "Argentina",       "Austria",             "2026-06-26", "15:00"),
    ("J", "Algeria",         "Jordan",              "2026-06-26", "18:00"),
    ("K", "Portugal",        "Uzbekistan",          "2026-06-26", "21:00"),
    ("K", "Colombia",        "Congo DR",            "2026-06-27", "15:00"),
    ("L", "England",         "Ghana",               "2026-06-27", "18:00"),
    ("L", "Croatia",         "Panama",              "2026-06-27", "21:00"),
    # ── Matchday 3 (simultaneous within each group) ───────────────────────────
    ("A", "Mexico",          "Czech Republic",      "2026-06-29", "16:00"),
    ("A", "South Korea",     "South Africa",        "2026-06-29", "16:00"),
    ("B", "Canada",          "Bosnia-Herzegovina",  "2026-06-29", "18:00"),
    ("B", "Switzerland",     "Qatar",               "2026-06-29", "18:00"),
    ("C", "Brazil",          "Haiti",               "2026-06-29", "20:00"),
    ("C", "Morocco",         "Scotland",            "2026-06-29", "20:00"),
    ("D", "USA",             "Turkey",              "2026-06-30", "16:00"),
    ("D", "Paraguay",        "Australia",           "2026-06-30", "16:00"),
    ("E", "Germany",         "Ecuador",             "2026-06-30", "18:00"),
    ("E", "Curaçao",         "Côte d'Ivoire",       "2026-06-30", "18:00"),
    ("F", "Netherlands",     "Sweden",              "2026-06-30", "20:00"),
    ("F", "Japan",           "Tunisia",             "2026-06-30", "20:00"),
    ("G", "Belgium",         "New Zealand",         "2026-07-01", "16:00"),
    ("G", "Egypt",           "Iran",                "2026-07-01", "16:00"),
    ("H", "Spain",           "Uruguay",             "2026-07-01", "18:00"),
    ("H", "Cabo Verde",      "Saudi Arabia",        "2026-07-01", "18:00"),
    ("I", "France",          "Iraq",                "2026-07-01", "20:00"),
    ("I", "Senegal",         "Norway",              "2026-07-01", "20:00"),
    ("J", "Argentina",       "Jordan",              "2026-07-02", "16:00"),
    ("J", "Algeria",         "Austria",             "2026-07-02", "16:00"),
    ("K", "Portugal",        "Congo DR",            "2026-07-02", "18:00"),
    ("K", "Colombia",        "Uzbekistan",          "2026-07-02", "18:00"),
    ("L", "England",         "Panama",              "2026-07-02", "20:00"),
    ("L", "Croatia",         "Ghana",               "2026-07-02", "20:00"),
]

assert len(CANONICAL) == 72, f"Canonical list has {len(CANONICAL)} entries, expected 72"


def make_utc(date_str: str, time_str: str) -> datetime:
    return datetime.strptime(f"{date_str}T{time_str}:00",
                             "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)


# Build lookup: frozenset({home_lower, away_lower}) → (utc_dt, group)
# Using frozenset so home/away order doesn't matter for lookup
canonical_map: dict[frozenset, tuple[datetime, str]] = {}
for grp, home, away, date_s, time_s in CANONICAL:
    key = frozenset({home.lower(), away.lower()})
    canonical_map[key] = (make_utc(date_s, time_s), grp)


# ── Supabase fetch ────────────────────────────────────────────────────────────

def fetch_db_matches() -> list[dict]:
    headers = {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept":        "application/json",
    }
    params = {
        "select": "match_id,home_team,away_team,match_date,group_name",
        "limit":  "200",
        "order":  "match_date.asc",
    }
    r = requests.get(f"{SUPABASE_URL}/rest/v1/matches",
                     headers=headers, params=params, timeout=20)
    if r.status_code != 200:
        sys.exit(f"[ERR] Supabase query failed HTTP {r.status_code}: {r.text[:300]}")
    return r.json()


# ── worldcup26.ir fetch ───────────────────────────────────────────────────────

def fetch_wc26() -> list[dict] | None:
    try:
        r = requests.get("https://worldcup26.ir/get/games",
                         timeout=15, headers={"Accept": "application/json"})
        if r.status_code == 200:
            data = r.json()
            # data may be a list or {"games": [...]} or similar
            if isinstance(data, list):
                return data
            for candidate in ("games", "matches", "data", "results"):
                if isinstance(data.get(candidate), list):
                    return data[candidate]
            print(f"[WARN] worldcup26.ir returned unexpected shape: {str(data)[:200]}")
            return None
        print(f"[WARN] worldcup26.ir HTTP {r.status_code}")
    except Exception as exc:
        print(f"[WARN] worldcup26.ir unavailable: {exc}")
    return None


def extract_wc26_teams(game: dict) -> tuple[str, str]:
    """Try common field names for team names (worldcup26.ir uses *_name_en)."""
    home = (game.get("home_team_name_en") or game.get("home_team") or
            game.get("home") or game.get("team_home") or game.get("homeTeam") or "")
    away = (game.get("away_team_name_en") or game.get("away_team") or
            game.get("away") or game.get("team_away") or game.get("awayTeam") or "")
    return str(home).strip(), str(away).strip()


def extract_wc26_date(game: dict) -> str:
    """Try common field names for the date/time string."""
    for field in ("local_date", "date", "datetime", "kickoff", "match_date",
                  "game_date", "time", "localDate", "gameDate"):
        val = game.get(field)
        if val:
            return str(val).strip()
    return ""


def parse_wc26_dt(raw: str, offset_hours: float) -> datetime | None:
    """
    Parse worldcup26.ir local datetime string and convert to UTC.
    Tries common formats: MM/DD/YYYY HH:MM, YYYY-MM-DD HH:MM, ISO, etc.
    offset_hours: hours to subtract to get UTC (e.g. -4 for EDT means +4 subtracted)
    """
    raw = raw.strip()
    fmts = [
        "%m/%d/%Y %H:%M",   # 06/13/2026 19:00
        "%m/%d/%Y %I:%M %p",# 06/13/2026 07:00 PM
        "%Y-%m-%d %H:%M",   # 2026-06-13 19:00
        "%Y-%m-%dT%H:%M",   # 2026-06-13T19:00
        "%d/%m/%Y %H:%M",   # 13/06/2026 19:00
    ]
    for fmt in fmts:
        try:
            naive = datetime.strptime(raw, fmt)
            # offset_hours is the site's local offset from UTC
            # e.g. EDT = UTC-4, so offset = -4 → subtract -4 hours = add 4 hours to get UTC
            utc = (naive - timedelta(hours=offset_hours)).replace(tzinfo=timezone.utc)
            return utc
        except ValueError:
            pass
    # Try ISO parse as a last resort
    try:
        dt = datetime.fromisoformat(raw)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass
    return None


def detect_tz_offset(games: list[dict]) -> float | None:
    """
    Auto-detect worldcup26.ir local timezone by comparing known reference matches
    against our canonical UTC times.
    Try Mexico vs South Korea (Jun 11 18:00 UTC) and others as fallbacks.
    """
    reference_pairs = [
        ("mexico", "south korea"),          # Jun 11 18:00 UTC
        ("brazil", "morocco"),              # Jun 13 15:00 UTC
        ("usa", "paraguay"),                # Jun 13 21:00 UTC
        ("england", "croatia"),             # Jun 19 15:00 UTC
        ("france", "senegal"),              # Jun 17 15:00 UTC
    ]

    # Candidate offsets to test: most likely site timezones
    # PDT=-7, MDT=-6, CDT=-5, EDT=-4, UTC=0, Baghdad=+3, Iran=+4.5
    candidate_offsets = [-7.0, -6.0, -5.0, -4.0, 0.0, 3.0, 3.5, 4.5]

    for ref_home, ref_away in reference_pairs:
        canon_key = frozenset({ref_home, ref_away})
        canon_info = canonical_map.get(canon_key)
        if not canon_info:
            continue
        canon_utc = canon_info[0]

        for game in games:
            h, a = extract_wc26_teams(game)
            if frozenset({h.lower(), a.lower()}) != frozenset({ref_home, ref_away}):
                continue
            raw_date = extract_wc26_date(game)
            if not raw_date:
                continue
            for offset in candidate_offsets:
                candidate_utc = parse_wc26_dt(raw_date, offset)
                if candidate_utc is None:
                    continue
                diff_sec = abs((candidate_utc - canon_utc).total_seconds())
                if diff_sec <= 120:  # within 2 minutes → match
                    return offset
    return None


# ── DB datetime parser ────────────────────────────────────────────────────────

def parse_db_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    s = s.strip()
    # Supabase returns ISO 8601 with timezone e.g. "2026-06-14T15:00:00+00:00"
    # or legacy "2026-06-14 15:00:00+00"
    s = s.replace(' ', 'T', 1)           # first space → T
    if s.endswith('+00'):
        s += ':00'                        # +00 → +00:00
    try:
        return datetime.fromisoformat(s).astimezone(timezone.utc)
    except Exception:
        return None


# ── Main ─────────────────────────────────────────────────────────────────────

def banner(text: str) -> None:
    print()
    print("=" * 80)
    print(f"  {text}")
    print("=" * 80)

banner("WC2026 MATCH TIME AUDIT")

# ── 1. Fetch DB ──────────────────────────────────────────────────────────────
print()
print("[1/3] Fetching matches from Supabase ...")
db_matches = fetch_db_matches()
print(f"      {len(db_matches)} rows returned")

# ── 2. Fetch worldcup26.ir ────────────────────────────────────────────────────
print()
print("[2/3] Fetching from https://worldcup26.ir/get/games ...")
wc26_games = fetch_wc26()
tz_offset: float | None = None
wc26_map: dict[frozenset, datetime] = {}

if wc26_games:
    print(f"      {len(wc26_games)} games returned")
    # Show raw sample so we can verify field names
    sample = wc26_games[0] if wc26_games else {}
    print(f"      Sample game keys : {list(sample.keys())}")
    # Print only ASCII-safe fields to avoid encoding errors on Windows
    safe = {k: v for k, v in sample.items() if isinstance(v, (int, float, bool, type(None)))
            or (isinstance(v, str) and v.isascii())}
    print(f"      Sample (ASCII)   : {safe}")

    tz_offset = detect_tz_offset(wc26_games)
    if tz_offset is not None:
        sign = '+' if tz_offset >= 0 else ''
        print(f"      Auto-detected TZ : UTC{sign}{tz_offset:g}  (site local → subtract to get UTC)")
    else:
        print("      Could not auto-detect timezone from reference matches")
        print("      → Will use canonical schedule only for comparisons")

    if tz_offset is not None:
        parsed_ok = 0
        for game in wc26_games:
            h, a = extract_wc26_teams(game)
            raw = extract_wc26_date(game)
            if not h or not a or not raw:
                continue
            utc_dt = parse_wc26_dt(raw, tz_offset)
            if utc_dt:
                wc26_map[frozenset({h.lower(), a.lower()})] = utc_dt
                parsed_ok += 1
        print(f"      Parsed {parsed_ok} / {len(wc26_games)} game times successfully")
else:
    print("      worldcup26.ir unavailable — using canonical schedule only")

# ── 3. Build comparison table ────────────────────────────────────────────────
banner("COMPARISON TABLE")
print()

COL_MATCH  = 38
COL_DB     = 20
COL_CANON  = 20
COL_WC26   = 20

def col(s: str, width: int) -> str:
    return s[:width].ljust(width)

hdr = (col("Match", COL_MATCH) + col("DB (UTC)", COL_DB) +
       col("Canonical (UTC)", COL_CANON) + col("WC26.ir (UTC)", COL_WC26) + "Status")
print(hdr)
print("-" * len(hdr))

TOLERANCE_SECS = 90   # matches within 90 s are considered equal

sql_updates: list[str] = []
unknown_matches: list[str] = []

for row in db_matches:
    home       = row.get("home_team", "?")
    away       = row.get("away_team", "?")
    match_id   = row.get("match_id", "")
    db_dt      = parse_db_dt(row.get("match_date"))

    key = frozenset({home.lower(), away.lower()})

    canon_info = canonical_map.get(key)
    canon_dt   = canon_info[0] if canon_info else None

    wc26_dt    = wc26_map.get(key)

    # Correct time: prefer worldcup26.ir (external live data), then canonical
    correct_dt = wc26_dt or canon_dt

    db_s    = db_dt.strftime("%m-%d %H:%M Z")    if db_dt    else "MISSING  "
    canon_s = canon_dt.strftime("%m-%d %H:%M Z") if canon_dt else "NOT IN LIST "
    wc26_s  = wc26_dt.strftime("%m-%d %H:%M Z")  if wc26_dt  else "—           "

    if correct_dt is None:
        status = "?"
        unknown_matches.append(f"{home} vs {away}")
    elif db_dt is None:
        status = "✗ MISSING"
    else:
        diff = abs((correct_dt - db_dt).total_seconds())
        status = "✓" if diff <= TOLERANCE_SECS else f"✗ OFF {int(diff/60)}min"

    label = f"{home} vs {away}"
    print(col(label, COL_MATCH) + col(db_s, COL_DB) +
          col(canon_s, COL_CANON) + col(wc26_s, COL_WC26) + status)

    # Generate SQL for mismatches
    if correct_dt and (db_dt is None or abs((correct_dt - db_dt).total_seconds()) > TOLERANCE_SECS):
        utc_iso = correct_dt.strftime("%Y-%m-%dT%H:%M:%S+00:00")
        source  = "worldcup26.ir" if wc26_dt else "canonical"
        if match_id:
            sql_updates.append(
                f"UPDATE public.matches"
                f" SET match_date = '{utc_iso}'"
                f" WHERE match_id = '{match_id}';"
                f"  -- {home} vs {away}  [{source}]"
            )
        else:
            sql_updates.append(
                f"UPDATE public.matches"
                f" SET match_date = '{utc_iso}'"
                f" WHERE home_team = '{home}' AND away_team = '{away}';"
                f"  -- [{source}]"
            )

# Matches in canonical but not found in DB
db_keys = {frozenset({r["home_team"].lower(), r["away_team"].lower()}) for r in db_matches}
missing_in_db = [f"{h} vs {a}" for _, h, a, *_ in CANONICAL
                 if frozenset({h.lower(), a.lower()}) not in db_keys]

# ── 4. Print SQL ──────────────────────────────────────────────────────────────
banner(f"RESULT: {len(sql_updates)} mismatches found")

if sql_updates:
    print()
    print("-- ================================================================")
    print("-- Copy everything below and paste into Supabase SQL Editor.")
    print("-- Review EACH line before running.")
    print("-- ================================================================")
    print()
    for sql in sql_updates:
        print(sql)
    print()
else:
    print()
    print("  All match times in the DB match the reference data. Nothing to fix.")
    print()

if missing_in_db:
    print()
    print(f"[!] {len(missing_in_db)} canonical matches NOT found in the DB:")
    for m in missing_in_db:
        print(f"    {m}")
    print("    → These rows are missing entirely; re-run populate_matches.py")
    print()

if unknown_matches:
    print()
    print(f"[?] {len(unknown_matches)} DB matches not in canonical list:")
    for m in unknown_matches:
        print(f"    {m}")
    print()

# ── 5. Summary ────────────────────────────────────────────────────────────────
banner("SUMMARY")
print()
print(f"  DB rows checked    : {len(db_matches)}")
print(f"  Canonical entries  : {len(CANONICAL)}")
print(f"  worldcup26.ir games: {len(wc26_games) if wc26_games else 'unavailable'}")
if tz_offset is not None:
    sign = '+' if tz_offset >= 0 else ''
    print(f"  Detected TZ offset : UTC{sign}{tz_offset:g}")
print(f"  Mismatches (SQL)   : {len(sql_updates)}")
print(f"  Missing from DB    : {len(missing_in_db)}")
print(f"  Unknown (not canon): {len(unknown_matches)}")
print()
