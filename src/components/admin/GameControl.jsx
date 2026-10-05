import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI, questionsAPI } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import s from './GameControl.module.css'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DIFF_AR = { easy:'سهل', medium:'متوسط', hard:'صعب' }
const DIFF_PTS = { easy:1, medium:2, hard:3 }

export default function GameControl() {
  const { id }     = useParams()
  const navigate   = useNavigate()

  const [session,   setSession]   = useState(null)
  const [teams,     setTeams]     = useState([])
  const [questions, setQuestions] = useState([])   // full shuffled bank
  const [usedIds,   setUsedIds]   = useState(new Set())
  const [question,  setQuestion]  = useState(null)
  const [revealed,  setRevealed]  = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [activeTeam,setActiveTeam]= useState(0)    // 0 = team1, 1 = team2
  const [doubleUsed,setDoubleUsed]= useState(false)

  // Load session + questions once
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

  // Realtime subscription — keep local state in sync
  useEffect(() => {
    const ch = supabase.channel(`gc-${id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'sessions', filter:`id=eq.${id}` },
        p => setSession(prev => ({...prev, ...p.new})))
      .on('postgres_changes', { event:'*', schema:'public', table:'session_teams', filter:`session_id=eq.${id}` },
        p => setTeams(prev => prev.map(t => t.id === p.new.id ? {...t,...p.new} : t)))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id])

  // Pick next question (random, non-repeated)
  function pickQuestion() {
    const available = questions.filter(q => !usedIds.has(q.id))
    if (available.length === 0) return null
    return available[Math.floor(Math.random() * available.length)]
  }

  function drawQuestion() {
    const q = pickQuestion()
    if (!q) { alert('انتهت جميع الأسئلة!'); return }
    setQuestion(q)
    setRevealed(false)
    setDoubleUsed(false)
    setUsedIds(prev => new Set([...prev, q.id]))
    // Push to session so BigScreen shows it
    sessionsAPI.update(id, {
      current_question: q,
      question_state: 'active',
      active_team: activeTeam,
    })
  }

  async function revealAnswer() {
    setRevealed(true)
    await sessionsAPI.update(id, { question_state: 'revealed' })
  }

  async function awardPoints(teamIdx, correct) {
    if (!question) return
    const team = teams[teamIdx]
    if (!team) return
    let pts = correct ? (question.points || DIFF_PTS[question.difficulty] || 1) : 0
    if (correct && doubleUsed) pts *= 2
    const newScore = (team.score || 0) + pts
    await sessionsAPI.updateTeam(team.id, { score: newScore })
    setTeams(prev => prev.map((t,i) => i===teamIdx ? {...t, score: newScore} : t))
    // Wrong answer = lose a life in current stage
    if (!correct) {
      const lives = (team.current_lives ?? 2) - 1
      await sessionsAPI.updateTeam(team.id, { current_lives: Math.max(0, lives) })
      setTeams(prev => prev.map((t,i) => i===teamIdx ? {...t, current_lives: Math.max(0, lives)} : t))
    }
    setQuestion(null)
    setRevealed(false)
    setActiveTeam(teamIdx === 0 ? 1 : 0)
    await sessionsAPI.update(id, { question_state: 'waiting', current_question: null })
  }

  async function nextStage() {
    const nextStg = (session?.current_stage || 1) + 1
    if (nextStg > 15) {
      await sessionsAPI.update(id, { status: 'finished' })
      return
    }
    await sessionsAPI.update(id, { current_stage: nextStg })
    // Reset lives for both teams
    for (const t of teams) {
      await sessionsAPI.updateTeam(t.id, { current_lives: 2 })
    }
    setTeams(prev => prev.map(t => ({...t, current_lives: 2})))
    setDoubleUsed(false)
    setQuestion(null)
    setRevealed(false)
  }

  async function toggleStatus() {
    const next = session?.status === 'active' ? 'waiting' : 'active'
    await sessionsAPI.update(id, { status: next })
    setSession(prev => ({...prev, status: next}))
  }

  if (loading) return <div className={s.loading}>⏳ تحميل الجلسة…</div>
  if (!session) return <div className={s.loading}>❌ الجلسة غير موجودة</div>

  const t1 = teams[0] || {}
  const t2 = teams[1] || {}

  return (
    <div className={s.page}>
      {/* Top bar */}
      <div className={s.topBar}>
        <button className="btn btn-ghost" onClick={()=>navigate('/admin-kanz/sessions')}>← رجوع</button>
        <h2 className={s.eventName}>{session.event_name}</h2>
        <div className={s.topRight}>
          <span className={s.stageLabel}>المرحلة <strong>{session.current_stage}</strong> / 15</span>
          <a className="btn btn-ghost" href={`/screen/${id}`} target="_blank" rel="noreferrer">📺 شاشة</a>
          <button className={`btn ${session.status==='active'?'btn-danger':'btn-success'}`} onClick={toggleStatus}>
            {session.status==='active' ? '⏸ إيقاف' : '▶️ تشغيل'}
          </button>
        </div>
      </div>

      {/* Teams scores */}
      <div className={s.teams}>
        {[t1,t2].map((t,i)=>(
          <div key={i} className={`card ${s.teamCard} ${activeTeam===i ? s.teamActive : ''}`}>
            <div className={s.teamColor} style={{background: i===0?'var(--team1)':'var(--team2)'}} />
            <h3 className={s.teamName} style={{color: i===0?'var(--team1)':'var(--team2)'}}>{t.team_name}</h3>
            <div className={s.teamScore}>{t.score || 0}</div>
            <div className={s.teamLives}>
              {Array.from({length:2}).map((_,li)=>(
                <span key={li} className={li < (t.current_lives??2) ? s.heartFull : s.heartEmpty}>
                  {li < (t.current_lives??2) ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
            {activeTeam===i && <span className={s.turnBadge}>دوره الآن</span>}
          </div>
        ))}
      </div>

      {/* Question area */}
      <div className={`card card-gold ${s.qArea}`}>
        {!question ? (
          <div className={s.noQ}>
            <span className={s.noQIcon}>🎲</span>
            <p>اضغط لسحب سؤال عشوائي</p>
            <button className="btn btn-primary" style={{fontSize:'1.1rem',padding:'12px 32px'}} onClick={drawQuestion}>
              🎯 سحب سؤال
            </button>
            <p className={s.bankInfo}>متبقي: {questions.filter(q=>!usedIds.has(q.id)).length} / {questions.length} سؤال</p>
          </div>
        ) : (
          <div className={s.qBox}>
            <div className={s.qMeta}>
              <span className={`badge badge-${question.difficulty}`}>{DIFF_AR[question.difficulty]}</span>
              <span className={s.qPts}>⭐ {question.points || DIFF_PTS[question.difficulty]} نقطة</span>
              {question.categories?.name && <span className={s.qCat}>📂 {question.categories.name}</span>}
            </div>
            <p className={s.qText}>{question.text}</p>

            {question.type === 'mcq' && question.options?.length > 0 && (
              <div className={s.opts}>
                {question.options.map((o,i)=>(
                  <div key={i} className={`${s.opt} ${revealed && o===question.answer ? s.optCorrect : ''}`}>
                    <span className={s.optLetter}>{['أ','ب','ج','د'][i]}</span>
                    <span>{o}</span>
                  </div>
                ))}
              </div>
            )}
            {question.type === 'true_false' && (
              <div className={s.tfRow}>
                <div className={`${s.tf} ${revealed && question.answer==='true' ? s.optCorrect : ''}`}>✓ صح</div>
                <div className={`${s.tf} ${revealed && question.answer==='false' ? s.optCorrect : ''}`}>✗ خطأ</div>
              </div>
            )}
            {revealed && question.answer && (
              <div className={s.answerReveal}>✅ الإجابة: {question.answer}</div>
            )}

            <div className={s.qActions}>
              {!revealed && (
                <button className="btn btn-ghost" onClick={revealAnswer}>👁 كشف الإجابة</button>
              )}
              {!doubleUsed && (
                <button className="btn btn-ghost" onClick={()=>setDoubleUsed(true)}>×2 مضاعفة</button>
              )}
              {doubleUsed && <span className={s.doubleBadge}>×2 فعّال</span>}
            </div>

            <div className={s.awardRow}>
              <p className={s.awardLabel}>من أجاب بشكل صحيح؟</p>
              {[t1,t2].map((t,i)=>(
                <div key={i} className={s.awardBtns}>
                  <button className="btn btn-success" onClick={()=>awardPoints(i,true)}>
                    ✓ {t.team_name}
                  </button>
                  <button className="btn btn-danger" onClick={()=>awardPoints(i,false)}>
                    ✗ {t.team_name}
                  </button>
                </div>
              ))}
              <button className="btn btn-ghost" onClick={()=>{ setQuestion(null); setRevealed(false) }}>
                تخطي ⏭
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stage control */}
      <div className={s.stageBar}>
        <button className="btn btn-primary" onClick={nextStage}>
          {session.current_stage >= 15 ? '🏆 إنهاء اللعبة' : `التالية → المرحلة ${(session.current_stage||1)+1}`}
        </button>
      </div>
    </div>
  )
}
