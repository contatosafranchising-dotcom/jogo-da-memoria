# Jogo da Memória — Casa do Sushi

Landing page de jogo promocional. O cliente joga, completa no menor tempo
possível e desbloqueia um cupom que resgata pelo WhatsApp da unidade.

HTML + CSS + JavaScript puro. **Sem npm, sem build, sem terminal.**

**No ar:** https://jogo.sacasadosushi.com.br/

---

## 1. Como testar

| O que | Como |
|---|---|
| O jogo de uma unidade | `https://jogo.sacasadosushi.com.br/?loja=camboriu` |
| A tela de escolha de unidade | `https://jogo.sacasadosushi.com.br/` sem nada depois |
| O painel da franqueadora | `https://jogo.sacasadosushi.com.br/painel.html` |

Localmente é a mesma coisa: dois cliques no `index.html`.

Para forçar a tela de tentativas esgotadas sem errar 3 vezes, abra o console
do navegador (F12) e cole:

```js
localStorage.setItem('casadosushi_jogo', JSON.stringify({
  nome:'Teste', loja:'camboriu', bloqueadoAte: Date.now() + 24*3600*1000
}));
location.reload();
```

Para zerar tudo: `localStorage.clear()` e recarregue.

---

## 2. Como o layout foi montado

As quatro telas que vieram do design (capa, como jogar, tabuleiro e
tentativas esgotadas) **usam a própria arte aprovada como fundo**. Por cima
dela entra só o que precisa estar vivo: o campo de nome, as áreas de toque
dos botões, o cronômetro, as bolinhas de erro, as cartas e o regressivo.

Cada peça foi encaixada nas coordenadas medidas no arquivo original de 853 px
de largura, em `%` e `cqw`, então a tela fica proporcionalmente idêntica ao
desenho em qualquer aparelho — de 320 px a tablet.

**O que isso significa na prática:** o texto dessas quatro telas está dentro
da imagem. Trocar uma palavra de "COMO JOGAR?" ou "JOGUE E GANHE!" exige
gerar a arte de novo no design e substituir o arquivo em
`/assets/img/telas/`. Foi a troca escolhida para o layout sair igual ao
aprovado. As telas de prêmio, oferta ao franqueado e escolha de unidade não
vieram no design, então são HTML de verdade e dá para editar o texto direto
no `index.html`.

---

## 3. Arquivos

```
index.html                  as 8 telas do jogo, em arquivo único
painel.html                 painel da franqueadora
assets/
  css/estilo.css            visual do jogo e todas as animações
  css/painel.css            visual do painel (separado de propósito)
  js/config.js              << É AQUI QUE SE MEXE NO DIA A DIA
  js/api.js                 gravação e leitura dos números
  js/jogo.js                lógica do jogo
  js/painel.js              lógica do painel
  img/telas/                a arte aprovada das 4 telas desenhadas
  img/produtos/             16 fotos, uma por peça, nomeadas
  img/deco/                 versos de carta e arte solta da marca
backend/apps-script.gs      backend opcional (Google Sheets)
```

As telas usam os nomes de seção previstos no CLAUDE.md: `#tela-nome`,
`#tela-regras`, `#tela-jogo`, `#tela-premio`, `#tela-bloqueado`, mais
`#tela-loja`, `#tela-franqueado` e `#tela-obrigado`.

---

## 4. O fluxo

```
Link da unidade (?loja=camboriu)
  ↓
Nome  →  Regras  →  Espiada de 1s  →  Tabuleiro (cronômetro dispara)
  ↓
├── Completou os 6 pares → prêmio + cupom + botão do WhatsApp
│                            ↓
│                          pergunta 1: quer o jogo?      (só no link do franqueado)
│                          pergunta 2: a gente publica?  (só no link do franqueado)
│
└── Errou 3 vezes SEGUIDAS → bloqueio de 24h com contador regressivo
```

- **12 cartas, 6 pares, grade 3 × 4** — na mesma posição do layout.
- A cada partida o jogo **sorteia 6 dos 16 produtos** e embaralha de novo.
  Ninguém decora o tabuleiro.
- **São 4 desenhos de verso** e o jogo sorteia um a cada rodada, então a mesa
  nunca aparece igual duas vezes seguidas.
- Erro é **consecutivo**: acertar um par zera o contador.
- O tabuleiro trava durante a comparação, então não dá para virar 4 cartas.
- As fotos são pré-carregadas **antes** do cronômetro começar.
- **Espiada de abertura:** as 12 cartas abrem por 1 segundo e fecham. O
  cronômetro só liga depois que elas fecham, então a espiada não custa tempo
  a ninguém e todo mundo começa vendo a mesma coisa. Muda em
  `CONFIG.PREVIA_MS` (0 desliga).

### A tela cabe inteira no aparelho

Cada tela desenhada tem uma proporção fixa (a do arquivo aprovado). O CSS
encolhe a largura até essa proporção caber na altura da janela — cartas,
cronômetro e botões encolhem juntos, e o desenho continua idêntico ao layout
em qualquer celular, sem rolagem.

A conta usa `svh` (altura com a barra do navegador aberta) de propósito: com
`dvh` a tela mudaria de tamanho no meio da partida, na hora em que a barra
some. No celular deitado a largura para de encolher em 300px e a página
passa a rolar — melhor rolar do que espremer o tabuleiro.

---

## 5. Mexendo no que importa (`assets/js/config.js`)

### Quem vê as perguntas do final

Quem decide é o **link**, não o arquivo:

| Link | O que acontece |
|---|---|
| `?loja=camboriu` | jogo do cliente: acaba na tela do prêmio |
| `?loja=camboriu&modo=franqueado` | acaba nas duas perguntas ao franqueado |

Os dois saem prontos no `painel.html`. Dá para mandar o do franqueado para o
dono da loja e o do cliente para o Instagram no mesmo dia, sem republicar
nada. `MODO_DEMO_FRANQUEADO` no config só vale quando o link vem **sem**
`?modo=`.

### Uma partida por dia, ganhando ou perdendo

```js
BLOQUEIO_APOS_GANHAR: true,   // quem ganha também espera 24h
BLOQUEIO_APOS_GANHAR: false,  // ganhou, joga de novo na hora
```

Sem isso o cliente joga em sequência até tirar o temaki e a loja recebe dez
cupons do mesmo nome no mesmo dia. Com isso, os dois caminhos param em 24h —
mas cada um vai para uma tela:

| | O que aparece ao voltar dentro das 24h |
|---|---|
| **Ganhou** | a tela do prêmio com o cupom dele, o botão do WhatsApp e o regressivo da próxima tentativa |
| **Errou 3x** | a tela de tentativas esgotadas |

Quem ganhou **não perde o cupom**: ele fica salvo e é remontado a cada visita
até vencer os 30 dias.

### Começar tudo de novo (zerar os aparelhos)

O bloqueio de 24h mora no aparelho de cada cliente — não dá para apagar de
fora. Para liberar todo mundo de uma vez, troque o número e publique:

```js
TEMPORADA: 4,   // vire para 5, 6, 7...
```

Na primeira vez que o aparelho abrir qualquer um dos 42 links, o jogo vê que
a temporada mudou, joga fora o bloqueio antigo e libera a pessoa. O nome e a
unidade continuam salvos. Bloqueios criados **depois** da virada continuam
valendo normalmente.

### Prêmios

| Nível | Prêmio | Pedido mínimo | Custo aprox. | Custo/mínimo | Até |
|---|---|---|---|---|---|
| 5 | 1 Temaki Hot | R$ 110 | R$ 10,00 (CMV) | 9,1% | 15s |
| 4 | 10 Hot Cortesia | R$ 95 | R$ 10,00 (CMV) | 10,5% | 24s |
| 3 | 15% de desconto | R$ 80 | R$ 12,00 | 15,0% | 34s |
| 2 | 10% de desconto | R$ 65 | R$ 6,50 | 10,0% | 48s |
| 1 | 5% de desconto | R$ 50 | R$ 2,50 | 5,0% | completou |

A escada sobe nos dois eixos: prêmio melhor exige mínimo maior. E o nível 3
é o mais caro da tabela em proporção (15% do pedido), enquanto os prêmios em
produto ficam em ~10% e custam CMV, não faturamento.

> **Os segundos ainda são chute.** Rode uma semana fechada com a equipe
> interna e as embaixadoras, colete os tempos reais e corte por percentil
> (topo 10% = melhor prêmio). Chutar no papel é como essas campanhas acabam
> com todo mundo no nível máximo no segundo dia — e aí a conta que fecha em
> 9,1% vira 9,1% de *todos* os pedidos.
>
> Vale conferir também se cada mínimo está **acima do ticket médio do
> delivery da unidade**. Se o TM é R$ 75 e o cupom libera a partir de R$ 50,
> não houve pedido novo — só desconto numa venda que já ia acontecer.

### Verso das cartas

São 4 desenhos em `VERSOS`: o original do layout e três montados com os
mesmos elementos da marca (onda seigaiha, torii, símbolo S.A, moldura
vermelha ou dourada).

```js
VERSO_MODO: "sorteado",  // um verso por partida, igual nas 12 cartas
VERSO_MODO: "misto",     // um verso sorteado para CADA carta
```

O padrão é `"sorteado"`. O modo `"misto"` existe, mas verso diferente em cada
carta parece dica de par para muita gente, mesmo não sendo.

### WhatsApp das lojas

As 42 unidades estão em `LOJAS`, com número, slug e código. Para trocar um
número, edite o campo `whats` (só dígitos, sem `+` e sem espaço).

### WhatsApp da franqueadora

```js
WHATS_FRANQUEADORA: "",   // vazio = o botão não aparece
```

Preencha para que o franqueado que responder "sim" fale direto com o time.
A resposta cai no painel de qualquer jeito.

---

## 6. O cupom

Um código fixo por prêmio, definido no `config.js`:

| Prêmio | Cupom |
|---|---|
| 1 Temaki Hot | `TEMAKIJOGO` |
| 10 Hot Cortesia | `10HOTJOGO` |
| 15% de desconto | `15OFFJOGO` |
| 10% de desconto | `10OFFJOGO` |
| 5% de desconto | `5OFFJOGO` |

São cinco códigos no total, então o atendente decora e confere de
bate-pronto. Como o código se repete, quem valida é a pessoa no WhatsApp:
a mensagem traz o nome, o tempo, o nível e a unidade antes do resgate.

### A mensagem que o cliente envia

```
🍣 *CUPOM CASA DO SUSHI* 🍣

Oi! Aqui é o(a) *Camille Souza* 👋
Joguei o *Jogo da Memória* da Casa do Sushi e desbloqueei um prêmio!

⏱️ Meu tempo: *00:42*
🏆 Nível: *4 de 5*
🎁 Prêmio: *10 Hot Cortesia*

🎟️ *CUPOM: 10HOTJOGO*
💰 Pedido mínimo: *R$ 95,00*
📅 Válido até: *11/09/2026*
📍 Unidade: *S.A Camboriú*

Quero resgatar meu prêmio e fazer meu pedido! 🥢
```

### Sugestão de resposta da loja

Vale deixar pronta no atendimento, para a confirmação sair padronizada:

```
Oiê! 🍣 Cupom *10HOTJOGO* confirmado!

Você garantiu: *10 Hot Cortesia* 🎁
É só fechar um pedido de *R$ 95,00* ou mais e o brinde vai junto.
Vale até *11/09/2026*.

Me manda seu pedido que eu já lanço aqui. 🥢
```

---

## 7. Os links das 42 unidades

Cada loja tem **dois** links do mesmo jogo publicado:

```
cliente     https://jogo.sacasadosushi.com.br/?loja=camboriu
franqueado  https://jogo.sacasadosushi.com.br/?loja=camboriu&modo=franqueado
```

O do cliente acaba na tela do prêmio. O do franqueado segue para as duas
perguntas e grava a resposta no painel.

No `painel.html` há três botões: **Copiar links do cliente**, **Copiar links
do franqueado** e **Copiar tudo (2 colunas)** — este último vem com cabeçalho,
pronto para colar no Excel. Cada linha da tabela também tem Copiar e Abrir
para cada um dos dois links.

Quem abrir o link sem `?loja=` cai numa tela de escolha de unidade — ninguém
fica sem saber para onde vai o cupom.

---

## 8. O painel da franqueadora (`painel.html`)

Mostra, por unidade: acessos, partidas começadas, partidas concluídas,
bloqueios por 3 erros, cupons enviados, **as duas respostas do franqueado** e
os **dois links** da unidade, cada um com botão de copiar e de abrir.

As duas perguntas são estas, e são feitas sempre — quem diz não na primeira
também responde a segunda, porque a publicação dos links de pedido, reserva e
caixinha vale por si só:

| | Pergunta | Coluna no painel |
|---|---|---|
| P1 | A unidade quer o jogo? | *P1 · quer o jogo?* |
| P2 | A franqueadora **agenda os links nos stories** da unidade por R$ 20,00/mês? | *P2 · agenda stories?* |

No topo: totais da rede, taxa de conclusão, quantas disseram sim em cada
pergunta e a receita mensal — que vem da **pergunta 2**, não da 1: o jogo em
si não é cobrado, o que entra no boleto é o sistema de agendamento de stories. Tem busca, filtro por
qualquer uma das duas respostas, ordenação e exportação em CSV com as duas
colunas de resposta e os dois links.

### Respondendo pela loja

Na maioria das vezes o franqueado vai responder por telefone ou no grupo,
não abrindo o link. As duas colunas de resposta são **seletores**: escolha
Sim / Não ali mesmo e fica registrado igual, com a marca *"marcado por
você"* embaixo — para não confundir depois com quem respondeu no celular.

### Os dois links, sem rolar a tabela

Cada unidade tem uma única coluna **Links da unidade**, com duas linhas:

```
[CLIENTE]     Copiar  Abrir
[FRANQUEADO]  Copiar  Abrir
```

A URL inteira não é mais escrita na tabela (ela fica no `title` do botão).
Unidade, links e as duas respostas cabem nos primeiros 810px — os números
ficam à direita, onde rolar não atrapalha.

### Dois modos

**Demonstração (como está agora).** `CONFIG.ENDPOINT` está vazio, então tudo
fica no `localStorage`. O jogo funciona inteiro e o painel mostra os números
**daquele navegador**. Serve para testar e para apresentar na reunião.

**Real.** Preencha o `ENDPOINT` e o painel passa a somar as 42 unidades.
O passo a passo está comentado dentro de `backend/apps-script.gs`: planilha
no Google Sheets → Extensões > Apps Script → colar o arquivo → implantar
como App da Web → copiar a URL `/exec` → colar no `config.js`. É gratuito e
não precisa de servidor.

---

## 9. Publicando alterações

O site está no GitHub Pages, na conta `contatosafranchising-dotcom`.
Qualquer alteração vai ao ar com:

```
git add -A
git commit -m "o que mudou"
git push
```

Leva de 1 a 2 minutos para aparecer.

---

## 10. O que já foi testado

Em navegador de verdade, de 320 px a 430 px de largura:

- as 4 telas do layout batendo com a arte aprovada (diferença de 1 px de
  altura no tabuleiro e na tela de tentativas esgotadas)
- sorteio diferente a cada partida (4 partidas, 4 disposições e 4 conjuntos)
- verso sorteado por rodada (10 partidas, os 4 desenhos apareceram)
- travamento do tabuleiro durante a comparação (a 4ª carta é ignorada)
- contador de erros consecutivos zerando ao acertar um par
- bloqueio de 24h com regressivo correndo, sem escapatória pelo botão
- prêmio, cupom, mínimo, validade e unidade corretos
- mensagem do WhatsApp com acento e emoji intactos
- nome lembrado entre visitas
- painel com as 42 unidades e os links
- nenhum erro de console, nenhum estouro horizontal

---

## 11. Limitações conhecidas (não são bugs)

O projeto roda 100% no navegador, então:

- o cronômetro pode ser manipulado por quem abrir o DevTools;
- o bloqueio de 24h é contornável limpando o `localStorage` ou usando aba
  anônima;
- o cupom é fixo por prêmio, então o print pode ser reencaminhado.

Isso é aceitável **porque a validação final é humana**: a loja recebe a
mensagem no WhatsApp e decide. O atendente confere o pedido mínimo antes de
aplicar o prêmio.

Se a fraude virar problema real (volume alto ou reclamação de franqueado), a
saída é mover cronômetro e emissão de cupom para funções no Supabase — mas
só quando e se o problema aparecer.

---

## 12. Ainda em aberto

- [ ] Calibrar as faixas de tempo com dados reais (seção 5)
- [ ] Conferir se os mínimos valem para toda a rede ou variam por praça —
      Sinop e Florianópolis não têm o mesmo ticket médio
- [ ] Preencher `WHATS_FRANQUEADORA` no `config.js`
- [ ] Ligar a planilha do Google (`CONFIG.ENDPOINT`) antes de mandar para as
      42 unidades, senão as respostas ficam só no aparelho de cada um
- [ ] Decidir se vale capturar telefone além do nome
- [ ] Testar em celular real
