import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { RequireAdmin } from '../components/RequireAdmin';
import { formatDateTime } from '../lib/format';
import { mergeById } from '../lib/merge';

type Message = {
  id: string;
  author: string;
  body: string;
  created_at: string;
};

const COLUMNS = 'id, author, body, created_at';

export function Admin() {
  return (
    <main className="page">
      <h1>🔒 Recados</h1>
      <RequireAdmin>{({ client }) => <Inbox client={client} />}</RequireAdmin>
    </main>
  );
}

function Inbox({ client }: { client: SupabaseClient }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  useEffect(() => {
    let active = true;

    // Tópico único por montagem: client.channel() reaproveita um canal de mesmo nome que
    // ainda esteja sendo removido (acontece no StrictMode) e aí a assinatura quebra.
    const channel = client
      .channel(`recados-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => mergeById(prev, [payload.new as Message]));
      })
      // Recado apagado em outro aparelho some daqui também (o payload só traz o id).
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const { id } = payload.old as Partial<Message>;
        setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();

    // Assina antes de buscar para não perder recados enviados nesse meio-tempo.
    client
      .from('messages')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setStatus('error');
          return;
        }
        setMessages((prev) => mergeById(prev, data));
        setStatus('ready');
      });

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [client]);

  async function remove(message: Message) {
    if (!window.confirm(`Apagar o recado de ${message.author}? Não dá para desfazer.`)) return;

    setDeletingId(message.id);
    setDeleteFailed(false);
    // O .select() mostra se apagou de fato: sem permissão, o RLS ignora a linha e não devolve erro.
    const { data, error } = await client.from('messages').delete().eq('id', message.id).select('id');
    setDeletingId(null);

    if (error || !data?.length) {
      setDeleteFailed(true);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  }

  return (
    <>
      {status === 'ready' && (
        <p className="muted admin-tip">
          Fotos: com este login, abra o <Link to="/jogo/fotos">Mural de fotos</Link> neste aparelho e toque numa
          foto para ver o botão Apagar.
        </p>
      )}

      {status === 'loading' && <p className="muted">Carregando recados...</p>}
      {status === 'error' && <p className="notice">Não foi possível carregar os recados.</p>}
      {status === 'ready' && (
        <>
          <h2>
            {messages.length} {messages.length === 1 ? 'recado' : 'recados'}
          </h2>
          {messages.length === 0 && <p className="muted">Nenhum recado ainda. Eles aparecem aqui na hora.</p>}
          {deleteFailed && (
            <p className="notice delete-error" role="alert">
              Não foi possível apagar o recado. Tente de novo.
            </p>
          )}
          <ul className="message-list">
            {messages.map((m) => (
              <li key={m.id} className="message-card">
                <p className="message-body">{m.body}</p>
                <div className="message-meta">
                  <span>
                    <strong>{m.author}</strong> · {formatDateTime(m.created_at)}
                  </span>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => remove(m)}
                    disabled={deletingId === m.id}
                  >
                    {deletingId === m.id ? 'Apagando...' : 'Apagar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
