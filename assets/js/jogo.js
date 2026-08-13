/* =============================================================
   jogo.js — toda a lógica do Jogo da Memória Casa do Sushi.

   Nada de prêmio, tempo, número de WhatsApp ou nome de loja
   aparece escrito aqui: tudo vem do config.js.
   ============================================================= */

(function () {
  "use strict";

  /* =========================================================
     1. ATALHOS
     ========================================================= */

  const $  = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  /* =========================================================
     2. ESTADO SALVO NO APARELHO
     ========================================================= */

  const Estado = {
    ler: function () {
      try {
        return JSON.parse(localStorage.getItem(CONFIG.CHAVE_STORAGE) || "{}") || {};
      } catch (e) {
        return {};
      }
    },
    gravar: function (novo) {
      const atual = Estado.ler();
      const junto = Object.assign(atual, novo);
      try {
        localStorage.setItem(CONFIG.CHAVE_STORAGE, JSON.stringify(junto));
      } catch (e) {
        /* aba anônima: o jogo segue, só não lembra na próxima visita */
      }
      return junto;
    },
    limpar: function () {
      try { localStorage.removeItem(CONFIG.CHAVE_STORAGE); } catch (e) {}
    }
  };

  /* Virada de temporada: o aparelho fica COMO SE NUNCA TIVESSE JOGADO.
     Some o bloqueio de 24h, o nome, o cupom que já ganhou, a contagem de
     partidas e os eventos guardados. Roda uma única vez por aparelho, antes
     de qualquer outra coisa; depois grava a temporada nova e não mexe mais.
     A unidade é a única coisa que fica: ela diz onde a pessoa está, não o
     que ela jogou. */
  function aplicarTemporada() {
    const st = Estado.ler();
    const atual = CONFIG.TEMPORADA || 1;
    if (st.temporada === atual) return;

    Estado.limpar();
    Estado.gravar({ temporada: atual, loja: st.loja || "" });

    // zera também os acessos/partidas guardados neste aparelho
    // API é declarado com const em api.js, então NÃO existe em window:
    // testar window.API dá sempre falso e os eventos ficariam para trás.
    if (typeof API !== "undefined" && API.limparLocal) API.limparLocal();
  }

  aplicarTemporada();

  /* =========================================================
     3. FUNÇÕES DE APOIO
     ========================================================= */

  function embaralhar(lista) {
    // Fisher-Yates: cada partida tem uma disposição nova, sem exceção
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copia[i]; copia[i] = copia[j]; copia[j] = tmp;
    }
    return copia;
  }

  function formatarTempo(segundos) {
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function formatarRegressivo(ms) {
    if (ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const dois = function (n) { return (n < 10 ? "0" : "") + n; };
    return dois(h) + ":" + dois(m) + ":" + dois(s);
  }

  function formatarReais(valor) {
    return "R$ " + valor.toFixed(2).replace(".", ",");
  }

  function formatarData(ts) {
    const d = new Date(ts);
    const dois = function (n) { return (n < 10 ? "0" : "") + n; };
    return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0] || "";
  }

  // aviso curto no rodapé — o projeto não usa alert()
  let avisoTimer = null;
  function avisar(texto, ms) {
    const el = $("#aviso-flutuante");
    el.textContent = texto;
    el.classList.add("visivel");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.classList.remove("visivel"); }, ms || 2800);
  }

  /* =========================================================
     4. NAVEGAÇÃO ENTRE TELAS
     ========================================================= */

  let telaAtual = null;

  function irPara(id) {
    const destino = document.getElementById(id);
    if (!destino || destino === telaAtual) return;

    if (telaAtual) {
      telaAtual.classList.remove("ativa");
    }
    destino.classList.add("ativa");
    telaAtual = destino;
    window.scrollTo(0, 0);

    // o cronômetro regressivo só roda enquanto a tela de bloqueio está à vista
    if (id === "tela-bloqueado") ligarRegressivo();
    else desligarRegressivo();
  }

  /* =========================================================
     5. LOJA (unidade)
     Cada unidade tem seu link:  index.html?loja=camboriu
     ========================================================= */

  let loja = null;

  function acharLoja(slug) {
    if (!slug) return null;
    const alvo = String(slug).toLowerCase().trim();
    for (let i = 0; i < LOJAS.length; i++) {
      if (LOJAS[i].slug === alvo) return LOJAS[i];
    }
    return null;
  }

  // ?modo=franqueado mostra as duas perguntas do final; ?modo=cliente nunca
  // mostra. Sem o parâmetro, vale o que estiver no config.
  function modoDaURL() {
    const busca = new URLSearchParams(window.location.search);
    const modo = (busca.get("modo") || "").toLowerCase();
    if (modo === "franqueado" || modo === "franquia") return true;
    if (modo === "cliente" || modo === "publico") return false;
    return !!CONFIG.MODO_DEMO_FRANQUEADO;
  }

  const MODO_FRANQUEADO = modoDaURL();

  function lojaDaURL() {
    const busca = new URLSearchParams(window.location.search);
    return acharLoja(busca.get("loja") || busca.get("unidade"));
  }

  function montarListaLojas() {
    const caixa = $("#lista-lojas");
    const busca = $("#busca-loja");
    const botao = $("#btn-confirma-loja");
    let escolhida = null;

    function desenhar(filtro) {
      const termo = String(filtro || "").toLowerCase().trim();
      caixa.innerHTML = "";

      const visiveis = LOJAS.filter(function (l) {
        return !termo || l.nome.toLowerCase().indexOf(termo) > -1 || l.slug.indexOf(termo) > -1;
      });

      if (!visiveis.length) {
        const vazio = document.createElement("p");
        vazio.className = "lista-lojas__item";
        vazio.style.color = "#7A7A7A";
        vazio.textContent = "Nenhuma unidade encontrada.";
        caixa.appendChild(vazio);
        return;
      }

      visiveis.forEach(function (l) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "lista-lojas__item" + (escolhida && escolhida.slug === l.slug ? " selecionada" : "");
        item.textContent = l.nome;
        item.setAttribute("role", "option");
        item.addEventListener("click", function () {
          escolhida = l;
          botao.disabled = false;
          $$(".lista-lojas__item").forEach(function (x) { x.classList.remove("selecionada"); });
          item.classList.add("selecionada");
        });
        caixa.appendChild(item);
      });
    }

    busca.addEventListener("input", function () { desenhar(busca.value); });

    botao.addEventListener("click", function () {
      if (!escolhida) return;
      definirLoja(escolhida);
      Estado.gravar({ loja: escolhida.slug });
      API.evento("acesso", { loja: escolhida.slug });
      abrirInicio();
    });

    desenhar("");
  }

  function definirLoja(l) {
    loja = l;
    $("#rodape-loja").textContent = "Prêmio válido na unidade " + l.nome + ".";
    $("#franq-loja").textContent = l.nome;
  }

  /* =========================================================
     6. BLOQUEIO DE 24H
     ========================================================= */

  let regressivoTimer = null;

  function estaBloqueado() {
    const st = Estado.ler();
    return !!(st.bloqueadoAte && Date.now() < st.bloqueadoAte);
  }

  // Dois motivos levam ao bloqueio de 24h e cada um vai para uma tela:
  //   "erro"   -> errou 3 vezes seguidas -> tela de tentativas esgotadas
  //   "premio" -> ganhou -> volta para o próprio cupom, com o regressivo
  function estaBloqueadoPorErro() {
    return estaBloqueado() && Estado.ler().bloqueioMotivo !== "premio";
  }

  // manda para a tela certa de quem está bloqueado; devolve true se desviou
  function desviarSeBloqueado() {
    if (!estaBloqueado()) return false;
    if (Estado.ler().bloqueioMotivo === "premio" && retomarPremio()) return true;
    irPara("tela-bloqueado");
    return true;
  }

  function bloquear() {
    const ate = Date.now() + CONFIG.BLOQUEIO_HORAS * 3600 * 1000;
    Estado.gravar({ bloqueadoAte: ate, bloqueioMotivo: "erro" });
    API.evento("bloqueio", { loja: loja ? loja.slug : "", nome: Estado.ler().nome || "" });
    irPara("tela-bloqueado");
  }

  function ligarRegressivo() {
    desligarRegressivo();
    const alvo = $("#regressivo");

    function passo() {
      const st = Estado.ler();
      const falta = (st.bloqueadoAte || 0) - Date.now();
      if (falta <= 0) {
        desligarRegressivo();
        Estado.gravar({ bloqueadoAte: null });
        alvo.textContent = "00:00:00";
        avisar("Liberado! Você já pode jogar de novo.");
        abrirInicio();
        return;
      }
      alvo.textContent = formatarRegressivo(falta);
    }

    passo();
    regressivoTimer = setInterval(passo, 1000);
  }

  function desligarRegressivo() {
    if (regressivoTimer) { clearInterval(regressivoTimer); regressivoTimer = null; }
  }

  // cartas espalhadas ao fundo da tela de bloqueio, como no layout
  function espalharCartasDeFundo() {
    const caixa = $("#cartas-fundo");
    if (!caixa || caixa.children.length) return;
    const posicoes = [
      { t: "6%",  l: "-8%",  r: -18 }, { t: "12%", l: "78%", r: 14 },
      { t: "34%", l: "-12%", r: 10 },  { t: "30%", l: "82%", r: -12 },
      { t: "58%", l: "-6%",  r: 16 },  { t: "62%", l: "80%", r: -8 },
      { t: "82%", l: "4%",   r: -14 }, { t: "86%", l: "72%", r: 12 }
    ];
    posicoes.forEach(function (p, i) {
      const img = document.createElement("img");
      img.src = VERSOS[i % VERSOS.length];
      img.alt = "";
      img.style.top = p.t;
      img.style.left = p.l;
      img.style.setProperty("--r", p.r + "deg");
      img.style.animationDelay = (i * 0.45) + "s";
      caixa.appendChild(img);
    });
  }

  /* =========================================================
     7. O JOGO
     ========================================================= */

  const Jogo = {
    cartas: [],
    viradas: [],
    paresFeitos: 0,
    errosSeguidos: 0,
    inicioEm: 0,
    verso: null,
    cronoTimer: null,
    travado: true,
    emAndamento: false
  };

  function sortearVerso() {
    return VERSOS[Math.floor(Math.random() * VERSOS.length)];
  }

  function sortearProdutos() {
    // sorteia 6 dos 16 produtos: o cliente nunca decora o conjunto
    return embaralhar(PRODUTOS).slice(0, CONFIG.PARES);
  }

  function precarregar(enderecos, aoTerminar) {
    // nenhuma carta pode aparecer em branco no meio da partida
    let faltam = enderecos.length;
    let jaChamou = false;

    function pronto() {
      if (jaChamou) return;
      jaChamou = true;
      aoTerminar();
    }

    if (!faltam) { pronto(); return; }

    enderecos.forEach(function (endereco) {
      const img = new Image();
      img.onload = img.onerror = function () {
        faltam--;
        if (faltam <= 0) pronto();
      };
      img.src = endereco;
    });

    // internet ruim não pode prender o cliente na tela anterior
    setTimeout(pronto, 6000);
  }

  function montarTabuleiro(produtos) {
    const tabuleiro = $("#tabuleiro");
    tabuleiro.innerHTML = "";
    tabuleiro.classList.add("travado");

    const baralho = embaralhar(produtos.concat(produtos));

    Jogo.cartas = baralho.map(function (produto, indice) {
      const carta = document.createElement("button");
      carta.type = "button";
      carta.className = "carta";
      carta.style.setProperty("--i", indice);
      carta.dataset.slug = produto.slug;
      carta.setAttribute("aria-label", "Carta " + (indice + 1) + ", virada para baixo");

      const verso = document.createElement("span");
      verso.className = "carta__face carta__verso";
      const versoImg = document.createElement("img");
      // um verso por partida, ou um por carta se o config pedir "misto"
      versoImg.src = Jogo.verso || sortearVerso();
      versoImg.alt = "";
      verso.appendChild(versoImg);

      const frente = document.createElement("span");
      frente.className = "carta__face carta__frente";
      const foto = document.createElement("img");
      foto.src = "assets/img/produtos/" + produto.slug + ".jpg";
      foto.alt = produto.nome;
      const nome = document.createElement("span");
      nome.className = "carta__nome";
      nome.textContent = produto.nome;
      frente.appendChild(foto);
      frente.appendChild(nome);

      carta.appendChild(verso);
      carta.appendChild(frente);
      carta.addEventListener("click", function () { clicarCarta(carta, produto); });

      tabuleiro.appendChild(carta);
      return carta;
    });
  }

  function iniciarPartida() {
    if (desviarSeBloqueado()) return;

    const produtos = sortearProdutos();
    Jogo.verso = CONFIG.VERSO_MODO === "misto" ? null : sortearVerso();

    const aBaixar = produtos.map(function (p) {
      return "assets/img/produtos/" + p.slug + ".jpg";
    }).concat(Jogo.verso ? [Jogo.verso] : VERSOS);

    const botao = $("#btn-comecar");
    botao.disabled = true;

    // só avisa se a conexão estiver lenta; no 4G normal nem chega a aparecer
    const avisoLento = setTimeout(function () { avisar("Preparando as cartas..."); }, 600);

    precarregar(aBaixar, function () {
      clearTimeout(avisoLento);
      botao.disabled = false;

      Jogo.viradas = [];
      Jogo.paresFeitos = 0;
      Jogo.errosSeguidos = 0;
      Jogo.travado = true;
      Jogo.emAndamento = true;

      pintarErros();
      $("#crono-valor").textContent = "00:00";
      $("#crono").classList.remove("correndo", "urgente");

      montarTabuleiro(produtos);
      irPara("tela-jogo");

      API.evento("inicio", { loja: loja ? loja.slug : "", nome: Estado.ler().nome || "" });

      // o cronômetro começa quando a última carta terminou de entrar e a
      // espiada acabou — ninguém perde tempo por causa da animação
      const espera = Jogo.cartas.length * 34 + 340;
      setTimeout(function () {
        if (!Jogo.emAndamento) return;
        espiar(function () {
          $("#tabuleiro").classList.remove("travado");
          Jogo.travado = false;
          ligarCronometro();
        });
      }, espera);
    });
  }

  /* Espiada de abertura.
     As 12 cartas abrem juntas, ficam CONFIG.PREVIA_MS à mostra e fecham.
     Tudo acontece com o tabuleiro travado e ANTES do cronômetro ligar:
     a espiada não conta tempo e é igual para todo mundo. */
  function espiar(aoTerminar) {
    const ms = CONFIG.PREVIA_MS || 0;
    if (ms <= 0) { aoTerminar(); return; }

    const VIRADA = 300;   // a transição da carta no CSS é de .28s

    Jogo.cartas.forEach(function (carta) { carta.classList.add("previa"); });
    avisar("Memorize as cartas!", ms + VIRADA);

    setTimeout(function () {
      Jogo.cartas.forEach(function (carta) { carta.classList.remove("previa"); });

      // só libera o toque depois que a última carta terminou de fechar,
      // senão dá para clicar numa carta ainda aberta e ver o par de graça
      setTimeout(function () {
        if (!Jogo.emAndamento) return;
        aoTerminar();
      }, VIRADA);
    }, ms + VIRADA);
  }

  function ligarCronometro() {
    Jogo.inicioEm = Date.now();
    $("#crono").classList.add("correndo");

    Jogo.cronoTimer = setInterval(function () {
      const seg = (Date.now() - Jogo.inicioEm) / 1000;
      $("#crono-valor").textContent = formatarTempo(seg);

      // fica vermelho nos 5 segundos finais antes de cair de faixa
      const faixa = premioPorTempo(seg);
      const limite = faixa.ateSegundos;
      const perto = limite < 999 && (limite - seg) <= 5;
      $("#crono").classList.toggle("urgente", perto);
    }, 200);
  }

  function desligarCronometro() {
    if (Jogo.cronoTimer) { clearInterval(Jogo.cronoTimer); Jogo.cronoTimer = null; }
    $("#crono").classList.remove("correndo", "urgente");
  }

  function clicarCarta(carta, produto) {
    if (Jogo.travado) return;
    if (carta.classList.contains("virada")) return;
    if (carta.dataset.resolvida === "1") return;

    carta.classList.add("virada");
    carta.setAttribute("aria-label", produto.nome + ", virada para cima");
    Jogo.viradas.push({ el: carta, produto: produto });

    if (Jogo.viradas.length === 2) {
      Jogo.travado = true;                       // trava aqui: sem isso o
      $("#tabuleiro").classList.add("travado");  // cliente vira 4 de uma vez
      comparar();
    }
  }

  function comparar() {
    const a = Jogo.viradas[0];
    const b = Jogo.viradas[1];
    const acertou = a.produto.slug === b.produto.slug;

    if (acertou) {
      a.el.classList.add("certa");
      b.el.classList.add("certa");
      a.el.dataset.resolvida = "1";
      b.el.dataset.resolvida = "1";

      Jogo.paresFeitos++;
      Jogo.errosSeguidos = 0;   // erro é CONSECUTIVO: acertar zera a conta
      pintarErros();

      setTimeout(function () {
        a.el.classList.remove("certa");
        b.el.classList.remove("certa");
        a.el.classList.add("resolvida");
        b.el.classList.add("resolvida");
        Jogo.viradas = [];

        if (Jogo.paresFeitos === CONFIG.PARES) {
          vencer();
        } else {
          Jogo.travado = false;
          $("#tabuleiro").classList.remove("travado");
        }
      }, 420);

      return;
    }

    // errou
    Jogo.errosSeguidos++;
    pintarErros();
    piscarErro();
    a.el.classList.add("errada");
    b.el.classList.add("errada");

    const estourou = Jogo.errosSeguidos >= CONFIG.ERROS_PERMITIDOS;

    setTimeout(function () {
      a.el.classList.remove("errada", "virada");
      b.el.classList.remove("errada", "virada");
      a.el.setAttribute("aria-label", "Carta virada para baixo");
      b.el.setAttribute("aria-label", "Carta virada para baixo");
      Jogo.viradas = [];

      if (estourou) {
        encerrarPartida();
        setTimeout(bloquear, 350);
      } else {
        Jogo.travado = false;
        $("#tabuleiro").classList.remove("travado");
      }
    }, CONFIG.TEMPO_VIRAR_MS);
  }

  function pintarErros() {
    $$("#erros .erro-bola").forEach(function (bola, i) {
      bola.classList.toggle("aceso", i < Jogo.errosSeguidos);
    });
  }

  function piscarErro() {
    const flash = document.createElement("div");
    flash.className = "flash-erro";
    document.body.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 460);
  }

  function encerrarPartida() {
    Jogo.emAndamento = false;
    Jogo.travado = true;
    $("#tabuleiro").classList.add("travado");
    desligarCronometro();
  }

  /* =========================================================
     8. PRÊMIO E CUPOM
     ========================================================= */

  function premioPorTempo(segundos) {
    // PREMIOS está ordenado do mais rápido para o mais lento
    for (let i = 0; i < PREMIOS.length; i++) {
      if (segundos <= PREMIOS[i].ateSegundos) return PREMIOS[i];
    }
    return PREMIOS[PREMIOS.length - 1];
  }

  function gerarCupom(premio) {
    // Código fixo por prêmio (10OFFJOGO, 10HOTJOGO...), definido no config.
    // Não é sorteado: o atendente decora os cinco e confere de bate-pronto.
    // Como o código se repete, quem valida é a pessoa no WhatsApp — ela vê o
    // nome, o tempo e a unidade na mensagem antes de aplicar.
    return premio.cupom;
  }

  function vencer() {
    const segundos = (Date.now() - Jogo.inicioEm) / 1000;
    encerrarPartida();

    const premio = premioPorTempo(segundos);
    const cupom = gerarCupom(premio);
    const agora = Date.now();
    const validade = agora + CONFIG.VALIDADE_DIAS * 24 * 3600 * 1000;
    const st = Estado.ler();

    const gravar = {
      ultimoPremio: premio.nome,
      ultimoNivel: premio.nivel,
      ultimoTempo: segundos,
      premioEm: agora,
      cupom: cupom,
      partidas: (st.partidas || 0) + 1
    };

    // ganhou também espera 24h: um cupom por cliente por dia
    if (CONFIG.BLOQUEIO_APOS_GANHAR) {
      gravar.bloqueadoAte = agora + CONFIG.BLOQUEIO_HORAS * 3600 * 1000;
      gravar.bloqueioMotivo = "premio";
    }

    Estado.gravar(gravar);

    API.evento("conclusao", {
      loja: loja ? loja.slug : "",
      nome: st.nome || "",
      tempo: Math.round(segundos),
      nivel: premio.nivel,
      premio: premio.nome,
      cupom: cupom
    });

    mostrarPremio(premio, segundos, cupom, validade);
  }

  // Recupera o cupom de quem já ganhou hoje e volta ao link dentro das 24h.
  // Devolve false se não houver prêmio guardado (aí quem chama manda para a
  // tela de tentativas esgotadas).
  function retomarPremio() {
    const st = Estado.ler();
    if (!st.cupom || !st.premioEm) return false;

    let premio = null;
    for (let i = 0; i < PREMIOS.length; i++) {
      if (PREMIOS[i].nivel === st.ultimoNivel || PREMIOS[i].nome === st.ultimoPremio) {
        premio = PREMIOS[i];
        break;
      }
    }
    if (!premio) return false;

    const validade = st.premioEm + CONFIG.VALIDADE_DIAS * 24 * 3600 * 1000;
    if (Date.now() > validade) return false;   // cupom vencido: não adianta remostrar

    mostrarPremio(premio, st.ultimoTempo || 0, st.cupom, validade, true);
    return true;
  }

  function mostrarPremio(premio, segundos, cupom, validade, jaEra) {
    const st = Estado.ler();
    const nome = primeiroNome(st.nome);
    const tempoTexto = formatarTempo(segundos);

    $("#premio-saudacao").innerHTML = nome
      ? ("PARABÉNS,<br /><span class=\"vm\">" + nome.toUpperCase() + "!</span>")
      : "PARABÉNS!";

    $("#premio-tempo").innerHTML = jaEra
      ? "Você já jogou hoje e este continua sendo o seu cupom:"
      : "Você completou em <strong>" + tempoTexto + "</strong> e desbloqueou:";

    $("#premio-selo").textContent = premio.selo;
    $("#premio-nome").textContent = premio.nome.toUpperCase();
    $("#premio-nivel").textContent = "Nível " + premio.nivel + " de " + PREMIOS.length;

    $$("#medidor .medidor__passo").forEach(function (passo, i) {
      // preenche com um pequeno atraso, para o medidor "subir" na tela
      setTimeout(function () { passo.classList.toggle("ativo", i < premio.nivel); }, 180 + i * 110);
    });

    $("#cupom-codigo").textContent = cupom;
    $("#cupom-minimo").textContent = formatarReais(premio.minimo);
    $("#cupom-validade").textContent = formatarData(validade);
    $("#cupom-loja").textContent = loja ? loja.nome : "—";

    $("#btn-whats").href = montarLinkWhats(premio, tempoTexto, cupom, validade);

    $("#btn-ir-franqueado").classList.toggle("oculto", !MODO_FRANQUEADO);

    ligarEsperaDoPremio();

    irPara("tela-premio");
    if (!jaEra) soltarConfete();   // confete é da vitória, não da revisita
  }

  /* Regressivo dentro da tela do prêmio. Aparece só quando o cliente está
     em espera; quando zera, some sozinho e libera a próxima partida. */
  let esperaTimer = null;

  function ligarEsperaDoPremio() {
    if (esperaTimer) { clearInterval(esperaTimer); esperaTimer = null; }

    const caixa = $("#premio-espera");
    const alvo = $("#premio-regressivo");

    function passo() {
      const falta = (Estado.ler().bloqueadoAte || 0) - Date.now();
      if (falta <= 0) {
        clearInterval(esperaTimer);
        esperaTimer = null;
        caixa.classList.add("oculto");
        if (Estado.ler().bloqueioMotivo === "premio") {
          Estado.gravar({ bloqueadoAte: null, bloqueioMotivo: null });
          avisar("Liberado! Você já pode jogar de novo.");
        }
        return;
      }
      alvo.textContent = formatarRegressivo(falta);
    }

    if (!estaBloqueado() || Estado.ler().bloqueioMotivo !== "premio") {
      caixa.classList.add("oculto");
      return;
    }

    caixa.classList.remove("oculto");
    passo();
    esperaTimer = setInterval(passo, 1000);
  }

  /* ---------- a mensagem que o cliente manda para a loja ---------- */

  function montarLinkWhats(premio, tempoTexto, cupom, validade) {
    const st = Estado.ler();
    const nome = String(st.nome || "").trim() || "um cliente";
    const numero = loja ? loja.whats : "";

    const linhas = [
      "🍣 *CUPOM CASA DO SUSHI* 🍣",
      "",
      "Oi! Aqui é o(a) *" + nome + "* 👋",
      "Joguei o *Jogo da Memória* da Casa do Sushi e desbloqueei um prêmio!",
      "",
      "⏱️ Meu tempo: *" + tempoTexto + "*",
      "🏆 Nível: *" + premio.nivel + " de " + PREMIOS.length + "*",
      "🎁 Prêmio: *" + premio.nome + "*",
      "",
      "🎟️ *CUPOM: " + cupom + "*",
      "💰 Pedido mínimo: *" + formatarReais(premio.minimo) + "*",
      "📅 Válido até: *" + formatarData(validade) + "*",
      "📍 Unidade: *" + (loja ? loja.nome : "—") + "*",
      "",
      "Quero resgatar meu prêmio e fazer meu pedido! 🥢"
    ];

    // encodeURIComponent é obrigatório: sem ele qualquer acento
    // ou emoji quebra a mensagem no meio
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(linhas.join("\n"));
  }

  function soltarConfete() {
    const pecas = ["🍣", "🍤", "🥢", "🍥", "🍱"];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("span");
      p.className = "confete";
      p.textContent = pecas[i % pecas.length];
      p.style.left = (Math.random() * 96) + "vw";
      p.style.animationDuration = (2.4 + Math.random() * 1.8) + "s";
      p.style.animationDelay = (Math.random() * 0.7) + "s";
      p.style.fontSize = (16 + Math.random() * 16) + "px";
      document.body.appendChild(p);
      setTimeout(function () { p.remove(); }, 5200);
    }
  }

  /* =========================================================
     9. TELA DO FRANQUEADO
     ========================================================= */

  function montarCombo() {
    const caixa = $("#lista-combo");
    if (!caixa || caixa.children.length) return;

    COMBO_FRANQUEADO.forEach(function (item) {
      const linha = document.createElement("div");
      linha.className = "combo";

      const icone = document.createElement("div");
      icone.className = "combo__icone";
      icone.textContent = item.icone;

      const texto = document.createElement("div");
      texto.className = "combo__texto";
      const h = document.createElement("h3");
      h.textContent = item.titulo;
      const p = document.createElement("p");
      p.textContent = item.texto;
      texto.appendChild(h);
      texto.appendChild(p);

      linha.appendChild(icone);
      linha.appendChild(texto);
      caixa.appendChild(linha);
    });

    $("#valor-combo").textContent = CONFIG.VALOR_COMBO;
  }

  /* As duas perguntas do final.
     P1 — a unidade quer o jogo?
     P2 — a franqueadora agenda os links nos stories da unidade por R$ 20,00?
     As duas são feitas sempre, mesmo quem diz não na primeira: a publicação
     dos links de pedido, reserva e caixinha vale por si só. O painel da
     franqueadora mostra as duas colunas lado a lado. */

  function responderPergunta1(resposta) {
    Estado.gravar({ respostaFranqueado: resposta, respostaEm: Date.now() });

    const nao = resposta === "nao";
    $("#franq2-chamada").innerHTML = nao
      ? ("Mesmo sem o jogo: o sistema agenda os stories de " +
         "<strong>pedidos, reservas e caixinha de perguntas</strong> " +
         "da sua unidade, no dia e na hora certa.")
      : ("A franqueadora tem um <strong>sistema que agenda o link nos " +
         "stories da sua unidade</strong> — no dia e na hora certa, sem " +
         "ninguém precisar lembrar de postar.");

    montarCombo();
    irPara("tela-franqueado-2");
  }

  function responderPergunta2(resposta2) {
    const resposta = Estado.ler().respostaFranqueado || "nao";
    Estado.gravar({ respostaCombo: resposta2, respostaEm: Date.now() });

    API.evento("resposta", {
      loja: loja ? loja.slug : "",
      resposta: resposta,      // P1 — quer o jogo
      resposta2: resposta2,    // P2 — quer a publicação por R$ 20,00
      nome: Estado.ler().nome || ""
    });

    const jogo = resposta === "sim";
    const publica = resposta2 === "sim";
    const nomeLoja = loja ? loja.nome : "";

    let icone, titulo, texto;

    if (jogo && publica) {
      icone = "🎉";
      titulo = "PERFEITO!<br /><span class=\"vm\">JÁ ANOTAMOS.</span>";
      texto = "A franqueadora prepara o jogo da unidade <strong>" + nomeLoja + "</strong> e " +
              "coloca a loja no <strong>sistema de agendamento de stories</strong>.<br />" +
              "Os R$ " + CONFIG.VALOR_COMBO + ",00 do agendamento entram no próximo boleto de fundo.";
    } else if (jogo && !publica) {
      icone = "🎮";
      titulo = "FECHADO!<br /><span class=\"vm\">JOGO LIBERADO.</span>";
      texto = "O jogo da unidade <strong>" + nomeLoja + "</strong> vai ser preparado com o " +
              "WhatsApp da sua loja.<br />" +
              "Sem o sistema de agendamento, quem posta nos stories é a própria loja — " +
              "e <strong>nada é lançado no boleto</strong>.";
    } else if (!jogo && publica) {
      icone = "📣";
      titulo = "COMBINADO!<br /><span class=\"vm\">A GENTE AGENDA.</span>";
      texto = "Sem o jogo, então. O <strong>sistema de agendamento</strong> assume os stories de " +
              "pedidos, reservas e caixinha de perguntas da unidade <strong>" + nomeLoja + "</strong>.<br />" +
              "Os R$ " + CONFIG.VALOR_COMBO + ",00 do agendamento entram no próximo boleto de fundo.";
    } else {
      icone = "👍";
      titulo = "TUDO BEM!<br /><span class=\"vm\">FICA O CONVITE.</span>";
      texto = "Suas duas respostas foram registradas e a unidade <strong>" + nomeLoja +
              "</strong> continua com tudo como está.<br />" +
              "Se mudar de ideia, é só avisar a franqueadora.";
    }

    $("#obrigado-icone").textContent = icone;
    $("#obrigado-titulo").innerHTML = titulo;
    $("#obrigado-texto").innerHTML = texto;

    // o botão só aparece se o WhatsApp da franqueadora estiver no config
    const botaoFranq = $("#btn-falar-franqueadora");
    if (CONFIG.WHATS_FRANQUEADORA) {
      const msg = "Oi! Sou da unidade " + nomeLoja + ". Respondi o Jogo da Memória: " +
                  "jogo na minha loja = " + (jogo ? "SIM" : "não") + ", " +
                  "sistema de agendamento de stories = " + (publica ? "SIM" : "não") + ".";
      botaoFranq.href = "https://wa.me/" + CONFIG.WHATS_FRANQUEADORA + "?text=" + encodeURIComponent(msg);
      botaoFranq.classList.remove("oculto");
    } else {
      botaoFranq.classList.add("oculto");
    }

    irPara("tela-obrigado");
  }

  /* =========================================================
     10. ABERTURA
     ========================================================= */

  function abrirInicio() {
    if (desviarSeBloqueado()) return;

    const st = Estado.ler();

    if (!loja) { irPara("tela-loja"); return; }

    if (st.nome) {
      // já jogou antes: pula a captura do nome
      $("#campo-nome").value = st.nome;
      irPara("tela-regras");
      avisar("Que bom te ver de novo, " + primeiroNome(st.nome) + "!");
    } else {
      irPara("tela-nome");
    }
  }

  function confirmarNome() {
    const campo = $("#campo-nome");
    const valor = campo.value.trim();

    if (valor.length < 2) {
      campo.classList.add("erro");
      campo.focus();
      avisar("Escreva seu nome para continuar.");
      setTimeout(function () { campo.classList.remove("erro"); }, 600);
      return;
    }

    Estado.gravar({ nome: valor });
    irPara("tela-regras");
  }

  /* =========================================================
     11. LIGAÇÕES DA INTERFACE
     ========================================================= */

  function ligarBotoes() {
    $("#btn-jogar").addEventListener("click", confirmarNome);

    $("#campo-nome").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); confirmarNome(); }
    });

    $("#btn-comecar").addEventListener("click", iniciarPartida);

    $("#btn-voltar-inicio").addEventListener("click", function () {
      if (estaBloqueado()) {
        avisar("Ainda falta um pouco. Volte quando o contador zerar.");
        return;
      }
      abrirInicio();
    });

    $("#btn-copiar").addEventListener("click", function () {
      const codigo = $("#cupom-codigo").textContent;
      copiar(codigo, "Cupom copiado!");
    });

    $("#btn-whats").addEventListener("click", function () {
      API.evento("resgate", {
        loja: loja ? loja.slug : "",
        nome: Estado.ler().nome || "",
        cupom: $("#cupom-codigo").textContent
      });
    });

    $("#btn-ir-franqueado").addEventListener("click", function () {
      irPara("tela-franqueado");
    });

    $("#btn-quero").addEventListener("click", function () { responderPergunta1("sim"); });
    $("#btn-nao-quero").addEventListener("click", function () { responderPergunta1("nao"); });
    $("#btn-quero-combo").addEventListener("click", function () { responderPergunta2("sim"); });
    $("#btn-nao-combo").addEventListener("click", function () { responderPergunta2("nao"); });

    $("#btn-jogar-de-novo").addEventListener("click", function () {
      if (estaBloqueado()) {
        avisar("Você já jogou hoje. Volte amanhã para uma nova tentativa.");
        desviarSeBloqueado();
        return;
      }
      irPara("tela-regras");
    });
  }

  function copiar(texto, aviso) {
    function fallback() {
      const area = document.createElement("textarea");
      area.value = texto;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch (e) {}
      area.remove();
      avisar(aviso);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () { avisar(aviso); }, fallback);
    } else {
      fallback();
    }
  }

  /* =========================================================
     12. PARTIDA
     ========================================================= */

  function comecar() {
    ligarBotoes();
    espalharCartasDeFundo();

    const st = Estado.ler();

    // 1º) o link da unidade manda; 2º) a unidade salva na visita anterior
    const daURL = lojaDaURL();
    const salva = acharLoja(st.loja);

    if (daURL) {
      definirLoja(daURL);
      if (st.loja !== daURL.slug) Estado.gravar({ loja: daURL.slug });
      API.evento("acesso", { loja: daURL.slug });
    } else if (salva) {
      definirLoja(salva);
      API.evento("acesso", { loja: salva.slug });
    } else {
      montarListaLojas();
    }

    // o bloqueio vale em qualquer tela, inclusive se o cliente
    // abrir o link direto da unidade
    if (desviarSeBloqueado()) return;

    abrirInicio();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", comecar);
  } else {
    comecar();
  }
})();
