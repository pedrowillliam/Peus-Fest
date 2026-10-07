-- Quiz individual, ao vivo, comandado pelo aniversariante em /admin/quiz (um jogador por celular).
-- Rode uma vez no SQL Editor do Supabase, depois do placar.sql.
-- As perguntas e o gabarito NÃO ficam aqui (o repositório é público): veja supabase/privado/.

create table public.quiz_state (
  id smallint primary key default 1 check (id = 1),
  phase text not null default 'closed'
    check (phase in ('closed', 'lobby', 'question', 'reveal', 'finished', 'results')),
  question_index int not null default 0,
  started_at timestamptz,
  round uuid not null default gen_random_uuid(), -- muda a cada "Reiniciar quiz"
  updated_at timestamptz not null default now()
);
insert into public.quiz_state (id) values (1);

create table public.quiz_questions (
  position int primary key check (position >= 0), -- 0 = primeira pergunta
  text text not null,
  options text[] not null check (array_length(options, 1) = 4),
  correct smallint not null check (correct between 0 and 3),
  image text -- opcional: caminho de uma imagem do site, ex.: /quiz/foto-pergunta-10.jpg
);

create table public.quiz_players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  guest_id text not null unique, -- um jogador por aparelho
  created_at timestamptz not null default now()
);

create table public.quiz_answers (
  player_id uuid not null references public.quiz_players (id) on delete cascade,
  question_index int not null,
  choice smallint not null check (choice between 0 and 3),
  correct boolean not null,
  response_ms int not null,
  created_at timestamptz not null default now(),
  primary key (player_id, question_index) -- uma resposta por jogador por pergunta
);

-- Só o estado (fase e número da pergunta) é legível direto, para o realtime avisar os celulares.
-- Perguntas, gabarito, jogadores e respostas passam só pelas funções abaixo.
alter table public.quiz_state enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_players enable row level security;
alter table public.quiz_answers enable row level security;

grant select on public.quiz_state to anon, authenticated;
create policy "Todos veem o estado do quiz" on public.quiz_state
  for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.quiz_state;

-- Segundos para responder cada pergunta.
create function public.quiz_time_limit() returns int
language sql immutable
as $$ select 30 $$;

create function public.quiz_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;

-- Pergunta da vez (sem gabarito) e, só na fase "reveal", a alternativa certa.
create function public.quiz_current() returns json
language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'phase', s.phase,
    'index', s.question_index,
    'total', (select count(*) from public.quiz_questions),
    'round', s.round,
    'started_at', s.started_at,
    'server_now', clock_timestamp(),
    'time_limit', public.quiz_time_limit(),
    'question', case when s.phase in ('question', 'reveal')
      then json_build_object('text', q.text, 'options', q.options, 'image', q.image) end,
    'correct', case when s.phase = 'reveal' then q.correct end
  )
  from public.quiz_state s
  left join public.quiz_questions q on q.position = s.question_index
  where s.id = 1
$$;

create function public.quiz_join(p_name text, p_guest_id text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select phase from public.quiz_state where id = 1) not in ('lobby', 'question', 'reveal') then
    raise exception 'quiz_fechado';
  end if;
  -- Entrar de novo do mesmo aparelho (ex.: depois de limpar o navegador) devolve o mesmo jogador.
  select id into v_id from public.quiz_players where guest_id = p_guest_id;
  if v_id is not null then
    update public.quiz_players set name = trim(p_name) where id = v_id;
    return v_id;
  end if;
  insert into public.quiz_players (name, guest_id) values (trim(p_name), p_guest_id)
  returning id into v_id;
  return v_id;
end
$$;

-- A correção acontece aqui, no banco: o celular nunca recebe o gabarito antes da hora.
create function public.quiz_answer(p_player uuid, p_choice int) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  s public.quiz_state;
  v_correct smallint;
  v_ms int;
begin
  select * into s from public.quiz_state where id = 1;
  if s.phase <> 'question' then
    return 'fora_de_hora';
  end if;
  if not exists (select 1 from public.quiz_players where id = p_player) then
    return 'jogador_invalido';
  end if;
  v_ms := (extract(epoch from (clock_timestamp() - s.started_at)) * 1000)::int;
  -- 2 s de folga para a rede.
  if v_ms > (public.quiz_time_limit() + 2) * 1000 then
    return 'tempo_esgotado';
  end if;
  select correct into v_correct from public.quiz_questions where position = s.question_index;
  insert into public.quiz_answers (player_id, question_index, choice, correct, response_ms)
  values (p_player, s.question_index, p_choice, p_choice = v_correct, v_ms)
  on conflict (player_id, question_index) do nothing;
  if not found then
    return 'ja_respondeu';
  end if;
  return 'ok';
end
$$;

-- Painel do admin: jogadores inscritos e respostas da pergunta atual.
create function public.quiz_progress() returns json
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.quiz_state;
begin
  if not public.quiz_is_admin() then
    raise exception 'somente_admin';
  end if;
  select * into s from public.quiz_state where id = 1;
  return json_build_object(
    'index', s.question_index,
    'players', (select coalesce(json_agg(name order by created_at), '[]'::json) from public.quiz_players),
    'answered', (select count(*) from public.quiz_answers where question_index = s.question_index),
    'right', (select count(*) from public.quiz_answers where question_index = s.question_index and correct)
  );
end
$$;

-- Ranking: escondido até a fase "results" (o admin vê antes, para conferir).
-- Empate em pontos: ganha quem somou menos tempo nas respostas certas.
create function public.quiz_ranking() returns json
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select phase from public.quiz_state where id = 1) <> 'results' and not public.quiz_is_admin() then
    return null;
  end if;
  return (
    select coalesce(json_agg(r order by r.points desc, r.time_ms asc, r.name), '[]'::json)
    from (
      select p.id, p.name,
        count(a.*) filter (where a.correct) as points,
        coalesce(sum(a.response_ms) filter (where a.correct), 0) as time_ms
      from public.quiz_players p
      left join public.quiz_answers a on a.player_id = p.id
      group by p.id, p.name
    ) r
  );
end
$$;

create function public.quiz_set_phase(p_phase text, p_index int default null) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.quiz_is_admin() then
    raise exception 'somente_admin';
  end if;
  if p_phase = 'question'
    and (p_index is null or p_index < 0 or p_index >= (select count(*) from public.quiz_questions)) then
    raise exception 'pergunta_invalida';
  end if;
  update public.quiz_state set
    phase = p_phase,
    question_index = coalesce(p_index, question_index),
    started_at = case when p_phase = 'question' then clock_timestamp() else started_at end,
    updated_at = clock_timestamp()
  where id = 1;
end
$$;

-- Apaga jogadores e respostas e volta ao começo (para testar antes da festa).
create function public.quiz_reset() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.quiz_is_admin() then
    raise exception 'somente_admin';
  end if;
  -- "where true": o Supabase bloqueia delete sem where vindo da API.
  delete from public.quiz_answers where true;
  delete from public.quiz_players where true;
  update public.quiz_state set
    phase = 'closed', question_index = 0, started_at = null,
    round = gen_random_uuid(), updated_at = clock_timestamp()
  where id = 1;
end
$$;

-- O Supabase libera funções novas para todo mundo por padrão: deixa só o necessário.
revoke all on function
  public.quiz_time_limit(), public.quiz_is_admin(), public.quiz_current(), public.quiz_join(text, text),
  public.quiz_answer(uuid, int), public.quiz_progress(), public.quiz_ranking(),
  public.quiz_set_phase(text, int), public.quiz_reset()
from public, anon, authenticated;

grant execute on function
  public.quiz_current(), public.quiz_join(text, text), public.quiz_answer(uuid, int), public.quiz_ranking()
to anon, authenticated;

grant execute on function public.quiz_progress(), public.quiz_set_phase(text, int), public.quiz_reset()
to authenticated;
