import type { SupabaseClient } from '@supabase/supabase-js';
import { useState } from 'react';
import { party } from '../config';
import type { Guest } from '../lib/guest';
import { supabase } from '../lib/supabase';

// Mesmo limite do check em supabase/schema.sql.
const MAX_LENGTH = 500;

// Conta como o char_length do Postgres (um emoji vale 1, e não 2 como em string.length).
function countChars(s: string): number {
  return [...s].length;
}

export function MessageBox({ guest }: { guest: Guest }) {
  if (!supabase) {
    return <p className="notice">Os recados ainda não estão conectados ao banco de dados.</p>;
  }
  return <MessageForm guest={guest} client={supabase} />;
}

function MessageForm({ guest, client }: { guest: Guest; client: SupabaseClient }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'error' | null>(null);

  const length = countChars(text);
  const excess = length - MAX_LENGTH;

  async function send() {
    const body = text.trim();
    if (!body || sending || countChars(body) > MAX_LENGTH) return;

    setSending(true);
    setResult(null);
    // Sem .select(): convidados têm permissão para enviar, mas não para ler recados.
    const { error } = await client.from('messages').insert({ guest_id: guest.id, author: guest.name, body });
    setSending(false);

    if (error) {
      setResult('error');
      return;
    }
    setText('');
    setResult('sent');
  }

  return (
    <form
      className="message-form"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {/* Sem maxLength de propósito: o navegador cortaria o texto colado sem avisar ninguém. */}
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        placeholder={`Escreva algo para ${party.birthdayName}...`}
        aria-label="Seu recado"
        aria-invalid={excess > 0}
        aria-describedby="message-limit"
        className={excess > 0 ? 'over-limit' : undefined}
        rows={5}
      />
      <div className="message-form-info">
        <span>
          Assinado por <strong>{guest.name}</strong>
        </span>
        <span className={excess > 0 ? 'counter-over' : undefined}>
          {length}/{MAX_LENGTH}
        </span>
      </div>
      <div id="message-limit" aria-live="polite">
        {excess > 0 && (
          <p className="notice limit-warning">
            Seu recado passou do limite de {MAX_LENGTH} caracteres. Apague {excess}{' '}
            {excess === 1 ? 'caractere' : 'caracteres'} para poder enviar.
          </p>
        )}
        {excess === 0 && <p className="limit-note">Você chegou ao limite de {MAX_LENGTH} caracteres.</p>}
      </div>
      <button type="submit" className="button" disabled={!text.trim() || sending || excess > 0}>
        {sending ? 'Enviando...' : 'Enviar recado'}
      </button>
      <p className="private-note">🔒 Só {party.birthdayName} vai ler.</p>
      {result === 'sent' && (
        <p className="feedback" role="status">
          Recado enviado! 💌 Se quiser, pode mandar outro.
        </p>
      )}
      {result === 'error' && (
        <p className="notice" role="alert">
          Não deu para enviar. Tente de novo.
        </p>
      )}
    </form>
  );
}
