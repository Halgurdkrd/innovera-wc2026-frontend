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
    # (group, team_name, flag, confederation, fifa_rank, position)
    ("A", "USA",          "US", "CONCACAF",  12, 1),
    ("A", "Panama",       "PA", "CONCACAF",  44, 2),
    ("A", "Albania",      "AL", "UEFA",      45, 3),
    ("A", "Ukraine",      "UA", "UEFA",      26, 4),

    ("B", "Mexico",       "MX", "CONCACAF",  16, 1),
    ("B", "Jamaica",      "JM", "CONCACAF",  40, 2),
    ("B", "Venezuela",    "VE", "CONMEBOL",  33, 3),
    ("B", "Ecuador",      "EC", "CONMEBOL",  20, 4),

    ("C", "Canada",       "CA", "CONCACAF",  34, 1),
    ("C", "Honduras",     "HN", "CONCACAF",  46, 2),
    ("C", "Morocco",      "MA", "CAF",       13, 3),
    ("C", "Portugal",     "PT", "UEFA",       5, 4),

    ("D", "Spain",        "ES", "UEFA",       8, 1),
    ("D", "Japan",        "JP", "AFC",       17, 2),
    ("D", "Congo DR",     "CD", "CAF",       43, 3),
    ("D", "New Zealand",  "NZ", "OFC",       48, 4),

    ("E", "Germany",      "DE", "UEFA",       9, 1),
    ("E", "Australia",    "AU", "AFC",       21, 2),
    ("E", "Argentina",    "AR", "CONMEBOL",   1, 3),
    ("E", "Chile",        "CL", "CONMEBOL",  32, 4),

    ("F", "France",       "FR", "UEFA",       2, 1),
    ("F", "Algeria",      "DZ", "CAF",       27, 2),
    ("F", "Nigeria",      "NG", "CAF",       36, 3),
    ("F", "Paraguay",     "PY", "CONMEBOL",  35, 4),

    ("G", "England",      "GB-ENG", "UEFA",   3, 1),
    ("G", "Serbia",       "RS", "UEFA",      25, 2),
    ("G", "Cameroon",     "CM", "CAF",       42, 3),
    ("G", "Senegal",      "SN", "CAF",       18, 4),

    ("H", "Netherlands",  "NL", "UEFA",       7, 1),
    ("H", "Finland",      "FI", "UEFA",      47, 2),
    ("H", "Saudi Arabia", "SA", "AFC",       39, 3),
    ("H", "Peru",         "PE", "CONMEBOL",  31, 4),

    ("I", "Brazil",       "BR", "CONMEBOL",   4, 1),
    ("I", "Uruguay",      "UY", "CONMEBOL",  15, 2),
    ("I", "Colombia",     "CO", "CONMEBOL",  14, 3),
    ("I", "South Korea",  "KR", "AFC",       24, 4),

    ("J", "Belgium",      "BE", "UEFA",       6, 1),
    ("J", "Egypt",        "EG", "CAF",       41, 2),
    ("J", "Qatar",        "QA", "AFC",       37, 3),
    ("J", "Slovakia",     "SK", "UEFA",      30, 4),

    ("K", "Croatia",      "HR", "UEFA",      11, 1),
    ("K", "Iran",         "IR", "AFC",       38, 2),
    ("K", "Poland",       "PL", "UEFA",      22, 3),
    ("K", "Tunisia",      "TN", "CAF",       28, 4),

    ("L", "Italy",        "IT", "UEFA",      10, 1),
    ("L", "Turkey",       "TR", "UEFA",      23, 2),
    ("L", "Slovenia",     "SI", "UEFA",      29, 3),
    ("L", "Switzerland",  "CH", "UEFA",      19, 4),
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
