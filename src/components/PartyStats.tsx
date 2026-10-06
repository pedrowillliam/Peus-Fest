import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../lib/supabase';

type Stats = { photos: number; messages: number };

// Recados não chegam por realtime para convidados (não podem lê-los), então o placar consulta
// a contagem (função party_stats em supabase/placar.sql) a cada 20 s, só com a tela visível.
const REFRESH_MS = 20_000;

const number = new Intl.NumberFormat('pt-BR');

export function PartyStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const load = async () => {
      if (document.visibilityState === 'hidden') return;
      const { data, error } = await client.rpc('party_stats');
      if (!active || error || !data) return;
      setStats({ photos: Number(data.photos) || 0, messages: Number(data.messages) || 0 });
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  // Sem banco (ou função ainda não criada), o placar simplesmente não aparece.
  if (!stats) return null;

  return (
    <section aria-labelledby="placar-titulo">
      <h2 id="placar-titulo">Placar da festa</h2>
      <div className="stats">
        <Link to="/jogo/fotos" className="stat">
          <span className="stat-value">{number.format(stats.photos)}</span>
          <span className="stat-label">{stats.photos === 1 ? 'foto postada' : 'fotos postadas'}</span>
        </Link>
        <Link to="/jogo/recados" className="stat">
          <span className="stat-value">{number.format(stats.messages)}</span>
          <span className="stat-label">{stats.messages === 1 ? 'recado enviado' : 'recados enviados'}</span>
        </Link>
      </div>
    </section>
  );
}
