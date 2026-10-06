-- Rode isto uma vez no SQL Editor do painel do Supabase.

-- Contas que podem ler os recados (veja o README para se adicionar aqui).
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  author text not null check (char_length(author) between 1 and 30),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.messages enable row level security;

grant select on public.admins to authenticated;
grant insert on public.messages to anon, authenticated;
grant select on public.messages to authenticated;

-- Cada conta só consegue ver se ela mesma é admin.
create policy "Ver a própria linha de admin" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Convidados (sem login) só enviam recados: não leem nenhum, nem o próprio.
create policy "Qualquer um envia recado" on public.messages
  for insert to anon, authenticated with check (true);

create policy "Só admins leem os recados" on public.messages
  for select to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Apagar recados: só admins, pelo botão da página /admin.
grant delete on public.messages to authenticated;

create policy "Só admins apagam recados" on public.messages
  for delete to authenticated
  using (exists (select 1 from public.admins where user_id = (select auth.uid())));

-- Recados novos aparecem na hora na página /admin.
alter publication supabase_realtime add table public.messages;
