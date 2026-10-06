import { Link, useParams } from 'react-router';
import { games } from '../games/registry';
import type { Guest } from '../lib/guest';

export function GamePage({ guest }: { guest: Guest }) {
  const { id } = useParams();
  const game = games.find((g) => g.id === id);

  if (!game) {
    return (
      <main className="page">
        <Link to="/" className="back">
          ← Voltar
        </Link>
        <h1>Ops!</h1>
        <p className="muted">Essa brincadeira não existe.</p>
      </main>
    );
  }

  const Content = game.component;

  return (
    <main className="page">
      <Link to="/" className="back">
        ← Voltar
      </Link>
      <h1>{game.title}</h1>
      <p className="muted">{game.description}</p>
      {Content ? <Content guest={guest} /> : <span className="badge">em breve</span>}
    </main>
  );
}
