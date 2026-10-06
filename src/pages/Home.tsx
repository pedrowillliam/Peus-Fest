import { Link } from 'react-router';
import { BirthdayPhoto } from '../components/BirthdayPhoto';
import { PartyStats } from '../components/PartyStats';
import { party } from '../config';
import { games } from '../games/registry';
import { useGuest, type Guest } from '../lib/guest';

export function Home({ guest }: { guest: Guest }) {
  const { forget } = useGuest();

  return (
    <main className="page">
      <p className="muted greeting">
        Oi, <strong>{guest.name}</strong> 👋{' '}
        <button type="button" className="link-button" onClick={forget}>
          Trocar de nome
        </button>
      </p>
      <div className="hero">
        <BirthdayPhoto src={party.photos.home} size={96} />
        <div>
          <h1>Farrinha do {party.nickname}</h1>
          <p className="muted tagline">Há {party.age} anos sendo gostoso nesse mundo</p>
        </div>
      </div>

      <PartyStats />

      <h2>Brincadeiras</h2>
      <ul className="game-list">
        {games.map((g) => (
          <li key={g.id}>
            <Link to={`/jogo/${g.id}`} className="game-card">
              <span className="game-emoji" aria-hidden="true">
                {g.emoji}
              </span>
              <span className="game-text">
                <strong>{g.title}</strong>
                <span className="muted">{g.description}</span>
              </span>
              {!g.component && <span className="badge">em breve</span>}
            </Link>
          </li>
        ))}
      </ul>

      <h2>Música</h2>
      <a href={party.playlistUrl} target="_blank" rel="noopener noreferrer" className="game-card">
        <span className="game-emoji" aria-hidden="true">
          🎵
        </span>
        <span className="game-text">
          <strong>Playlist da festa</strong>
          <span className="muted">Adicione suas músicas no Spotify.</span>
        </span>
        <span className="external-mark" aria-label="abre o Spotify">
          ↗
        </span>
      </a>
    </main>
  );
}
