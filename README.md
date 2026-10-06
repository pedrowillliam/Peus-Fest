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

Sem o `.env.local`, o site abre normalmente, mas os recados mostram que não estão conectados.
Para apagar um recado, use o botão **Apagar** no `/admin` (ou o **Table Editor** do Supabase, tabela `messages`).

## Onde mexer

| Arquivo | O que tem |
| --- | --- |
| `src/config.ts` | Nome e datas |
| `src/games/registry.ts` | Lista de brincadeiras da tela inicial |
| `src/games/MessageBox.tsx` | Caixa de recados (convidados enviam) |
| `src/pages/Admin.tsx` | Página `/admin`, onde só você lê os recados |
| `src/index.css` | Cores do tema (no topo do arquivo) |
| `src/pages/` | Telas: boas-vindas, início e página de cada brincadeira |
| `src/lib/guest.tsx` | Identificação do convidado (nome salvo no celular) |
| `supabase/schema.sql` | Tabelas e permissões do banco |

## Como funciona

1. O convidado abre o site e digita o nome (fica salvo no celular, não precisa digitar de novo).
2. Tela inicial: datas, contagem regressiva para a festa e lista de brincadeiras.
3. Cada brincadeira tem sua página em `/jogo/<id>`. Hoje: **Caixa de recados** (`/jogo/recados`).

## Cronograma

| Dia | O quê |
| --- | --- |
| Seg 05 | ✅ Estrutura do projeto · ✅ Caixa de recados + página /admin |
| Ter 06 | Conectar o Supabase · publicar online (Vercel) |
| Qua 07 | Testar no celular com 2–3 amigos · decidir a brincadeira de fotos |
| Qui 08 | 🎂 Aniversário · brincadeira de fotos (se for fazer) |
| Sex 09 | Ajustes finais, QR code impresso |
| Sáb 10 | 🎉 Festa às 20h |
