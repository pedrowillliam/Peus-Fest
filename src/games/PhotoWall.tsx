import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { PhotoReactions } from '../components/PhotoReactions';
import { party } from '../config';
import { useIsAdmin } from '../lib/admin';
import { formatDateTime } from '../lib/format';
import type { Guest } from '../lib/guest';
import { preparePhoto } from '../lib/images';
import { mergeById } from '../lib/merge';
import { saveImage, slug } from '../lib/saveImage';
import { supabase } from '../lib/supabase';
import { uuid } from '../lib/uuid';

type Photo = {
  id: string;
  author: string;
  path: string;
  thumb_path: string;
  created_at: string;
};

const BUCKET = 'photos';
const COLUMNS = 'id, author, path, thumb_path, created_at';
const MAX_FILES = 10;
const ONE_YEAR = '31536000'; // arquivos nunca mudam: cache longo

export function PhotoWall({ guest }: { guest: Guest }) {
  if (!supabase) {
    return <p className="notice">O mural ainda não está conectado ao banco de dados.</p>;
  }
  return <ConnectedWall guest={guest} client={supabase} />;
}

function ConnectedWall({ guest, client }: { guest: Guest; client: SupabaseClient }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const files = useRef(new Map<string, Promise<File>>());
  const isAdmin = useIsAdmin(client);

  const publicUrl = (path: string) => client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  useEffect(() => {
    let active = true;

    // Tópico único por montagem: client.channel() reaproveita um canal de mesmo nome que
    // ainda esteja sendo removido (acontece no StrictMode) e aí a assinatura quebra.
    const channel = client
      .channel(`fotos-${uuid()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos' }, (payload) => {
        setPhotos((prev) => mergeById(prev, [payload.new as Photo]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photos' }, (payload) => {
        const { id } = payload.old as Partial<Photo>;
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        setOpen((current) => (current?.id === id ? null : current));
      })
      .subscribe();

    // Assina antes de buscar para não perder fotos enviadas nesse meio-tempo.
    client
      .from('photos')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setStatus('error');
          return;
        }
        setPhotos((prev) => mergeById(prev, data));
        setStatus('ready');
      });

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [client]);

  function photoFile(photo: Photo): Promise<File> {
    let file = files.current.get(photo.id);
    if (!file) {
      const name = `aniversario-${slug(party.nickname)}-${slug(photo.author) || 'foto'}-${photo.id.slice(0, 8)}.jpg`;
      file = fetch(publicUrl(photo.path))
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => new File([blob], name, { type: 'image/jpeg' }));
      file.catch(() => files.current.delete(photo.id)); // deixa tentar de novo
      files.current.set(photo.id, file);
    }
    return file;
  }

  async function save(photo: Photo) {
    setSaving(true);
    setSaveFailed(false);
    try {
      await saveImage(await photoFile(photo));
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  // Foto ampliada: Esc fecha e a página de trás não rola.
  useEffect(() => {
    if (!open) return;
    // Já busca o arquivo para o "Baixar": o iPhone só abre o menu de compartilhar logo após o toque.
    photoFile(open).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  async function sendOne(file: File) {
    const { full, thumb } = await preparePhoto(file);
    const id = uuid();
    const path = `${id}.jpg`;
    const thumbPath = `${id}-thumb.jpg`;
    const storage = client.storage.from(BUCKET);

    for (const [name, blob] of [
      [path, full],
      [thumbPath, thumb],
    ] as const) {
      const { error } = await storage.upload(name, blob, { contentType: 'image/jpeg', cacheControl: ONE_YEAR });
      if (error) throw error;
    }

    const { data, error } = await client
      .from('photos')
      .insert({ id, guest_id: guest.id, author: guest.name, path, thumb_path: thumbPath })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    setPhotos((prev) => mergeById(prev, [data]));
  }

  async function send(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = ''; // permite escolher a mesma foto de novo
    if (!files.length || progress) return;

    // Só fotos: vídeo (ou outro arquivo) é recusado antes de enviar. Tipo vazio acontece em
    // alguns Androids; nesse caso tenta, e se não for imagem a leitura falha e conta como erro.
    const images = files.filter((f) => f.type === '' || f.type.startsWith('image/'));
    const rejected = files.filter((f) => !images.includes(f));
    if (!images.length) {
      setFeedback({ ok: false, text: 'Vídeos não são aceitos. Escolha uma foto.' });
      return;
    }
    const allVideos = rejected.every((f) => f.type.startsWith('video/'));
    const rejectedNote = rejected.length
      ? ` ${rejected.length} ${allVideos ? 'vídeo' : 'arquivo'}${rejected.length > 1 ? 's ficaram' : ' ficou'} de fora: só fotos são aceitas.`
      : '';

    const batch = images.slice(0, MAX_FILES);
    let sent = 0;
    setFeedback(null);
    for (const [i, file] of batch.entries()) {
      setProgress({ current: i + 1, total: batch.length });
      try {
        await sendOne(file);
        sent++;
      } catch {
        // Segue para as próximas; o aviso no fim conta as que falharam.
      }
    }
    setProgress(null);

    const failed = batch.length - sent;
    const notes = (images.length > MAX_FILES ? ` Só dá para enviar ${MAX_FILES} por vez.` : '') + rejectedNote;
    if (failed === 0) {
      const text = (sent === 1 ? 'Foto enviada!' : `${sent} fotos enviadas!`) + notes;
      setFeedback({ ok: !notes, text });
    } else if (sent === 0) {
      setFeedback({ ok: false, text: 'Não deu para enviar. Tente de novo.' + notes });
    } else {
      setFeedback({ ok: false, text: `${sent} enviadas e ${failed} não foram. Tente de novo as que faltaram.` + notes });
    }
  }

  async function remove(photo: Photo) {
    if (!window.confirm(`Apagar a foto de ${photo.author}? Ela some do mural de todo mundo.`)) return;

    setDeleting(true);
    setDeleteFailed(false);
    // O .select() mostra se apagou de fato: sem permissão, o RLS ignora a linha e não devolve erro.
    const { data, error } = await client.from('photos').delete().eq('id', photo.id).select('id');
    if (error || !data?.length) {
      setDeleting(false);
      setDeleteFailed(true);
      return;
    }
    // Arquivos por último: se falhar, a foto já saiu do mural, que é o que importa.
    await client.storage.from(BUCKET).remove([photo.path, photo.thumb_path]);
    setDeleting(false);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    setOpen(null);
  }

  const busy = progress !== null;

  return (
    <div className="photo-wall">
      {/* <label> abre o seletor de arquivo de forma confiável em qualquer celular. */}
      <div className="photo-actions">
        <label className={`button${busy ? ' is-disabled' : ''}`}>
          Tirar foto
          <input
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={send}
          />
        </label>
        <label className={`button button-secondary${busy ? ' is-disabled' : ''}`}>
          Galeria
          <input className="visually-hidden" type="file" accept="image/*" multiple disabled={busy} onChange={send} />
        </label>
      </div>
      <p className="photo-hint">Só fotos. Vídeos não são aceitos.</p>

      <div aria-live="polite">
        {progress && (
          <p className="feedback">
            {progress.total > 1 ? `Enviando ${progress.current} de ${progress.total}...` : 'Enviando foto...'}
          </p>
        )}
        {feedback && <p className={feedback.ok ? 'feedback' : 'notice'}>{feedback.text}</p>}
      </div>

      <h2>{status === 'ready' ? `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}` : 'Fotos'}</h2>
      {status === 'loading' && <p className="muted">Carregando fotos...</p>}
      {status === 'error' && <p className="notice">Não foi possível carregar as fotos.</p>}
      {status === 'ready' && photos.length === 0 && (
        <p className="muted">Nenhuma foto ainda. Seja a primeira pessoa a postar!</p>
      )}

      <ul className="photo-grid">
        {photos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="photo-tile"
              onClick={() => {
                setDeleteFailed(false);
                setSaveFailed(false);
                setOpen(p);
              }}
            >
              <img src={publicUrl(p.thumb_path)} alt={`Foto de ${p.author}`} loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${open.author}`}
          onClick={() => setOpen(null)}
        >
          {/* crossOrigin: mesma requisição (CORS) do fetch do "Baixar", então o arquivo vem do cache. */}
          <img
            className="lightbox-image"
            src={publicUrl(open.path)}
            alt={`Foto de ${open.author}`}
            crossOrigin="anonymous"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span>
              <strong>{open.author}</strong> · {formatDateTime(open.created_at)}
            </span>
            <div className="lightbox-buttons">
              {isAdmin && (
                <button type="button" className="delete-button" onClick={() => remove(open)} disabled={deleting}>
                  {deleting ? 'Apagando...' : 'Apagar foto'}
                </button>
              )}
              <button type="button" className="lightbox-save" onClick={() => save(open)} disabled={saving}>
                {saving ? 'Baixando...' : 'Baixar'}
              </button>
              <button type="button" className="lightbox-close" onClick={() => setOpen(null)}>
                Fechar
              </button>
            </div>
          </div>
          <PhotoReactions client={client} photoId={open.id} guest={guest} />
          {deleteFailed && (
            <p className="notice lightbox-error" role="alert" onClick={(e) => e.stopPropagation()}>
              Não foi possível apagar a foto. Tente de novo.
            </p>
          )}
          {saveFailed && (
            <p className="notice lightbox-error" role="alert" onClick={(e) => e.stopPropagation()}>
              Não deu para baixar. Segure o dedo na foto e escolha salvar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
