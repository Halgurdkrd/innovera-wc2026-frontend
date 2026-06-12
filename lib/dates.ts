/**
 * Parse a match datetime string from Supabase into a JS Date.
 *
 * PostgreSQL returns timestamptz as "2026-06-12 19:00:00+00" or
 * "2026-06-12 19:00:00" (space separator, not 'T'). JS Date requires ISO 8601
 * with 'T'. Without this fix, new Date("2026-06-12 19:00:00Z") is Invalid Date
 * in V8, so the time renders as "Invalid Date" or falls back to epoch midnight.
 */
export function parseMatchDate(s?: string | null): Date | null {
  if (!s) return null
  // Replace PostgreSQL space separator with ISO 8601 'T'
  const clean = s.replace(' ', 'T')
  // Append 'Z' only when there is no existing timezone indicator
  const utc = clean.endsWith('Z') || clean.includes('+') ? clean : clean + 'Z'
  const d = new Date(utc)
  return isNaN(d.getTime()) ? null : d
}

export function fmtMatchTime(s?: string | null): string {
  const d = parseMatchDate(s)
  return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
}

export function fmtMatchDate(s?: string | null): string {
  const d = parseMatchDate(s)
  return d ? d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : ''
}

export function fmtMatchDateTime(s?: string | null): string {
  const d = parseMatchDate(s)
  return d ? d.toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : ''
}
