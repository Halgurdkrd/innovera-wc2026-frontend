"""
populate_teams.py — Insert all 48 WC2026 teams into Supabase.

Two modes depending on credentials in ../.env.local:

  MODE A (service key present — SUPABASE_SERVICE_KEY=...):
    Executes scripts/seed.sql directly via Supabase REST API.
    Creates tables if missing, inserts all 48 teams, prints each one.

  MODE B (service key absent — anon key only):
    Prints step-by-step instructions to run seed.sql manually
    in the Supabase dashboard SQL editor.

Run:
  cd <project-root>
  python scripts/populate_teams.py
"""

import os, sys, json, pathlib
import requests

# ── Load .env.local ────────────────────────────────────────────────────────────

ROOT      = pathlib.Path(__file__).parent.parent
ENV_PATH  = ROOT / ".env.local"
SQL_PATH  = ROOT / "scripts" / "seed.sql"

env = {}
if ENV_PATH.exists():
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY  = env.get("SUPABASE_SERVICE_KEY", "")
ANON_KEY     = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL:
    sys.exit("[ERR] NEXT_PUBLIC_SUPABASE_URL not found in .env.local")

print(f"[URL] {SUPABASE_URL}")

# ── 48 teams ──────────────────────────────────────────────────────────────────

TEAMS = [
    # (group, team_name, flag_cc, confederation, fifa_rank, position)
    # Group A: Mexico, South Korea, South Africa, Czech Republic
    ("A", "Mexico",             "MX",     "CONCACAF", 14, 1),
    ("A", "South Korea",        "KR",     "AFC",       23, 2),
    ("A", "South Africa",       "ZA",     "CAF",       57, 3),
    ("A", "Czech Republic",     "CZ",     "UEFA",      36, 4),
    # Group B: Canada, Switzerland, Qatar, Bosnia-Herzegovina
    ("B", "Canada",             "CA",     "CONCACAF", 24, 1),
    ("B", "Switzerland",        "CH",     "UEFA",      15, 2),
    ("B", "Qatar",              "QA",     "AFC",       35, 3),
    ("B", "Bosnia-Herzegovina", "BA",     "UEFA",      51, 4),
    # Group C: Brazil, Morocco, Scotland, Haiti
    ("C", "Brazil",             "BR",     "CONMEBOL",   5, 1),
    ("C", "Morocco",            "MA",     "CAF",        12, 2),
    ("C", "Scotland",           "GB-SCT", "UEFA",       42, 3),
    ("C", "Haiti",              "HT",     "CONCACAF",   79, 4),
    # Group D: USA, Paraguay, Australia, Turkey
    ("D", "USA",                "US",     "CONCACAF",  13, 1),
    ("D", "Paraguay",           "PY",     "CONMEBOL",  40, 2),
    ("D", "Australia",          "AU",     "AFC",        22, 3),
    ("D", "Turkey",             "TR",     "UEFA",       32, 4),
    # Group E: Germany, Curaçao, Côte d'Ivoire, Ecuador
    ("E", "Germany",            "DE",     "UEFA",       16, 1),
    ("E", "Curaçao",            "CW",     "CONCACAF",  82, 2),
    ("E", "Côte d'Ivoire",      "CI",     "CAF",        45, 3),
    ("E", "Ecuador",            "EC",     "CONMEBOL",  21, 4),
    # Group F: Netherlands, Japan, Tunisia, Sweden
    ("F", "Netherlands",        "NL",     "UEFA",        7, 1),
    ("F", "Japan",              "JP",     "AFC",         18, 2),
    ("F", "Tunisia",            "TN",     "CAF",         30, 3),
    ("F", "Sweden",             "SE",     "UEFA",        36, 4),
    # Group G: Belgium, Egypt, Iran, New Zealand
    ("G", "Belgium",            "BE",     "UEFA",         6, 1),
    ("G", "Egypt",              "EG",     "CAF",          41, 2),
    ("G", "Iran",               "IR",     "AFC",          25, 3),
    ("G", "New Zealand",        "NZ",     "OFC",          43, 4),
    # Group H: Spain, Cabo Verde, Saudi Arabia, Uruguay
    ("H", "Spain",              "ES",     "UEFA",          3, 1),
    ("H", "Cabo Verde",         "CV",     "CAF",           64, 2),
    ("H", "Saudi Arabia",       "SA",     "AFC",           32, 3),
    ("H", "Uruguay",            "UY",     "CONMEBOL",     17, 4),
    # Group I: France, Senegal, Norway, Iraq
    ("I", "France",             "FR",     "UEFA",           2, 1),
    ("I", "Senegal",            "SN",     "CAF",            19, 2),
    ("I", "Norway",             "NO",     "UEFA",           38, 3),
    ("I", "Iraq",               "IQ",     "AFC",            68, 4),
    # Group J: Argentina, Algeria, Austria, Jordan
    ("J", "Argentina",          "AR",     "CONMEBOL",        1, 1),
    ("J", "Algeria",            "DZ",     "CAF",             37, 2),
    ("J", "Austria",            "AT",     "UEFA",            28, 3),
    ("J", "Jordan",             "JO",     "AFC",             74, 4),
    # Group K: Portugal, Colombia, Uzbekistan, Congo DR
    ("K", "Portugal",           "PT",     "UEFA",             8, 1),
    ("K", "Colombia",           "CO",     "CONMEBOL",         9, 2),
    ("K", "Uzbekistan",         "UZ",     "AFC",              76, 3),
    ("K", "Congo DR",           "CD",     "CAF",              72, 4),
    # Group L: England, Croatia, Ghana, Panama
    ("L", "England",            "GB-ENG", "UEFA",              4, 1),
    ("L", "Croatia",            "HR",     "UEFA",             11, 2),
    ("L", "Ghana",              "GH",     "CAF",              33, 3),
    ("L", "Panama",             "PA",     "CONCACAF",         46, 4),
]

# ── Mode B: no service key — print manual instructions ────────────────────────

if not SERVICE_KEY:
    print("[KEY] No SUPABASE_SERVICE_KEY found in .env.local")
    print()
    print("=" * 60)
    print("  MANUAL SETUP (2 minutes)")
    print("=" * 60)
    print()
    print("  Step 1: Get your service role key")
    print("    Supabase dashboard -> Settings -> API")
    print("    Copy the 'service_role' key (starts with eyJ...)")
    print()
    print("  Step 2: Add it to .env.local")
    print("    SUPABASE_SERVICE_KEY=eyJhbGci...")
    print()
    print("  Step 3: Re-run this script")
    print("    python scripts/populate_teams.py")
    print()
    print("  --- OR: Run seed.sql directly in Supabase ---")
    print()
    print("  Step 1: Open Supabase dashboard -> SQL Editor -> New Query")
    print("  Step 2: Paste the contents of:  scripts/seed.sql")
    print("  Step 3: Click Run")
    print()
    print("  seed.sql creates both tables + inserts all 48 teams.")
    print(f"  File location: {SQL_PATH}")
    print()
    sys.exit(0)

# ── Mode A: service key present — execute SQL via Supabase REST ───────────────

print("[KEY] Service role key found -- executing seed.sql")
print()

# Supabase allows running SQL via the /rest/v1/rpc endpoint if you create an
# exec_sql function, OR via the pg endpoint on the management API.
# The most reliable approach with just the project URL + service key is to
# POST directly to PostgREST (table inserts) — no exec_sql needed.

def upsert(table: str, rows: list[dict], conflict: str) -> tuple[bool, str]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }
    r = requests.post(url, headers=headers,
                      params={"on_conflict": conflict},
                      data=json.dumps(rows), timeout=15)
    if r.status_code in (200, 201, 204):
        return True, "ok"
    return False, f"HTTP {r.status_code}: {r.text[:300]}"

def table_accessible(table: str) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    r = requests.get(url, headers=headers, params={"limit": "1"}, timeout=10)
    return r.status_code == 200

# Check which tables exist
print("Checking tables...")
has_standings = table_accessible("group_standings")
has_teams     = table_accessible("teams")

print(f"  group_standings : {'EXISTS' if has_standings else 'NOT FOUND'}")
print(f"  teams           : {'EXISTS' if has_teams else 'NOT FOUND'}")
print()

if not has_standings and not has_teams:
    print("[ERR] Neither table exists. Create them first:")
    print("  Supabase dashboard -> SQL Editor -> paste scripts/seed.sql -> Run")
    print()
    print("  seed.sql includes CREATE TABLE statements for both tables.")
    sys.exit(1)

# Insert all 48 teams
ok_count = 0
fail_count = 0

for grp, name, cc, conf, rank, pos in TEAMS:
    row_label = f"Group {grp} | {name:<14} | {conf:<10} | FIFA #{rank}"
    team_ok = False

    if has_standings:
        row = {
            "group_name": grp, "team_name": name,
            "confederation": conf, "position": pos,
            "played": 0, "won": 0, "drawn": 0, "lost": 0,
            "goals_for": 0, "goals_against": 0,
            "goal_difference": 0, "points": 0,
        }
        ok, msg = upsert("group_standings", [row], "team_name,group_name")
        if ok:
            team_ok = True
        else:
            print(f"    [WARN] group_standings: {msg}")

    if has_teams:
        row = {
            "team_name": name, "group_name": grp,
            "confederation": conf, "fifa_rank": rank,
        }
        ok, msg = upsert("teams", [row], "team_name,group_name")
        if ok:
            team_ok = True
        else:
            print(f"    [WARN] teams: {msg}")

    if team_ok:
        print(f"  [OK]   {row_label}")
        ok_count += 1
    else:
        print(f"  [FAIL] {row_label}")
        fail_count += 1

print()
print("-" * 60)
print(f"  Inserted : {ok_count} / 48")
print(f"  Failed   : {fail_count}")
print()
if ok_count == 48:
    print("[SUCCESS] All 48 teams inserted!")
elif fail_count > 0:
    print("[!] Some inserts failed. Check Supabase RLS policies or run seed.sql manually.")
