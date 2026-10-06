import { useEffect, useState } from 'react';

export function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = target.getTime() - now;
  if (diff <= 0) return <p className="countdown-done">A festa começou! 🎉</p>;

  const s = Math.floor(diff / 1000);
  const parts = [
    { value: Math.floor(s / 86400), label: 'dias' },
    { value: Math.floor((s % 86400) / 3600), label: 'horas' },
    { value: Math.floor((s % 3600) / 60), label: 'min' },
    { value: s % 60, label: 'seg' },
  ];

  return (
    <div className="countdown" role="timer" aria-label="Tempo até a festa">
      {parts.map((p) => (
        <div key={p.label} className="countdown-cell">
          <span className="countdown-value">{String(p.value).padStart(2, '0')}</span>
          <span className="countdown-label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
