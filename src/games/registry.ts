import { party } from '../config';

export type Game = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  ready: boolean;
};

// Sugestões iniciais: remova/adicione conforme as brincadeiras escolhidas.
export const games: Game[] = [
  {
    id: 'quiz',
    emoji: '🧠',
    title: 'Quiz',
    description: `Quem conhece mais ${party.birthdayName}? Ranking ao vivo.`,
    ready: false,
  },
  {
    id: 'recados',
    emoji: '💌',
    title: 'Mural de recados',
    description: `Deixe uma mensagem para ${party.birthdayName}.`,
    ready: false,
  },
  {
    id: 'bingo',
    emoji: '🎯',
    title: 'Bingo da festa',
    description: 'Marque as situações que acontecerem durante a festa.',
    ready: false,
  },
  {
    id: 'missoes',
    emoji: '📸',
    title: 'Missões',
    description: 'Desafios com foto para cumprir até o fim da noite.',
    ready: false,
  },
  {
    id: 'premios',
    emoji: '🏆',
    title: 'Prêmios da noite',
    description: 'Vote em quem mais dançou, quem chegou mais atrasado...',
    ready: false,
  },
];
