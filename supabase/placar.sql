-- Placar da festa (home). Rode uma vez no SQL Editor do Supabase, depois do fotos.sql.
-- Devolve só as contagens: convidados continuam sem acesso ao conteúdo dos recados.

create function public.party_stats()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'photos', (select count(*) from public.photos),
    'messages', (select count(*) from public.messages)
  );
$$;

revoke all on function public.party_stats() from public;
grant execute on function public.party_stats() to anon, authenticated;
