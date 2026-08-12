# Jogo da Memória — Casa do Sushi

Landing page de jogo promocional. O cliente joga, completa no menor tempo
possível e desbloqueia um cupom que resgata pelo WhatsApp da unidade.

HTML + CSS + JavaScript puro. **Sem npm, sem build, sem terminal.**
Para ver funcionando, dê dois cliques no `index.html`.

---

## 1. Como testar agora

| O que | Como |
|---|---|
| O jogo, de uma unidade | abra `index.html?loja=camboriu` |
| A tela de escolha de unidade | abra `index.html` sem nada depois |
| O painel da franqueadora | abra `painel.html` |

Para forçar a tela de bloqueio sem errar 3 vezes: abra o console do navegador
(F12) e cole:

```js
localStorage.setItem('casadosushi_jogo', JSON.stringify({
  nome:'Teste', loja:'camboriu', bloqueadoAte: Date.now() + 24*3600*1000
}));
location.reload();
```

Para zerar tudo e começar do início: `localStorage.clear()` e recarregue.

---

## 2. Arquivos

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
  img/marca.png             lockup da marca
  img/produtos/             16 fotos, uma por peça, nomeadas
  img/deco/                 arte recortada do layout aprovado
backend/apps-script.gs      backend opcional (Google Sheets)
```

As telas usam os nomes de seção previstos no CLAUDE.md: `#tela-nome`,
`#tela-regras`, `#tela-jogo`, `#tela-premio`, `#tela-bloqueado`, mais
`#tela-loja`, `#tela-franqueado` e `#tela-obrigado`.

---

## 3. O fluxo

```
Link da unidade (index.html?loja=camboriu)
  ↓
Nome  →  Regras  →  Tabuleiro (cronômetro dispara)
  ↓
├── Completou os 6 pares → prêmio + cupom + botão do WhatsApp
│                            ↓
│                          tela do franqueado (só no modo demonstração)
│
└── Errou 3 vezes SEGUIDAS → bloqueio de 24h com contador regressivo
```

- **12 cartas, 6 pares, grade 3 × 4** — como no layout aprovado.
- A cada partida o jogo **sorteia 6 dos 16 produtos** e embaralha de novo.
  Ninguém decora o tabuleiro.
- **São 4 desenhos de verso** e o jogo sorteia um a cada rodada, então a mesa
  nunca aparece igual duas vezes seguidas.
- Erro é **consecutivo**: acertar um par zera o contador.
- O tabuleiro trava durante a comparação, então não dá para virar 4 cartas.
- As 6 fotos são pré-carregadas **antes** do cronômetro começar.

---

## 4. Mexendo no que importa (`assets/js/config.js`)

### Ligar/desligar a tela do franqueado

```js
MODO_DEMO_FRANQUEADO: true,   // versão para mandar às 42 unidades
MODO_DEMO_FRANQUEADO: false,  // versão que vai para o cliente final
```

### Prêmios

```js
{ nivel: 5, ateSegundos: 30, nome: "1 Temaki Hot",    minimo: 90 }
```

| Nível | Prêmio | Pedido mínimo | Até |
|---|---|---|---|
| 5 | 1 Temaki Hot | R$ 90 | 30s |
| 4 | 10 Hot Cortesia | R$ 85 | 45s |
| 3 | 15% de desconto | R$ 80 | 60s |
| 2 | 10% de desconto | R$ 65 | 90s |
| 1 | 5% de desconto | R$ 50 | completou |

> **Duas coisas para resolver antes de publicar.**
>
> 1. **O mínimo do nível 4 não veio na tabela.** Coloquei R$ 85 para manter a
>    escada subindo entre os R$ 80 do nível 3 e os R$ 90 do nível 5. Se o
>    número certo for outro, é só trocar no `config.js`.
>
> 2. **Os segundos são chute.** Rode uma semana fechada com a equipe interna
>    e as embaixadoras, colete os tempos reais e corte por percentil (topo
>    10% = melhor prêmio). Chutar no papel é como essas campanhas acabam com
>    todo mundo no nível máximo no segundo dia.
>
> Vale também conferir se cada mínimo está **acima do ticket médio do
> delivery da unidade**. Se o TM é R$ 75 e o cupom libera a partir de R$ 50,
> não houve pedido novo — só desconto numa venda que já ia acontecer.

### Verso das cartas

São 4 desenhos, listados em `VERSOS`: o original do layout aprovado e três
montados com os mesmos elementos da marca (onda seigaiha, torii, símbolo S.A,
moldura vermelha ou dourada).

```js
VERSO_MODO: "sorteado",  // um verso por partida, igual nas 12 cartas
VERSO_MODO: "misto",     // um verso sorteado para CADA carta
```

O padrão é `"sorteado"`: a mesa muda de cara a cada rodada e o jogo continua
justo. O modo `"misto"` existe, mas vale um aviso — verso diferente em cada
carta parece dica de par para muita gente, mesmo não sendo. Só use se for
mesmo essa a intenção.

Para acrescentar um quinto desenho: salve o PNG quadrado em
`/assets/img/deco/` e acrescente a linha em `VERSOS`.

### WhatsApp das lojas

As 42 unidades já estão em `LOJAS`, com número, slug e código de cupom.
Para trocar um número, edite o campo `whats` (só dígitos, sem `+` e sem espaço).

### WhatsApp da franqueadora

```js
WHATS_FRANQUEADORA: "",   // vazio = o botão não aparece
```

Preencha para que o franqueado que responder "sim" possa falar direto com
o time. A resposta cai no painel de qualquer jeito.

---

## 5. O cupom

Formato padronizado, gerado no fim da partida:

```
SA-CAM-N5-7K2P
│  │   │  └── 4 caracteres sorteados (sem O, 0, I e 1, que confundem à mão)
│  │   └───── nível do prêmio
│  └───────── código da unidade
└──────────── prefixo da rede
```

O mesmo código aparece na tela, no botão de copiar e dentro da mensagem
do WhatsApp.

### A mensagem que o cliente envia

```
🍣 *CUPOM CASA DO SUSHI* 🍣

Oi! Aqui é o(a) *Camille Souza* 👋
Joguei o *Jogo da Memória* da Casa do Sushi e desbloqueei um prêmio!

⏱️ Meu tempo: *00:42*
🏆 Nível: *4 de 5*
🎁 Prêmio: *10 Hot Cortesia*

🎟️ *CUPOM: SA-CAM-N4-7K2P*
💰 Pedido mínimo: *R$ 85,00*
📅 Válido até: *11/09/2026*
📍 Unidade: *S.A Camboriú*

Quero resgatar meu prêmio e fazer meu pedido! 🥢
```

### Sugestão de resposta da loja

Vale deixar pronta no atendimento, para a confirmação sair padronizada:

```
Oiê! 🍣 Cupom *SA-CAM-N4-7K2P* confirmado!

Você garantiu: *10 Hot Cortesia* 🎁
É só fechar um pedido de *R$ 85,00* ou mais e o brinde vai junto.
Vale até *11/09/2026*.

Me manda seu pedido que eu já lanço aqui. 🥢
```

---

## 6. Os links das 42 unidades

Cada loja tem o link dela:

```
https://seusite.com/index.html?loja=camboriu
https://seusite.com/index.html?loja=maringa
...
```

Abra o `painel.html`, cole o endereço final no campo **"Endereço público do
jogo"** e clique em **"Copiar os 42 links"**. Vem tudo pronto para colar no
Excel ou mandar no grupo.

Quem abrir o link sem `?loja=` cai numa tela de escolha de unidade — ninguém
fica sem saber para onde vai o cupom.

---

## 7. O painel da franqueadora (`painel.html`)

Mostra, por unidade:

- acessos (aberturas do link)
- partidas começadas
- partidas concluídas
- bloqueios por 3 erros
- cupons enviados (clique no botão do WhatsApp)
- **a resposta do franqueado** sobre contratar o jogo
- o link exclusivo, com botão de copiar e de abrir

No topo: totais da rede, taxa de conclusão e quanto entra por mês se todas
as lojas que disseram "sim" aceitarem. Tem busca, filtro por resposta,
ordenação e **exportação em CSV** (abre no Excel com os acentos certos).

### Dois modos

**Demonstração (como está agora).** `CONFIG.ENDPOINT` está vazio, então tudo
fica no `localStorage`. O jogo funciona inteiro e o painel mostra os números
**daquele navegador**. Serve para testar e para apresentar na reunião.

**Real.** Preencha o `ENDPOINT` e o painel passa a somar as 42 unidades.

### Ligando o modo real (10 minutos, uma vez só)

O passo a passo está comentado dentro de `backend/apps-script.gs`. Em resumo:
crie uma planilha no Google Sheets → Extensões > Apps Script → cole o arquivo
→ Implantar como App da Web ("qualquer pessoa") → copie a URL `/exec` → cole
em `CONFIG.ENDPOINT`.

É gratuito, não precisa de servidor nem de cartão.

---

## 8. Publicando

Arraste a pasta para o **Vercel** ou suba num repositório e ligue o
**GitHub Pages**. Não há build: o que está aqui é o que vai para o ar.

Depois de publicar, volte ao painel e preencha o campo do endereço público
para os links saírem certos.

---

## 9. O que já foi testado

Rodado em navegador de verdade, em tela de 390 px:

- as 4 telas do layout aprovado, batendo com a arte
- sorteio diferente a cada partida (4 partidas, 4 disposições e 4 conjuntos)
- verso sorteado por rodada (10 partidas, os 4 desenhos apareceram, mesa sempre uniforme)
- travamento do tabuleiro durante a comparação (a 4ª carta é ignorada)
- contador de erros consecutivos zerando ao acertar um par
- bloqueio de 24h com regressivo correndo, sem escapatória pelo botão
- prêmio, cupom, mínimo, validade e unidade corretos
- mensagem do WhatsApp com acento e emoji intactos
- nome lembrado entre visitas
- painel com as 42 unidades e os links
- nenhum erro de console

---

## 10. Limitações conhecidas (não são bugs)

O projeto roda 100% no navegador, então:

- o cronômetro pode ser manipulado por quem abrir o DevTools;
- o bloqueio de 24h é contornável limpando o `localStorage` ou usando aba
  anônima;
- o print da tela do cupom pode ser reencaminhado.

Isso é aceitável **porque a validação final é humana**: a loja recebe a
mensagem no WhatsApp e decide. O atendente confere o pedido mínimo antes de
aplicar o prêmio.

Se a fraude virar problema real (volume alto ou reclamação de franqueado), a
saída é mover cronômetro e emissão de cupom para funções no Supabase — mas
só quando e se o problema aparecer.

---

## 11. Ainda em aberto

- [ ] Calibrar as faixas de tempo com dados reais (seção 4)
- [ ] Confirmar o pedido mínimo do nível 4 (está em R$ 85)
- [ ] Conferir se os mínimos valem para toda a rede ou variam por praça —
      Sinop e Florianópolis não têm o mesmo ticket médio
- [ ] Preencher `WHATS_FRANQUEADORA` no `config.js`
- [ ] Decidir se vale capturar telefone além do nome (mais fricção antes de
      jogar, mas alimenta a Central de Envios)
- [ ] Testar em celular real antes de mandar para as 42 unidades
