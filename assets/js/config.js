/* =============================================================
   CASA DO SUSHI - JOGO DA MEMÓRIA
   config.js — TUDO que se edita no dia a dia está aqui.
   Nenhum prêmio, tempo, número ou texto deve ser escrito fora deste arquivo.
   ============================================================= */

const CONFIG = {

  /* ---------- MODO DE OPERAÇÃO ---------- */

  // true  = depois do prêmio aparece a tela de oferta ao FRANQUEADO
  //         (versão que a franqueadora manda para as 42 unidades avaliarem)
  // false = versão do cliente final; termina no prêmio.
  MODO_DEMO_FRANQUEADO: true,

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
  ERROS_PERMITIDOS: 3,      // erros CONSECUTIVOS; acertar um par zera a contagem
  TEMPO_VIRAR_MS: 850,      // quanto tempo o par errado fica visível antes de desvirar
  BLOQUEIO_HORAS: 24,       // punição por errar 3x seguidas
  VALIDADE_DIAS: 30,        // validade do cupom

  /* ---------- IDENTIDADE ---------- */

  CHAVE_STORAGE: "casadosushi_jogo",

  /* ---------- OFERTA AO FRANQUEADO ---------- */

  VALOR_COMBO: 20,          // R$ por mês no boleto de fundo

  // WhatsApp do time da franqueadora que recebe o "sim" do franqueado.
  // Só números, sem + e sem espaços. Vazio = o botão "Falar com a
  // franqueadora" não aparece (a resposta ainda cai no painel).
  WHATS_FRANQUEADORA: ""
};


/* =============================================================
   PRÊMIOS
   Ordem: do melhor (mais rápido) para o mais simples.
   "ateSegundos" = completou em até X segundos, ganha este prêmio.
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
  { nivel: 5, ateSegundos:  30, nome: "1 Temaki Hot",    tipo: "produto",  minimo: 110, custo: 10.00, cupom: "TEMAKIJOGO", selo: "PRÊMIO MÁXIMO"  },
  { nivel: 4, ateSegundos:  45, nome: "10 Hot Cortesia", tipo: "produto",  minimo:  95, custo: 10.00, cupom: "10HOTJOGO",  selo: "PRÊMIO RARO"    },
  { nivel: 3, ateSegundos:  60, nome: "15% de desconto", tipo: "desconto", minimo:  80, custo: 12.00, cupom: "15OFFJOGO",  selo: "MUITO BOM"      },
  { nivel: 2, ateSegundos:  90, nome: "10% de desconto", tipo: "desconto", minimo:  65, custo:  6.50, cupom: "10OFFJOGO",  selo: "BOA!"           },
  { nivel: 1, ateSegundos: 999, nome: "5% de desconto",  tipo: "desconto", minimo:  50, custo:  2.50, cupom: "5OFFJOGO",   selo: "VOCÊ CONSEGUIU" }
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
  { icone: "🛵", titulo: "Link de pedidos",       texto: "Seu delivery no topo da bio, sempre a um toque." },
  { icone: "🎮", titulo: "Link do jogo",          texto: "Jogo da memória com o WhatsApp da SUA unidade." },
  { icone: "📅", titulo: "Link de reservas",      texto: "Mesa reservada sem ocupar o atendimento." },
  { icone: "💬", titulo: "Caixinha de perguntas", texto: "Post publicado e gerenciado pela franqueadora." }
];
