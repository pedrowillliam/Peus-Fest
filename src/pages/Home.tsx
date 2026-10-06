import { Link } from 'react-router';
import { Countdown } from '../components/Countdown';
import { party } from '../config';
import { games } from '../games/registry';
import { useGuest, type Guest } from '../lib/guest';

const birthdayFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const partyFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export function Home({ guest }: { guest: Guest }) {
  const { forget } = useGuest();

  return (
    <main className="page">
      <p className="muted greeting">
        Oi, <strong>{guest.name}</strong> 👋{' '}
        <button type="button" className="link-button" onClick={forget}>
          não é você?
        </button>
      </p>
      <h1>Aniversário de {party.birthdayName}</h1>
      <p className="muted dates">
        🎂 Aniversário: {birthdayFormat.format(party.birthday)}
        <br />
        🎉 Festa: {partyFormat.format(party.startsAt)}
      </p>
      <Countdown target={party.startsAt} />

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
    </main>
  );
}
