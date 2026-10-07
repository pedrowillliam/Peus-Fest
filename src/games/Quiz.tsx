import type { SupabaseClient } from '@supabase/supabase-js';
import { useState, type ReactNode } from 'react';
import { Podium } from '../components/Podium';
import { party } from '../config';
import type { Guest } from '../lib/guest';
import { LETTERS, useMsLeft, useQuizState, useRanking, type QuizState } from '../lib/quiz';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'aniversario:quiz';

// O jogador vale só para a rodada em que entrou: se o admin reiniciar o quiz, entra de novo.
type SavedPlayer = { round: string; id: string; choices: Record<number, number> };

function loadPlayer(): SavedPlayer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedPlayer) : null;
  } catch {
    return null;
  }
}

function savePlayer(player: SavedPlayer | null) {
  try {
    if (player) localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage bloqueado: segue só em memória.
  }
}

export function Quiz({ guest }: { guest: Guest }) {
  if (!supabase) return <p className="notice">O quiz ainda não está conectado ao banco de dados.</p>;
  return <QuizPlayer guest={guest} client={supabase} />;
}

function QuizPlayer({ guest, client }: { guest: Guest; client: SupabaseClient }) {
  const { state, failed, refresh } = useQuizState(client);
  const [player, setPlayerState] = useState<SavedPlayer | null>(loadPlayer);
  const ranking = useRanking(client, state?.phase === 'results');

  const setPlayer = (next: SavedPlayer | null) => {
    savePlayer(next);
    setPlayerState(next);
  };
  const current = player && state && player.round === state.round ? player : null;

  if (!state) {
    return failed ? (
      <p className="notice">Não foi possível carregar o quiz.</p>
    ) : (
      <p className="muted">Carregando quiz...</p>
    );
  }

  if (state.phase === 'closed') {
    return (
      <QuizMessage title="O quiz ainda não começou">
        Quando {party.nickname} abrir, entre por aqui.
      </QuizMessage>
    );
  }

  if (state.phase === 'results') return <Results ranking={ranking} playerId={current?.id} />;

  if (!current) {
    if (state.phase === 'finished') {
      return <QuizMessage title="O quiz acabou">Aguarde {party.nickname} revelar quem ganhou.</QuizMessage>;
    }
    return <JoinButton client={client} guest={guest} state={state} onJoined={setPlayer} />;
  }

  switch (state.phase) {
    case 'lobby':
      return (
        <QuizMessage title={`${guest.name}, você está dentro!`}>
          Aguarde {party.nickname} começar. As perguntas aparecem aqui sozinhas.
        </QuizMessage>
      );
    case 'question':
      return <QuestionView client={client} state={state} player={current} setPlayer={setPlayer} refresh={refresh} />;
    case 'reveal':
      return <RevealView state={state} player={current} />;
    case 'finished':
      return <QuizMessage title="Fim do quiz!">Aguarde {party.nickname} revelar quem ganhou.</QuizMessage>;
  }
}

function QuizMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="quiz-message" aria-live="polite">
      <strong>{title}</strong>
      <p className="muted">{children}</p>
    </div>
  );
}

function JoinButton({
  client,
  guest,
  state,
  onJoined,
}: {
  client: SupabaseClient;
  guest: Guest;
  state: QuizState;
  onJoined: (player: SavedPlayer) => void;
}) {
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function join() {
    setSending(true);
    setFailed(false);
    const { data, error } = await client.rpc('quiz_join', { p_name: guest.name, p_guest_id: guest.id });
    setSending(false);
    if (error || !data) {
      setFailed(true);
      return;
    }
    onJoined({ round: state.round, id: data, choices: {} });
  }

  return (
    <div className="quiz-join">
      <p className="muted">
        {state.phase === 'lobby'
          ? `Você vai jogar como ${guest.name}. Cada um no seu celular!`
          : 'O quiz já começou, mas ainda dá para entrar a partir da próxima pergunta.'}
      </p>
      <button type="button" className="button" onClick={join} disabled={sending}>
        {sending ? 'Entrando...' : 'Entrar no quiz'}
      </button>
      {failed && (
        <p className="notice" role="alert">
          Não deu para entrar. Tente de novo.
        </p>
      )}
    </div>
  );
}

function QuestionHeader({ state, msLeft }: { state: QuizState; msLeft: number | null }) {
  const seconds = msLeft === null ? null : Math.max(0, Math.ceil(msLeft / 1000));
  const fraction = msLeft === null ? 0 : Math.max(0, Math.min(1, msLeft / (state.timeLimit * 1000)));
  return (
    <div className="quiz-head">
      <span className="muted">
        Pergunta {state.index + 1} de {state.total}
      </span>
      {seconds !== null && <span className="quiz-seconds">{seconds}s</span>}
      {seconds !== null && (
        <div className="quiz-timer" aria-hidden="true">
          <div className="quiz-timer-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function QuestionView({
  client,
  state,
  player,
  setPlayer,
  refresh,
}: {
  client: SupabaseClient;
  state: QuizState;
  player: SavedPlayer;
  setPlayer: (player: SavedPlayer | null) => void;
  refresh: () => void;
}) {
  const msLeft = useMsLeft(state);
  const [pending, setPending] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const chosen = player.choices[state.index];
  const timeUp = msLeft !== null && msLeft <= 0;
  const locked = chosen !== undefined || pending !== null || timeUp;

  async function answer(choice: number) {
    if (locked) return;
    setPending(choice);
    setProblem(null);
    const { data, error } = await client.rpc('quiz_answer', { p_player: player.id, p_choice: choice });
    setPending(null);
    if (error) {
      setProblem('Não deu para enviar. Toque de novo.');
      return;
    }
    if (data === 'ok' || data === 'ja_respondeu') {
      setPlayer({ ...player, choices: { ...player.choices, [state.index]: choice } });
    } else if (data === 'tempo_esgotado') {
      setProblem('O tempo acabou antes de a resposta chegar.');
    } else if (data === 'jogador_invalido') {
      setPlayer(null); // o quiz foi reiniciado
    } else {
      refresh();
    }
  }

  const status = chosen !== undefined ? 'Resposta enviada! Aguarde o resultado.' : timeUp ? 'Tempo esgotado!' : null;

  return (
    <div className="quiz-play">
      <QuestionHeader state={state} msLeft={msLeft} />
      <p className="quiz-question">{state.question?.text}</p>
      {state.question?.image && <img className="quiz-image" src={state.question.image} alt="Foto da pergunta" />}
      <div className="quiz-options">
        {state.question?.options.map((option, i) => (
          <button
            key={i}
            type="button"
            className={`quiz-option${chosen === i || pending === i ? ' is-chosen' : ''}`}
            onClick={() => answer(i)}
            disabled={locked}
          >
            <span className="quiz-letter">{LETTERS[i]}</span>
            {option}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {status && <p className="feedback">{status}</p>}
        {problem && <p className="notice">{problem}</p>}
      </div>
    </div>
  );
}

function RevealView({ state, player }: { state: QuizState; player: SavedPlayer }) {
  const chosen = player.choices[state.index];
  const right = chosen !== undefined && chosen === state.correct;
  const message = chosen === undefined ? 'Você não respondeu esta.' : right ? 'Você acertou!' : 'Não foi dessa vez!';

  return (
    <div className="quiz-play">
      <QuestionHeader state={state} msLeft={null} />
      <p className="quiz-question">{state.question?.text}</p>
      {state.question?.image && <img className="quiz-image" src={state.question.image} alt="Foto da pergunta" />}
      <div className="quiz-options">
        {state.question?.options.map((option, i) => {
          const mark = i === state.correct ? ' is-correct' : i === chosen ? ' is-wrong' : '';
          return (
            <div key={i} className={`quiz-option${mark}`}>
              <span className="quiz-letter">{LETTERS[i]}</span>
              {option}
            </div>
          );
        })}
      </div>
      <p className={`quiz-verdict${right ? ' is-right' : ''}`} aria-live="polite">
        {message}
      </p>
      <p className="muted quiz-wait">Aguarde a próxima pergunta.</p>
    </div>
  );
}

function Results({ ranking, playerId }: { ranking: ReturnType<typeof useRanking>; playerId?: string }) {
  if (!ranking) return <p className="muted">Carregando resultado...</p>;
  const position = playerId ? ranking.findIndex((r) => r.id === playerId) : -1;
  const mine = position >= 0 ? ranking[position] : null;

  return (
    <div className="quiz-results">
      <Podium ranking={ranking} />
      {mine && (
        <p className="quiz-mine">
          Você ficou em {position + 1}º lugar, com {mine.points} {mine.points === 1 ? 'ponto' : 'pontos'}.
        </p>
      )}
    </div>
  );
}
