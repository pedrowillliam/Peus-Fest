import type { RankingRow } from '../lib/quiz';

const points = (n: number) => `${n} ${n === 1 ? 'ponto' : 'pontos'}`;

export function Podium({ ranking }: { ranking: RankingRow[] }) {
  if (ranking.length === 0) return <p className="muted">Ninguém jogou.</p>;
  const [first, ...rest] = ranking;
  const tie = rest[0]?.points === first.points;

  return (
    <div className="podium">
      <p className="podium-label">1º lugar</p>
      <p className="podium-winner">{first.name}</p>
      <p className="muted">{points(first.points)}</p>
      {tie && <p className="muted podium-note">Empate em pontos: venceu quem respondeu mais rápido.</p>}
      {rest.length > 0 && (
        <ol className="podium-list" start={2}>
          {rest.map((row) => (
            <li key={row.id}>
              <span>{row.name}</span>
              <span className="muted">{points(row.points)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
