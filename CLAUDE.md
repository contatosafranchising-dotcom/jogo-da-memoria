# CLAUDE.md — Jogo da Memória Casa do Sushi

Contexto para o Claude Code. Leia antes de qualquer alteração.

---

## 1. O que é este projeto

Landing page de jogo promocional para a rede **S.A Casa do Sushi Franchising**. O cliente joga um jogo da memória com cartas de sushi; quanto mais rápido completar, melhor o prêmio que desbloqueia. O resgate é feito via WhatsApp direto com a unidade.

Objetivo de negócio: gerar pedido no delivery e criar motivo de contato recorrente com o cliente. O jogo é a isca, o cupom é a conversão.

**Público:** cliente final, majoritariamente em celular. Mobile-first não é preferência — é o cenário principal. Desktop é secundário.

---

## 2. Stack e restrições

- **HTML + CSS + JavaScript puro (vanilla).** Sem framework.
- **Sem build step. Sem npm. Sem bundler. Sem TypeScript.**
- Sem dependências externas além de fontes do Google Fonts (ou fontes locais em `/assets/fonts/`).
- Persistência: `localStorage` do navegador.
- Deploy: GitHub Pages ou Vercel (arrastar a pasta).

**Regra dura:** se uma solução exigir instalar algo via terminal, ela está errada para este projeto. Sempre escolha o caminho que funciona abrindo o `index.html` no navegador.

---

## 3. Estrutura de arquivos

```
/index.html          → captura do nome + regras + botão "Começar"
/jogo.html           → tabuleiro, cronômetro, contador de erros
/premio.html         → resultado, prêmio, botão WhatsApp
/bloqueado.html      → tela de espera de 24h com contador regressivo
/assets/
  /css/estilo.css    → todo o CSS, arquivo único
  /js/jogo.js        → lógica do jogo
  /js/config.js      → configurações editáveis (prêmios, tempos, WhatsApp)
  /img/              → imagens dos produtos (cartas)
```

As telas podem ser unificadas em um único `index.html` com troca via `display:none` se isso simplificar a manutenção de estado. Se for feito assim, manter os mesmos nomes de seção (`#tela-nome`, `#tela-regras`, `#tela-jogo`, `#tela-premio`, `#tela-bloqueado`).

---

## 4. Mecânica do jogo

### 4.1 Fluxo

```
Cliente acessa
  ↓
Preenche o nome
  ↓
Vê as regras
  ↓
Clica em "Começar o jogo" → cronômetro inicia
  ↓
Encontra os 6 pares
  ↓
├── Completou → prêmio conforme o tempo → botão WhatsApp
└── Errou 3x seguidas → bloqueio de 24h com contador regressivo
```

### 4.2 Tabuleiro

- **12 cartas / 6 pares.** Grade 4 colunas × 3 linhas no mobile.
- Cartas iniciam viradas para baixo (verso da marca).
- O jogador vira duas cartas por vez.
- **Par correto:** as duas cartas permanecem abertas e o contador de erros consecutivos zera.
- **Par errado:** as duas cartas voltam a virar após ~800ms e soma 1 erro consecutivo.
- **Embaralhamento obrigatório a cada partida.** Nunca reutilizar a mesma disposição — o jogador decora em poucos dias.
- O pool de imagens deve ter mais de 6 sushis; sorteie 6 a cada partida. Isso impede memorização do conjunto.

### 4.3 Regra dos 3 erros

Erros **consecutivos**, não erros totais. Acertar um par reseta o contador para zero.

Ao atingir 3 erros consecutivos, a partida encerra imediatamente e exibe:

> **Ops! Você errou 3 vezes seguidas.**
> Volte em 24h para tentar novamente.

Abaixo, contador regressivo em tempo real no formato `23:47:12`, atualizado a cada segundo.

### 4.4 Bloqueio de estado

Durante o clique, travar o tabuleiro:
- Enquanto duas cartas erradas estão sendo exibidas antes de virar de volta.
- Após o fim da partida.

Sem isso o jogador clica rápido e vira 4 cartas de uma vez, quebrando a lógica de pares.

---

## 5. Prêmios e faixas de tempo

Definidos em `/assets/js/config.js`, nunca hardcoded no meio da lógica.

```js
const PREMIOS = [
  { ateSegundos:  30, nome: "1 Temaki Hot",       minimo: 110 },
  { ateSegundos:  45, nome: "10 peças Hot",       minimo:  95 },
  { ateSegundos:  60, nome: "15% de desconto",    minimo:  80 },
  { ateSegundos:  90, nome: "10% de desconto",    minimo:  65 },
  { ateSegundos: 999, nome: "5% de desconto",     minimo:  50 }
];
```

### Regras de precificação (importante)

1. **Todo mínimo de pedido precisa estar acima do ticket médio do delivery da unidade.** Se o TM é R$75 e o cupom libera a partir de R$50, não houve pedido novo — só desconto em venda que já ia acontecer. Os valores acima são ponto de partida e devem ser calibrados por unidade.
2. **A escada precisa ser crescente nos dois eixos ao mesmo tempo:** prêmio melhor exige mínimo maior. Nunca inverter.
3. **Precificar assumindo 100% dos jogadores no topo.** Se o prêmio máximo quebra a margem quando todo mundo alcança, ele não pode ser o prêmio máximo.
4. Prêmio em produto (temaki, peças hot) custa CMV; prêmio em % custa faturamento. Preferir produto nos níveis altos.

### Calibração das faixas de tempo

Os segundos acima são **chute inicial e provavelmente estão errados**. Antes de publicar:

1. Rodar uma semana fechada com a equipe interna e as embaixadoras.
2. Coletar os tempos reais de conclusão.
3. Definir os cortes por percentil: topo 10% = melhor prêmio, e assim por diante.

Chutar segundos no papel é como essas campanhas acabam com todo mundo no nível máximo no dia 2.

---

## 6. Persistência (localStorage)

Chave única: `casadosushi_jogo`

```js
{
  nome: "Camille",
  bloqueadoAte: 1754956800000,   // timestamp; null se liberado
  ultimoPremio: "15% de desconto",
  premioEm: 1754870400000,        // para calcular a validade de 30 dias
  partidas: 4                     // contador simples
}
```

- Verificar `bloqueadoAte` no carregamento de **todas** as telas. Se `Date.now() < bloqueadoAte`, redirecionar para a tela de bloqueio.
- O nome persiste entre sessões: se já existir, pular a captura e ir direto para as regras com um "Bem-vinda de volta, {nome}".

---

## 7. Resgate via WhatsApp

Botão na tela de prêmio: **"ENVIAR MENSAGEM E RECEBER MEU PRÊMIO"**

```js
const numero = "5547999999999"; // config.js, sem + e sem espaços
const texto = `Oi! Sou ${nome} e joguei o Jogo da Memória da Casa do Sushi. ` +
              `Completei em ${tempoFormatado} e desbloqueei: ${premio}. ` +
              `Quero resgatar meu prêmio!`;
const link = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
```

`encodeURIComponent` é obrigatório — sem ele a mensagem quebra em qualquer acento ou emoji.

Exibir junto: **"Válido por 30 dias"** e a data exata de expiração calculada a partir de `premioEm`.

---

## 8. Identidade visual

Seguir a marca S.A Casa do Sushi:

| Uso | Valor |
|---|---|
| Vermelho principal | `#D30303` |
| Dourado | `#D4AF37` |
| Verde oliva | `#7D7237` |
| Títulos | Montserrat (700/800) |
| Texto | Montserrat (400/500) |

Direção sugerida: fundo escuro (quase preto) com padrão **Seigaiha** sutil em baixa opacidade, cartas com verso vermelho + detalhe dourado, faces com as fotos dos produtos.

**Diretrizes de layout:**
- Cartas quadradas via `aspect-ratio: 1`.
- Grade com `display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;`
- Área de toque mínima de 44px.
- Virada de carta com `transform: rotateY(180deg)` + `backface-visibility: hidden` — animação em CSS, não em JS.
- Cronômetro e contador de erros fixos no topo, sempre visíveis sem rolar a página.
- Testar em tela de 360px de largura. Se estourar ali, está errado.

---

## 9. Imagens dos produtos

- Formato `.webp` com fallback `.jpg`.
- Recortadas em quadrado, produto centralizado.
- Máximo 100KB cada — são 12 cartas carregando de uma vez em 4G.
- Pré-carregar todas antes de iniciar o cronômetro. Carta que aparece em branco no meio da partida arruina a experiência.

---

## 10. Limitações conhecidas (não são bugs)

Este projeto roda 100% no navegador, o que significa:

- **O cronômetro pode ser manipulado** por quem abrir o DevTools.
- **O bloqueio de 24h é contornável** limpando o localStorage ou usando aba anônima.
- **Não há código único de cupom** — o print da tela pode ser reencaminhado.

Isso é aceitável **porque a validação final é humana**: a loja recebe a mensagem no WhatsApp e decide. O atendente deve conferir se o pedido atinge o mínimo antes de aplicar.

Se a fraude virar problema real (volume alto ou reclamação de franqueado), a solução é mover cronômetro e emissão de cupom para funções RPC no Supabase. **Não implementar isso agora** — só se e quando o problema aparecer.

---

## 11. O que NÃO fazer

- Não adicionar React, Vue, npm, bundler ou qualquer build step.
- Não usar `localStorage` dentro de artifacts do Claude.ai (funciona só no deploy real).
- Não hardcodar prêmios, tempos ou número de WhatsApp fora do `config.js`.
- Não fixar a disposição das cartas.
- Não usar `alert()` ou `confirm()` — telas próprias, com o visual da marca.
- Não contar erros totais; são erros **consecutivos**.
- Não deixar o tabuleiro clicável durante a animação de virada.

---

## 12. Estado atual

- [x] HTMLs das telas criados
- [x] Imagens dos produtos disponíveis
- [x] Lógica do jogo (`jogo.js`)
- [x] Bloqueio de 24h + contador regressivo
- [x] Integração do link do WhatsApp
- [x] Cupom padronizado (`SA-CAM-N5-7K2P`)
- [x] Seletor de unidade + link exclusivo por loja (`?loja=slug`)
- [x] Tela de oferta ao franqueado + registro da resposta
- [x] Painel da franqueadora (`painel.html`) com os 2 links e as 2 respostas por loja
- [x] Encaixe proporcional da tela em qualquer celular (sem rolagem)
- [x] Espiada de 1s no começo da partida (`CONFIG.PREVIA_MS`)
- [x] Duas perguntas ao franqueado: quer o jogo? / a franqueadora publica?
- [x] Zerar bloqueados pela chave `CONFIG.TEMPORADA`
- [x] Backend opcional em Google Apps Script (`backend/apps-script.gs`)
- [x] Definição do número de WhatsApp por unidade (as 42 estão no `config.js`)
- [ ] Calibração das faixas de tempo com dados reais
- [ ] Confirmar o pedido mínimo do nível 4 (assumido R$ 85)
- [ ] Preencher `WHATS_FRANQUEADORA` no `config.js`
- [ ] Teste em celular real

---

## 13. Pendências de decisão

1. **Uma unidade ou a rede toda?** Se for rede, precisa de seletor de loja na primeira tela e um número de WhatsApp por unidade em `config.js`. Isso também permite relatório por unidade, que é o que justifica o projeto na reunião com os franqueados.
2. **Captura de telefone além do nome?** A base de contatos é um ativo maior que o próprio jogo e alimenta a Central de Envios. Custo: mais fricção antes de jogar.
3. **Os mínimos de pedido valem para toda a rede** ou variam por praça? Sinop e Florianópolis não têm o mesmo ticket médio.
