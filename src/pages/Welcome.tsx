import { useState } from 'react';
import { BirthdayPhoto } from '../components/BirthdayPhoto';
import { party } from '../config';
import { useGuest } from '../lib/guest';

export function Welcome() {
  const { register } = useGuest();
  const [name, setName] = useState('');

  return (
    <main className="page welcome">
      <BirthdayPhoto src={party.photos.welcome} size={140} />
      <h1>Bem-vindo ao aniversário de {party.nickname}</h1>
      <p className="muted">
        Fico muito feliz com a sua presença, coloque o seu nome para começarmos a brincadeira.
      </p>
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
