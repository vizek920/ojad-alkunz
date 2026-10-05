import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { sessionsAPI, questionsAPI } from '../lib/api'
import { supabase } from '../lib/supabase'
import styles from './BigScreenPage.module.css'

export default function BigScreenPage() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [teams, setTeams] = useState({ team1: null, team2: null })
  const [stages, setStages] = useState([])
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await sessionsAPI.get(sessionId)
    setSession(data)
    setTeams({
      team1: data.session_teams.find(t => t.team_key === 'team1'),
      team2: data.session_teams.find(t => t.team_key === 'team2')
    })
    setStages(data.session_stages.sort((a, b) => a.stage_number - b.stage_number))

    if (data.current_question_id && data.show_question) {
      const q = await questionsAPI.get(data.current_question_id)
      setQuestion(q)
    } else {
      setQuestion(null)
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => { load() }, [load])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`screen:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_teams', filter: `session_id=eq.${sessionId}` },
        () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [sessionId, load])

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingIcon}>🏺</div>
        <p>جارٍ التحميل...</p>
      </div>
    )
  }

  if (!session) {
    return <div className={styles.loading}><p>الجلسة غير موجودة</p></div>
  }

  const currentStage = stages[session.current_stage - 1]
  const t1 = teams.team1
  const t2 = teams.team2
  const activeTeam = session.current_turn

  return (
    <div className={styles.screen}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLogo}>🏺 اوجد الكنز</div>
        <div className={styles.headerEvent}>{session.event_name}</div>
        <div className={styles.headerStage}>
          المرحلة <span className={styles.stageNum}>{session.current_stage}</span>
          <span className="muted"> / {session.total_stages}</span>
        </div>
      </header>

      {/* Stage progress */}
      <div className={styles.progress}>
        {stages.map(s => (
          <div key={s.stage_number}
            className={`${styles.progressDot}
              ${s.stage_number === session.current_stage ? styles.progressDotActive : ''}
              ${s.status === 'finished' ? styles.progressDotDone : ''}`} />
        ))}
      </div>

      {/* Main content */}
      <div className={styles.main}>
        {/* Team 1 */}
        <TeamCard team={t1} stage={currentStage} teamKey="team1" isActive={activeTeam === 'team1'} />

        {/* Question area */}
        <div className={styles.questionArea}>
          {session.show_question && question ? (
            <div className={styles.questionBox}>
              {question.categories && (
                <div className={styles.qCategory}>
                  {question.categories.icon} {question.categories.name_ar}
                </div>
              )}
              <div className={styles.qDifficulty}>
                <span className={`badge badge-${question.difficulty}`}>
                  {{ easy:'سهل', medium:'متوسط', hard:'صعب' }[question.difficulty]}
                </span>
                <span className={styles.qPoints}>{question.points} نقطة</span>
              </div>
              <p className={styles.qText}>{question.text}</p>

              {question.type === 'mcq' && question.options && (
                <div className={styles.options}>
                  {question.options.map((opt, i) => (
                    <div key={i}
                      className={`${styles.option}
                        ${session.show_answer && opt === question.correct_answer ? styles.optionCorrect : ''}`}>
                      <span className={styles.optionLetter}>{['أ','ب','ج','د'][i]}</span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}

              {question.type === 'tf' && (
                <div className={styles.tfOptions}>
                  {['صح', 'خطأ'].map(opt => (
                    <div key={opt}
                      className={`${styles.tfOption}
                        ${session.show_answer && opt === question.correct_answer ? styles.optionCorrect : ''}`}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              {session.show_answer && (
                <div className={styles.answerReveal}>
                  ✓ الإجابة: {question.correct_answer}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.waiting}>
              <div className={styles.waitingIcon}>🏺</div>
              <p>{session.event_name}</p>
              <p className="muted" style={{fontSize:'1rem'}}>
                {session.status === 'waiting' ? 'في انتظار بدء اللعبة' : 'جارٍ تحضير السؤال...'}
              </p>
            </div>
          )}
        </div>

        {/* Team 2 */}
        <TeamCard team={t2} stage={currentStage} teamKey="team2" isActive={activeTeam === 'team2'} />
      </div>

      {/* Turn indicator */}
      {session.status === 'active' && (
        <div className={styles.turnBar}>
          <span className="muted">الدور: </span>
          <span style={{ color: activeTeam === 'team1' ? 'var(--team1)' : 'var(--team2)', fontWeight: 700 }}>
            {activeTeam === 'team1' ? t1?.name : t2?.name}
          </span>
        </div>
      )}
    </div>
  )
}

function TeamCard({ team, stage, teamKey, isActive }) {
  if (!team || !stage) return null
  const lives = stage[`${teamKey}_lives`] ?? 2
  const stageScore = stage[`${teamKey}_stage_score`] ?? 0
  const color = teamKey === 'team1' ? 'var(--team1)' : 'var(--team2)'

  return (
    <div className={`${styles.teamCard} ${isActive ? styles.teamCardActive : ''}`}
      style={{ '--team-color': color }}>
      <div className={styles.teamName} style={{ color }}>{team.name}</div>

      <div className={styles.teamScore}>{team.score}</div>
      <div className={styles.teamScoreLabel}>نقطة</div>

      <div className={styles.teamStage}>مرحلة: {stageScore}</div>

      <div className={styles.teamLives}>
        {[0, 1].map(i => (
          <span key={i} className={styles.heart}>{i < lives ? '❤️' : '🖤'}</span>
        ))}
      </div>

      {isActive && <div className={styles.activePulse} style={{ background: color }} />}
    </div>
  )
}
