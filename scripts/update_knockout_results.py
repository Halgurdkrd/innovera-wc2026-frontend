"""
update_knockout_results.py
==========================
Fetches match results from worldcup26.ir and updates knockout match rows
(R32, R16, QF, SF, Final) in Supabase.

Fixes:
  1. worldcup26.ir changed API format: response is now {"games":[...]} not [...]
  2. Team name mismatches between API and Supabase

Run:
    python scripts/update_knockout_results.py [--dry-run]

Cron (VPS) — every 15 minutes during active knockout days:
    */15 * * * * /path/to/venv/bin/python /path/to/scripts/update_knockout_results.py >> /var/log/wc_results.log 2>&1
"""

import os, sys, json, argparse, requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# ── Load env from .env.local (frontend repo) or plain .env (VPS) ─────────────
load_dotenv('.env.local')
load_dotenv('.env')

SUPABASE_URL  = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
# Service role key required for writes (bypasses RLS).
# Anon key accepted for --dry-run / read-only diagnostics.
SUPABASE_KEY  = (
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    or os.getenv('SUPABASE_SERVICE_KEY')
    or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit('ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')

# ── Team name normalization ───────────────────────────────────────────────────
# Maps worldcup26.ir names → exact Supabase home_team / away_team values
TEAM_NAME_MAP: dict[str, str] = {
    'democratic republic of the congo': 'DR Congo',
    'dr congo':                          'DR Congo',
    'united states':                     'USA',
    'usa':                               'USA',
    'cape verde':                        'Cabo Verde',
    'cabo verde':                        'Cabo Verde',
    'ivory coast':                       'Ivory Coast',
    "côte d'ivoire":                     'Ivory Coast',
    'korea republic':                    'South Korea',
    'south korea':                       'South Korea',
    'ir iran':                           'Iran',
    'bosnia and herzegovina':            'Bosnia and Herzegovina',
}

KNOCKOUT_TYPES = {'r32', 'r16', 'qf', 'sf', 'final', 'third'}

STAGE_MAP = {
    'r32':   'Round of 32',
    'r16':   'Round of 16',
    'qf':    'Quarter-Finals',
    'sf':    'Semi-Finals',
    'final': 'Final',
    'third': 'Third Place',
}


def norm(name: str) -> str:
    """Lowercase + strip for comparison."""
    return name.strip().lower()


def canonical(api_name: str) -> str:
    """Resolve an API team name to the canonical Supabase spelling."""
    return TEAM_NAME_MAP.get(norm(api_name), api_name.strip())


def fetch_api_games() -> list[dict]:
    """Fetch all games from worldcup26.ir, handling both old and new API shapes."""
    resp = requests.get('https://worldcup26.ir/get/games', timeout=15)
    resp.raise_for_status()
    data = resp.json()

    # New format (2026-06): {"games": [...]}
    if isinstance(data, dict) and 'games' in data:
        return data['games']
    # Old format: [...]
    if isinstance(data, list):
        return data

    raise ValueError(f'Unexpected API shape: {type(data)}, keys={list(data.keys()) if isinstance(data, dict) else "N/A"}')


def fetch_supabase_knockout(headers: dict) -> list[dict]:
    """Fetch all non-group-stage matches from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/matches?tournament_stage=neq.Group Stage&select=match_id,home_team,away_team,status,home_score,away_score,tournament_stage"
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return r.json()


def update_match(match_id: str, home_score: int, away_score: int, headers: dict, dry_run: bool) -> bool:
    """Mark a match as finished with the given score."""
    payload = {
        'status':     'finished',
        'home_score': home_score,
        'away_score': away_score,
    }
    print(f"  {'[DRY RUN] ' if dry_run else ''}UPDATE match_id={match_id} → {home_score}–{away_score} finished")
    if dry_run:
        return True

    url = f"{SUPABASE_URL}/rest/v1/matches?match_id=eq.{match_id}"
    r = requests.patch(url, json=payload, headers=headers, timeout=15)
    if r.status_code not in (200, 204):
        print(f"  ERROR: {r.status_code} {r.text}")
        return False
    return True


def main(dry_run: bool = False) -> None:
    now = datetime.now(timezone.utc).isoformat()
    print(f"\n=== update_knockout_results.py  {now}  dry_run={dry_run} ===")

    headers = {
        'apikey':        SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
    }

    # ── 1. Fetch API games ────────────────────────────────────────────────────
    try:
        all_games = fetch_api_games()
    except Exception as e:
        sys.exit(f'ERROR fetching worldcup26.ir: {e}')

    knockout_games = [g for g in all_games if g.get('type') in KNOCKOUT_TYPES]
    print(f'API: {len(all_games)} total games | {len(knockout_games)} knockout')

    # Keep only finished ones with numeric scores
    finished_games = []
    for g in knockout_games:
        if str(g.get('finished', '')).upper() != 'TRUE':
            continue
        try:
            hs = int(g['home_score'])
            aws = int(g['away_score'])
        except (TypeError, ValueError, KeyError):
            continue
        finished_games.append({
            'home': canonical(g.get('home_team_name_en', '')),
            'away': canonical(g.get('away_team_name_en', '')),
            'home_score': hs,
            'away_score': aws,
            'type':       g.get('type'),
        })

    print(f'API: {len(finished_games)} finished knockout games')

    # ── 2. Fetch Supabase knockout rows ───────────────────────────────────────
    try:
        sb_matches = fetch_supabase_knockout(headers)
    except Exception as e:
        sys.exit(f'ERROR fetching Supabase: {e}')

    # Build lookup: frozenset({home, away}) → match row
    # frozenset handles home/away order ambiguity
    sb_map: dict[frozenset, dict] = {}
    for m in sb_matches:
        key = frozenset({norm(m['home_team']), norm(m['away_team'])})
        sb_map[key] = m

    print(f'Supabase: {len(sb_matches)} knockout rows')

    # ── 3. Match & update ─────────────────────────────────────────────────────
    updated = skipped = unmatched = 0

    for g in finished_games:
        key = frozenset({norm(g['home']), norm(g['away'])})
        sb = sb_map.get(key)

        if sb is None:
            print(f'  UNMATCHED: {g["home"]} vs {g["away"]} (type={g["type"]})')
            # Try loose match with partial names for debugging
            for sk, sv in sb_map.items():
                if any(norm(g['home']) in n or n in norm(g['home']) for n in sk):
                    print(f'    close match? {sv["home_team"]} vs {sv["away_team"]}')
            unmatched += 1
            continue

        if sb['status'] == 'finished':
            skipped += 1
            continue  # Already done

        ok = update_match(sb['match_id'], g['home_score'], g['away_score'], headers, dry_run)
        if ok:
            updated += 1

    print(f'\nResult: {updated} updated | {skipped} already finished | {unmatched} unmatched')
    if unmatched:
        print('ACTION NEEDED: Add unmatched team names to TEAM_NAME_MAP in this script.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Print changes without writing to Supabase')
    args = parser.parse_args()
    main(dry_run=args.dry_run)
