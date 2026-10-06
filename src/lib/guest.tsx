import { createContext, useContext, useState, type ReactNode } from 'react';

export type Guest = { id: string; name: string };

// O id fica salvo mesmo se a pessoa trocar o nome, para não perder pontos/votos.
const ID_KEY = 'aniversario:id';
const NAME_KEY = 'aniversario:nome';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Navegação anônima com storage bloqueado: segue só em memória.
  }
}

// crypto.randomUUID só existe em HTTPS/localhost; no teste pelo IP da rede local, não.
function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function loadGuest(): Guest | null {
  const id = read(ID_KEY);
  const name = read(NAME_KEY);
  return id && name ? { id, name } : null;
}

type GuestContextValue = {
  guest: Guest | null;
  register: (name: string) => void;
  forget: () => void;
};

const GuestContext = createContext<GuestContextValue | null>(null);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<Guest | null>(loadGuest);

  function register(name: string) {
    const id = read(ID_KEY) ?? newId();
    const next = { id, name: name.trim() };
    write(ID_KEY, id);
    write(NAME_KEY, next.name);
    setGuest(next);
  }

  function forget() {
    write(NAME_KEY, null);
    setGuest(null);
  }

  return <GuestContext value={{ guest, register, forget }}>{children}</GuestContext>;
}

export function useGuest(): GuestContextValue {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest precisa estar dentro de <GuestProvider>');
  return ctx;
}
