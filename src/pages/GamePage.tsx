import { Link, useParams } from 'react-router';
import { games } from '../games/registry';

export function GamePage() {
  const { id } = useParams();
  const game = games.find((g) => g.id === id);

  return (
    <main className="page">
      <Link to="/" className="back">
        ← Voltar
      </Link>
      {game ? (
        <>
          <div className="hero-emoji">{game.emoji}</div>
          <h1>{game.title}</h1>
          <p className="muted">{game.description}</p>
          <span className="badge">em breve</span>
        </>
      ) : (
        <>
          <h1>Ops!</h1>
          <p className="muted">Essa brincadeira não existe.</p>
        </>
      )}
    </main>
  );
}
