import type { ComponentType } from 'react';
import { party } from '../config';
import type { Guest } from '../lib/guest';
import { MessageBox } from './MessageBox';
import { PhotoWall } from './PhotoWall';
import { Quiz } from './Quiz';
import { ShotRoulette } from './ShotRoulette';

export type Game = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  // Sem componente, a brincadeira aparece como "em breve".
  component?: ComponentType<{ guest: Guest }>;
};

export const games: Game[] = [
  {
    id: 'recados',
    emoji: '💌',
    title: 'Caixa de recados',
    description: `Deixe uma mensagem que só ${party.birthdayName} vai ler.`,
    component: MessageBox,
  },
  {
    id: 'roleta',
    emoji: '🍻',
    title: 'Roleta de shots',
    description: 'Gire a roleta e cumpra o desafio que cair.',
    component: ShotRoulette,
  },
  {
    id: 'fotos',
    emoji: '📸',
    title: 'Mural de fotos',
    description: 'Tire fotos da festa e veja as de todo mundo.',
    component: PhotoWall,
  },
  {
    id: 'quiz',
    emoji: '🧠',
    title: `Quiz do ${party.nickname}`,
    description: `Quem conhece mais o ${party.nickname}? Ao vivo, cada um no seu celular.`,
    component: Quiz,
  },
];
