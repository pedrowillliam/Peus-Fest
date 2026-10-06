import { useState } from 'react';
import { party } from '../config';
import { useGuest } from '../lib/guest';

export function Welcome() {
  const { register } = useGuest();
  const [name, setName] = useState('');

  return (
    <main className="page welcome">
      <div className="hero-emoji">🎉</div>
      <h1>Aniversário de {party.birthdayName}</h1>
      <p className="muted">Que bom ter você aqui! Antes de começar, como você se chama?</p>
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) register(name);
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          aria-label="Seu nome"
          autoComplete="given-name"
          maxLength={30}
          autoFocus
        />
        <button type="submit" className="button" disabled={!name.trim()}>
          Entrar na festa
        </button>
      </form>
    </main>
  );
}
