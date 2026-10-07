import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Login + checagem de admin para as páginas /admin. O bloqueio de verdade é o RLS no banco;
// isto só decide o que mostrar.

type AdminContext = { client: SupabaseClient; session: Session };

export function RequireAdmin({ children }: { children: (ctx: AdminContext) => ReactNode }) {
  if (!supabase) return <p className="notice">O site ainda não está conectado ao banco de dados.</p>;
  return <SessionGate client={supabase}>{children}</SessionGate>;
}

function SessionGate({ client, children }: { client: SupabaseClient; children: (ctx: AdminContext) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    // Dispara na hora com a sessão salva (INITIAL_SESSION) e depois a cada login/logout.
    const { data } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setChecking(false);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setIsAdmin(null);
    client
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) setIsAdmin(!error && !!data);
      });
    return () => {
      active = false;
    };
  }, [client, userId]);

  if (checking) return <p className="muted">Carregando...</p>;
  if (!session) return <LoginForm client={client} />;

  return (
    <>
      <p className="muted greeting">
        {session.user.email} ·{' '}
        <button type="button" className="link-button" onClick={() => client.auth.signOut()}>
          sair
        </button>
      </p>
      {isAdmin === null && <p className="muted">Carregando...</p>}
      {isAdmin === false && <p className="notice">Esta conta não tem acesso de admin.</p>}
      {isAdmin && children({ client, session })}
    </>
  );
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
