-- Mural de fotos. Rode uma vez no SQL Editor do Supabase, depois do schema.sql.

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  author text not null check (char_length(author) between 1 and 30),
  path text not null check (path ~ '^[0-9a-f-]{36}\.jpg$'),
  thumb_path text not null check (thumb_path ~ '^[0-9a-f-]{36}-thumb\.jpg$'),
  created_at timestamptz not null default now()
);

-- Todo mundo vê e envia fotos; só admins apagam (pelo botão na foto ampliada).
alter table public.photos enable row level security;

grant select, insert on public.photos to anon, authenticated;
grant delete on public.photos to authenticated;

create policy "Todos veem as fotos" on public.photos
  for select to anon, authenticated using (true);

create policy "Qualquer um envia foto" on public.photos
  for insert to anon, authenticated with check (true);

create policy "Só admins apagam fotos" on public.photos
  for delete to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Fotos novas e apagadas aparecem na hora para todo mundo.
alter publication supabase_realtime add table public.photos;

-- Arquivos: bucket público (leitura pelo link), só JPEG, até 3 MB (o site já envia ~300 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, array['image/jpeg']);

create policy "Qualquer um envia arquivo de foto" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'photos');

create policy "Só admins listam arquivos de foto" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "Só admins apagam arquivos de foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and exists (select 1 from public.admins where user_id = (select auth.uid())));
