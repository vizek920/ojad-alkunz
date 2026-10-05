import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { sessionsAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import s from './BigScreenPage.module.css'

const DIFF_AR  = { easy:'سهل', medium:'متوسط', hard:'صعب' }
const TYPES_AR = { mcq:'اختيار متعدد', true_false:'صح / خطأ', open:'سؤال مفتوح' }

export default function BigScreenPage() {
  const { sessionId } = useParams()
  const [session,  setSession]  = useState(null)
  const [teams,    setTeams]    = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function init() {
      const sess = await sessionsAPI.get(sessionId)
      setSession(sess)
      setTeams(sess?.session_teams || [])
      setLoading(false)
    }
    init()

    const ch = supabase.channel(`bs-${sessionId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'sessions', filter:`id=eq.${sessionId}` },
        p => setSession(prev => ({...prev, ...p.new})))
      .on('postgres_changes', { event:'*', schema:'public', table:'session_teams', filter:`session_id=eq.${sessionId}` },
        p => setTeams(prev => prev.map(t => t.id===p.new.id ? {...t,...p.new} : t)))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [sessionId])

  if (loading) return (
    <div className={s.loading}>
      <div className={s.loadingIcon}>🏺</div>
      <p>جاري تحميل الجلسة…</p>
    </div>
  )
  if (!session) return (
    <div className={s.loading}><p>❌ الجلسة غير موجودة</p></div>
  )

  const q     = session.current_question
  const state = session.question_state   // 'waiting' | 'active' | 'revealed'
  const t1    = teams[0] || {}
  const t2    = teams[1] || {}
  const activeTeam = session.active_team ?? 0

  // Progress dots for stages
  const stages = Array.from({length:15}, (_,i) => i+1)

  return (
    <div className={s.screen}>
      {/* Header */}
      <header className={s.header}>
        <div className={s.headerLogo}>
          <span className="gem">💎</span>
          <span className="shimmer-text">اوجد الكنز</span>
        </div>
        <div className={s.headerCenter}>
          <span className={s.headerEvent}>{session.event_name}</span>
        </div>
        <div className={s.headerStage}>
          المرحلة
          <span className={s.stageNum}>{session.current_stage}</span>
          / 15
        </div>
      </header>

      {/* Stage progress dots */}
      <div className={s.progress}>
        {stages.map(n => (
          <div key={n} className={`${s.progressDot}
            ${n === session.current_stage ? s.progressDotActive : ''}
            ${n < session.current_stage  ? s.progressDotDone   : ''}`}
          />
        ))}
      </div>

      {/* Main layout */}
      <div className={s.main}>
        {/* Team 1 */}
        <TeamPanel team={t1} color="var(--team1)" isActive={activeTeam===0} side="right" />

        {/* Question center */}
        <div className={s.questionArea}>
          {(!q || state === 'waiting') ? (
            <div className={s.waiting}>
              <div className={s.waitingIcon}>🏺</div>
              <p>{session.status==='finished' ? '🏆 انتهت اللعبة!' : 'في انتظار السؤال التالي…'}</p>
              {session.status==='finished' && (
                <div className={s.winner}>
                  <span>🥇</span>
                  <span>{(t1.score||0) >= (t2.score||0) ? t1.team_name : t2.team_name} يفوز!</span>
                </div>
              )}
            </div>
          ) : (
            <div className={s.questionBox}>
              <div className={s.qCategory}>
                {q.categories?.name && <span>📂 {q.categories.name}</span>}
                <span className={s.qDifficulty}>
                  <span className={`badge badge-${q.difficulty}`}>{DIFF_AR[q.difficulty]}</span>
                  <span className={s.qPoints}>⭐ {q.points} نقطة</span>
                </span>
              </div>

              <p className={s.qText}>{q.text}</p>

              {q.type === 'mcq' && q.options?.length > 0 && (
                <div className={s.options}>
                  {q.options.map((o,i) => (
                    <div key={i} className={`${s.option} ${state==='revealed' && o===q.answer ? s.optionCorrect : ''}`}>
                      <span className={s.optionLetter}>{['أ','ب','ج','د'][i]}</span>
                      <span>{o}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'true_false' && (
                <div className={s.tfOptions}>
                  <div className={`${s.tfOption} ${state==='revealed' && q.answer==='true'  ? s.optionCorrect : ''}`}>✓ صح</div>
                  <div className={`${s.tfOption} ${state==='revealed' && q.answer==='false' ? s.optionCorrect : ''}`}>✗ خطأ</div>
                </div>
              )}

              {state === 'revealed' && q.answer && (
                <div className={s.answerReveal}>✅ الإجابة الصحيحة: {q.answer}</div>
              )}
            </div>
          )}
        </div>

        {/* Team 2 */}
        <TeamPanel team={t2} color="var(--team2)" isActive={activeTeam===1} side="left" />
      </div>

      {/* Turn bar */}
      {session.status !== 'finished' && (
        <div className={s.turnBar} style={{color:'var(--muted)'}}>
          {state === 'active' ? `🎯 دور: ${teams[activeTeam]?.team_name || ''}` : '⏳ انتظار…'}
        </div>
      )}
    </div>
  )
}

function TeamPanel({ team, color, isActive, side }) {
  return (
    <div className={`${s.teamCard} ${isActive ? s.teamCardActive : ''}`}>
      {isActive && <div className={s.activePulse} style={{background:color}} />}
      <h2 className={s.teamName} style={{color}}>{team.team_name}</h2>
      <div className={s.teamScore} style={{color}}>{team.score || 0}</div>
      <p className={s.teamScoreLabel}>نقطة</p>
      <div className={s.teamLives}>
        {Array.from({length:2}).map((_,i)=>(
          <span key={i} className={s.heart}>
            {i < (team.current_lives ?? 2) ? '❤️' : '🖤'}
          </span>
        ))}
      </div>
    </div>
  )
}
