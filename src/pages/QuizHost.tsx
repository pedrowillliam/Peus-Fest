import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Podium } from '../components/Podium';
import { RequireAdmin } from '../components/RequireAdmin';
import { party } from '../config';
import { LETTERS, useMsLeft, useQuizState, useRanking, type QuizPhase, type QuizState } from '../lib/quiz';

// Painel do quiz em /admin/quiz. Pode ficar aberto numa TV: o gabarito só aparece na revelação
// e o ranking só aparece antes do fim se o admin tocar em "espiar".

type Progress = { index: number; players: string[]; answered: number; right: number };

const PROGRESS_MS = 1500;
// Depois do fim do tempo, espera as respostas que ainda estão a caminho antes de revelar.
const REVEAL_GRACE_MS = 1500;

export function QuizHost() {
  return (
    <main className="page quiz-host">
      <Link to="/admin" className="back">
        ← Recados
      </Link>
      <h1>Quiz do {party.nickname}</h1>
      <RequireAdmin>{({ client }) => <HostPanel client={client} />}</RequireAdmin>
    </main>
  );
}

function HostPanel({ client }: { client: SupabaseClient }) {
  const { state, failed, refresh } = useQuizState(client);
  const msLeft = useMsLeft(state);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peek, setPeek] = useState(false);
  const ranking = useRanking(client, state?.phase === 'results' || (state?.phase === 'finished' && peek));
  const revealedFor = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await client.rpc('quiz_progress');
      if (active && !error && data) setProgress(data);
    };
    load();
    const timer = window.setInterval(load, PROGRESS_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [client]);

  async function setPhase(phase: QuizPhase, index?: number) {
    setBusy(true);
    setError(null);
    const { error } = await client.rpc('quiz_set_phase', { p_phase: phase, p_index: index ?? null });
    setBusy(false);
    if (error) setError('Não deu para avançar. Tente de novo.');
    refresh();
  }

  async function reset() {
    if (!window.confirm('Reiniciar o quiz? Apaga quem entrou e todas as respostas.')) return;
    setBusy(true);
    setError(null);
    const { error } = await client.rpc('quiz_reset');
    setBusy(false);
    setPeek(false);
    if (error) setError('Não deu para reiniciar. Tente de novo.');
    refresh();
  }

  // Revela sozinho quando todo mundo respondeu ou o tempo acabou (uma vez por pergunta).
  const players = progress?.players ?? [];
  const sameQuestion = progress?.index === state?.index;
  const allAnswered = sameQuestion && players.length > 0 && (progress?.answered ?? 0) >= players.length;
  const timeOver = msLeft !== null && msLeft <= -REVEAL_GRACE_MS;
  const questionKey = state ? `${state.round}:${state.index}` : null;
  useEffect(() => {
    if (state?.phase !== 'question' || !(allAnswered || timeOver)) return;
    if (revealedFor.current === questionKey) return;
    revealedFor.current = questionKey;
    setPhase('reveal');
  }, [state?.phase, allAnswered, timeOver, questionKey]); // setPhase fica de fora: é recriada a cada render

  if (!state) {
    return failed ? <p className="notice">Não foi possível carregar o quiz.</p> : <p className="muted">Carregando...</p>;
  }

  const last = state.index + 1 >= state.total;

  return (
    <div className="host">
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {state.total === 0 && (
        <p className="notice">
          Nenhuma pergunta cadastrada: rode o <code>supabase/privado/quiz-perguntas.sql</code> no Supabase.
        </p>
      )}

      {state.phase === 'closed' && (
        <section className="host-step">
          <p className="muted">Ninguém consegue entrar ainda. São {state.total} perguntas.</p>
          <button type="button" className="button" onClick={() => setPhase('lobby')} disabled={busy || !state.total}>
            Abrir inscrições
          </button>
        </section>
      )}

      {state.phase === 'lobby' && (
        <section className="host-step">
          <p className="host-count">
            <strong>{players.length}</strong> {players.length === 1 ? 'pessoa entrou' : 'pessoas entraram'}
          </p>
          <p className="muted">
            Cada pessoa entra pelo site em <strong>Quiz do {party.nickname}</strong>, no próprio celular.
          </p>
          {players.length > 0 && (
            <ul className="host-players">
              {players.map((name, i) => (
                <li key={`${name}-${i}`}>{name}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="button"
            onClick={() => setPhase('question', 0)}
            disabled={busy || players.length === 0}
          >
            Começar quiz
          </button>
        </section>
      )}

      {(state.phase === 'question' || state.phase === 'reveal') && (
        <section className="host-step">
          <HostQuestion state={state} msLeft={msLeft} />
          <p className="host-count">
            {state.phase === 'question' ? (
              <>
                <strong>{sameQuestion ? progress?.answered : 0}</strong> de {players.length} responderam
              </>
            ) : (
              <>
                <strong>{sameQuestion ? progress?.right : 0}</strong> de {players.length} acertaram
              </>
            )}
          </p>
          {state.phase === 'question' ? (
            <button type="button" className="button button-secondary" onClick={() => setPhase('reveal')} disabled={busy}>
              Mostrar resposta agora
            </button>
          ) : last ? (
            <button type="button" className="button" onClick={() => setPhase('finished')} disabled={busy}>
              Encerrar quiz
            </button>
          ) : (
            <button
              type="button"
              className="button"
              onClick={() => setPhase('question', state.index + 1)}
              disabled={busy}
            >
              Próxima pergunta
            </button>
          )}
        </section>
      )}

      {state.phase === 'finished' && (
        <section className="host-step">
          <p className="host-count">
            <strong>Quiz encerrado!</strong>
          </p>
          <p className="muted">Quando quiser, revele quem ganhou. O resultado aparece também no celular de todo mundo.</p>
          <button type="button" className="button" onClick={() => setPhase('results')} disabled={busy}>
            Revelar vencedores
          </button>
          <button type="button" className="link-button" onClick={() => setPeek((v) => !v)}>
            {peek ? 'Esconder ranking' : 'Espiar o ranking (só você, cuidado com a TV)'}
          </button>
          {peek && ranking && <Podium ranking={ranking} />}
        </section>
      )}

      {state.phase === 'results' && (
        <section className="host-step">{ranking ? <Podium ranking={ranking} /> : <p className="muted">Carregando...</p>}</section>
      )}

      <div className="host-footer">
        <button type="button" className="delete-button" onClick={reset} disabled={busy}>
          Reiniciar quiz
        </button>
      </div>
    </div>
  );
}

function HostQuestion({ state, msLeft }: { state: QuizState; msLeft: number | null }) {
  const seconds = msLeft === null ? null : Math.max(0, Math.ceil(msLeft / 1000));
  return (
    <>
      <div className="quiz-head">
        <span className="muted">
          Pergunta {state.index + 1} de {state.total}
        </span>
        {seconds !== null && <span className="quiz-seconds host-seconds">{seconds}s</span>}
      </div>
      <p className="quiz-question">{state.question?.text}</p>
      {state.question?.image && (
        <img className="quiz-image" src={state.question.image} alt="Foto da pergunta" />
      )}
      <div className="quiz-options">
        {state.question?.options.map((option, i) => (
          <div key={i} className={`quiz-option${state.phase === 'reveal' && i === state.correct ? ' is-correct' : ''}`}>
            <span className="quiz-letter">{LETTERS[i]}</span>
            {option}
          </div>
        ))}
      </div>
    </>
  );
}
