import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import s from './GameControl.module.css';

/* ── helpers ───────────────────────────────────────────────── */
const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const shuffle = arr => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const TOTAL = 15;

/* ── MOCK DATA (replace with real API calls later) ─────────── */
const MOCK_SESSION = {
  id: 'mock-session-1',
  name: 'جلسة الاختبار الكوني',
  status: 'waiting',
  current_stage: 1,
  turn: 'team1',
  active_question: null,
  show_question: false,
  show_answer: false,
  timer_seconds: 30,
};

const MOCK_TEAMS = [
  { id: 't1', team_key: 'team1', name: 'فريق النجوم ⭐', score: 0, lives: 2 },
  { id: 't2', team_key: 'team2', name: 'فريق القمر 🌙', score: 0, lives: 2 },
];

const MOCK_QUESTIONS = Array.from({ length: 45 }, (_, i) => ({
  id: `q${i+1}`,
  text: `سؤال رقم ${i+1}: ما هو الكوكب الأقرب إلى الشمس في المجموعة الشمسية؟`,
  type: i % 3 === 2 ? 'true_false' : 'mcq',
  difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
  points: i % 3 === 0 ? 5 : i % 3 === 1 ? 10 : 15,
  correct_answer: i % 3 === 2 ? 'صح' : 'عطارد',
  options: i % 3 === 2 ? ['صح', 'خطأ'] : ['عطارد', 'الزهرة', 'المريخ', 'المشتري'],
  category_id: null,
}));

/* ── useTimer hook ─────────────────────────────────────────── */
function useTimer(initial = 30) {
  const [seconds, setSeconds] = useState(initial);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const ref = useRef(null);

  const stop = useCallback(() => { clearInterval(ref.current); setRunning(false); }, []);
  const reset = useCallback((val) => {
    stop();
    const v = Math.max(5, Math.min(120, val ?? initial));
    setSeconds(v); setFinished(false);
  }, [initial, stop]);
  const start = useCallback(() => {
    if (running) return;
    setFinished(false); setRunning(true);
    ref.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(ref.current); setRunning(false); setFinished(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [running]);

  useEffect(() => () => clearInterval(ref.current), []);
  return { seconds, running, finished, start, stop, reset };
}

/* ── StageNode ─────────────────────────────────────────────── */
function StageNode({ idx, current, done, onClick }) {
  const num = idx + 1;
  // snake: row 0 RTL, row 1 LTR, row 2 RTL
  const row = Math.floor(idx / 5);
  const col = row % 2 === 0 ? 4 - (idx % 5) : idx % 5;
  const state = done ? 'done' : num === current ? 'active' : num < current ? 'done' : 'locked';

  const planetColors = [
    '#4C9EE8','#C9A227','#E05555','#7B68EE','#4CAF8A',
    '#FF6B6B','#E8C547','#4C9EE8','#C9A227','#9B59B6',
    '#E05555','#4CAF8A','#C9A227','#4C9EE8','#E8C547',
  ];

  return (
    <div
      className={`${s.node} ${s[`node_${state}`]}`}
      style={{ gridColumn: col + 1, gridRow: row + 1 }}
      onClick={state !== 'locked' ? onClick : undefined}
      title={`المرحلة ${num}`}
    >
      <div className={s.nodeOrbit} />
      <div className={s.nodePlanet} style={state !== 'locked' ? { background: `radial-gradient(circle at 35% 35%, ${planetColors[idx]}cc, ${planetColors[idx]}55)`, boxShadow: `0 0 24px ${planetColors[idx]}66` } : {}}>
        {state === 'locked' ? '🔒' : state === 'done' ? '✓' : toAr(num)}
      </div>
      {state === 'active' && <div className={s.nodeRing} />}
      <span className={s.nodeLabel}>م{toAr(num)}</span>
    </div>
  );
}

/* ── QuestionCard ──────────────────────────────────────────── */
function QuestionCard({ question, revealed, onReveal, onAward, onSkip, onDouble, currentTeam, teams, double }) {
  if (!question) return null;
  const team = teams.find(t => t.team_key === currentTeam);
  const diffLabel = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }[question.difficulty];
  const diffClass = { easy: s.diffEasy, medium: s.diffMed, hard: s.diffHard }[question.difficulty];
  const pts = question.points * (double ? 2 : 1);

  return (
    <div className={s.qCard}>
      <div className={s.qCardHeader}>
        <span className={`${s.diffBadge} ${diffClass}`}>{diffLabel}</span>
        <span className={s.qPts}>{toAr(pts)} نقطة{double ? ' ×٢' : ''}</span>
        <span className={s.qTeamTurn}>دور: {team?.name}</span>
      </div>
      <p className={s.qText}>{question.text}</p>

      {question.type === 'mcq' && question.options && (
        <div className={s.optionsGrid}>
          {question.options.map((opt, i) => (
            <div key={i} className={`${s.optionChip} ${revealed ? s.optionReveal : ''} ${revealed && opt === question.correct_answer ? s.optionCorrect : ''}`}>
              {opt}
            </div>
          ))}
        </div>
      )}
      {question.type === 'true_false' && (
        <div className={s.tfRow}>
          <div className={`${s.tfChip} ${s.tfTrue} ${revealed && question.correct_answer === 'صح' ? s.optionCorrect : ''}`}>✓ صح</div>
          <div className={`${s.tfChip} ${s.tfFalse} ${revealed && question.correct_answer === 'خطأ' ? s.optionCorrect : ''}`}>✗ خطأ</div>
        </div>
      )}

      {revealed && (
        <div className={s.answerReveal}>
          <span className={s.answerLabel}>الإجابة الصحيحة:</span>
          <span className={s.answerValue}>{question.correct_answer}</span>
        </div>
      )}

      <div className={s.qActions}>
        {!revealed && <button className={s.btnReveal} onClick={onReveal}>كشف الإجابة 👁</button>}
        {revealed && (
          <>
            <button className={`${s.btnAward} ${s.btnGreen}`} onClick={() => onAward(currentTeam, true)}>✓ أجاب صح +{toAr(pts)}</button>
            <button className={`${s.btnAward} ${s.btnRed}`} onClick={() => onAward(currentTeam, false)}>✗ أجاب خطأ −❤</button>
            {!double && <button className={s.btnDouble} onClick={onDouble}>⚡ ضاعف النقاط</button>}
          </>
        )}
        <button className={s.btnSkip} onClick={onSkip}>تخطى ↩</button>
      </div>
    </div>
  );
}

/* ── StageModal ────────────────────────────────────────────── */
function StageModal({ stage, teams, stageScores, questions, timerVal, setTimerVal, onStart, onClose }) {
  const easy = questions.filter(q => q.difficulty === 'easy').length;
  const med  = questions.filter(q => q.difficulty === 'medium').length;
  const hard = questions.filter(q => q.difficulty === 'hard').length;

  return (
    <div className={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <div className={s.modalGlowBar} />
        <h2 className={s.modalTitle}>🪐 المرحلة {toAr(stage)}</h2>

        <div className={s.modalTeams}>
          {teams.map(t => (
            <div key={t.id} className={s.modalTeamCard}>
              <div className={s.modalTeamName}>{t.name}</div>
              <div className={s.modalTeamScore}>{toAr(stageScores[t.team_key] ?? 0)}</div>
              <div className={s.modalTeamLives}>{'❤️'.repeat(t.lives || 0)}</div>
            </div>
          ))}
        </div>

        <div className={s.modalQCounts}>
          <div className={s.modalQItem}><span className={s.diffEasyDot} />سهل<b>{toAr(easy)}</b></div>
          <div className={s.modalQItem}><span className={s.diffMedDot} />متوسط<b>{toAr(med)}</b></div>
          <div className={s.modalQItem}><span className={s.diffHardDot} />صعب<b>{toAr(hard)}</b></div>
        </div>

        <div className={s.modalTimer}>
          <label>⏱ وقت كل سؤال (ثانية)</label>
          <div className={s.timerRow}>
            {[20, 30, 45, 60].map(v => (
              <button key={v} className={`${s.timerChip} ${timerVal === v ? s.timerChipActive : ''}`} onClick={() => setTimerVal(v)}>{toAr(v)}</button>
            ))}
            <input type="number" min="5" max="120" value={timerVal} onChange={e => setTimerVal(+e.target.value || 30)} className={s.timerInput} />
          </div>
        </div>

        <div className={s.modalActions}>
          <button className={s.btnStart} onClick={onStart}>🚀 ابدأ المرحلة</button>
          <button className={s.btnCancel} onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* ── StageWinnerModal ──────────────────────────────────────── */
function StageWinnerModal({ winner, teams, stageScores, onNext, isLastStage }) {
  const winTeam = teams.find(t => t.team_key === winner);
  return (
    <div className={s.modalOverlay}>
      <div className={`${s.modal} ${s.winnerModal}`}>
        <div className={s.winnerStars}>✨🏆✨</div>
        <h2 className={s.winnerTitle}>انتهت المرحلة!</h2>
        <p className={s.winnerName}>{winTeam?.name ?? 'تعادل'}</p>
        <div className={s.winnerScores}>
          {teams.map(t => (
            <div key={t.id} className={`${s.winnerScoreCard} ${t.team_key === winner ? s.winnerHighlight : ''}`}>
              <div>{t.name}</div>
              <div className={s.bigScore}>{toAr(stageScores[t.team_key] ?? 0)}</div>
            </div>
          ))}
        </div>
        <button className={s.btnStart} onClick={onNext}>
          {isLastStage ? '🏁 إنهاء اللعبة' : '➡ المرحلة التالية'}
        </button>
      </div>
    </div>
  );
}

/* ── Main GameControl ──────────────────────────────────────── */
export default function GameControl() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  /* state */
  const [session, setSession]       = useState(null);
  const [teams, setTeams]           = useState([]);
  const [allQuestions, setAllQ]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [stageMode, setStageMode]   = useState(false);
  const [stageQ, setStageQ]         = useState([]);       // questions for current stage
  const [qIdx, setQIdx]             = useState(0);
  const [revealed, setRevealed]     = useState(false);
  const [double, setDouble]         = useState(false);
  const [stageScores, setStageScores] = useState({});     // { team_key: pts }

  const [showStageModal, setShowStageModal] = useState(false);
  const [showWinner, setShowWinner]         = useState(false);
  const [stageWinner, setStageWinner]       = useState(null);
  const [timerVal, setTimerVal]             = useState(30);

  const timer = useTimer(timerVal);

  /* ── Load data (mock for now) ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // TODO: replace with real API calls
        // const sess = await sessionsAPI.get(sessionId);
        // const qs   = await questionsAPI.list({ limit: 500 });
        await new Promise(r => setTimeout(r, 400)); // simulate network
        setSession({ ...MOCK_SESSION, id: sessionId });
        setTeams(MOCK_TEAMS.map(t => ({ ...t })));
        setAllQ(shuffle(MOCK_QUESTIONS));
      } catch (e) {
        setError('تعذّر تحميل الجلسة');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const currentStage = session?.current_stage ?? 1;
  const currentTurn  = session?.turn ?? teams[0]?.team_key;

  /* ── Stage questions (easy→medium→hard) ── */
  const buildStageQ = useCallback(() => {
    const easy = allQuestions.filter(q => q.difficulty === 'easy').slice(0, 3);
    const med  = allQuestions.filter(q => q.difficulty === 'medium').slice(0, 3);
    const hard = allQuestions.filter(q => q.difficulty === 'hard').slice(0, 2);
    return [...easy, ...med, ...hard];
  }, [allQuestions]);

  /* ── Handlers ── */
  const openStageModal = () => setShowStageModal(true);

  const startStage = () => {
    const qs = buildStageQ();
    setStageQ(qs);
    setQIdx(0);
    setRevealed(false);
    setDouble(false);
    setStageScores({ [teams[0]?.team_key]: 0, [teams[1]?.team_key]: 0 });
    setStageMode(true);
    setShowStageModal(false);
    timer.reset(timerVal);
    timer.start();
  };

  const revealAnswer = () => {
    setRevealed(true);
    timer.stop();
  };

  const awardPoints = (teamKey, correct) => {
    const q = stageQ[qIdx];
    const pts = q.points * (double ? 2 : 1);

    if (correct) {
      setTeams(prev => prev.map(t => t.team_key === teamKey ? { ...t, score: t.score + pts } : t));
      setStageScores(prev => ({ ...prev, [teamKey]: (prev[teamKey] ?? 0) + pts }));
    } else {
      setTeams(prev => prev.map(t => t.team_key === teamKey ? { ...t, lives: Math.max(0, t.lives - 1) } : t));
    }

    nextQuestion();
  };

  const nextQuestion = () => {
    const next = qIdx + 1;
    if (next >= stageQ.length) {
      endStage();
    } else {
      setQIdx(next);
      setRevealed(false);
      setDouble(false);
      // alternate turn
      const other = teams.find(t => t.team_key !== currentTurn);
      setSession(prev => ({ ...prev, turn: other?.team_key ?? currentTurn }));
      timer.reset(timerVal);
      timer.start();
    }
  };

  const endStage = () => {
    timer.stop();
    setStageMode(false);
    // determine winner
    const scores = stageScores;
    const [t1, t2] = teams;
    let winner = null;
    if ((scores[t1?.team_key] ?? 0) > (scores[t2?.team_key] ?? 0)) winner = t1.team_key;
    else if ((scores[t2?.team_key] ?? 0) > (scores[t1?.team_key] ?? 0)) winner = t2.team_key;
    setStageWinner(winner);
    setShowWinner(true);
  };

  const advanceStage = () => {
    setShowWinner(false);
    if (currentStage >= TOTAL) {
      setSession(prev => ({ ...prev, status: 'done' }));
      return;
    }
    setSession(prev => ({ ...prev, current_stage: prev.current_stage + 1, status: 'active' }));
    setTeams(prev => prev.map(t => ({ ...t, lives: 2 })));
  };

  /* ── Loading / error ── */
  if (loading) return (
    <div className={s.loadWrap}>
      <div className={s.loadPlanet} />
      <p className={s.loadText}>يتم تحميل الجلسة...</p>
    </div>
  );
  if (error) return (
    <div className={s.loadWrap}>
      <p className={s.errorText}>{error}</p>
      <button className={s.btnCancel} onClick={() => navigate(-1)}>العودة</button>
    </div>
  );

  const currentQ = stageMode ? stageQ[qIdx] : null;
  const timerPct = timerVal > 0 ? (timer.seconds / timerVal) * 100 : 0;
  const timerColor = timerPct > 60 ? '#4CAF8A' : timerPct > 30 ? '#C9A227' : '#E05555';

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <header className={s.header}>
        <button className={s.backBtn} onClick={() => navigate(-1)}>← العودة</button>
        <div className={s.headerCenter}>
          <h1 className={s.headerTitle}>{session.name}</h1>
          <span className={s.headerSub}>المرحلة {toAr(currentStage)} / {toAr(TOTAL)}</span>
        </div>
        <div className={s.headerStatus}>
          <span className={`${s.statusDot} ${session.status === 'active' ? s.statusActive : s.statusWait}`} />
          <span>{session.status === 'active' ? 'جارٍ' : session.status === 'done' ? 'منتهية' : 'انتظار'}</span>
        </div>
      </header>

      <div className={s.body}>
        {/* ── Left: Map ── */}
        <aside className={s.mapPanel}>
          <div className={s.mapTitle}>🗺 خريطة الرحلة</div>
          <div className={s.stageGrid}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <StageNode
                key={i} idx={i}
                current={currentStage}
                done={i + 1 < currentStage}
                onClick={() => i + 1 === currentStage && !stageMode && openStageModal()}
              />
            ))}
          </div>
          {/* Team scores sidebar */}
          <div className={s.teamScores}>
            {teams.map(t => (
              <div key={t.id} className={`${s.teamCard} ${currentTurn === t.team_key && stageMode ? s.teamActive : ''}`}>
                <div className={s.teamName}>{t.name}</div>
                <div className={s.teamScore}>{toAr(t.score)}</div>
                <div className={s.teamLives}>{'❤️'.repeat(t.lives)}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Right: Action area ── */}
        <main className={s.actionPanel}>
          {!stageMode && (
            <div className={s.idlePanel}>
              <div className={s.idleOrb} />
              <h2 className={s.idleTitle}>المرحلة {toAr(currentStage)}</h2>
              <p className={s.idleSub}>اضغط على الكوكب في الخريطة أو ابدأ المرحلة مباشرة</p>
              <button className={s.btnStart} onClick={openStageModal}>🚀 ابدأ المرحلة {toAr(currentStage)}</button>
            </div>
          )}

          {stageMode && (
            <>
              {/* Timer bar */}
              <div className={s.timerBar}>
                <div className={s.timerFill} style={{ width: `${timerPct}%`, background: timerColor }} />
                <span className={s.timerNum} style={{ color: timerColor }}>{toAr(timer.seconds)}ث</span>
              </div>

              {/* Progress */}
              <div className={s.stageProgress}>
                سؤال {toAr(qIdx + 1)} / {toAr(stageQ.length)}
              </div>

              <QuestionCard
                question={currentQ}
                revealed={revealed}
                onReveal={revealAnswer}
                onAward={awardPoints}
                onSkip={nextQuestion}
                onDouble={() => setDouble(true)}
                currentTeam={currentTurn}
                teams={teams}
                double={double}
              />
            </>
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      {showStageModal && (
        <StageModal
          stage={currentStage}
          teams={teams}
          stageScores={stageScores}
          questions={buildStageQ()}
          timerVal={timerVal}
          setTimerVal={setTimerVal}
          onStart={startStage}
          onClose={() => setShowStageModal(false)}
        />
      )}
      {showWinner && (
        <StageWinnerModal
          winner={stageWinner}
          teams={teams}
          stageScores={stageScores}
          onNext={advanceStage}
          isLastStage={currentStage >= TOTAL}
        />
      )}
    </div>
  );
}
