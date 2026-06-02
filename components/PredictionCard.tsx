'use client'

import { useRef } from 'react'

interface PredictionCardProps {
  homeTeam: string
  awayTeam: string
  homeFlag: string
  awayFlag: string
  matchDate: string
  groupName: string
  aiHomeWinProb: number
  aiDrawProb: number
  aiAwayWinProb: number
  userName: string
  userPrediction: 'home' | 'draw' | 'away'
  userHomeScore?: number
  userAwayScore?: number
  isFinished?: boolean
  actualHomeScore?: number
  actualAwayScore?: number
  pointsEarned?: number
  totalPoints?: number
  humanBeatAI?: boolean
  userCorrect?: boolean
  aiCorrect?: boolean
  language?: 'EN' | 'KU'
}

export default function PredictionCard({
  homeTeam, awayTeam, homeFlag, awayFlag,
  matchDate, groupName,
  aiHomeWinProb, aiDrawProb, aiAwayWinProb,
  userName,
  userPrediction, userHomeScore, userAwayScore,
  isFinished = false,
  actualHomeScore, actualAwayScore,
  pointsEarned, totalPoints,
  humanBeatAI, userCorrect, aiCorrect,
  language = 'EN',
}: PredictionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isKU = language === 'KU'

  const downloadCard = async () => {
    if (!cardRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#0D1117',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    const link = document.createElement('a')
    link.download = `innovera-${homeTeam}-vs-${awayTeam}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const aiPredText = aiHomeWinProb > 0.45
    ? `${homeTeam} ${isKU ? 'دەبەرێت' : 'Win'}`
    : aiHomeWinProb < 0.35
    ? `${awayTeam} ${isKU ? 'دەبەرێت' : 'Win'}`
    : (isKU ? 'یەکسان' : 'Draw')

  const userPredText = userPrediction === 'home'
    ? `${homeTeam} ${isKU ? 'دەبەرێت' : 'Win'}`
    : userPrediction === 'away'
    ? `${awayTeam} ${isKU ? 'دەبەرێت' : 'Win'}`
    : (isKU ? 'یەکسان' : 'Draw')

  const hasExactScore = userHomeScore !== undefined && userAwayScore !== undefined

  const s = {
    card: {
      width: '380px',
      background: 'linear-gradient(135deg, #0D1117 0%, #161B22 100%)',
      borderRadius: '16px',
      border: '1.5px solid #F0A500',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'white',
    } as React.CSSProperties,
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">

      {/* ── Card (rendered to PNG) ─────────────────────────────────────────── */}
      <div ref={cardRef} style={s.card}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
          <span style={{ color:'#F0A500', fontWeight:'bold', fontSize:'13px', letterSpacing:'0.5px' }}>
            🏆 INNOVERA WC2026
          </span>
          <span style={{ color:'#8B949E', fontSize:'11px' }}>innovera.ai</span>
        </div>

        {/* Match teams */}
        <div style={{ textAlign:'center', marginBottom:'14px' }}>
          <div style={{ fontSize:'19px', fontWeight:'bold', marginBottom:'4px' }}>
            {homeFlag} {homeTeam}
            <span style={{ color:'#8B949E', margin:'0 8px', fontSize:'15px' }}>vs</span>
            {awayTeam} {awayFlag}
          </div>

          {isFinished && actualHomeScore !== undefined ? (
            <div style={{ fontSize:'26px', fontWeight:'bold', color:'#F0A500', margin:'6px 0' }}>
              {actualHomeScore} — {actualAwayScore}
              <span style={{ fontSize:'11px', color:'#8B949E', marginLeft:'8px', fontWeight:'normal' }}>
                {isKU ? 'کۆتایی' : 'FINAL'}
              </span>
            </div>
          ) : (
            <div style={{ color:'#8B949E', fontSize:'12px' }}>
              {matchDate}{groupName ? ` • Group ${groupName}` : ''}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height:'1px', background:'#21262D', margin:'10px 0' }} />

        {/* AI prediction */}
        <div style={{ background:'#161B22', borderRadius:'8px', padding:'10px 12px', marginBottom:'8px', border:'1px solid #21262D' }}>
          <div style={{ fontSize:'10px', color:'#8B949E', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
            🤖 {isKU ? 'پێشبینی AI' : 'AI Prediction'}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
            <span style={{ fontWeight:'bold', fontSize:'14px' }}>
              {aiPredText}
              {isFinished && aiCorrect !== undefined && (
                <span style={{ marginLeft:'6px' }}>{aiCorrect ? '✅' : '❌'}</span>
              )}
            </span>
            <span style={{ color:'#F0A500', fontSize:'12px' }}>
              {Math.round(aiHomeWinProb * 100)}% / {Math.round(aiDrawProb * 100)}% / {Math.round(aiAwayWinProb * 100)}%
            </span>
          </div>
          <div style={{ display:'flex', height:'5px', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ width:`${aiHomeWinProb*100}%`, background:'#2EA043' }} />
            <div style={{ width:`${aiDrawProb*100}%`, background:'#8B949E' }} />
            <div style={{ width:`${aiAwayWinProb*100}%`, background:'#F85149' }} />
          </div>
        </div>

        {/* User prediction */}
        <div style={{ background:'#161B22', borderRadius:'8px', padding:'10px 12px', marginBottom:'10px', border:'1px solid #F0A500' }}>
          <div style={{ fontSize:'10px', color:'#8B949E', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
            👤 {userName} {isKU ? 'پێشبینی کرد' : 'Predicted'}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:'bold', fontSize:'14px' }}>
              {hasExactScore
                ? `${homeTeam} ${userHomeScore} — ${userAwayScore} ${awayTeam}`
                : userPredText}
              {isFinished && userCorrect !== undefined && (
                <span style={{ marginLeft:'6px' }}>{userCorrect ? '✅' : '❌'}</span>
              )}
            </span>
            {isFinished && pointsEarned !== undefined && (
              <span style={{ color: pointsEarned > 0 ? '#2EA043' : '#8B949E', fontWeight:'bold', fontSize:'13px' }}>
                +{pointsEarned} {isKU ? 'خاڵ' : 'pts'}
              </span>
            )}
          </div>
        </div>

        {/* Post-match result banner */}
        {isFinished && humanBeatAI !== undefined && (
          <div style={{
            textAlign:'center', padding:'10px', borderRadius:'8px', marginBottom:'8px',
            background: humanBeatAI ? 'linear-gradient(135deg,#1A3A1A,#1E4620)' : 'linear-gradient(135deg,#1A1A2E,#16213E)',
            border: `1px solid ${humanBeatAI ? '#2EA043' : '#F0A500'}`,
          }}>
            <div style={{ fontSize:'16px', fontWeight:'bold', color: humanBeatAI ? '#2EA043' : '#F0A500', marginBottom:'3px' }}>
              {humanBeatAI
                ? `🏆 ${isKU ? 'مرۆڤ دەستی بکردەسەر AI!' : 'HUMAN BEATS AI!'}`
                : `🤖 ${isKU ? 'AI بردی!' : 'AI BEATS HUMAN'}`}
            </div>
            <div style={{ fontSize:'12px', color:'#8B949E' }}>
              {humanBeatAI
                ? `${userName} ${isKU ? 'دروست پێشبینی کرد!' : 'called it right!'}`
                : (isKU ? 'جارێکی تر هەوڵ بدە!' : 'Better luck next match!')}
            </div>
            {totalPoints !== undefined && (
              <div style={{ fontSize:'12px', color:'#F0A500', marginTop:'3px' }}>
                {isKU ? 'کۆی خاڵەکان' : 'Total points'}: {totalPoints}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:'8px' }}>
          <span style={{ color:'#F0A500', fontSize:'10px', fontWeight:'bold' }}>innovera.ai</span>
          <span style={{ color:'#8B949E', fontSize:'10px' }}>FIFA World Cup 2026</span>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={downloadCard}
        className="w-[380px] bg-[#F0A500] hover:bg-[#D4920A] text-[#0D1117] font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <span>📥</span>
        {isKU ? 'کارتی پێشبینی داگرە' : 'Download Prediction Card'}
      </button>
    </div>
  )
}
