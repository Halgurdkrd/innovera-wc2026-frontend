'use client'

import { useRef } from 'react'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:     '#0f172a',
  panel:  '#1e293b',
  border: '#334155',
  gold:   '#f59e0b',
  blue:   '#3b82f6',
  text:   '#f8fafc',
  muted:  '#94a3b8',
  green:  '#22c55e',
  red:    '#ef4444',
}

// ── html2canvas helpers ───────────────────────────────────────────────────────

async function captureAndDownload(el: HTMLElement, filename: string) {
  const h2c = (await import('html2canvas')).default
  const canvas = await h2c(el, { scale: 2, useCORS: true, backgroundColor: T.bg, logging: false })
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function captureAndShare(el: HTMLElement, title: string) {
  const h2c = (await import('html2canvas')).default
  const canvas = await h2c(el, { scale: 2, useCORS: true, backgroundColor: T.bg, logging: false })
  canvas.toBlob(async (blob) => {
    if (!blob) return
    if (navigator.share && typeof navigator.canShare === 'function') {
      try {
        await navigator.share({ title, files: [new File([blob], 'innovera.png', { type: 'image/png' })] })
        return
      } catch { /* fallthrough */ }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = 'innovera-prediction.png'; a.href = url; a.click()
    URL.revokeObjectURL(url)
  })
}

// ── Shared sub-components (inline styles for html2canvas compat) ──────────────

function Header() {
  return (
    <div style={{ background: '#0a0f1e', padding: '14px 20px', borderBottom: `2px solid ${T.gold}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>⚽</span>
        <span style={{ color: T.gold, fontWeight: '800', fontSize: '13px', letterSpacing: '1px' }}>ENNOVERA</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: T.muted, fontSize: '11px' }}>PL 26-27</span>
        <span style={{ fontSize: '15px' }}>🏆</span>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <div style={{ padding: '10px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'center', gap: '16px' }}>
      <span style={{ color: T.muted, fontSize: '10px' }}>#PL2026</span>
      <span style={{ color: T.gold, fontSize: '10px', fontWeight: 'bold' }}>Ennovera</span>
    </div>
  )
}

function FlagDisplay({ flag, name, size }: { flag: string; name: string; size?: number }) {
  const sz = size ?? 48
  if (flag.startsWith('https://')) {
    return (
      <img
        src={flag}
        alt={name}
        crossOrigin="anonymous"
        style={{ width: `${sz}px`, height: 'auto', borderRadius: '3px', display: 'inline-block' }}
      />
    )
  }
  return <span style={{ fontSize: `${sz}px`, lineHeight: 1 }}>{flag}</span>
}

function Teams({ homeTeam, awayTeam, homeFlag, awayFlag }: { homeTeam: string; awayTeam: string; homeFlag: string; awayFlag: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
      {[{ flag: homeFlag, name: homeTeam }, { flag: awayFlag, name: awayTeam }].map((t, i) => (
        <div key={i} style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ lineHeight: 1 }}><FlagDisplay flag={t.flag} name={t.name} /></div>
          <div style={{ fontWeight: '800', fontSize: '13px', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', color: T.text }}>{t.name}</div>
        </div>
      )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <div key="vs" style={{ color: T.muted, fontWeight: 'bold', fontSize: '16px', flexShrink: 0 }}>VS</div>, el], [] as React.ReactNode[])}
    </div>
  )
}

function MetaRow({ items }: { items: (string | undefined)[] }) {
  const valid = items.filter(Boolean)
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
      {valid.map((v, i) => (
        <span key={i} style={{ color: T.muted, fontSize: '11px' }}>{v}</span>
      ))}
    </div>
  )
}

function ConfBadge({ level }: { level: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const c = level === 'HIGH' ? T.gold : level === 'MEDIUM' ? T.blue : T.muted
  return (
    <span style={{ color: c, border: `1px solid ${c}`, borderRadius: '999px', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', background: c + '25' }}>
      {level}
    </span>
  )
}

function ProbRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{ color: T.muted, fontSize: '12px', width: '90px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: T.bg, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, pct)}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ color, fontSize: '12px', fontWeight: 'bold', width: '32px', textAlign: 'right', flexShrink: 0 }}>{Math.round(pct)}%</span>
    </div>
  )
}

function LuckBar({ team, score }: { team: string; score: number }) {
  const positive = score >= 0
  const color = positive ? T.gold : T.red
  const pct = Math.min(100, Math.abs(score) / 10 * 100)
  const label = score > 1 ? '🍀 Lucky' : score < -1 ? '😤 Unlucky' : '✅ Deserved'
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: T.muted, fontSize: '11px' }}>{team}</span>
        <span style={{ color, fontSize: '11px', fontWeight: 'bold' }}>{score > 0 ? '+' : ''}{score.toFixed(1)} {label}</span>
      </div>
      <div style={{ height: '5px', background: T.bg, borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
        {positive
          ? <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
          : <div style={{ position: 'absolute', right: 0, width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
        }
      </div>
    </div>
  )
}

function ActionButtons({ onDownload, onShare, enabled, isKU }: { onDownload: () => void; onShare: () => void; enabled: boolean; isKU: boolean }) {
  const btn = (onClick: () => void, icon: string, label: string, primary: boolean) => (
    <button onClick={onClick} disabled={!enabled} style={{
      flex: 1, padding: '10px 0', borderRadius: '10px', border: primary ? 'none' : `1px solid ${enabled ? T.gold + '50' : T.border}`,
      background: primary ? (enabled ? T.gold : T.panel) : T.panel,
      color: primary ? (enabled ? '#0f172a' : T.muted) : (enabled ? T.text : T.muted),
      fontWeight: 'bold', fontSize: '12px', cursor: enabled ? 'pointer' : 'not-allowed',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
      transition: 'all 0.2s',
    }}>
      {icon} {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', width: '400px' }}>
      {btn(onDownload, '📥', isKU ? 'داگرتن' : 'Download Card', true)}
      {btn(onShare,    '📤', isKU ? 'هاوبەشکردن' : 'Share', false)}
    </div>
  )
}

// ── PRE-MATCH CARD ────────────────────────────────────────────────────────────

export interface PreMatchCardProps {
  homeTeam: string; awayTeam: string
  homeFlag: string; awayFlag: string
  matchDate?: string; venue?: string; group?: string
  homeWinProb: number; drawProb: number; awayWinProb: number
  aiConfidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  topScorelines?: string
  userPrediction?: string    // e.g. "Mexico Win"
  userScore?: string         // e.g. "1 - 1"
  userName?: string          // signed-in user's display name
  isLocked?: boolean
  language?: 'EN' | 'KU'
}

export function PreMatchCard(props: PreMatchCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const isKU = props.language === 'KU'
  const slug = `${props.homeTeam.toLowerCase().replace(/\s+/g,'-')}-vs-${props.awayTeam.toLowerCase().replace(/\s+/g,'-')}`

  const exec = async (fn: (el: HTMLElement) => Promise<void>) => {
    if (!cardRef.current || !props.isLocked) return
    if (btnRef.current) btnRef.current.style.visibility = 'hidden'
    await fn(cardRef.current)
    if (btnRef.current) btnRef.current.style.visibility = 'visible'
  }

  return (
    <div style={{ display: 'inline-block' }}>
      {/* ── Card ── */}
      <div ref={cardRef} style={{ width: '400px', background: T.bg, borderRadius: '16px', border: `1px solid ${T.border}`, overflow: 'hidden', fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text }}>
        <Header />

        {/* Teams */}
        <div style={{ padding: '22px 20px 14px' }}>
          <Teams homeTeam={props.homeTeam} awayTeam={props.awayTeam} homeFlag={props.homeFlag} awayFlag={props.awayFlag} />
          <MetaRow items={[props.group && `Group ${props.group}`, props.matchDate, props.venue]} />
        </div>

        {/* AI section */}
        <div style={{ margin: '0 16px 14px', background: T.panel, borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ color: T.muted, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🤖 {isKU ? 'پێشبینی AI' : 'AI Prediction'}
            </span>
            {props.aiConfidence && <ConfBadge level={props.aiConfidence} />}
          </div>
          <ProbRow label={props.homeTeam} pct={props.homeWinProb} color={T.gold} />
          <ProbRow label={isKU ? 'یەکسان' : 'Draw'}    pct={props.drawProb}    color={T.blue} />
          <ProbRow label={props.awayTeam} pct={props.awayWinProb} color={T.muted} />
          {props.topScorelines && (
            <div style={{ color: T.muted, fontSize: '11px', marginTop: '2px' }}>
              {isKU ? 'باشترین ئەنجام' : 'Top scorelines'}: {props.topScorelines}
            </div>
          )}
        </div>

        {/* User section */}
        {props.userPrediction ? (
          <div style={{ margin: '0 16px 14px', background: T.panel, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${T.gold}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ color: T.muted, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                👤 {isKU ? 'پێشبینیت' : 'Your Prediction'}
              </div>
              {props.userName && (
                <div style={{ color: T.muted, fontSize: '11px' }}>{props.userName}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔒</span>
              <span style={{ fontWeight: '800', fontSize: '18px', color: T.gold }}>{props.userPrediction}</span>
            </div>
            {props.userScore && (
              <div style={{ color: T.muted, fontSize: '12px', marginTop: '6px' }}>
                {isKU ? 'ئەنجامی پێشبینیکراو' : 'Predicted score'}: <span style={{ color: T.text }}>{props.userScore}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ margin: '0 16px 14px', background: T.panel, borderRadius: '12px', padding: '14px 16px', border: `1px dashed ${T.border}`, textAlign: 'center' }}>
            <div style={{ color: T.muted, fontSize: '12px' }}>
              {isKU ? 'پێشبینیەکەت قووڵ بکە بۆ داگرتنی کارت' : 'Lock your prediction to download the card'}
            </div>
          </div>
        )}

        <Footer />
      </div>

      {/* Action buttons */}
      <div ref={btnRef}>
        <ActionButtons
          onDownload={() => exec(el => captureAndDownload(el, `innovera-${slug}-prediction.png`))}
          onShare={() => exec(el => captureAndShare(el, `My Premier League prediction: ${props.homeTeam} vs ${props.awayTeam}`))}
          enabled={!!props.isLocked}
          isKU={isKU}
        />
      </div>
    </div>
  )
}

// ── POST-MATCH CARD ───────────────────────────────────────────────────────────

export interface PostMatchCardProps {
  homeTeam: string; awayTeam: string
  homeFlag: string; awayFlag: string
  homeScore: number; awayScore: number
  group?: string
  aiPrediction?: string
  aiCorrect?: boolean
  userPrediction?: string
  userCorrect?: boolean
  pointsEarned?: number
  totalPoints?: number
  homeLuckScore?: number
  awayLuckScore?: number
  userStreak?: number
  userRank?: number
  isLoggedIn?: boolean
  language?: 'EN' | 'KU'
}

export function PostMatchCard(props: PostMatchCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const isKU = props.language === 'KU'
  const slug = `${props.homeTeam.toLowerCase().replace(/\s+/g,'-')}-vs-${props.awayTeam.toLowerCase().replace(/\s+/g,'-')}`

  const exec = async (fn: (el: HTMLElement) => Promise<void>) => {
    if (!cardRef.current) return
    if (btnRef.current) btnRef.current.style.visibility = 'hidden'
    await fn(cardRef.current)
    if (btnRef.current) btnRef.current.style.visibility = 'visible'
  }

  const Result = ({ correct }: { correct: boolean | undefined }) =>
    correct == null ? null :
    <span style={{ fontSize: '16px' }}>{correct ? '✅' : '❌'}</span>

  return (
    <div style={{ display: 'inline-block' }}>
      <div ref={cardRef} style={{ width: '400px', background: T.bg, borderRadius: '16px', border: `1px solid ${T.border}`, overflow: 'hidden', fontFamily: 'system-ui,-apple-system,sans-serif', color: T.text }}>
        <Header />

        {/* Teams + score */}
        <div style={{ padding: '22px 20px 14px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ lineHeight: 1 }}><FlagDisplay flag={props.homeFlag} name={props.homeTeam} size={40} /></div>
              <div style={{ fontWeight: '800', fontSize: '12px', marginTop: '5px', textTransform: 'uppercase' }}>{props.homeTeam}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: '900', color: T.gold, lineHeight: 1 }}>
                {props.homeScore} — {props.awayScore}
              </div>
              <div style={{ color: T.muted, fontSize: '10px', marginTop: '4px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {isKU ? 'کۆتایی' : 'FINAL'}
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ lineHeight: 1 }}><FlagDisplay flag={props.awayFlag} name={props.awayTeam} size={40} /></div>
              <div style={{ fontWeight: '800', fontSize: '12px', marginTop: '5px', textTransform: 'uppercase' }}>{props.awayTeam}</div>
            </div>
          </div>
          {props.group && <MetaRow items={[`Group ${props.group}`]} />}
        </div>

        {/* Result comparison */}
        <div style={{ margin: '0 16px 14px', background: T.panel, borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ color: T.muted, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            {isKU ? 'ئەنجامەکان' : 'RESULT'}
          </div>
          {[
            { icon: '🤖', label: isKU ? 'AI پێشبینی کرد' : 'AI predicted', pred: props.aiPrediction, correct: props.aiCorrect },
            { icon: '👤', label: isKU ? 'تۆ پێشبینی کرد' : 'You predicted', pred: props.userPrediction, correct: props.userCorrect },
          ].map(({ icon, label, pred, correct }) => pred ? (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px' }}>{icon}</span>
              <span style={{ color: T.muted, fontSize: '12px', width: '100px', flexShrink: 0 }}>{label}:</span>
              <span style={{ fontWeight: 'bold', fontSize: '13px', color: correct ? T.green : correct === false ? T.red : T.text, flex: 1 }}>{pred}</span>
              <Result correct={correct} />
            </div>
          ) : null)}

          {props.isLoggedIn && props.pointsEarned !== undefined && (
            <div style={{ borderTop: `1px solid ${T.border}`, marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: T.muted, fontSize: '12px' }}>{isKU ? 'خاڵی ئەم یارییە' : 'Points this match'}</span>
              <span style={{ color: T.gold, fontWeight: '800', fontSize: '18px' }}>+{props.pointsEarned}</span>
            </div>
          )}
          {props.isLoggedIn && props.totalPoints !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ color: T.muted, fontSize: '12px' }}>{isKU ? 'کۆی خاڵەکان' : 'Total points'}</span>
              <span style={{ color: T.text, fontWeight: 'bold', fontSize: '14px' }}>🏅 {props.totalPoints}</span>
            </div>
          )}
        </div>

        {/* Luck scores */}
        {(props.homeLuckScore !== undefined || props.awayLuckScore !== undefined) && (
          <div style={{ margin: '0 16px 14px', background: T.panel, borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ color: T.muted, fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              🍀 {isKU ? 'خەمەی بەخت' : 'Luck Score'}
            </div>
            {props.homeLuckScore !== undefined && <LuckBar team={props.homeTeam} score={props.homeLuckScore} />}
            {props.awayLuckScore !== undefined && <LuckBar team={props.awayTeam} score={props.awayLuckScore} />}
          </div>
        )}

        {/* User streak + rank */}
        {props.isLoggedIn && (props.userStreak != null || props.userRank != null) && (
          <div style={{ margin: '0 16px 14px', display: 'flex', gap: '10px' }}>
            {props.userStreak != null && (
              <div style={{ flex: 1, background: T.panel, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px' }}>🔥</div>
                <div style={{ color: T.gold, fontWeight: '800', fontSize: '18px' }}>{props.userStreak}</div>
                <div style={{ color: T.muted, fontSize: '10px' }}>{isKU ? 'زنجیرە' : 'Streak'}</div>
              </div>
            )}
            {props.userRank != null && (
              <div style={{ flex: 1, background: T.panel, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px' }}>🏆</div>
                <div style={{ color: T.gold, fontWeight: '800', fontSize: '18px' }}>#{props.userRank}</div>
                <div style={{ color: T.muted, fontSize: '10px' }}>{isKU ? 'پلە' : 'Rank'}</div>
              </div>
            )}
          </div>
        )}

        <Footer />
      </div>

      {/* Action buttons — always enabled for post-match */}
      <div ref={btnRef}>
        <ActionButtons
          onDownload={() => exec(el => captureAndDownload(el, `innovera-${slug}-result.png`))}
          onShare={() => exec(el => captureAndShare(el, `${props.homeTeam} ${props.homeScore}–${props.awayScore} ${props.awayTeam} | Premier League`))}
          enabled={true}
          isKU={isKU}
        />
      </div>
    </div>
  )
}

// ── Legacy default export (kept for backward compat) ──────────────────────────

export default PreMatchCard
