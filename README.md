# 🎉 Site do Aniversário

Site para os convidados abrirem no celular durante a festa e participarem das brincadeiras.
Funciona em Android e iPhone pelo navegador, sem instalar nada.

**Festa: sábado, 10/10/2026.**

## Rodando no computador

```bash
npm install   # só na primeira vez
npm run dev
```

Abre em http://localhost:5173. Para testar **no celular**, conecte no mesmo Wi-Fi do computador e abra
o endereço `Network` que aparece no terminal (ex.: `http://192.168.0.10:5173`).

## Onde mexer

| Arquivo | O que tem |
| --- | --- |
| `src/config.ts` | Nome e data/hora da festa |
| `src/games/registry.ts` | Lista de brincadeiras da tela inicial |
| `src/index.css` | Cores do tema (no topo do arquivo) |
| `src/pages/` | Telas: boas-vindas, início e página de cada brincadeira |
| `src/lib/guest.tsx` | Identificação do convidado (nome salvo no celular) |

## Como funciona hoje

1. O convidado abre o site e digita o nome (fica salvo no celular, não precisa digitar de novo).
2. Tela inicial: contagem regressiva + lista de brincadeiras.
3. Cada brincadeira tem sua página em `/jogo/<id>` (por enquanto "em breve").

## Cronograma

| Dia | O quê |
| --- | --- |
| Seg 05 | ✅ Estrutura do projeto · escolher as brincadeiras |
| Ter 06 | Banco de dados em tempo real + 1ª brincadeira |
| Qua 07 | Demais brincadeiras |
| Qui 08 | Publicar online + testar no celular com 2–3 amigos |
| Sex 09 | Conteúdo final (perguntas, desafios), ajustes, QR code impresso |
| Sáb 10 | 🎉 Festa |

## Decisões pendentes

- **Quais brincadeiras**: as sugestões estão na tela inicial; manter, trocar ou cortar.
- **Banco de dados compartilhado** (ranking, recados, votos): Firebase/Firestore (grátis, tempo real).
  Se alguma brincadeira envolver fotos, Supabase é melhor (inclui armazenamento grátis).
- **Hospedagem**: Vercel (grátis; `vercel.json` já está configurado).
