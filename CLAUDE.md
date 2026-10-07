# CLAUDE.md

Site (web app mobile-first) para os convidados do aniversário de Pedro William abrirem no celular
durante a festa. **Aniversário: 08/10/2026 · Festa: sábado 10/10/2026, 20h. Prazo inegociável:**
na dúvida entre mais escopo e ficar pronto, corte escopo. Tudo precisa estar publicado e testado
no celular até 09/10.

## Comandos

```bash
npm run dev       # http://localhost:5180 (+ endereços de rede para testar no celular)
npm run build     # tsc --noEmit + vite build; rode antes de dar algo como pronto
npm run preview   # serve o dist/ em http://localhost:4180
```

As portas são fixas com `strictPort` (veja `vite.config.ts`): a 5173 é de outro projeto do usuário
(Sys-Pitstops). No Windows, `::1:5173` e `0.0.0.0:5173` sobem juntos sem erro e `localhost` cai no
projeto errado. Não volte para a porta padrão.

## Stack

Vite 8 + React 19 + TypeScript 7 + React Router 8 (pacote `react-router`, não `react-router-dom`),
Supabase (`@supabase/supabase-js` v2) para dados. Sem servidor próprio: o site é estático (deploy
previsto na Vercel, `vercel.json` já faz o rewrite das rotas para o SPA). CSS puro em
`src/index.css` com variáveis no `:root` e sem biblioteca de UI.

## Estrutura

- `src/config.ts`: nome, apelido ("Peu"), idade e fotos (boas-vindas e home). Os textos usam
  `party.birthdayName` / `party.nickname` / `party.age`, nunca escritos direto. A home não tem mais
  datas nem contagem regressiva (pedido do usuário). `party.playlistUrl` é o link de **convite** da
  playlist colaborativa do Spotify. Não limpe os parâmetros: o `pt=` é o que deixa adicionar músicas.
- `src/components/PartyStats.tsx`: "Placar da festa" na home (fotos postadas e recados enviados).
  Chama a função `party_stats()` (`supabase/placar.sql`, security definer que devolve só as contagens)
  a cada 20 s com a tela visível, porque recados não chegam por realtime para convidados. Se a função
  falhar ou não existir, o placar some sem quebrar a home.
- `src/lib/guest.tsx`: convidado = `{ id, name }` no localStorage. O id sobrevive à troca de nome.
- `src/games/registry.ts`: lista de brincadeiras. Uma entrada sem `component` aparece como "em breve".
- `src/games/MessageBox.tsx`: Caixa de recados (convidado só **envia**).
- `src/games/ShotRoulette.tsx`: Roleta de shots, só no navegador (sem banco). O sorteio é uniforme e a
  conta do ângulo final garante que a fatia sob o ponteiro é a sorteada. Mexeu nas opções? Mantenha
  `label` curto (cabe na fatia) e `text` com o desafio completo. Fatias em vermelho e preto, sem
  emoji (só o "Se fudeu 💸"), com a fonte Bebas Neue (`--font-display`, embutida via `@fontsource`).
- `src/games/PhotoWall.tsx`: Mural de fotos. Todos enviam ("Tirar foto" com `capture`, "Galeria" com
  até 10 de uma vez) e todos veem, ao vivo via realtime. Antes do upload, `src/lib/images.ts` reduz no
  aparelho: 1600px (~200-300 KB) + miniatura de 480px (~40 KB) para a grade. Só quem é admin vê o botão
  "Apagar foto" na foto ampliada (`src/lib/admin.ts`, `useIsAdmin`); apaga a linha e depois os arquivos.
  **Só fotos, nunca vídeo** (requisito do usuário): aviso fixo na tela, vídeos escolhidos são recusados
  antes do envio com mensagem própria, e o bucket só aceita `image/jpeg`.
  Botão "Baixar" na foto ampliada (`src/lib/saveImage.ts`): no Android faz download comum (vai para a
  galeria); no iPhone abre o menu de compartilhar ("Salvar Imagem" vai para o app Fotos). O arquivo é
  buscado ao ampliar, porque o iPhone só aceita `navigator.share` logo após o toque, e o `<img>` usa
  `crossOrigin` para reaproveitar o cache. O storage do Supabase responde com CORS `*`.
- Quiz individual, ao vivo (estilo Kahoot), comandado pelo admin. Era em duplas; o usuário mudou para
  individual, um jogador por celular, com o nome da entrada do site:
  - `src/pages/QuizHost.tsx`: `/admin/quiz` (atrás do `RequireAdmin`). Pode ir para a TV: o gabarito só
    aparece na fase `reveal`, e o ranking só antes de `results` se o admin tocar em "espiar". Revela
    sozinho quando todo mundo responde ou 1,5 s depois do fim do tempo, uma vez por pergunta.
  - `src/games/Quiz.tsx`: tela de quem joga. Entra com um toque usando `guest.name`. O jogador fica no
    localStorage (`aniversario:quiz`) amarrado ao `round`; se o admin reiniciar, entra de novo.
    `quiz_join` é idempotente por `guest_id` (o mesmo aparelho volta como o mesmo jogador).
  - `src/lib/quiz.ts`: `useQuizState` (realtime em `quiz_state` + consulta a cada 4 s, ignorando
    respostas fora de ordem; cronômetro pelo relógio do servidor), `useMsLeft`, `useRanking`.
  - `supabase/quiz.sql`: fases `closed → lobby → question ↔ reveal → finished → results`. Tudo
    passa por funções `security definer` (`quiz_current`, `quiz_join`, `quiz_answer`, `quiz_ranking`;
    só admin: `quiz_progress`, `quiz_set_phase`, `quiz_reset`). **A correção é no banco**; o
    celular nunca recebe o gabarito antes da revelação. 30 s por pergunta (`quiz_time_limit()`).
  - Pergunta pode ter imagem (coluna `image`, caminho de um arquivo em `public/quiz/`). A imagem fica
    pública (vai no site e no repositório); o texto da pergunta e o gabarito, não.
  - **Perguntas e gabarito ficam em `supabase/privado/quiz-perguntas.sql`, que é gitignored**,
    porque o repositório é público. Nunca coloque perguntas ou respostas em arquivo versionado.
- `src/components/RequireAdmin.tsx`: login + checagem de admin das páginas `/admin` e `/admin/quiz`.
- `src/lib/`: `uuid.ts` (UUID v4 que funciona em HTTP), `merge.ts` (junta listas por id, mais novo
  primeiro), `format.ts` (data/hora pt-BR).
- `src/pages/Admin.tsx`: `/admin`, com login Supabase (e-mail + senha), onde só o aniversariante **lê** os recados, ao vivo via realtime.
- `src/App.tsx`: `/admin` fica fora do portão de nome. O resto exige nome (`Welcome`) antes.
- `supabase/schema.sql`: tabelas `messages` e `admins`, com RLS.
- `supabase/fotos.sql`: tabela `photos`, bucket público `photos` (só JPEG, até 3 MB) e policies.
  Roda depois do `schema.sql`. `supabase/placar.sql` roda depois do `fotos.sql`, e `quiz.sql` depois
  do `placar.sql`.

## Regras de privacidade dos recados (requisito do usuário)

Só o aniversariante pode ler os recados. Convidados não leem nenhum, nem o próprio.

- Quem garante isso é o **RLS no banco**, não a interface. O repositório e a publishable key são públicos.
- O insert do convidado **não** pode ter `.select()`: o anon não tem policy de leitura.
- Leitura e exclusão só são liberadas para `auth.uid()` presente em `public.admins`.
- Nunca coloque e-mail, senha do banco ou a secret key (`sb_secret_...`) no repositório.
  O `.env.local` (gitignored) tem `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_PIX_KEY`.
- `VITE_PIX_KEY` é a chave Pix pessoal do usuário (cartão "Se fudeu" da roleta). Nunca escreva o valor em
  arquivo versionado, commit, CLAUDE.md ou saída de comando. Como toda `VITE_*`, ela vai no bundle
  público do site. Nos testes visuais, use uma chave falsa.
- Fotos são públicas (mural): todos leem e enviam, mas apagar a linha em `photos` e os arquivos no
  bucket só é liberado para admins, também por RLS (inclusive em `storage.objects`).
- Mudou o schema? Atualize `supabase/schema.sql` (script completo, para banco novo) e aplique só a
  diferença no banco existente: pelo MCP do Supabase (configurado com escopo local, se estiver
  autenticado), mostrando o SQL ao usuário antes, ou passando o trecho para ele rodar no SQL Editor.

## Convenções

- Interface em pt-BR. Identificadores de código em inglês; comentários curtos em pt-BR.
- Textos neutros quanto a gênero: use o nome ("Só Pedro William vai ler"), não "o aniversariante" nem "ele".
- Mobile-first: coluna de até 480px, inputs com fonte ≥ 16px (evita zoom no iPhone), respeitar `safe-area-inset`.

## Commits

Siga o [Conventional Commits](https://www.conventionalcommits.org/pt-br/), com a mensagem em pt-BR:

- Formato: `tipo(escopo opcional): descrição`. O tipo segue o padrão em inglês (`feat`, `fix`,
  `docs`, `style`, `refactor`, `perf`, `test`, `build`, `chore`, `ci`). A descrição vai em
  português, minúscula, no presente e sem ponto final.
- Escopos usados: `recados`, `admin`, `home`, `boas-vindas`, `roleta`, `fotos`, `supabase`, `config`.
- Corpo opcional em pt-BR explicando o porquê. Mudança que quebra algo leva `!` ou um rodapé `BREAKING CHANGE:`.
- Um assunto por commit: separe, por exemplo, `feat` de `docs` quando forem mudanças independentes.

Exemplos: `feat(recados): adiciona aviso ao atingir 500 caracteres`,
`fix(admin): corrige recados duplicados no realtime`, `docs: atualiza passo a passo do Supabase`.

## Pegadinhas conhecidas

- `crypto.randomUUID` não existe em HTTP fora de localhost (teste no celular via IP da rede).
  Há fallback em `guest.tsx`.
- `client.channel(nome)` do Supabase reaproveita um canal de mesmo nome que ainda esteja sendo
  removido (StrictMode) e a assinatura quebra. Use tópico único por montagem.
- Consultas do supabase-js com rede fora do ar fazem retry por cerca de 7s antes de devolver o erro.

## Verificação visual

O Edge headless (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`) não deixa a
janela ficar mais estreita que ~500px. Para ver em largura de celular, sirva uma página com
`<iframe style="width:390px">` apontando para a rota, e preencha `aniversario:id`/`aniversario:nome`
no localStorage antes para pular as boas-vindas. Use um `--user-data-dir` próprio e encerre só
esses processos do Edge depois (eles não fecham sozinhos). Nunca encerre o Edge do usuário.

O `--screenshot` com `--virtual-time-budget` acelera o relógio da página, mas **não espera** trabalho
em segundo plano (decodificar/reduzir imagem, rede): o print sai antes do fim e parece bug.
Animações CSS também podem aparecer pela metade. Para fluxos assíncronos (upload de fotos), suba o Edge
com `--remote-debugging-port`, controle pelo DevTools Protocol (o `WebSocket` nativo do Node 24 basta)
e tire o print só quando a página de teste sinalizar que terminou. Para testar sem o banco real, use um
servidor falso local que imite as rotas REST/storage do Supabase. Atenção: o supabase-js envia o
upload de `Blob` como `multipart/form-data`.

SQL com lógica (o quiz) se testa de verdade no **PGlite** (`@electric-sql/pglite`, numa pasta fora do
projeto), simulando o mínimo do Supabase: papéis `anon`/`authenticated`, `auth.uid()` lendo
`request.jwt.claim.sub`, `publication supabase_realtime` e a tabela `admins`. O mesmo PGlite pode
servir as RPCs de um servidor falso para testar o site ponta a ponta. Para simular vários celulares,
use uma origem por aparelho (portas diferentes = localStorage separado) e uma **janela** por aparelho
(`Target.createTarget` com `newWindow`), porque abas em segundo plano ficam ocultas e com os timers
atrasados. Nas esperas via `Runtime.evaluate`, devolva booleano (`!!(...)`): um elemento do DOM não
volta com `returnByValue`.

## Ambiente

Windows 11, Node 24. O GitHub CLI fica em `C:\Program Files\GitHub CLI\gh.exe` (pode não estar no
PATH do Git Bash). Repositório: github.com/pedrowillliam/Peus-Fest (público, branch `main`; antes se chamava `aniversario`).
Commit e push só com pedido explícito do usuário a cada vez ("commita", "pode subir"). Escolher uma
opção, aprovar um plano ou responder a uma pergunta minha **não** conta como pedido. Na dúvida,
deixe as mudanças locais e pergunte.

Produção: **https://niver-pedro-william.vercel.app** (projeto Vercel `niver-pedro-william`). As
variáveis `VITE_SUPABASE_*` estão cadastradas na Vercel (production, preview e development).
Deploy automático: todo push na `main` publica em produção (repositório ligado à Vercel).
Vercel CLI via `npx --yes vercel@62` (não está instalado globalmente). Deploy manual, se precisar:
`npx --yes vercel@62 deploy --prod --yes`. O CLI grava `VERCEL_OIDC_TOKEN` no `.env.local`, que
é gitignored. Nunca exiba esse valor.
