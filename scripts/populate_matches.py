"""
populate_matches.py — Insert all 72 WC2026 group stage fixtures into Supabase.

Two modes depending on credentials in ../.env.local:

  MODE A (service key present — SUPABASE_SERVICE_KEY=...):
    Upserts all 72 matches via Supabase REST API.
    Also writes scripts/matches_seed.sql for reference.

  MODE B (service key absent — anon key only):
    Writes scripts/matches_seed.sql and prints manual instructions.

Run:
  cd <project-root>
  python scripts/populate_matches.py
"""

import os, sys, json, pathlib, uuid
import requests

ROOT     = pathlib.Path(__file__).parent.parent
ENV_PATH = ROOT / ".env.local"
SQL_PATH = ROOT / "scripts" / "matches_seed.sql"

env = {}
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY  = env.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL:
    sys.exit("[ERR] NEXT_PUBLIC_SUPABASE_URL not found in .env.local")

print(f"[URL] {SUPABASE_URL}")

# ISO country codes (safe on Windows console, no emoji encoding issues)
FLAGS = {
    "USA": "US", "Panama": "PA", "Albania": "AL", "Ukraine": "UA",
    "Mexico": "MX", "Jamaica": "JM", "Venezuela": "VE", "Ecuador": "EC",
    "Canada": "CA", "Honduras": "HN", "Morocco": "MA", "Portugal": "PT",
    "Spain": "ES", "Japan": "JP", "Congo DR": "CD", "New Zealand": "NZ",
    "Germany": "DE", "Australia": "AU", "Argentina": "AR", "Chile": "CL",
    "France": "FR", "Algeria": "DZ", "Nigeria": "NG", "Paraguay": "PY",
    "England": "GB-ENG", "Serbia": "RS", "Cameroon": "CM", "Senegal": "SN",
    "Netherlands": "NL", "Finland": "FI", "Saudi Arabia": "SA", "Peru": "PE",
    "Brazil": "BR", "Uruguay": "UY", "Colombia": "CO", "South Korea": "KR",
    "Belgium": "BE", "Egypt": "EG", "Qatar": "QA", "Slovakia": "SK",
    "Croatia": "HR", "Iran": "IR", "Poland": "PL", "Tunisia": "TN",
    "Italy": "IT", "Turkey": "TR", "Slovenia": "SI", "Switzerland": "CH",
}

# (group, home, away, date YYYY-MM-DD, time HH:MM UTC, venue, city)
MATCHES = [
    # ── Matchday 1 (June 11-19) ──────────────────────────────────────────────
    ("A", "USA",          "Panama",       "2026-06-11", "18:00", "MetLife Stadium",          "East Rutherford"),
    ("A", "Albania",      "Ukraine",      "2026-06-12", "15:00", "AT&T Stadium",             "Arlington"),
    ("B", "Mexico",       "Jamaica",      "2026-06-12", "18:00", "Estadio Azteca",           "Mexico City"),
    ("B", "Venezuela",    "Ecuador",      "2026-06-12", "21:00", "Hard Rock Stadium",        "Miami Gardens"),
    ("C", "Canada",       "Honduras",     "2026-06-13", "15:00", "BMO Field",                "Toronto"),
    ("C", "Morocco",      "Portugal",     "2026-06-13", "18:00", "Rose Bowl",                "Pasadena"),
    ("D", "Spain",        "Japan",        "2026-06-13", "21:00", "SoFi Stadium",             "Inglewood"),
    ("D", "Congo DR",     "New Zealand",  "2026-06-14", "15:00", "Camping World Stadium",    "Orlando"),
    ("E", "Germany",      "Australia",    "2026-06-14", "18:00", "Gillette Stadium",         "Foxborough"),
    ("E", "Argentina",    "Chile",        "2026-06-14", "21:00", "AT&T Stadium",             "Arlington"),
    ("F", "France",       "Algeria",      "2026-06-15", "15:00", "MetLife Stadium",          "East Rutherford"),
    ("F", "Nigeria",      "Paraguay",     "2026-06-15", "18:00", "Estadio BBVA",             "Monterrey"),
    ("G", "England",      "Serbia",       "2026-06-15", "21:00", "Lincoln Financial Field",  "Philadelphia"),
    ("G", "Cameroon",     "Senegal",      "2026-06-16", "15:00", "Estadio Akron",            "Guadalajara"),
    ("H", "Netherlands",  "Finland",      "2026-06-16", "18:00", "Arrowhead Stadium",        "Kansas City"),
    ("H", "Saudi Arabia", "Peru",         "2026-06-16", "21:00", "Levi's Stadium",           "Santa Clara"),
    ("I", "Brazil",       "Uruguay",      "2026-06-17", "15:00", "Hard Rock Stadium",        "Miami Gardens"),
    ("I", "Colombia",     "South Korea",  "2026-06-17", "18:00", "Lumen Field",              "Seattle"),
    ("J", "Belgium",      "Egypt",        "2026-06-17", "21:00", "Rose Bowl",                "Pasadena"),
    ("J", "Qatar",        "Slovakia",     "2026-06-18", "15:00", "AT&T Stadium",             "Arlington"),
    ("K", "Croatia",      "Iran",         "2026-06-18", "18:00", "Camping World Stadium",    "Orlando"),
    ("K", "Poland",       "Tunisia",      "2026-06-18", "21:00", "SoFi Stadium",             "Inglewood"),
    ("L", "Italy",        "Turkey",       "2026-06-19", "15:00", "Estadio Azteca",           "Mexico City"),
    ("L", "Slovenia",     "Switzerland",  "2026-06-19", "18:00", "BC Place",                 "Vancouver"),
    # ── Matchday 2 (June 20-27) ──────────────────────────────────────────────
    ("A", "USA",          "Albania",      "2026-06-20", "15:00", "Levi's Stadium",           "Santa Clara"),
    ("A", "Panama",       "Ukraine",      "2026-06-20", "18:00", "Gillette Stadium",         "Foxborough"),
    ("B", "Mexico",       "Venezuela",    "2026-06-20", "21:00", "Estadio Azteca",           "Mexico City"),
    ("B", "Jamaica",      "Ecuador",      "2026-06-21", "15:00", "Hard Rock Stadium",        "Miami Gardens"),
    ("C", "Canada",       "Morocco",      "2026-06-21", "18:00", "BC Place",                 "Vancouver"),
    ("C", "Honduras",     "Portugal",     "2026-06-21", "21:00", "Rose Bowl",                "Pasadena"),
    ("D", "Spain",        "Congo DR",     "2026-06-22", "15:00", "AT&T Stadium",             "Arlington"),
    ("D", "Japan",        "New Zealand",  "2026-06-22", "18:00", "Levi's Stadium",           "Santa Clara"),
    ("E", "Germany",      "Argentina",    "2026-06-22", "21:00", "MetLife Stadium",          "East Rutherford"),
    ("E", "Australia",    "Chile",        "2026-06-23", "15:00", "Arrowhead Stadium",        "Kansas City"),
    ("F", "France",       "Nigeria",      "2026-06-23", "18:00", "MetLife Stadium",          "East Rutherford"),
    ("F", "Algeria",      "Paraguay",     "2026-06-23", "21:00", "Estadio BBVA",             "Monterrey"),
    ("G", "England",      "Cameroon",     "2026-06-24", "15:00", "Lumen Field",              "Seattle"),
    ("G", "Serbia",       "Senegal",      "2026-06-24", "18:00", "SoFi Stadium",             "Inglewood"),
    ("H", "Netherlands",  "Saudi Arabia", "2026-06-24", "21:00", "AT&T Stadium",             "Arlington"),
    ("H", "Finland",      "Peru",         "2026-06-25", "15:00", "BMO Field",                "Toronto"),
    ("I", "Brazil",       "Colombia",     "2026-06-25", "18:00", "Hard Rock Stadium",        "Miami Gardens"),
    ("I", "Uruguay",      "South Korea",  "2026-06-25", "21:00", "Estadio Akron",            "Guadalajara"),
    ("J", "Belgium",      "Qatar",        "2026-06-26", "15:00", "Rose Bowl",                "Pasadena"),
    ("J", "Egypt",        "Slovakia",     "2026-06-26", "18:00", "Camping World Stadium",    "Orlando"),
    ("K", "Croatia",      "Poland",       "2026-06-26", "21:00", "MetLife Stadium",          "East Rutherford"),
    ("K", "Iran",         "Tunisia",      "2026-06-27", "15:00", "Gillette Stadium",         "Foxborough"),
    ("L", "Italy",        "Slovenia",     "2026-06-27", "18:00", "AT&T Stadium",             "Arlington"),
    ("L", "Turkey",       "Switzerland",  "2026-06-27", "21:00", "BC Place",                 "Vancouver"),
    # ── Matchday 3 (June 29 - July 2, simultaneous within each group) ─────────
    ("A", "USA",          "Ukraine",      "2026-06-29", "16:00", "MetLife Stadium",          "East Rutherford"),
    ("A", "Panama",       "Albania",      "2026-06-29", "16:00", "AT&T Stadium",             "Arlington"),
    ("B", "Mexico",       "Ecuador",      "2026-06-29", "18:00", "Estadio Azteca",           "Mexico City"),
    ("B", "Jamaica",      "Venezuela",    "2026-06-29", "18:00", "Hard Rock Stadium",        "Miami Gardens"),
    ("C", "Canada",       "Portugal",     "2026-06-29", "20:00", "BC Place",                 "Vancouver"),
    ("C", "Honduras",     "Morocco",      "2026-06-29", "20:00", "Rose Bowl",                "Pasadena"),
    ("D", "Spain",        "New Zealand",  "2026-06-30", "16:00", "SoFi Stadium",             "Inglewood"),
    ("D", "Japan",        "Congo DR",     "2026-06-30", "16:00", "Camping World Stadium",    "Orlando"),
    ("E", "Germany",      "Chile",        "2026-06-30", "18:00", "Gillette Stadium",         "Foxborough"),
    ("E", "Australia",    "Argentina",    "2026-06-30", "18:00", "MetLife Stadium",          "East Rutherford"),
    ("F", "France",       "Paraguay",     "2026-06-30", "20:00", "AT&T Stadium",             "Arlington"),
    ("F", "Algeria",      "Nigeria",      "2026-06-30", "20:00", "Estadio BBVA",             "Monterrey"),
    ("G", "England",      "Senegal",      "2026-07-01", "16:00", "Lincoln Financial Field",  "Philadelphia"),
    ("G", "Serbia",       "Cameroon",     "2026-07-01", "16:00", "Arrowhead Stadium",        "Kansas City"),
    ("H", "Netherlands",  "Peru",         "2026-07-01", "18:00", "Levi's Stadium",           "Santa Clara"),
    ("H", "Finland",      "Saudi Arabia", "2026-07-01", "18:00", "Lumen Field",              "Seattle"),
    ("I", "Brazil",       "South Korea",  "2026-07-01", "20:00", "Rose Bowl",                "Pasadena"),
    ("I", "Uruguay",      "Colombia",     "2026-07-01", "20:00", "Estadio Akron",            "Guadalajara"),
    ("J", "Belgium",      "Slovakia",     "2026-07-02", "16:00", "BMO Field",                "Toronto"),
    ("J", "Egypt",        "Qatar",        "2026-07-02", "16:00", "AT&T Stadium",             "Arlington"),
    ("K", "Croatia",      "Tunisia",      "2026-07-02", "18:00", "Hard Rock Stadium",        "Miami Gardens"),
    ("K", "Iran",         "Poland",       "2026-07-02", "18:00", "SoFi Stadium",             "Inglewood"),
    ("L", "Italy",        "Switzerland",  "2026-07-02", "20:00", "MetLife Stadium",          "East Rutherford"),
    ("L", "Turkey",       "Slovenia",     "2026-07-02", "20:00", "Camping World Stadium",    "Orlando"),
]

assert len(MATCHES) == 72, f"Expected 72 matches, got {len(MATCHES)}"

# ── SQL file generation ───────────────────────────────────────────────────────

def generate_sql() -> str:
    parts = [
        "-- ====================================================================",
        "-- matches_seed.sql  --  Insert all 72 WC2026 group stage fixtures",
        "-- into the EXISTING matches table (S02 schema).",
        "-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run",
        "--",
        "-- Columns used: match_id, home_team, away_team, match_date,",
        "--               tournament_stage, group_name, venue, status",
        "-- ====================================================================",
        "",
        "INSERT INTO public.matches",
        "  (match_id, home_team, away_team, match_date, tournament_stage, group_name, venue, status)",
        "VALUES",
    ]

    rows = []
    for i, (grp, home, away, date, time_utc, venue, city) in enumerate(MATCHES):
        mt = f"{date}T{time_utc}:00+00"
        v  = venue.replace("'", "''")
        comma = ";" if i == len(MATCHES) - 1 else ","
        rows.append(
            f"  (gen_random_uuid(),'{home}','{away}','{mt}','Group','{grp}','{v}','scheduled'){comma}"
        )

    parts.extend(rows)
    parts += [
        "",
        "SELECT COUNT(*) AS total_matches FROM public.matches;",
        "",
    ]
    return "\n".join(parts)


sql_content = generate_sql()
SQL_PATH.write_text(sql_content, encoding="utf-8")
print(f"[SQL] Written: {SQL_PATH}")
print()

# ── Mode B: no service key ─────────────────────────────────────────────────────

if not SERVICE_KEY:
    print("[KEY] No SUPABASE_SERVICE_KEY found in .env.local")
    print()
    print("=" * 60)
    print("  MANUAL SETUP")
    print("=" * 60)
    print()
    print("  Option 1: Add service key and re-run")
    print("    1. Supabase dashboard -> Settings -> API")
    print("    2. Copy the 'service_role' key")
    print("    3. Add to .env.local:  SUPABASE_SERVICE_KEY=eyJhbGci...")
    print("    4. Re-run: python scripts/populate_matches.py")
    print()
    print("  Option 2: Run SQL directly in Supabase dashboard")
    print("    1. Open Supabase dashboard -> SQL Editor -> New Query")
    print("    2. Paste the contents of:  scripts/matches_seed.sql")
    print("    3. Click Run")
    print()
    print(f"  SQL file location: {SQL_PATH}")
    print()
    sys.exit(0)

# ── Mode A: service key present ───────────────────────────────────────────────

print("[KEY] Service role key found -- inserting 72 matches via REST")
print()


def upsert(table: str, rows: list, conflict: str) -> tuple:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }
    params = {"on_conflict": conflict} if conflict else {}
    r = requests.post(url, headers=headers,
                      params=params,
                      data=json.dumps(rows), timeout=20)
    if r.status_code in (200, 201, 204):
        return True, "ok"
    return False, f"HTTP {r.status_code}: {r.text[:400]}"


def table_accessible(table: str) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    r = requests.get(url, headers=headers, params={"limit": "1"}, timeout=10)
    return r.status_code == 200


print("Checking matches table...")
has_matches = table_accessible("matches")
print(f"  matches : {'EXISTS' if has_matches else 'NOT FOUND'}")
print()

if not has_matches:
    print("[ERR] matches table not found. Create it first:")
    print("  Supabase dashboard -> SQL Editor -> paste scripts/matches_seed.sql -> Run")
    print()
    sys.exit(1)

# Insert in batches of 10 to stay within request limits
ok_count   = 0
fail_count = 0
batch_size = 10

rows_to_insert = []
for grp, home, away, date, time_utc, venue, city in MATCHES:
    mt = f"{date}T{time_utc}:00Z"
    rows_to_insert.append({
        "match_id":         str(uuid.uuid4()),
        "home_team":        home,
        "away_team":        away,
        "match_date":       mt,
        "tournament_stage": "Group",
        "group_name":       grp,
        "venue":            venue,
        "status":           "scheduled",
    })

for i in range(0, len(rows_to_insert), batch_size):
    batch = rows_to_insert[i:i + batch_size]
    ok, msg = upsert("matches", batch, "")
    batch_num = i // batch_size + 1
    if ok:
        ok_count += len(batch)
        first = batch[0]
        last  = batch[-1]
        print(f"  [OK]  batch {batch_num:02d} ({len(batch)} matches) "
              f"{first['home_team']} vs {first['away_team']} ... "
              f"{last['home_team']} vs {last['away_team']}")
    else:
        fail_count += len(batch)
        print(f"  [FAIL] batch {batch_num:02d}: {msg}")

print()
print("-" * 60)
print(f"  Inserted : {ok_count} / 72")
print(f"  Failed   : {fail_count}")
print()

if ok_count == 72:
    print("[SUCCESS] All 72 group stage matches inserted!")
elif fail_count > 0:
    print("[!] Some inserts failed.")
    print("    Check column names match the matches table schema,")
    print("    or run scripts/matches_seed.sql manually in Supabase.")
print()

# ── Call simulation endpoint ──────────────────────────────────────────────────

if ok_count > 0:
    print("Calling simulation endpoint...")
    SIM_URL = "https://halgurdkrd-innovera-wc2026-api.hf.space/simulate/tournament"
    try:
        r = requests.get(SIM_URL, timeout=60)
        if r.status_code == 200:
            data = r.json()
            champion = data.get("champion", {})
            print(f"  [OK] Simulation returned HTTP 200")
            print()
            # Top 5 winner probabilities
            probs = data.get("winner_probabilities", {})
            if probs:
                sorted_teams = sorted(probs.items(), key=lambda x: x[1], reverse=True)[:5]
                print("  Top 5 predicted winners:")
                for rank, (team, prob) in enumerate(sorted_teams, 1):
                    bar = "#" * int(prob * 40)
                    print(f"    {rank}. {team:<16} {prob*100:5.1f}%  {bar}")
            elif champion:
                print(f"  Predicted champion : {champion.get('team', 'N/A')}")
                print(f"  Win probability    : {champion.get('probability', 0)*100:.1f}%")
            else:
                print("  Simulation data returned — check /simulate/tournament for full results.")
        else:
            print(f"  [WARN] Simulation endpoint returned HTTP {r.status_code}")
            print(f"         {r.text[:300]}")
    except requests.exceptions.Timeout:
        print("  [WARN] Simulation timed out (60s). The API cold-start may take longer.")
        print("         Try again in ~2 minutes: GET", SIM_URL)
    except Exception as e:
        print(f"  [WARN] Could not reach simulation endpoint: {e}")
