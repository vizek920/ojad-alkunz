import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI, questionsAPI } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import s from './GameControl.module.css'

/* ── helpers ─────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function toAr(n) { return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) }

const DIFF_AR  = { easy:'سهل', medium:'متوسط', hard:'صعب' }
const DIFF_PTS = { easy:10, medium:20, hard:30 }
const TOTAL    = 15
const COLS     = 5

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

/* ── Timer hook ──────────────────────────────────────────── */
function useTimer(initial) {
  const [seconds,   setSeconds]   = useState(initial)
  const [running,   setRunning]   = useState(false)
  const [finished,  setFinished]  = useState(false)
  const intervalRef = useRef(null)

  const start = useCallback(() => { setRunning(true); setFinished(false) }, [])
  const pause = useCallback(() => setRunning(false), [])
  const reset = useCallback((val) => {
    setRunning(false); setFinished(false); setSeconds(val ?? initial)
  }, [initial])

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(intervalRef.current); setRunning(false); setFinished(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  return { seconds, running, finished, start, pause, reset }
}

/* ── Stage Map Node ──────────────────────────────────────── */
function StageNode({ stage, current, onClick }) {
  const meta    = STAGE_META[stage - 1]
  const isDone  = stage < current
  const isActive = stage === current
  const isLocked = stage > current

  return (
    <div
      className={`${s.node} ${isActive ? s.nodeActive : ''} ${isDone ? s.nodeDone : ''} ${isLocked ? s.nodeLocked : ''}`}
      onClick={() => !isLocked && onClick(stage)}
      title={meta.name}
    >
      <span className={s.nodeIcon}>{meta.icon}</span>
      <span className={s.nodeNum}>{toAr(stage)}</span>
      {isLocked && <span className={s.lockIcon}>🔒</span>}
      {isActive  && <div className={s.nodePulse} />}
    </div>
  )
}

/* ── Stage Winner Modal ──────────────────────────────────── */
function StageWinnerModal({ winner, loser, onContinue }) {
  return (
    <div className={s.overlay}>
      <div className={s.winnerModal}>
        <div className={s.winnerCrown}>👑</div>
        <h2 className={s.winnerTitle}>فائز المرحلة!</h2>
        <div className={s.winnerName}>{winner.team_name}</div>
        <div className={s.winnerScores}>
          <div className={s.wsRow}>
            <span>{winner.team_name}</span>
            <span className={s.wsScore} style={{color:'var(--gold2)'}}>{toAr(winner.stageScore)} نقطة</span>
          </div>
          <div className={s.wsRow}>
            <span>{loser.team_name}</span>
            <span className={s.wsScore} style={{color:'var(--muted)'}}>{toAr(loser.stageScore)} نقطة</span>
          </div>
        </div>
        <button className={s.continueBtn} onClick={onContinue}>
          المرحلة التالية →
        </button>
      </div>
    </div>
  )
}

/* ── Stage Detail Modal ──────────────────────────────────── */
function StageModal({ stage, questions, usedIds, teams, onClose, onStartStage, timerVal, onTimerChange }) {
  const meta      = STAGE_META[stage - 1]
  const stageQs   = questions.filter(q => !usedIds.has(q.id))
  const easy      = stageQs.filter(q => q.difficulty === 'easy').length
  const medium    = stageQs.filter(q => q.difficulty === 'medium').length
  const hard      = stageQs.filter(q => q.difficulty === 'hard').length

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.stageModal} onClick={e => e.stopPropagation()}>
        <button className={s.modalClose} onClick={onClose}>✕</button>

        <div className={s.smHeader}>
          <span className={s.smIcon}>{meta.icon}</span>
          <div>
            <p className={s.smNum}>المرحلة {toAr(stage)}</p>
            <h3 className={s.smName}>{meta.name}</h3>
          </div>
        </div>

        <div className={s.smStats}>
          <div className={s.smStat}>
            <span className={s.smStatVal}>{toAr(stageQs.length)}</span>
            <span className={s.smStatLbl}>سؤال متاح</span>
          </div>
          <div className={s.smStat}>
            <span className={s.smStatVal} style={{color:'var(--success)'}}>
              {toAr(easy)}
            </span>
            <span className={s.smStatLbl}>سهل</span>
          </div>
          <div className={s.smStat}>
            <span className={s.smStatVal} style={{color:'var(--gold)'}}>
              {toAr(medium)}
            </span>
            <span className={s.smStatLbl}>متوسط</span>
          </div>
          <div className={s.smStat}>
            <span className={s.smStatVal} style={{color:'var(--t2)'}}>
              {toAr(hard)}
            </span>
            <span className={s.smStatLbl}>صعب</span>
          </div>
        </div>

        <div className={s.smTeamScores}>
          {teams.map((t, i) => (
            <div key={i} className={s.smTeamRow}>
              <span style={{color: i===0?'var(--t1)':'var(--t2)'}}>{t.team_name}</span>
              <span className={s.smTeamScore}>{toAr(t.score || 0)} نقطة</span>
            </div>
          ))}
        </div>

        <div className={s.smTimerRow}>
          <label className={s.smTimerLbl}>⏱ وقت كل سؤال (ثانية)</label>
          <div className={s.smTimerControls}>
            {[10,20,30,60].map(v => (
              <button
                key={v}
                className={`${s.timerPreset} ${timerVal===v ? s.timerPresetActive : ''}`}
                onClick={() => onTimerChange(v)}
              >{toAr(v)}</button>
            ))}
            <input
              type="number" min="5" max="300"
              value={timerVal}
              onChange={e => onTimerChange(Number(e.target.value))}
              className={s.timerInput}
            />
          </div>
        </div>

        <button className={s.startStageBtn} onClick={onStartStage}>
          🎯 بدء المرحلة
        </button>
      </div>
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────── */
export default function GameControl() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [session,    setSession]    = useState(null)
  const [teams,      setTeams]      = useState([])
  const [questions,  setQuestions]  = useState([])
  const [usedIds,    setUsedIds]    = useState(new Set())
  const [question,   setQuestion]   = useState(null)
  const [revealed,   setRevealed]   = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [activeTeam, setActiveTeam] = useState(0)
  const [doubleUsed, setDoubleUsed] = useState(false)

  // Stage modal
  const [stageModal,   setStageModal]   = useState(null)   // stage number | null
  const [stageMode,    setStageMode]    = useState(false)  // playing stage questions
  const [stageQs,      setStageQs]      = useState([])    // queue for current stage
  const [stageQIdx,    setStageQIdx]    = useState(0)
  const [stageScores,  setStageScores]  = useState({t1:0, t2:0})

  // Winner modal
  const [winnerModal, setWinnerModal] = useState(null)  // { winner, loser }

  // Timer
  const [timerVal, setTimerVal] = useState(30)
  const timer = useTimer(timerVal)

  // Load data
  useEffect(() => {
    async function init() {
      const [sess, qList] = await Promise.all([
        sessionsAPI.get(id),
        questionsAPI.list({ limit: 500 })
      ])
      setSession(sess)
      setTeams(sess?.session_teams || [])
      setQuestions(shuffle(qList || []))
      setLoading(false)
    }
    init()
  }, [id])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`gc-${id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'sessions', filter:`id=eq.${id}` },
        p => setSession(prev => ({...prev, ...p.new})))
      .on('postgres_changes', { event:'*', schema:'public', table:'session_teams', filter:`session_id=eq.${id}` },
        p => setTeams(prev => prev.map(t => t.id === p.new.id ? {...t,...p.new} : t)))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id])

  // Flash screen when timer finishes
  useEffect(() => {
    if (timer.finished) {
      document.body.classList.add('timer-flash')
      setTimeout(() => document.body.classList.remove('timer-flash'), 800)
    }
  }, [timer.finished])

  /* ── Stage modal handlers ─────────────────────────── */
  function openStageModal(stage) {
    setStageModal(stage)
  }

  function startStage() {
    const stg = stageModal
    setStageModal(null)
    // Get questions for this stage, shuffled, sorted easy→hard
    const pool = shuffle(questions.filter(q => !usedIds.has(q.id)))
    const order = ['easy','medium','hard']
    pool.sort((a,b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))
    setStageQs(pool)
    setStageQIdx(0)
    setStageMode(true)
    setStageScores({t1:0, t2:0})
    // Show first question
    const q = pool[0]
    if (q) activateQuestion(q)
  }

  function activateQuestion(q) {
    setQuestion(q)
    setRevealed(false)
    setDoubleUsed(false)
    timer.reset(timerVal)
    timer.start()
    setUsedIds(prev => new Set([...prev, q.id]))
    sessionsAPI.update(id, {
      current_question: q,
      question_state: 'active',
      active_team: activeTeam,
    })
  }

  /* ── Free draw ─────────────────────────────────────── */
  function drawQuestion() {
    const available = questions.filter(q => !usedIds.has(q.id))
    if (!available.length) { alert('انتهت جميع الأسئلة!'); return }
    const q = available[Math.floor(Math.random() * available.length)]
    activateQuestion(q)
  }

  async function revealAnswer() {
    setRevealed(true)
    timer.pause()
    await sessionsAPI.update(id, { question_state: 'revealed' })
  }

  async function awardPoints(teamIdx, correct) {
    if (!question) return
    const team = teams[teamIdx]
    if (!team) return
    let pts = correct ? (question.points || DIFF_PTS[question.difficulty] || 10) : 0
    if (correct && doubleUsed) pts *= 2
    const newScore = (team.score || 0) + pts

    await sessionsAPI.updateTeam(team.id, { score: newScore })
    setTeams(prev => prev.map((t,i) => i===teamIdx ? {...t, score: newScore} : t))

    if (!correct) {
      const lives = (team.current_lives ?? 2) - 1
      await sessionsAPI.updateTeam(team.id, { current_lives: Math.max(0, lives) })
      setTeams(prev => prev.map((t,i) => i===teamIdx ? {...t, current_lives: Math.max(0, lives)} : t))
    }

    // Track stage score
    if (stageMode) {
      setStageScores(prev => ({
        ...prev,
        [`t${teamIdx+1}`]: (prev[`t${teamIdx+1}`] || 0) + pts
      }))
    }

    // Next question in stage mode
    if (stageMode) {
      const nextIdx = stageQIdx + 1
      setStageQIdx(nextIdx)
      if (nextIdx < stageQs.length) {
        const nextQ = stageQs[nextIdx]
        setActiveTeam(teamIdx === 0 ? 1 : 0)
        activateQuestion(nextQ)
      } else {
        // Stage finished — determine winner
        endStage(pts, teamIdx, correct)
      }
    } else {
      setQuestion(null)
      setRevealed(false)
      setActiveTeam(teamIdx === 0 ? 1 : 0)
      await sessionsAPI.update(id, { question_state: 'waiting', current_question: null })
    }
  }

  function endStage(lastPts, lastTeamIdx, correct) {
    const finalScores = {
      t1: stageScores.t1 + (lastTeamIdx===0 && correct ? lastPts : 0),
      t2: stageScores.t2 + (lastTeamIdx===1 && correct ? lastPts : 0),
    }
    const t1 = teams[0] || {}
    const t2 = teams[1] || {}
    const winner = finalScores.t1 >= finalScores.t2
      ? { ...t1, stageScore: finalScores.t1 }
      : { ...t2, stageScore: finalScores.t2 }
    const loser  = finalScores.t1 >= finalScores.t2
      ? { ...t2, stageScore: finalScores.t2 }
      : { ...t1, stageScore: finalScores.t1 }

    setStageMode(false)
    setQuestion(null)
    setRevealed(false)
    sessionsAPI.update(id, { question_state: 'waiting', current_question: null })
    setWinnerModal({ winner, loser })
  }

  async function proceedNextStage() {
    setWinnerModal(null)
    await nextStage()
  }

  async function nextStage() {
    const nextStg = (session?.current_stage || 1) + 1
    if (nextStg > 15) {
      await sessionsAPI.update(id, { status: 'finished' })
      return
    }
    await sessionsAPI.update(id, { current_stage: nextStg })
    for (const t of teams) {
      await sessionsAPI.updateTeam(t.id, { current_lives: 2 })
    }
    setTeams(prev => prev.map(t => ({...t, current_lives: 2})))
    setDoubleUsed(false)
    setQuestion(null)
    setRevealed(false)
    timer.reset(timerVal)
  }

  async function skipQuestion() {
    setQuestion(null)
    setRevealed(false)
    timer.reset(timerVal)
    await sessionsAPI.update(id, { question_state: 'waiting', current_question: null })
    if (stageMode) {
      const nextIdx = stageQIdx + 1
      setStageQIdx(nextIdx)
      if (nextIdx < stageQs.length) activateQuestion(stageQs[nextIdx])
      else endStage(0, activeTeam, false)
    }
  }

  async function toggleStatus() {
    const next = session?.status === 'active' ? 'waiting' : 'active'
    await sessionsAPI.update(id, { status: next })
    setSession(prev => ({...prev, status: next}))
  }

  /* ── snake grid col ──────────────────────────────── */
  function stageCol(idx) {
    const row = Math.floor(idx / COLS), pos = idx % COLS
    if (row === 0) return 4 - pos
    if (row === 1) return pos
    return 4 - pos
  }

  if (loading) return <div className={s.loading}>⏳ تحميل الجلسة…</div>
  if (!session) return <div className={s.loading}>❌ الجلسة غير موجودة</div>

  const t1 = teams[0] || {}
  const t2 = teams[1] || {}
  const curStage = session.current_stage || 1

  // Timer color
  const timerPct = timer.seconds / timerVal
  const timerColor = timerPct > 0.5 ? 'var(--success)' : timerPct > 0.25 ? 'var(--gold)' : 'var(--t2)'

  return (
    <div className={s.page}>
      {/* ── Top bar ── */}
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={() => navigate('/admin-kanz/sessions')}>← رجوع</button>
        <h2 className={s.eventName}>{session.event_name}</h2>
        <div className={s.topRight}>
          <span className={s.stageLabel}>المرحلة <strong>{toAr(curStage)}</strong> / {toAr(TOTAL)}</span>
          <a className={s.screenBtn} href={`/screen/${id}`} target="_blank" rel="noreferrer">📺 شاشة</a>
          <button
            className={`${s.statusBtn} ${session.status==='active' ? s.statusBtnActive : ''}`}
            onClick={toggleStatus}
          >
            {session.status === 'active' ? '⏸ إيقاف' : '▶ تشغيل'}
          </button>
        </div>
      </div>

      <div className={s.body}>
        {/* ── Left: Stage map ── */}
        <div className={s.mapCol}>
          <h3 className={s.mapTitle}>🗺️ خريطة المراحل</h3>
          <p className={s.mapHint}>انقر على مرحلة لفتح أسئلتها</p>
          <div className={s.mapGrid}>
            {Array.from({length:TOTAL}, (_,i) => {
              const stage = i + 1
              const col   = stageCol(i)
              const row   = Math.floor(i / COLS)
              return (
                <div
                  key={stage}
                  style={{ gridColumn: col+1, gridRow: row+1 }}
                >
                  <StageNode
                    stage={stage}
                    current={curStage}
                    onClick={openStageModal}
                  />
                </div>
              )
            })}
          </div>

          {/* Team scores compact */}
          <div className={s.mapTeams}>
            {[t1,t2].map((t,i)=>(
              <div key={i} className={`${s.mapTeam} ${activeTeam===i ? s.mapTeamActive : ''}`}>
                <span className={s.mapTeamName} style={{color:i===0?'var(--t1)':'var(--t2)'}}>
                  {t.team_name}
                </span>
                <span className={s.mapTeamScore}>{toAr(t.score||0)}</span>
                <div className={s.mapTeamHearts}>
                  {Array.from({length:2}).map((_,li)=>(
                    <span key={li}>{li < (t.current_lives??2) ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Question + Timer ── */}
        <div className={s.mainCol}>
          {/* Timer bar */}
          <div className={s.timerBox}>
            <div className={s.timerTop}>
              <span className={s.timerLabel}>⏱ المؤقت</span>
              <div className={s.timerControls}>
                <input
                  type="number" min="5" max="300"
                  value={timerVal}
                  onChange={e => { const v=Number(e.target.value); setTimerVal(v); timer.reset(v) }}
                  className={s.timerInput}
                />
                <span>ثانية</span>
                <button className={s.timerBtn} onClick={timer.running ? timer.pause : timer.start}>
                  {timer.running ? '⏸' : '▶'}
                </button>
                <button className={s.timerBtn} onClick={() => timer.reset(timerVal)}>↺</button>
              </div>
            </div>
            <div className={s.timerTrack}>
              <div
                className={`${s.timerFill} ${timer.finished ? s.timerDone : ''}`}
                style={{ width: `${(timer.seconds/timerVal)*100}%`, background: timerColor }}
              />
            </div>
            <div className={s.timerNum} style={{color: timerColor}}>
              {toAr(timer.seconds)}
            </div>
            {timer.finished && (
              <div className={s.timerAlert}>⏰ انتهى الوقت!</div>
            )}
          </div>

          {/* Question area */}
          <div className={s.qArea}>
            {!question ? (
              <div className={s.noQ}>
                <span className={s.noQIcon}>🎲</span>
                <p className={s.noQText}>اضغط لسحب سؤال عشوائي</p>
                <button className={s.drawBtn} onClick={drawQuestion}>
                  🎯 سحب سؤال
                </button>
                <p className={s.bankInfo}>
                  متبقي: {toAr(questions.filter(q=>!usedIds.has(q.id)).length)} / {toAr(questions.length)} سؤال
                </p>
                {stageMode && (
                  <p className={s.stageInfo}>
                    سؤال {toAr(stageQIdx+1)} / {toAr(stageQs.length)} في المرحلة
                  </p>
                )}
              </div>
            ) : (
              <div className={s.qBox}>
                <div className={s.qMeta}>
                  <span className={`${s.badge} ${s[`badge_${question.difficulty}`]}`}>
                    {DIFF_AR[question.difficulty]}
                  </span>
                  <span className={s.qPts}>⭐ {toAr(question.points || DIFF_PTS[question.difficulty])} نقطة</span>
                  {question.categories?.name && (
                    <span className={s.qCat}>📂 {question.categories.name}</span>
                  )}
                  {stageMode && (
                    <span className={s.qStageProgress}>
                      {toAr(stageQIdx+1)} / {toAr(stageQs.length)}
                    </span>
                  )}
                </div>

                <p className={s.qText}>{question.text}</p>

                {question.type === 'mcq' && question.options?.length > 0 && (
                  <div className={s.opts}>
                    {question.options.map((o,i) => (
                      <div key={i} className={`${s.opt} ${revealed && o===question.answer ? s.optCorrect : ''}`}>
                        <span className={s.optLetter}>{['أ','ب','ج','د'][i]}</span>
                        <span>{o}</span>
                      </div>
                    ))}
                  </div>
                )}
                {question.type === 'true_false' && (
                  <div className={s.tfRow}>
                    <div className={`${s.tf} ${revealed && question.answer==='true'  ? s.optCorrect : ''}`}>✓ صح</div>
                    <div className={`${s.tf} ${revealed && question.answer==='false' ? s.optCorrect : ''}`}>✗ خطأ</div>
                  </div>
                )}
                {revealed && question.answer && (
                  <div className={s.answerReveal}>✅ الإجابة: {question.answer}</div>
                )}

                <div className={s.qActions}>
                  {!revealed && (
                    <button className={s.actionBtn} onClick={revealAnswer}>👁 كشف الإجابة</button>
                  )}
                  {!doubleUsed ? (
                    <button className={s.actionBtn} onClick={() => setDoubleUsed(true)}>×٢ مضاعفة</button>
                  ) : (
                    <span className={s.doubleBadge}>×٢ فعّال</span>
                  )}
                  <button className={s.actionBtnGhost} onClick={skipQuestion}>تخطي ⏭</button>
                </div>

                <div className={s.awardRow}>
                  <p className={s.awardLabel}>من أجاب بشكل صحيح؟</p>
                  <div className={s.awardBtns}>
                    {[t1,t2].map((t,i)=>(
                      <div key={i} className={s.awardTeam}>
                        <button className={s.awardCorrect} onClick={() => awardPoints(i, true)}>
                          ✓ {t.team_name}
                        </button>
                        <button className={s.awardWrong} onClick={() => awardPoints(i, false)}>
                          ✗ {t.team_name}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stage nav */}
          <div className={s.stageBar}>
            <button className={s.nextStageBtn} onClick={nextStage}>
              {curStage >= TOTAL ? '🏆 إنهاء اللعبة' : `التالية → المرحلة ${toAr(curStage+1)}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stage Detail Modal ── */}
      {stageModal && (
        <StageModal
          stage={stageModal}
          questions={questions}
          usedIds={usedIds}
          teams={teams}
          timerVal={timerVal}
          onTimerChange={v => { setTimerVal(v); timer.reset(v) }}
          onClose={() => setStageModal(null)}
          onStartStage={startStage}
        />
      )}

      {/* ── Stage Winner Modal ── */}
      {winnerModal && (
        <StageWinnerModal
          winner={winnerModal.winner}
          loser={winnerModal.loser}
          onContinue={proceedNextStage}
        />
      )}
    </div>
  )
}
