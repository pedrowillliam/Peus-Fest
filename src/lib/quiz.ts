import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uuid } from './uuid';

export type QuizPhase = 'closed' | 'lobby' | 'question' | 'reveal' | 'finished' | 'results';

export type QuizState = {
  phase: QuizPhase;
  index: number; // 0 = primeira pergunta
  total: number;
  round: string; // muda quando o admin reinicia o quiz
  timeLimit: number; // segundos por pergunta
  endsAt: number | null; // fim do tempo da pergunta, no relógio deste aparelho
  question: { text: string; options: string[]; image: string | null } | null;
  correct: number | null; // só vem na fase "reveal"
};

export type RankingRow = { id: string; name: string; points: number; time_ms: number };

export const LETTERS = ['A', 'B', 'C', 'D'];

const POLL_MS = 4000;

// Estado do quiz: o realtime em quiz_state avisa na hora e a consulta a cada 4 s cobre a rede
// ruim da festa. Sempre lê pela função quiz_current(), que esconde o gabarito até a revelação.
export function useQuizState(client: SupabaseClient): { state: QuizState | null; failed: boolean; refresh: () => void } {
  const [state, setState] = useState<QuizState | null>(null);
  const [failed, setFailed] = useState(false);
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;
    let requested = 0;
    let applied = 0;

    const load = async () => {
      const seq = ++requested;
      const sent = Date.now();
      const { data, error } = await client.rpc('quiz_current');
      // Respostas fora de ordem (realtime + consulta periódica) não podem voltar o estado.
      if (!active || seq < applied) return;
      applied = seq;
      if (error || !data) {
        setFailed(true);
        return;
      }
      setFailed(false);
      // Corrige o relógio do aparelho pelo do servidor (latência = metade da ida e volta).
      const offset = Date.parse(data.server_now) - (sent + Date.now()) / 2;
      setState({
        phase: data.phase,
        index: data.index,
        total: data.total,
        round: data.round,
        timeLimit: data.time_limit,
        endsAt: data.started_at ? Date.parse(data.started_at) + data.time_limit * 1000 - offset : null,
        question: data.question ?? null,
        correct: data.correct ?? null,
      });
    };
    loadRef.current = load;

    load();
    const channel = client
      .channel(`quiz-${uuid()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_state' }, () => load())
      .subscribe();
    const timer = window.setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      client.removeChannel(channel);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client]);

  const refresh = useCallback(() => loadRef.current(), []);
  return { state, failed, refresh };
}

// Milissegundos até acabar o tempo da pergunta (negativo depois do fim); null fora de pergunta.
export function useMsLeft(state: QuizState | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const running = state?.phase === 'question' && state.endsAt !== null;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!running || state?.endsAt == null) return null;
  return state.endsAt - now;
}

export function useRanking(client: SupabaseClient, enabled: boolean): RankingRow[] | null {
  const [ranking, setRanking] = useState<RankingRow[] | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRanking(null);
      return;
    }
    let active = true;
    client.rpc('quiz_ranking').then(({ data }) => {
      if (active && Array.isArray(data)) setRanking(data);
    });
    return () => {
      active = false;
    };
  }, [client, enabled]);

  return ranking;
}
