import { Navigate, Route, Routes } from 'react-router';
import { useGuest } from './lib/guest';
import { GamePage } from './pages/GamePage';
import { Home } from './pages/Home';
import { Welcome } from './pages/Welcome';

export function App() {
  const { guest } = useGuest();

  // Sem nome, qualquer link (inclusive QR code direto para uma brincadeira) cai na boas-vindas primeiro.
  if (!guest) return <Welcome />;

  return (
    <Routes>
      <Route path="/" element={<Home guest={guest} />} />
      <Route path="/jogo/:id" element={<GamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
