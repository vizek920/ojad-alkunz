import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI, questionsAPI } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import styles from './GameControl.module.css'

export default function GameControl() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [teams, setTeams] = useState({ team1: null, team2: null })
  const [stages, setStages] = useState([])
  const [questions, setQuestions] = useState([])
  const [selectedQ, setSelectedQ] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const data = await sessionsAPI.get(sessionId)
    setSession(data)
    const t1 = data.session_teams.find(t => t.team_key === 'team1')
    const t2 = data.session_teams.find(t => t.team_key === 'team2')
    setTeams({ team1: t1, team2: t2 })
    setStages(data.session_stages.sort((a,b) => a.stage_number - b.stage_number))
    setLoading(false)
  }, [sessionId])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel(`session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_teams', filter: `session_id=eq.${sessionId}` },
        () => load())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [sessionId, load])

  async function loadStageQuestions(stage) {
    const data = await questionsAPI.forStage(stage)
    setQuestions(data)
  }

  async function pushState(updates) {
    setSaving(true)
    try {
      await sessionsAPI.updateState(sessionId, updates)
      await load()
    } finally { setSaving(false) }
  }

  async function setQuestion(q) {
    setSelectedQ(q)
    await pushState({ current_question_id: q.id, show_question: true, show_answer: false })
  }

  async function revealAnswer() {
    await pushState({ show_answer: true })
  }

  async function nextTurn() {
    const nextTurn = session.current_turn === 'team1' ? 'team2' : 'team1'
    await pushState({ current_turn: nextTurn, show_question: false, show_answer: false, current_question_id: null })
  }

  async function updateTeamScore(teamKey, delta) {
    const team = teams[teamKey]
    await sessionsAPI.updateTeam(sessionId, teamKey, { score: Math.max(0, team.score + delta) })
    await load()
  }

  async function updateLives(teamKey, delta) {
    const currentStage = stages[session.current_stage - 1]
    const livesKey = `${teamKey}_lives`
    const newLives = Math.max(0, Math.min(2, (currentStage[livesKey]) + delta))
    await sessionsAPI.updateStage(sessionId, session.current_stage, { [livesKey]: newLives })
    await load()
  }

  async function nextStage() {
    if (session.current_stage >= session.total_stages) return
    const next = session.current_stage + 1
    await pushState({ current_stage: next, show_question: false, show_answer: false, current_question_id: null })
    setQuestions([])
    setSelectedQ(null)
  }

  if (loading) return <p className="muted" style={{padding:32}}>جارٍ التحميل...</p>

  const currentStage = stages[session.current_stage - 1]
  const bigScreenUrl = `${window.location.origin}/screen/${sessionId}`

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <button className="btn btn-ghost" style={{marginBottom:8}} onClick={() => navigate('/admin')}>← رجوع</button>
          <h2>{session.event_name}</h2>
        </div>
        <div className={styles.headerActions}>
          <a href={bigScreenUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">🖥 الشاشة الكبيرة</a>
          <div className={`badge ${session.status === 'active' ? 'badge-easy' : 'badge-medium'}`}
            style={{padding:'8px 16px', fontSize:'0.9rem'}}>
            {session.status === 'waiting' ? 'انتظار' : session.status === 'active' ? 'جارية' : 'منتهية'}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Team 1 */}
        <TeamPanel
          team={teams.team1}
          stage={currentStage}
          teamKey="team1"
          isActive={session.current_turn === 'team1'}
          onScoreDelta={d => updateTeamScore('team1', d)}
          onLivesDelta={d => updateLives('team1', d)}
        />

        {/* Stage control */}
        <div className={styles.center}>
          <div className="card" style={{marginBottom:16}}>
            <div className={styles.stageLine}>
              <span className="muted">المرحلة</span>
              <span style={{fontSize:'2rem', fontWeight:900, color:'var(--gold)'}}>{session.current_stage}</span>
              <span className="muted">/ {session.total_stages}</span>
            </div>
            <div className={styles.stageProgress}>
              {stages.map(s => (
                <div key={s.stage_number}
                  className={`${styles.stageDot}
                    ${s.stage_number === session.current_stage ? styles.stageDotActive : ''}
                    ${s.status === 'finished' ? styles.stageDotDone : ''}`} />
              ))}
            </div>
          </div>

          {/* Turn indicator */}
          <div className="card" style={{marginBottom:16, textAlign:'center'}}>
            <p className="muted" style={{marginBottom:4, fontSize:'0.85rem'}}>الدور الحالي</p>
            <span style={{fontWeight:700, fontSize:'1.1rem',
              color: session.current_turn === 'team1' ? 'var(--team1)' : 'var(--team2)'}}>
              {session.current_turn === 'team1' ? teams.team1?.name : teams.team2?.name}
            </span>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            {!session.show_question && (
              <button className="btn btn-primary" style={{width:'100%'}}
                onClick={() => { loadStageQuestions(session.current_stage) }}>
                عرض أسئلة المرحلة
              </button>
            )}
            {session.show_question && !session.show_answer && (
              <button className="btn btn-success" style={{width:'100%'}} onClick={revealAnswer} disabled={saving}>
                كشف الإجابة
              </button>
            )}
            {session.show_answer && (
              <>
                <button className="btn btn-ghost" style={{width:'100%'}} onClick={nextTurn} disabled={saving}>
                  تبديل الدور
                </button>
                <button className="btn btn-primary" style={{width:'100%'}} onClick={nextStage} disabled={saving || session.current_stage >= session.total_stages}>
                  المرحلة التالية ←
                </button>
              </>
            )}
          </div>

          {/* Current question preview */}
          {selectedQ && (
            <div className="card" style={{marginTop:16, borderColor:'var(--gold)'}}>
              <p style={{fontWeight:600, fontSize:'0.9rem', marginBottom:8}}>{selectedQ.text}</p>
              {session.show_answer && (
                <p style={{color:'var(--success)', fontWeight:700}}>✓ {selectedQ.correct_answer}</p>
              )}
            </div>
          )}
        </div>

        {/* Team 2 */}
        <TeamPanel
          team={teams.team2}
          stage={currentStage}
          teamKey="team2"
          isActive={session.current_turn === 'team2'}
          onScoreDelta={d => updateTeamScore('team2', d)}
          onLivesDelta={d => updateLives('team2', d)}
        />
      </div>

      {/* Questions panel */}
      {questions.length > 0 && (
        <div className={styles.questionPanel}>
          <h3 style={{marginBottom:16}}>أسئلة المرحلة {session.current_stage}</h3>
          <div className={styles.questionList}>
            {questions.map(q => (
              <button key={q.id} className={`${styles.qBtn} ${selectedQ?.id === q.id ? styles.qBtnActive : ''}`}
                onClick={() => setQuestion(q)}>
                <span className={`badge badge-${q.difficulty}`} style={{marginLeft:8}}>
                  {{ easy:'سهل', medium:'متوسط', hard:'صعب'}[q.difficulty]}
                </span>
                {q.text.length > 60 ? q.text.slice(0,60) + '...' : q.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TeamPanel({ team, stage, teamKey, isActive, onScoreDelta, onLivesDelta }) {
  if (!team || !stage) return null
  const lives = stage[`${teamKey}_lives`] ?? 2
  const stageScore = stage[`${teamKey}_stage_score`] ?? 0

  return (
    <div className={`${styles.teamPanel} ${isActive ? styles.teamActive : ''}`}
      style={{ borderColor: isActive ? (teamKey === 'team1' ? 'var(--team1)' : 'var(--team2)') : 'var(--border)' }}>
      <div className={styles.teamName}
        style={{ color: teamKey === 'team1' ? 'var(--team1)' : 'var(--team2)' }}>
        {team.name}
        {isActive && <span className={styles.turnBadge}>الدور</span>}
      </div>

      {/* Total score */}
      <div className={styles.scoreBox}>
        <span className="muted" style={{fontSize:'0.8rem'}}>النقاط الإجمالية</span>
        <span className={styles.scoreNum}>{team.score}</span>
        <div className={styles.scoreButtons}>
          <button className="btn btn-ghost" style={{padding:'4px 12px'}} onClick={() => onScoreDelta(-1)}>−</button>
          <button className="btn btn-primary" style={{padding:'4px 12px'}} onClick={() => onScoreDelta(1)}>+</button>
        </div>
      </div>

      {/* Stage score */}
      <div style={{textAlign:'center', marginBottom:12}}>
        <span className="muted" style={{fontSize:'0.8rem'}}>نقاط المرحلة: </span>
        <span style={{fontWeight:700}}>{stageScore}</span>
      </div>

      {/* Lives */}
      <div className={styles.livesBox}>
        <span className="muted" style={{fontSize:'0.8rem'}}>الأرواح</span>
        <div className={styles.hearts}>
          {[0,1].map(i => <span key={i}>{i < lives ? '❤️' : '🖤'}</span>)}
        </div>
        <div className={styles.livesBtns}>
          <button className="btn btn-ghost" style={{padding:'3px 10px',fontSize:'0.8rem'}} onClick={() => onLivesDelta(-1)}>−</button>
          <button className="btn btn-ghost" style={{padding:'3px 10px',fontSize:'0.8rem'}} onClick={() => onLivesDelta(1)}>+</button>
        </div>
      </div>
    </div>
  )
}
