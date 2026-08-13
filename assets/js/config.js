/* =============================================================
   CASA DO SUSHI - JOGO DA MEMÓRIA
   config.js — TUDO que se edita no dia a dia está aqui.
   Nenhum prêmio, tempo, número ou texto deve ser escrito fora deste arquivo.
   ============================================================= */

const CONFIG = {

  /* ---------- MODO DE OPERAÇÃO ---------- */

  // Quem vê as duas perguntas do final (a oferta ao franqueado).
  // O link decide, não este arquivo:
  //   ...index.html?loja=camboriu                  -> jogo do CLIENTE, acaba no prêmio
  //   ...index.html?loja=camboriu&modo=franqueado  -> versão do FRANQUEADO, com as perguntas
  // Este valor é só o que vale quando o link vem SEM ?modo=.
  // Fica em false porque é o lado seguro: link solto, sem parâmetro, é
  // tratado como link de cliente. O painel gera os dois com o parâmetro
  // certo, então ninguém depende deste padrão.
  MODO_DEMO_FRANQUEADO: false,

  // Cole aqui a URL do Google Apps Script (ver /backend/apps-script.gs).
  // Vazio = o jogo funciona 100%, só que os dados ficam no navegador (modo demonstração).
  ENDPOINT: "",

  /* ---------- REGRAS DO JOGO ---------- */

  PARES: 6,                 // 6 pares = 12 cartas (grade 3 x 4)

  // Verso das cartas (lista VERSOS mais abaixo):
  // "sorteado" = a cada partida o jogo escolhe UM verso e usa nas 12 cartas.
  //              A mesa muda de cara toda rodada e continua justa.
  // "misto"    = cada carta recebe um verso sorteado.
  //              Atenção: verso diferente por carta parece dica de par para
  //              muita gente, mesmo não sendo. Use só se for essa a intenção.
  VERSO_MODO: "sorteado",
  // Espiada de abertura: todas as cartas abrem por este tempo e fecham de novo.
  // O cronômetro só liga DEPOIS que elas fecham — a espiada não custa tempo
  // a ninguém e todo mundo começa a partida vendo a mesma coisa.
  // 0 desliga a espiada.
  PREVIA_MS: 1000,

  ERROS_PERMITIDOS: 3,      // erros CONSECUTIVOS; acertar um par zera a contagem
  // Quanto tempo o par ERRADO fica à mostra antes de desvirar. É o botão
  // mais direto da dificuldade: quanto menor, menos o jogador consegue
  // decorar a carta que errou. Abaixo de 600 vira sorte, não memória.
  TEMPO_VIRAR_MS: 700,
  BLOQUEIO_HORAS: 24,       // vale para os dois casos abaixo

  // true  = quem GANHA também espera 24h para jogar de novo.
  //         Sem isso a pessoa joga em sequência até tirar o temaki e a loja
  //         recebe dez cupons do mesmo cliente no mesmo dia.
  //         Quem volta dentro das 24h vê o cupom que já ganhou, com o
  //         regressivo da próxima tentativa — não perde o prêmio.
  // false = ganhou, pode jogar de novo na hora.
  BLOQUEIO_APOS_GANHAR: true,

  // COMEÇAR TUDO DE NOVO.
  // Os dados moram no aparelho de cada cliente, então não dá para apagar de
  // fora. O jeito é este: troque o número abaixo (2, 3, 4...) e publique.
  // Na primeira vez que o aparelho abrir o link, o jogo vê que a temporada
  // mudou e apaga TUDO daquele aparelho: bloqueio de 24h, nome, cupom que
  // já tinha ganhado, partidas e os acessos contados. Fica como se aquela
  // pessoa nunca tivesse jogado. Vale para os 42 links de uma vez.
  // Só a unidade continua salva — ela diz onde a pessoa está, não o que ela
  // jogou.
  // ATENÇÃO: quem ganhou um cupom e ainda não resgatou perde o cupom.
  TEMPORADA: 5,
  VALIDADE_DIAS: 30,        // validade do cupom

  /* ---------- IDENTIDADE ---------- */

  CHAVE_STORAGE: "casadosushi_jogo",

  /* ---------- OFERTA AO FRANQUEADO ---------- */

  // R$ por mês no boleto de fundo. É o valor do SISTEMA DE AGENDAMENTO de
  // stories da franqueadora — o jogo em si não é cobrado.
  VALOR_COMBO: 20,

  // WhatsApp do time da franqueadora que recebe o "sim" do franqueado.
  // Só números, sem + e sem espaços. Vazio = o botão "Falar com a
  // franqueadora" não aparece (a resposta ainda cai no painel).
  WHATS_FRANQUEADORA: ""
};


/* =============================================================
   PRÊMIOS
   Ordem: do melhor (mais rápido) para o mais simples.
   "ateSegundos" = completou em até X segundos, ganha este prêmio.
   A lista está do mais rápido para o mais lento e é lida de cima para baixo:
   o primeiro nível em que o tempo couber é o que vale. O último (999) é o
   piso — quem termina em qualquer tempo leva pelo menos ele.
   "custo" = custo real aproximado por cupom queimado, para conta de padaria.

   ATENÇÃO — ler antes de publicar:
   1) Os SEGUNDOS são estimativa. Rode uma semana com a equipe interna,
      colete os tempos reais e corte por percentil.
   2) O MÍNIMO precisa ficar acima do ticket médio do delivery da unidade,
      senão o cupom só dá desconto em venda que já ia acontecer.
   3) Precifique assumindo que TODO MUNDO chega no nível 5. Se o temaki
      quebra a margem quando todos alcançam, ele não pode ser o topo.
   ============================================================= */

const PREMIOS = [
  { nivel: 5, ateSegundos:  10, nome: "1 Temaki Filadélfia", tipo: "produto",  minimo: 100, custo: 10.00, cupom: "FILAJOGO",   selo: "PRÊMIO MÁXIMO"  },
  { nivel: 4, ateSegundos:  15, nome: "1 Temaki Hot",        tipo: "produto",  minimo:  90, custo: 10.00, cupom: "TEMAKIJOGO", selo: "PRÊMIO RARO"    },
  { nivel: 3, ateSegundos:  24, nome: "10% de desconto",     tipo: "desconto", minimo:  70, custo:  7.00, cupom: "10OFFJOGO",  selo: "MUITO BOM"      },
  { nivel: 2, ateSegundos:  30, nome: "10 Hot Cortesia",     tipo: "produto",  minimo:  60, custo: 10.00, cupom: "10HOTJOGO",  selo: "BOA!"           },
  { nivel: 1, ateSegundos: 999, nome: "5% de desconto",      tipo: "desconto", minimo:  50, custo:  2.50, cupom: "5OFFJOGO",   selo: "VOCÊ CONSEGUIU" }
];


/* =============================================================
   VERSOS DAS CARTAS
   Mais de um desenho para o tabuleiro não ficar sempre igual.
   O primeiro é a arte original do layout aprovado; os outros três
   foram montados com os mesmos elementos da marca (onda seigaiha,
   torii, símbolo S.A, moldura vermelha ou dourada).
   Para acrescentar outro: salve em /assets/img/deco/ e cite aqui.
   ============================================================= */

const VERSOS = [
  "assets/img/deco/carta-verso.png",    // marca completa, moldura vermelha
  "assets/img/deco/carta-verso-2.png",  // torii, moldura vermelha
  "assets/img/deco/carta-verso-3.png",  // marca completa, moldura dourada
  "assets/img/deco/carta-verso-4.png"   // símbolo S.A, moldura vermelha
];


/* =============================================================
   CARTAS — banco de imagens dos produtos.
   O jogo sorteia 6 destes 16 a cada partida, então o cliente
   nunca decora o conjunto. Para adicionar um produto novo:
   salve o .jpg em /assets/img/produtos/ e acrescente uma linha.
   ============================================================= */

const PRODUTOS = [
  { slug: "barco-premium",        nome: "Barco Premium"        },
  { slug: "big-hot-salmao",       nome: "Big Hot Salmão"       },
  { slug: "burger-sushi-salmao",  nome: "Burger Sushi Salmão"  },
  { slug: "combinado-40-hot",     nome: "Combinado 40 Hot"     },
  { slug: "combinado-mix-sa",     nome: "Combinado Mix S.A"    },
  { slug: "hossomaki-de-salmao",  nome: "Hossomaki de Salmão"  },
  { slug: "joe-camarao",          nome: "Joe Camarão"          },
  { slug: "niguiri-de-kani",      nome: "Niguiri de Kani"      },
  { slug: "niguiri-de-salmao",    nome: "Niguiri de Salmão"    },
  { slug: "poke-salmao-marinado", nome: "Poke Salmão Marinado" },
  { slug: "sashimi-de-salmao",    nome: "Sashimi de Salmão"    },
  { slug: "tartare-de-salmao",    nome: "Tartare de Salmão"    },
  { slug: "temaki-kani",          nome: "Temaki Kani"          },
  { slug: "temaki-no-copo",       nome: "Temaki no Copo"       },
  { slug: "uramaki-filadelfia",   nome: "Uramaki Filadélfia"   },
  { slug: "yakissoba-misto",      nome: "Yakissoba Misto"      }
];


/* =============================================================
   LOJAS — 42 unidades.
   O link exclusivo de cada uma é:  index.html?loja=SLUG
   O painel (/painel.html) monta e copia esses links prontos.
   "cod" entra no cupom:  SA-CAM-N5-7K2P
   ============================================================= */

const LOJAS = [
  { slug: "alto-da-xv",             cod: "AXV", nome: "S.A Alto da XV",             whats: "5541995611488" },
  { slug: "americana",              cod: "AMR", nome: "S.A Americana",              whats: "5519971390084" },
  { slug: "araucaria",              cod: "ARA", nome: "S.A Araucária",              whats: "5541998983891" },
  { slug: "camboriu",               cod: "CAM", nome: "S.A Camboriú",               whats: "5547999644590" },
  { slug: "ingleses",               cod: "ING", nome: "S.A Ingleses",               whats: "5548992230079" },
  { slug: "yakiniku-erechim",       cod: "YER", nome: "S.A Yakiniku Erechim",       whats: "5554991646404" },
  { slug: "yakiniku-florianopolis", cod: "YFL", nome: "S.A Yakiniku Florianópolis", whats: "5548998378572" },
  { slug: "yakiniku-goiania",       cod: "YGO", nome: "S.A Yakiniku Goiânia",       whats: "5562999451099" },
  { slug: "yakiniku-indaiatuba",    cod: "YIN", nome: "S.A Yakiniku Indaiatuba",    whats: "5519998331233" },
  { slug: "yakiniku-mogi",          cod: "YMG", nome: "S.A Yakiniku Mogi",          whats: "5511992450051" },
  { slug: "yakiniku-rio-preto",     cod: "YRP", nome: "S.A Yakiniku Rio Preto",     whats: "5517981356292" },
  { slug: "yakiniku-santos",        cod: "YST", nome: "S.A Yakiniku Santos",        whats: "5513998080085" },
  { slug: "yakiniku-sinop",         cod: "YSN", nome: "S.A Yakiniku Sinop",         whats: "5566996807666" },
  { slug: "castro",                 cod: "CAS", nome: "S.A Castro",                 whats: "5542999261164" },
  { slug: "colombo",                cod: "COL", nome: "S.A Colombo",                whats: "5541987809629" },
  { slug: "cwb",                    cod: "CWB", nome: "S.A CWB",                    whats: "5541991911519" },
  { slug: "fazenda",                cod: "FAZ", nome: "S.A Fazenda",                whats: "5541998476128" },
  { slug: "gaspar",                 cod: "GAS", nome: "S.A Gaspar",                 whats: "5547991109932" },
  { slug: "itajai-delivery",        cod: "ITJ", nome: "S.A Itajaí Delivery",        whats: "5547996924623" },
  { slug: "itapema",                cod: "ITP", nome: "S.A Itapema",                whats: "5547999458585" },
  { slug: "itapolis",               cod: "ITL", nome: "S.A Itápolis",               whats: "5516993089570" },
  { slug: "jaragua-do-sul",         cod: "JGS", nome: "S.A Jaraguá do Sul",         whats: "554730847370"  },
  { slug: "jardim-analia-franco",   cod: "JAF", nome: "S.A Jardim Anália Franco",   whats: "5511967401511" },
  { slug: "maringa",                cod: "MAR", nome: "S.A Maringá",                whats: "5544991326249" },
  { slug: "merces",                 cod: "MER", nome: "S.A Mercês",                 whats: "5541991173763" },
  { slug: "navegantes",             cod: "NAV", nome: "S.A Navegantes",             whats: "5547997248138" },
  { slug: "novo-mundo",             cod: "NVM", nome: "S.A Novo Mundo",             whats: "5541998795881" },
  { slug: "palmeira",               cod: "PLM", nome: "S.A Palmeira",               whats: "5542998591807" },
  { slug: "paranagua",              cod: "PGU", nome: "S.A Paranaguá",              whats: "5541991883200" },
  { slug: "pinhais",                cod: "PNH", nome: "S.A Pinhais",                whats: "5541988538224" },
  { slug: "ponta-grossa-centro",    cod: "PGC", nome: "S.A Ponta Grossa Centro",    whats: "5542999903726" },
  { slug: "ponta-grossa-oficinas",  cod: "PGO", nome: "S.A Ponta Grossa Oficinas",  whats: "5542998113308" },
  { slug: "rondonopolis",           cod: "RON", nome: "S.A Rondonópolis",           whats: "5566992328123" },
  { slug: "santa-candida",          cod: "SCA", nome: "S.A Santa Cândida",          whats: "5541988985675" },
  { slug: "sao-bento-do-sul",       cod: "SBS", nome: "S.A São Bento do Sul",       whats: "5547999280409" },
  { slug: "sao-braz",               cod: "SBZ", nome: "S.A São Braz",               whats: "5541987743195" },
  { slug: "sao-francisco-do-sul",   cod: "SFS", nome: "S.A São Francisco do Sul",   whats: "5547988906469" },
  { slug: "sao-jose",               cod: "SJO", nome: "S.A São José",               whats: "5548988086457" },
  { slug: "sao-jose-dos-pinhais",   cod: "SJP", nome: "S.A São José dos Pinhais",   whats: "5541999220366" },
  { slug: "sitio-cercado",          cod: "SIC", nome: "S.A Sítio Cercado",          whats: "5541996249340" },
  { slug: "tubarao",                cod: "TUB", nome: "S.A Tubarão",                whats: "5548988664456" },
  { slug: "yakiniku-bauru",         cod: "YBA", nome: "S.A Yakiniku Bauru",         whats: "5514996783678" }
];


/* =============================================================
   O QUE A FRANQUEADORA ENTREGA POR R$ 20/MÊS NO BOLETO DE FUNDO.
   Aparece na tela final, para o franqueado.
   ============================================================= */

const COMBO_FRANQUEADO = [
  { icone: "🗓️", titulo: "Agendamento automático",  texto: "O sistema da franqueadora programa os stories da semana inteira. A loja não precisa lembrar de postar." },
  { icone: "🛵", titulo: "Link de pedidos",         texto: "Seu delivery no story, no horário em que o cliente tem fome." },
  { icone: "🎮", titulo: "Link do jogo",            texto: "Jogo da memória com o WhatsApp da SUA unidade." },
  { icone: "📅", titulo: "Link de reservas",        texto: "Mesa reservada sem ocupar o atendimento." },
  { icone: "💬", titulo: "Caixinha de perguntas",   texto: "Publicada e respondida pela franqueadora." }
];
