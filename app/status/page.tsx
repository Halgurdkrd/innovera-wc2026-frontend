'use client'

import { useEffect, useState } from 'react'

interface Health {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable'
  last_pipeline_run?: string | null
  elo_current_through?: string | null
  form_current_through?: string | null
  matches_finished?: number | null
  matches_scheduled?: number | null
  next_gw?: number | null
  next_gw_deadline?: string | null
  next_gw_squad_generated?: boolean
  v5_1_shadow_active?: boolean
  fantasy_lifecycle_alerts?: string[]
  alerts?: string[]
}

function ago(iso?: string | null): string {
  if (!iso) return 'never'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const h = Math.floor(mins / 60)
  return h < 48 ? `${h} hour${h === 1 ? '' : 's'} ago` : `${Math.floor(h / 24)} days ago`
}

function deadline(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZoneName: 'short' })
}

const HEADLINE: Record<Health['status'], { text: string; cls: string }> = {
  healthy: { text: 'All systems operational', cls: 'text-emerald-400' },
  degraded: { text: 'Degraded — needs attention', cls: 'text-amber-400' },
  unhealthy: { text: 'Problem — action required', cls: 'text-red-400' },
  unreachable: { text: 'Backend unreachable', cls: 'text-red-400' },
}

export default function StatusPage() {
  const [h, setH] = useState<Health | null>(null)
  useEffect(() => {
    let live = true
    const load = async () => {
      try {
        const r = await fetch('/api/pl/health', { cache: 'no-store' })
        const j = await r.json()
        if (live) setH(j)
      } catch {
        if (live) setH({ status: 'unreachable', alerts: ['Could not reach the status service'] })
      }
    }
    load()
    const t = setInterval(load, 60000)
    return () => { live = false; clearInterval(t) }
  }, [])

  const head = h ? HEADLINE[h.status] ?? HEADLINE.unreachable : null
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 border-b border-[#30363D]/60 text-sm">
      <span className="text-[#8B949E]">{label}</span>
      <span className="text-[#E6EDF3] text-right">{value}</span>
    </div>
  )
  return (
    <main className="min-h-screen bg-[#0D1117] text-[#E6EDF3] px-4 py-10">
      <div className="max-w-xl mx-auto bg-[#161B22] border border-[#30363D] rounded-xl p-6">
        <h1 className="text-lg font-bold mb-1">System status</h1>
        {!h ? (
          <p className="text-[#8B949E] text-sm">Loading…</p>
        ) : (
          <>
            <p className={`text-base font-semibold mb-4 ${head?.cls}`}>System Status: {head?.text}</p>
            {row('Last updated', ago(h.last_pipeline_run))}
            {row('Elo / form current through', h.elo_current_through ?? '—')}
            {row('Matches', h.matches_finished != null ? `${h.matches_finished} finished · ${h.matches_scheduled ?? '—'} scheduled` : '—')}
            {row('Next GW deadline', deadline(h.next_gw_deadline))}
            {row(h.next_gw ? `GW${h.next_gw} squad` : 'Next GW squad', h.next_gw_squad_generated ? 'Generated ✅' : 'Not generated ❌')}
            {row('V5.1 shadow mode', h.v5_1_shadow_active ? 'Active ✅' : 'Not running')}
            {(h.alerts?.length ?? 0) > 0 && (
              <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/20 p-3 text-sm text-amber-200">
                <div className="font-semibold mb-1">Alerts</div>
                <ul className="list-disc ml-5 space-y-0.5">{h.alerts!.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
