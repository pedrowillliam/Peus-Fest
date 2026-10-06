import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Página só para quem está na tabela admins (veja supabase/schema.sql).
// O bloqueio de verdade é feito pelo banco; esta tela só mostra o que ele liberar.

type Message = {
  id: string;
  author: string;
  body: string;
  created_at: string;
};

const COLUMNS = 'id, author, body, created_at';

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

// Junta sem duplicar (um recado pode chegar pela busca e pelo realtime) e deixa o mais novo primeiro.
function merge(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function Admin() {
  return (
    <main className="page">
      <h1>🔒 Recados</h1>
      {supabase ? (
        <AdminArea client={supabase} />
      ) : (
        <p className="notice">O site ainda não está conectado ao banco de dados.</p>
      )}
    </main>
  );
}

function AdminArea({ client }: { client: SupabaseClient }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Dispara na hora com a sessão salva (INITIAL_SESSION) e depois a cada login/logout.
    const { data } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  if (checking) return <p className="muted">Carregando...</p>;
  if (!session) return <LoginForm client={client} />;
  return <Inbox client={client} session={session} />;
}

function LoginForm({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function login() {
    setLoading(true);
    setFailed(false);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setFailed(true);
  }

  return (
    <form
      className="name-form"
      onSubmit={(e) => {
        e.preventDefault();
        login();
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        aria-label="E-mail"
        autoComplete="email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        aria-label="Senha"
        autoComplete="current-password"
      />
      <button type="submit" className="button" disabled={loading || !email.trim() || !password}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      {failed && (
        <p className="notice" role="alert">
          Não deu para entrar. Confira o e-mail e a senha.
        </p>
      )}
    </form>
  );
}

function Inbox({ client, session }: { client: SupabaseClient; session: Session }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-admin' | 'error'>('loading');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const userId = session.user.id;

  useEffect(() => {
    let active = true;

    // Tópico único por montagem: client.channel() reaproveita um canal de mesmo nome que
    // ainda esteja sendo removido (acontece no StrictMode) e aí a assinatura quebra.
    const channel = client
      .channel(`recados-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => merge(prev, [payload.new as Message]));
      })
      // Recado apagado em outro aparelho some daqui também (o payload só traz o id).
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        const { id } = payload.old as Partial<Message>;
        setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();

    // Assina antes de buscar para não perder recados enviados nesse meio-tempo.
    Promise.all([
      client.from('admins').select('user_id').eq('user_id', userId).maybeSingle(),
      client.from('messages').select(COLUMNS).order('created_at', { ascending: false }),
    ]).then(([admin, list]) => {
      if (!active) return;
      if (admin.error || list.error) setStatus('error');
      else if (!admin.data) setStatus('not-admin');
      else {
        setMessages((prev) => merge(prev, list.data));
        setStatus('ready');
      }
    });

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [client, userId]);

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
      <p className="muted greeting">
        {session.user.email} ·{' '}
        <button type="button" className="link-button" onClick={() => client.auth.signOut()}>
          sair
        </button>
      </p>

      {status === 'loading' && <p className="muted">Carregando recados...</p>}
      {status === 'error' && <p className="notice">Não foi possível carregar os recados.</p>}
      {status === 'not-admin' && <p className="notice">Esta conta não tem acesso aos recados.</p>}
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
                    <strong>{m.author}</strong> · {timeFormat.format(new Date(m.created_at))}
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
