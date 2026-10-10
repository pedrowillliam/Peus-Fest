-- Reações com emoji nas fotos do mural. Rode uma vez no SQL Editor do Supabase, depois do fotos.sql.

create table public.photo_reactions (
  photo_id uuid not null references public.photos (id) on delete cascade,
  guest_id text not null,
  author text not null check (char_length(author) between 1 and 30),
  emoji text not null check (emoji in ('❤️', '😂', '🔥', '😍', '👏', '😮')),
  created_at timestamptz not null default now(),
  primary key (photo_id, guest_id, emoji) -- cada pessoa usa cada emoji uma vez por foto
);

-- Sem acesso direto: tudo passa pelas funções abaixo, que nunca devolvem o guest_id de ninguém
-- (com ele, daria para tirar a reação dos outros).
alter table public.photo_reactions enable row level security;

-- Reações de uma foto: por emoji, quantas, quem reagiu e se este aparelho reagiu.
create function public.photo_reactions_list(p_photo uuid, p_guest text) returns json
language sql stable security definer set search_path = ''
as $$
  select coalesce(json_agg(json_build_object(
    'emoji', r.emoji, 'count', r.total, 'names', r.names, 'mine', r.mine
  )), '[]'::json)
  from (
    select emoji, count(*) as total,
      json_agg(author order by created_at) as names,
      bool_or(guest_id = p_guest) as mine
    from public.photo_reactions
    where photo_id = p_photo
    group by emoji
  ) r
$$;

-- Liga/desliga a reação deste aparelho e devolve a lista atualizada.
create function public.photo_react(p_photo uuid, p_guest text, p_author text, p_emoji text) returns json
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.photo_reactions
  where photo_id = p_photo and guest_id = p_guest and emoji = p_emoji;
  if not found then
    insert into public.photo_reactions (photo_id, guest_id, author, emoji)
    values (p_photo, p_guest, trim(p_author), p_emoji);
  end if;
  return public.photo_reactions_list(p_photo, p_guest);
end
$$;

revoke all on function public.photo_reactions_list(uuid, text), public.photo_react(uuid, text, text, text)
from public, anon, authenticated;

grant execute on function public.photo_reactions_list(uuid, text), public.photo_react(uuid, text, text, text)
to anon, authenticated;
