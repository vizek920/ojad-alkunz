import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { sessionsAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import s from './BigScreenPage.module.css'

const DIFF_AR  = { easy:'سهل', medium:'متوسط', hard:'صعب' }
const TOTAL_STAGES = 15
const COLS = 5

/* ── Stage metadata ─────────────────────────────────────── */
const STAGE_META = [
  { icon:'🗺️',  name:'البداية' },
  { icon:'🏜️',  name:'الرمال' },
  { icon:'🌴',  name:'الواحة' },
  { icon:'🌿',  name:'النخلة' },
  { icon:'☀️',  name:'الصحراء' },
  { icon:'🕳️',  name:'الكهف' },
  { icon:'💧',  name:'العيون' },
  { icon:'⛰️',  name:'الجبل' },
  { icon:'🌊',  name:'الوادي' },
  { icon:'🐾',  name:'الأثر' },
  { icon:'🏰',  name:'القلعة' },
  { icon:'🐚',  name:'البحر' },
  { icon:'⭐',  name:'النجوم' },
  { icon:'📜',  name:'المخطوطة' },
  { icon:'💎',  name:'الكنز' },
]

/* ── Helpers ────────────────────────────────────────────── */
function toAr(n){ return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) }

function stageCol(idx){
  const row = Math.floor(idx / COLS), pos = idx % COLS
  if (row === 0) return 4 - pos
  if (row === 1) return pos
  return 4 - pos
}

function buildPts(mapRef){
  const wrap = mapRef.current
  if (!wrap) return []
  const nodes = Array.from(wrap.querySelectorAll('[data-node]'))
  const rect  = wrap.getBoundingClientRect()
  return nodes.map(el => {
    const r = el.getBoundingClientRect()
    return { x: r.left - rect.left + r.width/2, y: r.top - rect.top + r.height/2 }
  })
}

/* ── Stars canvas ───────────────────────────────────────── */
function useStars(canvasRef){
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    let W, H, stars = [], shoots = [], raf

    function resize(){
      W = cvs.width  = cvs.offsetWidth
      H = cvs.height = cvs.offsetHeight
      stars = Array.from({length:180}, () => ({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.4+0.3,
        a: Math.random(), speed: Math.random()*0.006+0.002
      }))
    }

    function spawnShoot(){
      if (shoots.length < 3 && Math.random() < 0.01)
        shoots.push({ x:Math.random()*W*0.8, y:Math.random()*H*0.4,
          vx:4+Math.random()*3, vy:2+Math.random()*2, life:1 })
    }

    function draw(){
      ctx.clearRect(0,0,W,H)
      // gold dust tint for top portion
      const gd = ctx.createLinearGradient(0,0,0,H*0.3)
      gd.addColorStop(0,'rgba(201,162,39,0.03)')
      gd.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=gd; ctx.fillRect(0,0,W,H*0.3)

      stars.forEach(st => {
        st.a += st.speed
        const op = 0.2 + 0.8*Math.abs(Math.sin(st.a))
        ctx.beginPath()
        ctx.arc(st.x, st.y, st.r, 0, Math.PI*2)
        ctx.fillStyle = `rgba(255,255,255,${op})`
        ctx.fill()
      })
      spawnShoot()
      shoots = shoots.filter(sh => {
        sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.025
        if (sh.life <= 0) return false
        const g = ctx.createLinearGradient(sh.x,sh.y,sh.x-sh.vx*8,sh.y-sh.vy*8)
        g.addColorStop(0,`rgba(255,240,160,${sh.life})`)
        g.addColorStop(1,'rgba(255,240,160,0)')
        ctx.beginPath(); ctx.strokeStyle=g; ctx.lineWidth=1.5
        ctx.moveTo(sh.x,sh.y); ctx.lineTo(sh.x-sh.vx*8,sh.y-sh.vy*8); ctx.stroke()
        return true
      })
      raf = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(cvs); resize(); draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [canvasRef])
}

/* ── Main Component ─────────────────────────────────────── */
export default function BigScreenPage() {
  const { sessionId } = useParams()
  const [session,    setSession]    = useState(null)
  const [teams,      setTeams]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tooltip,    setTooltip]    = useState(null)
  const [scoreAnim,  setScoreAnim]  = useState({t1:null, t2:null})
  const [stageFlash, setStageFlash] = useState(false)

  const canvasRef  = useRef(null)
  const mapRef     = useRef(null)
  const m1Ref      = useRef(null)
  const m2Ref      = useRef(null)
  const ptsRef     = useRef([])
  const prevStage  = useRef(null)
  const prevScores = useRef({t1:0, t2:0})

  useStars(canvasRef)

  /* ── Data + Realtime ──────────────────────────────────── */
  useEffect(() => {
    async function init(){
      const sess = await sessionsAPI.get(sessionId)
      setSession(sess)
      setTeams(sess?.session_teams || [])
      prevStage.current = sess?.current_stage
      setLoading(false)
    }
    init()

    const ch = supabase.channel(`bs-${sessionId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'sessions',filter:`id=eq.${sessionId}`},
        p => setSession(prev => ({...prev, ...p.new})))
      .on('postgres_changes',{event:'*',schema:'public',table:'session_teams',filter:`session_id=eq.${sessionId}`},
        p => setTeams(prev => prev.map(t => t.id===p.new.id ? {...t,...p.new} : t)))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [sessionId])

  /* ── Score fly ────────────────────────────────────────── */
  useEffect(() => {
    const t1=teams[0], t2=teams[1]
    if (!t1||!t2) return
    const prev = prevScores.current
    const d1=(t1.score||0)-(prev.t1||0), d2=(t2.score||0)-(prev.t2||0)
    if(d1>0){ setScoreAnim(a=>({...a,t1:d1})); setTimeout(()=>setScoreAnim(a=>({...a,t1:null})),900) }
    if(d2>0){ setScoreAnim(a=>({...a,t2:d2})); setTimeout(()=>setScoreAnim(a=>({...a,t2:null})),900) }
    prevScores.current = {t1:t1.score||0, t2:t2.score||0}
  }, [teams])

  /* ── Stage flash on advance ───────────────────────────── */
  useEffect(() => {
    if (!session || prevStage.current === null) return
    const cur = session.current_stage ?? 1
    if (cur !== prevStage.current) {
      setStageFlash(true)
      setTimeout(() => setStageFlash(false), 1200)
    }
  }, [session?.current_stage])

  /* ── Build pts ────────────────────────────────────────── */
  const rebuildPts = useCallback(() => { ptsRef.current = buildPts(mapRef) }, [])

  useEffect(() => {
    if (!loading) setTimeout(rebuildPts, 100)
  }, [loading, rebuildPts])

  /* ── Marker animation ─────────────────────────────────── */
  useEffect(() => {
    if (!session) return
    const cur  = session.current_stage ?? 1
    const prev = prevStage.current ?? cur

    if (cur === prev) {
      const pts = ptsRef.current
      if (pts.length >= cur && m1Ref.current && m2Ref.current) {
        const p = pts[cur-1]
        if (p) {
          m1Ref.current.style.left = p.x+'px'; m1Ref.current.style.top = p.y+'px'
          m2Ref.current.style.left = p.x+'px'; m2Ref.current.style.top = p.y+'px'
        }
      }
      return
    }
    prevStage.current = cur
    const pts = ptsRef.current
    if (!pts.length) return

    function animateMarker(markerRef, from, to, delay){
      setTimeout(() => {
        const m = markerRef.current; if (!m) return
        const step = from < to ? 1 : -1
        let c = from - 1
        const toIdx = to - 1

        function move(){
          if (c === toIdx){
            m.animate([
              {transform:'translate(-50%,-50%) scale(1)'},
              {transform:'translate(-50%,-80%) scale(1.6)'},
              {transform:'translate(-50%,-50%) scale(1)'}
            ],{duration:500,easing:'cubic-bezier(.36,1.4,.64,1)'}); return
          }
          c += step
          const p = pts[c]; if (!p) return
          m.style.transition = 'left .50s cubic-bezier(.4,0,.2,1), top .50s cubic-bezier(.4,0,.2,1)'
          m.style.left=p.x+'px'; m.style.top=p.y+'px'
          m.animate([
            {transform:'translate(-50%,-50%) scale(1)'},
            {transform:'translate(-50%,-80%) scale(1.4) rotate(-10deg)'},
            {transform:'translate(-50%,-50%) scale(1)'}
          ],{duration:460,easing:'cubic-bezier(.36,1.4,.64,1)'})
          setTimeout(move, 540)
        }
        move()
      }, delay)
    }

    animateMarker(m1Ref, prev, cur, 0)
    animateMarker(m2Ref, prev, cur, 220)
  }, [session?.current_stage])

  useEffect(() => {
    window.addEventListener('resize', rebuildPts)
    return () => window.removeEventListener('resize', rebuildPts)
  }, [rebuildPts])

  if (loading) return (
    <div className={s.loadScreen}>
      <div className={s.loadIcon}>💎</div>
      <p className={s.loadText}>جاري تحميل الجلسة…</p>
    </div>
  )
  if (!session) return (
    <div className={s.loadScreen}><p className={s.loadText}>❌ الجلسة غير موجودة</p></div>
  )

  const q          = session.current_question
  const state      = session.question_state
  const t1         = teams[0] || {}
  const t2         = teams[1] || {}
  const activeTeam = session.active_team ?? 0
  const curStage   = session.current_stage ?? 1
  const t1Score    = t1.score||0
  const t2Score    = t2.score||0
  const t1Leading  = t1Score >= t2Score

  return (
    <div className={`${s.screen} ${stageFlash ? s.screenFlash : ''}`}>
      <canvas ref={canvasRef} className={s.stars} />

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <header className={s.header}>

        {/* Team 1 */}
        <div className={`${s.teamChip} ${s.chip1} ${activeTeam===0 ? s.chipActive : ''}`}>
          {t1Leading && t1Score > 0 && <span className={s.leadCrown}>👑</span>}
          <span className={s.chipName}>{t1.team_name||'الفريق ١'}</span>
          <div className={s.chipScoreWrap}>
            <span className={s.chipScore}>
              {toAr(t1Score)}
              {scoreAnim.t1 && <span className={`${s.scoreFly} ${s.flyT1}`}>+{toAr(scoreAnim.t1)}</span>}
            </span>
          </div>
          <div className={s.chipHearts}>
            {Array.from({length:2}).map((_,i)=>(
              <span key={i} className={i<(t1.current_lives??2)?s.heartFull:s.heartEmpty}>
                {i<(t1.current_lives??2)?'❤️':'🖤'}
              </span>
            ))}
          </div>
        </div>

        {/* Center */}
        <div className={s.headerCenter}>
          <div className={s.headerLogo}>
            <span className={s.logoGem}>💎</span>
            <span className={s.shimmer}>اوجد الكنز</span>
          </div>
          {session.event_name && <div className={s.eventName}>{session.event_name}</div>}
          <div className={s.stageLabel}>
            <span className={s.stageBadge}>
              {STAGE_META[curStage-1]?.icon} المرحلة{' '}
              <span className={s.stageNum}>{toAr(curStage)}</span>
              {' '}/ {toAr(TOTAL_STAGES)}
            </span>
            <span className={s.stageName}>{STAGE_META[curStage-1]?.name}</span>
          </div>
        </div>

        {/* Team 2 */}
        <div className={`${s.teamChip} ${s.chip2} ${activeTeam===1 ? s.chipActive : ''}`}>
          {!t1Leading && t2Score > 0 && <span className={s.leadCrown}>👑</span>}
          <span className={s.chipName}>{t2.team_name||'الفريق ٢'}</span>
          <div className={s.chipScoreWrap}>
            <span className={s.chipScore}>
              {toAr(t2Score)}
              {scoreAnim.t2 && <span className={`${s.scoreFly} ${s.flyT2}`}>+{toAr(scoreAnim.t2)}</span>}
            </span>
          </div>
          <div className={s.chipHearts}>
            {Array.from({length:2}).map((_,i)=>(
              <span key={i} className={i<(t2.current_lives??2)?s.heartFull:s.heartEmpty}>
                {i<(t2.current_lives??2)?'❤️':'🖤'}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ══ SCORE BAR ════════════════════════════════════════ */}
      <div className={s.scoreBar}>
        <div className={s.sbLeft} style={{flex: t1Score || 1}}>
          <div className={s.sbFill1} />
        </div>
        <div className={s.sbCenter}>⚔️</div>
        <div className={s.sbRight} style={{flex: t2Score || 1}}>
          <div className={s.sbFill2} />
        </div>
      </div>

      {/* ══ STAGE MAP ════════════════════════════════════════ */}
      <div className={s.mapWrap} ref={mapRef}>
        <svg className={s.pathSvg}>
          <defs>
            <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#C9A227" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#E8C547" stopOpacity="0.5"/>
            </linearGradient>
          </defs>
        </svg>

        <div className={s.nodesGrid}>
          {Array.from({length:TOTAL_STAGES}, (_,i) => {
            const stage   = i+1
            const col     = stageCol(i)
            const row     = Math.floor(i/COLS)
            const isActive = stage === curStage
            const isDone   = stage < curStage
            const isLocked = stage > curStage
            const meta     = STAGE_META[i]
            return (
              <div
                key={stage}
                data-node={stage}
                className={[
                  s.node,
                  isActive ? s.nodeActive : '',
                  isDone   ? s.nodeDone   : '',
                  isLocked ? s.nodeLocked : '',
                ].join(' ')}
                style={{gridColumn:col+1, gridRow:row+1}}
                onClick={() => {
                  const pts = ptsRef.current
                  if (pts[i]) setTooltip(t => t?.stage===stage ? null : {
                    stage, meta, x:pts[i].x, y:pts[i].y
                  })
                }}
              >
                {/* Lock icon for future stages */}
                {isLocked ? (
                  <span className={s.nodeLockIcon}>🔒</span>
                ) : (
                  <>
                    <span className={s.nodeIcon}>{meta.icon}</span>
                    <span className={s.nodeNum}>{toAr(stage)}</span>
                  </>
                )}
                {isDone && <span className={s.nodeDoneCheck}>✓</span>}
                {isActive && <div className={s.nodePulse} />}
              </div>
            )
          })}
        </div>

        {/* Markers */}
        <div ref={m1Ref} className={`${s.marker} ${s.markerT1} ${t1Leading?s.markerLead:''}`}>
          <span className={s.markerEmoji}>🥇</span>
          <span className={s.markerLabel}>{t1.team_name||'ف١'}</span>
        </div>
        <div ref={m2Ref} className={`${s.marker} ${s.markerT2} ${!t1Leading?s.markerLead:''}`}>
          <span className={s.markerEmoji}>🥈</span>
          <span className={s.markerLabel}>{t2.team_name||'ف٢'}</span>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div className={s.tooltip} style={{left:tooltip.x, top:tooltip.y - 84}}>
            <span className={s.tooltipIcon}>{tooltip.meta.icon}</span>
            <strong className={s.tooltipTitle}>المرحلة {toAr(tooltip.stage)}</strong>
            <span className={s.tooltipName}>{tooltip.meta.name}</span>
            {tooltip.stage === curStage && <span className={s.tooltipActive}>← أنتم هنا الآن</span>}
            {tooltip.stage < curStage  && <span className={s.tooltipDone}>✓ مكتملة</span>}
            <button className={s.tooltipClose} onClick={()=>setTooltip(null)}>✕</button>
          </div>
        )}
      </div>

      {/* ══ PROGRESS BARS ════════════════════════════════════ */}
      <div className={s.progressBars}>
        {[{team:t1,color:'var(--t1)'}, {team:t2,color:'var(--t2)'}].map(({team,color},idx)=>{
          const pct = Math.round(((curStage-1)/14)*100)
          return (
            <div key={idx} className={s.pbRow}>
              <span className={s.pbLabel} style={{color}}>{team.team_name||`الفريق ${idx+1}`}</span>
              <div className={s.pbTrack}>
                <div className={s.pbFill} style={{width:`${pct}%`,background:color}} />
              </div>
              <span className={s.pbPct}>{toAr(pct)}٪</span>
            </div>
          )
        })}
      </div>

      {/* ══ QUESTION AREA ════════════════════════════════════ */}
      <div className={s.questionArea}>
        {(!q || state === 'waiting') ? (
          <div className={s.waiting}>
            {session.status === 'finished' ? (
              <>
                <div className={s.waitingIcon}>🏆</div>
                <p className={s.waitingTitle}>انتهت اللعبة!</p>
                <div className={s.winner}>
                  <span className={s.winnerCrown}>👑</span>
                  {t1Score >= t2Score ? t1.team_name : t2.team_name} يفوز!
                  <span className={s.winnerScore}>
                    {toAr(Math.max(t1Score,t2Score))} نقطة
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className={s.waitingIcon}>
                  {STAGE_META[curStage-1]?.icon || '🏺'}
                </div>
                <p className={s.waitingTitle}>
                  {STAGE_META[curStage-1]?.name} — في انتظار السؤال…
                </p>
              </>
            )}
          </div>
        ) : (
          <div className={s.questionBox}>
            <div className={s.qMeta}>
              {q.categories?.name_ar && <span className={s.qCat}>📂 {q.categories.name_ar}</span>}
              <span className={`${s.badge} ${s['badge_'+q.difficulty]}`}>{DIFF_AR[q.difficulty]}</span>
              <span className={s.qPoints}>⭐ {toAr(q.points)} نقطة</span>
            </div>

            <p className={s.qText}>{q.text}</p>

            {q.type === 'mcq' && q.options?.length > 0 && (
              <div className={s.options}>
                {q.options.map((o,i) => (
                  <div key={i} className={`${s.option} ${state==='revealed'&&o===q.correct_answer?s.optionCorrect:''}`}>
                    <span className={s.optionLetter}>{['أ','ب','ج','د'][i]}</span>
                    <span className={s.optionText}>{o}</span>
                  </div>
                ))}
              </div>
            )}

            {q.type === 'true_false' && (
              <div className={s.tfOptions}>
                <div className={`${s.tfOption} ${state==='revealed'&&q.correct_answer==='true'?s.optionCorrect:''}`}>
                  <span className={s.tfIcon}>✓</span> صح
                </div>
                <div className={`${s.tfOption} ${state==='revealed'&&q.correct_answer==='false'?s.optionCorrect:''}`}>
                  <span className={s.tfIcon}>✗</span> خطأ
                </div>
              </div>
            )}

            {state === 'revealed' && q.correct_answer && (
              <div className={s.answerReveal}>
                ✅ الإجابة الصحيحة: <strong>{q.correct_answer}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ TURN BAR ═════════════════════════════════════════ */}
      {session.status !== 'finished' && (
        <div className={s.turnBar}>
          {state === 'active'
            ? <><span className={s.turnDot} />دور: <strong>{teams[activeTeam]?.team_name||''}</strong></>
            : <span>⏳ انتظار السؤال القادم…</span>
          }
        </div>
      )}
    </div>
  )
}
