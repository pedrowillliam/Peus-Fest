import '@fontsource/bebas-neue/latin-400.css';
import { useEffect, useRef, useState } from 'react';

type Option = {
  label: string; // texto curto que cabe na fatia (só o "Se fudeu" leva emoji na roleta)
  title: string; // desafio mostrado no pop-up do resultado
  caption?: string;
  pix?: boolean; // mostra a chave Pix com botão de copiar
};

const OPTIONS: Option[] = [
  { label: 'Todos menos você', title: 'Todos bebem menos você' },
  { label: 'Beba um shot', title: 'Beba um shot' },
  { label: 'Beba e gire', title: 'Beba e gire mais uma vez' },
  { label: 'Passe a vez', title: 'Passe a vez' },
  { label: 'Beba em dobro', title: 'Beba em dobro' },
  { label: 'Escolha um amigo', title: 'Escolha um amigo para beber' },
  { label: 'Sem as mãos', title: 'Beba sem usar as mãos' },
  {
    label: 'Se fudeu 💸',
    title: 'Se fudeu',
    caption: 'Faça um pix de R$ 5,00 para o aniversariante',
    pix: true,
  },
];

// Fica no .env.local / variáveis da Vercel, fora do repositório. Sem ela, o cartão mostra só a legenda.
const PIX_KEY = import.meta.env.VITE_PIX_KEY;

const SLICE = 360 / OPTIONS.length;
const RADIUS = 145;
const SPIN_MS = 4500;
const SPIN_MS_REDUCED = 600;

// Ângulos contados a partir do topo, no sentido horário (onde fica o ponteiro).
function point(angle: number): string {
  const rad = ((angle - 90) * Math.PI) / 180;
  return `${(RADIUS * Math.cos(rad)).toFixed(2)} ${(RADIUS * Math.sin(rad)).toFixed(2)}`;
}

function slicePath(i: number): string {
  return `M 0 0 L ${point(i * SLICE)} A ${RADIUS} ${RADIUS} 0 0 1 ${point((i + 1) * SLICE)} Z`;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // navigator.clipboard só existe em HTTPS/localhost; no teste pelo IP da rede local, usa o jeito antigo.
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  }
}

function PixCopy({ pixKey }: { pixKey: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  return (
    // Tocar aqui não fecha o pop-up.
    <div className="pix-copy" onClick={(e) => e.stopPropagation()}>
      <span className="pix-key">
        Pix: <span className="pix-key-value">{pixKey}</span>
      </span>
      <button
        type="button"
        className="pix-copy-button"
        onClick={async () => {
          if (await copyText(pixKey)) {
            setStatus('copied');
            window.setTimeout(() => setStatus('idle'), 2000);
          } else {
            setStatus('failed');
          }
        }}
      >
        {status === 'copied' ? 'Copiado!' : 'Copiar'}
      </button>
      {status === 'failed' && (
        <span className="pix-copy-failed" role="alert">
          Não deu para copiar. Segure o número para selecionar.
        </span>
      )}
    </div>
  );
}

export function ShotRoulette() {
  const [rotation, setRotation] = useState(0);
  const [duration, setDuration] = useState(SPIN_MS);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Option | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function spin() {
    if (spinning) return;

    const index = Math.floor(Math.random() * OPTIONS.length);
    // Para num ponto aleatório da fatia, longe das bordas, para não parar "em cima da linha".
    const offset = SLICE * (0.15 + Math.random() * 0.7);
    // A roleta gira no sentido horário: o ponteiro aponta para o ângulo -rotation da roda.
    const target = 360 - (index * SLICE + offset);
    const delta = (((target - rotation) % 360) + 360) % 360;
    const ms = prefersReducedMotion() ? SPIN_MS_REDUCED : SPIN_MS;

    setDuration(ms);
    setRotation(rotation + 360 * 5 + delta);
    setSpinning(true);
    setResult(null);
    timer.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(OPTIONS[index]);
      navigator.vibrate?.(150);
    }, ms);
  }

  return (
    <div className="roulette">
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden="true" />
        <svg
          className="wheel"
          viewBox="-150 -150 300 300"
          style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${duration}ms` }}
          role="img"
          aria-label="Roleta de shots"
        >
          {OPTIONS.map((o, i) => (
            <g key={o.label}>
              <path className={`wheel-slice wheel-slice-${i % 2}`} d={slicePath(i)} />
              <text
                className="wheel-label"
                transform={`rotate(${i * SLICE + SLICE / 2 - 90})`}
                x={RADIUS - 12}
                y={0}
              >
                {o.label.toUpperCase()}
              </text>
            </g>
          ))}
          <circle className="wheel-rim" r={RADIUS} />
          <circle className="wheel-hub" r={20} />
          <circle className="wheel-hub-dot" r={7} />
        </svg>

        {/* Pop-up do resultado por cima da roleta; some ao tocar nele ou ao girar de novo. */}
        <div className="roulette-popup-layer" aria-live="polite">
          {result && (
            <div className="roulette-popup" onClick={() => setResult(null)}>
              <span className="roulette-popup-title">{result.title}</span>
              {result.caption && <span className="roulette-popup-caption">{result.caption}</span>}
              {result.pix && PIX_KEY && <PixCopy pixKey={PIX_KEY} />}
              <button type="button" className="roulette-popup-close" onClick={() => setResult(null)}>
                toque para fechar
              </button>
            </div>
          )}
        </div>
      </div>

      <button type="button" className="button" onClick={spin} disabled={spinning}>
        {spinning ? 'Girando...' : 'Girar roleta'}
      </button>

      <p className="private-note">Beba sem moderação!</p>
    </div>
  );
}
