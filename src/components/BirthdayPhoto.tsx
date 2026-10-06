import { party } from '../config';

export function BirthdayPhoto({ src, size }: { src: string; size: number }) {
  return (
    <span className="hero-photo" style={{ width: size, height: size }}>
      <img src={src} alt={party.birthdayName} width={size} height={size} />
    </span>
  );
}
