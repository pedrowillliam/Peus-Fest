import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import type { Guest } from '../lib/guest';

// Mesma lista do check em supabase/reacoes.sql (com o mesmo caractere invisível do ❤️).
const EMOJIS = ['❤️', '😂', '🔥', '😍', '👏', '😮'];
const REFRESH_MS = 5000;

type Reaction = { emoji: string; count: number; names: string[]; mine: boolean };

// Reações da foto ampliada. Se o banco não tiver as funções (reacoes.sql não rodou) ou der erro,
// a barra simplesmente não aparece: o mural continua funcionando.
export function PhotoReactions({ client, photoId, guest }: { client: SupabaseClient; photoId: string; guest: Guest }) {
  const [reactions, setReactions] = useState<Reaction[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setReactions(null);
    const load = async () => {
      const { data, error } = await client.rpc('photo_reactions_list', { p_photo: photoId, p_guest: guest.id });
      if (!active) return;
      if (error || !Array.isArray(data)) return;
      setReactions(data);
    };
    load();
    // Sem realtime aqui (a tabela não é legível direto): atualiza enquanto a foto está aberta.
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [client, photoId, guest.id]);

  async function toggle(emoji: string) {
    setBusy(true);
    setFailed(false);
    const { data, error } = await client.rpc('photo_react', {
      p_photo: photoId,
      p_guest: guest.id,
      p_author: guest.name,
      p_emoji: emoji,
    });
    setBusy(false);
    if (error || !Array.isArray(data)) {
      setFailed(true);
      return;
    }
    setReactions(data);
  }

  if (!reactions) return null;
  const byEmoji = new Map(reactions.map((r) => [r.emoji, r]));
  const withNames = EMOJIS.map((e) => byEmoji.get(e)).filter((r): r is Reaction => !!r && r.count > 0);

  return (
    <div className="reactions" onClick={(e) => e.stopPropagation()}>
      <div className="reaction-buttons">
        {EMOJIS.map((emoji) => {
          const r = byEmoji.get(emoji);
          return (
            <button
              key={emoji}
              type="button"
              className={`reaction${r?.mine ? ' is-mine' : ''}`}
              onClick={() => toggle(emoji)}
              disabled={busy}
              aria-pressed={!!r?.mine}
              aria-label={`Reagir com ${emoji}${r?.count ? ` (${r.count})` : ''}`}
            >
              <span aria-hidden="true">{emoji}</span>
              {!!r?.count && <span className="reaction-count">{r.count}</span>}
            </button>
          );
        })}
      </div>
      {withNames.length > 0 && (
        <ul className="reaction-names">
          {withNames.map((r) => (
            <li key={r.emoji}>
              <span aria-hidden="true">{r.emoji}</span> {r.names.join(', ')}
            </li>
          ))}
        </ul>
      )}
      {failed && (
        <p className="notice" role="alert">
          Não deu para reagir. Tente de novo.
        </p>
      )}
    </div>
  );
}
