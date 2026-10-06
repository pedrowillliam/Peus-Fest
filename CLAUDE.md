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

- `src/config.ts`: nome, data do aniversário e início da festa. Os textos usam `party.birthdayName`, nunca o nome escrito direto.
- `src/lib/guest.tsx`: convidado = `{ id, name }` no localStorage. O id sobrevive à troca de nome.
- `src/games/registry.ts`: lista de brincadeiras. Uma entrada sem `component` aparece como "em breve".
- `src/games/MessageBox.tsx`: Caixa de recados (convidado só **envia**).
- `src/pages/Admin.tsx`: `/admin`, com login Supabase (e-mail + senha), onde só o aniversariante **lê** os recados, ao vivo via realtime.
- `src/App.tsx`: `/admin` fica fora do portão de nome. O resto exige nome (`Welcome`) antes.
- `supabase/schema.sql`: tabelas `messages` e `admins`, com RLS.

## Regras de privacidade dos recados (requisito do usuário)

Só o aniversariante pode ler os recados. Convidados não leem nenhum, nem o próprio.

- Quem garante isso é o **RLS no banco**, não a interface. O repositório e a publishable key são públicos.
- O insert do convidado **não** pode ter `.select()`: o anon não tem policy de leitura.
- A leitura só é liberada para `auth.uid()` presente em `public.admins`.
- Nunca coloque e-mail, senha do banco ou a secret key (`sb_secret_...`) no repositório.
  O `.env.local` (gitignored) tem só `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Mudou o schema? Atualize `supabase/schema.sql`. Quem roda o SQL é o usuário, no SQL Editor do painel.

## Convenções

- Interface em pt-BR. Identificadores de código em inglês; comentários curtos em pt-BR.
- Textos neutros quanto a gênero: use o nome ("Só Pedro William vai ler"), não "o aniversariante" nem "ele".
- Mobile-first: coluna de até 480px, inputs com fonte ≥ 16px (evita zoom no iPhone), respeitar `safe-area-inset`.

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

## Ambiente

Windows 11, Node 24. O GitHub CLI fica em `C:\Program Files\GitHub CLI\gh.exe` (pode não estar no
PATH do Git Bash). Repositório: github.com/pedrowillliam/aniversario (público, branch `main`).
Commit e push só quando o usuário pedir.
