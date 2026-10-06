import type { ComponentType } from 'react';
import { party } from '../config';
import type { Guest } from '../lib/guest';
import { MessageBox } from './MessageBox';

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
];
