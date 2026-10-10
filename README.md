# 🎉 Site do Aniversário

Site para os convidados abrirem no celular durante a festa e participarem das brincadeiras.
Funciona em Android e iPhone pelo navegador, sem instalar nada.

**Aniversário: quinta, 08/10/2026 · Festa: sábado, 10/10/2026 às 20h.**

## Rodando no computador

```bash
npm install   # só na primeira vez
npm run dev
```

Abre em http://localhost:5180. Para testar **no celular**, conecte no mesmo Wi-Fi do computador e abra
o endereço `Network` que aparece no terminal (ex.: `http://192.168.0.10:5180`).

## Banco de dados (Supabase)

Os recados ficam no [Supabase](https://supabase.com) (plano gratuito). Convidados **só enviam**;
quem lê é só a conta de admin, na página **`/admin`**. O bloqueio é feito pelo próprio banco
(Row Level Security), então vale mesmo com o código e a chave pública à mostra.

1. Crie um projeto no Supabase (região São Paulo).
2. No **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Authentication → Users → Add user → Create new user**, crie sua conta (e-mail + senha)
   com **Auto Confirm User** marcado.
4. De volta ao **SQL Editor**, libere a leitura para essa conta (troque pelo seu e-mail):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'seu-email@exemplo.com';
   ```
5. Recomendado: em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
6. Copie `.env.example` para `.env.local` e preencha com a **Project URL** e a **Publishable key**
   (botão **Connect** no topo do painel).
7. Para o mural de fotos, rode também [`supabase/fotos.sql`](supabase/fotos.sql) no **SQL Editor**
   (cria a tabela `photos` e o bucket de arquivos `photos`).
8. Para o placar da home, rode [`supabase/placar.sql`](supabase/placar.sql) (função que devolve só as
   contagens de fotos e recados). Sem ela, o placar simplesmente não aparece.
9. Para o quiz, rode [`supabase/quiz.sql`](supabase/quiz.sql) e depois
   `supabase/privado/quiz-perguntas.sql` (as perguntas e o gabarito). Esse segundo arquivo **não vai
   para o git**, porque o repositório é público. Pode rodá-lo de novo sempre que mudar as perguntas.
10. Para as reações com emoji nas fotos, rode [`supabase/reacoes.sql`](supabase/reacoes.sql). Sem ele,
    o mural funciona normalmente, só sem a barra de reações.

## Quiz individual (ao vivo)

1. Entre em **`/admin/quiz`** com a conta de admin (pode deixar essa tela numa TV: o gabarito só
   aparece na revelação).
2. **Abrir inscrições**: cada pessoa entra em *Quiz do Peu* no próprio celular, com o nome que já
   digitou na entrada do site (é só tocar em "Entrar no quiz").
3. **Começar quiz**: cada pergunta tem 30 s. A resposta certa aparece sozinha quando todo mundo
   responde ou o tempo acaba. Depois, **Próxima pergunta**.
4. **Encerrar quiz** e, quando quiser, **Revelar vencedores** (aparece em todos os celulares).
   1 ponto por acerto. Empate: vence quem respondeu mais rápido nas que acertou.
5. **Reiniciar quiz** apaga quem entrou e as respostas (use depois de testar).

Sem o `.env.local`, o site abre normalmente, mas os recados mostram que não estão conectados.

A chave Pix do cartão "Se fudeu" da roleta fica em `VITE_PIX_KEY` (no `.env.local` e nas variáveis
da Vercel). Ela não vai para o repositório, mas aparece para quem abrir o site.
Para apagar um recado, use o botão **Apagar** no `/admin` (ou o **Table Editor** do Supabase, tabela `messages`).
Para apagar uma foto, entre no `/admin` e depois abra o **Mural de fotos** no mesmo aparelho: a foto
ampliada mostra o botão **Apagar foto**, só para a conta de admin.

## Onde mexer

| Arquivo | O que tem |
| --- | --- |
| `src/config.ts` | Nome, apelido, idade, fotos e link da playlist |
| `src/components/PartyStats.tsx` | Placar da festa na home (fotos e recados) |
| `src/games/registry.ts` | Lista de brincadeiras da tela inicial |
| `src/games/MessageBox.tsx` | Caixa de recados (convidados enviam) |
| `src/games/ShotRoulette.tsx` | Roleta de shots |
| `src/games/PhotoWall.tsx` | Mural de fotos (todos enviam e veem; admin apaga) |
| `src/components/PhotoReactions.tsx` | Reações com emoji na foto ampliada (com os nomes) |
| `src/pages/Admin.tsx` | Página `/admin`, onde só você lê os recados |
| `src/index.css` | Cores do tema (no topo do arquivo) |
| `src/pages/` | Telas: boas-vindas, início e página de cada brincadeira |
| `src/lib/guest.tsx` | Identificação do convidado (nome salvo no celular) |
| `supabase/schema.sql` | Tabelas e permissões dos recados |
| `supabase/fotos.sql` | Tabela, bucket e permissões do mural de fotos |
| `supabase/reacoes.sql` | Reações nas fotos (sem expor quem é quem por trás dos nomes) |
| `supabase/placar.sql` | Contagens do placar (sem expor o conteúdo dos recados) |
| `src/games/Quiz.tsx` | Quiz: tela de quem joga |
| `src/pages/QuizHost.tsx` | Quiz: painel de comando (`/admin/quiz`) |
| `supabase/quiz.sql` | Quiz: tabelas e funções (a correção acontece no banco) |
| `supabase/privado/quiz-perguntas.sql` | Perguntas e gabarito (fora do git) |

## Como funciona

1. O convidado abre o site e digita o nome (fica salvo no celular, não precisa digitar de novo).
2. Tela inicial: "Farrinha do Peu", foto, frase, placar da festa, brincadeiras e a playlist do Spotify.
3. Cada brincadeira tem sua página em `/jogo/<id>`. Hoje: **Caixa de recados** (`/jogo/recados`),
   **Roleta de shots** (`/jogo/roleta`), **Mural de fotos** (`/jogo/fotos`) e **Quiz do Peu**
   (`/jogo/quiz`).

## Cronograma

| Dia | O quê |
| --- | --- |
| Seg 05 | ✅ Estrutura do projeto · ✅ Caixa de recados + página /admin |
| Ter 06 | Conectar o Supabase · publicar online (Vercel) |
| Qua 07 | Testar no celular com 2–3 amigos · decidir a brincadeira de fotos |
| Qui 08 | 🎂 Aniversário · brincadeira de fotos (se for fazer) |
| Sex 09 | Ajustes finais, QR code impresso |
| Sáb 10 | 🎉 Festa às 20h |
