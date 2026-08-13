/* =============================================================
   api.js — camada de dados.

   Dois modos, decididos por CONFIG.ENDPOINT:

   1) ENDPOINT vazio  → MODO DEMONSTRAÇÃO.
      Tudo fica no localStorage do navegador. O jogo funciona
      inteiro e o painel mostra os dados daquele aparelho.
      Serve para testar e para apresentar na reunião.

   2) ENDPOINT preenchido → MODO REAL.
      Cada evento também é enviado para a planilha do Google
      (ver /backend/apps-script.gs) e o painel passa a ler de lá,
      juntando as 42 lojas.

   A comunicação usa JSONP (uma tag <script>) de propósito:
   é o único jeito de falar com o Apps Script sem servidor
   próprio, sem CORS e sem build. Nada de npm aqui.
   ============================================================= */

const API = (function () {

  const CHAVE_EVENTOS = "casadosushi_eventos";

  /* ---------- utilitários ---------- */

  function agora() { return Date.now(); }

  // Identificador do evento. Serve para a planilha não contar duas vezes o
  // mesmo cupom quando um reenvio dá certo depois de um envio que já tinha
  // chegado — só o carimbo de tempo não basta, dois cliques no mesmo
  // milissegundo existem.
  let sequencia = 0;
  function novoId() {
    sequencia++;
    return Date.now().toString(36) + "-" + sequencia + "-" +
           Math.random().toString(36).slice(2, 7);
  }

  function lerLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_EVENTOS) || "[]");
    } catch (e) {
      return [];
    }
  }

  function gravarLocal(lista) {
    try {
      // não deixa crescer sem limite no aparelho do cliente
      if (lista.length > 800) lista = lista.slice(-800);
      localStorage.setItem(CHAVE_EVENTOS, JSON.stringify(lista));
    } catch (e) {
      /* modo anônimo ou storage cheio: o jogo continua funcionando */
    }
  }

  function montarQuery(obj) {
    return Object.keys(obj)
      .filter(function (k) { return obj[k] !== undefined && obj[k] !== null; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]); })
      .join("&");
  }

  /* ---------- JSONP ---------- */

  function jsonp(params, aoTerminar) {
    if (!CONFIG.ENDPOINT) {
      if (aoTerminar) aoTerminar(new Error("sem endpoint"), null);
      return;
    }

    const nomeCb = "csCb" + Math.random().toString(36).slice(2, 10);
    const script = document.createElement("script");
    let encerrado = false;

    function limpar() {
      encerrado = true;
      try { delete window[nomeCb]; } catch (e) { window[nomeCb] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[nomeCb] = function (dados) {
      if (encerrado) return;
      limpar();
      if (aoTerminar) aoTerminar(null, dados);
    };

    script.onerror = function () {
      if (encerrado) return;
      limpar();
      if (aoTerminar) aoTerminar(new Error("falha de rede"), null);
    };

    // rede ruim não pode travar a tela: 12s e desiste
    setTimeout(function () {
      if (encerrado) return;
      limpar();
      if (aoTerminar) aoTerminar(new Error("tempo esgotado"), null);
    }, 12000);

    params.callback = nomeCb;
    script.src = CONFIG.ENDPOINT +
      (CONFIG.ENDPOINT.indexOf("?") > -1 ? "&" : "?") + montarQuery(params);
    document.head.appendChild(script);
  }

  /* ---------- gravação de evento ----------
     tipo: acesso | inicio | conclusao | bloqueio | resgate | resposta   */

  function evento(tipo, dados) {
    const registro = Object.assign({ id: novoId(), tipo: tipo, em: agora() }, dados || {});

    // sempre grava no aparelho — é o que faz o painel funcionar sem backend
    const lista = lerLocal();
    registro.enviado = false;
    lista.push(registro);
    gravarLocal(lista);

    // e dispara para a planilha, se houver endpoint. Não espera resposta.
    enviar(registro);

    return registro;
  }

  /* Um envio só. Se der certo, marca o evento como enviado no aparelho.

     Isso importa de verdade no clique do WhatsApp: ali o cliente sai da
     página para o aplicativo, e num 4G ruim o pedido morre no meio. Sem a
     marca, esse cupom sumia da conta para sempre. Com ela, o evento fica
     pendente e sobe sozinho na próxima vez que a pessoa abrir o link. */
  function enviar(registro) {
    if (!CONFIG.ENDPOINT || registro.enviado) return;

    const pacote = { acao: "registrar" };
    Object.keys(registro).forEach(function (k) {
      if (k !== "enviado") pacote[k] = registro[k];
    });

    jsonp(pacote, function (erro) {
      if (erro) return;   // fica pendente para a próxima visita
      const lista = lerLocal();
      for (let i = lista.length - 1; i >= 0; i--) {
        if (lista[i].id === registro.id) { lista[i].enviado = true; break; }
      }
      gravarLocal(lista);
    });
  }

  /* Sobe o que ficou para trás. Roda na abertura de qualquer tela, no
     máximo 20 por vez para não atropelar a rede do cliente. */
  function sincronizar() {
    if (!CONFIG.ENDPOINT) return 0;
    const pendentes = lerLocal().filter(function (e) { return e.enviado === false; });
    pendentes.slice(0, 20).forEach(function (e, i) {
      setTimeout(function () { enviar(e); }, i * 250);
    });
    return pendentes.length;
  }

  function pendentes() {
    return lerLocal().filter(function (e) { return e.enviado === false; }).length;
  }

  /* ---------- leitura consolidada (usada pelo painel) ---------- */

  function agregarLocal() {
    const eventos = lerLocal();
    const porLoja = {};

    eventos.forEach(function (ev) {
      const slug = ev.loja || "(sem-loja)";
      if (!porLoja[slug]) {
        porLoja[slug] = {
          loja: slug, acessos: 0, inicios: 0, conclusoes: 0,
          bloqueios: 0, resgates: 0,
          resposta: "",    // P1 — a unidade quer o jogo
          resposta2: "",   // P2 — o agendamento de stories por R$ 20,00
          respostaOrigem: "",   // "painel" = marcada pela franqueadora
          respostaEm: 0, ultimoEm: 0
        };
      }
      const l = porLoja[slug];
      if (ev.tipo === "acesso")    l.acessos++;
      if (ev.tipo === "inicio")    l.inicios++;
      if (ev.tipo === "conclusao") l.conclusoes++;
      if (ev.tipo === "bloqueio")  l.bloqueios++;
      if (ev.tipo === "resgate")   l.resgates++;
      if (ev.tipo === "resposta" && ev.em >= l.respostaEm) {
        l.resposta = ev.resposta || "";
        l.resposta2 = ev.resposta2 || "";
        l.respostaOrigem = ev.origem || "";
        l.respostaEm = ev.em;
      }
      if (ev.em > l.ultimoEm) l.ultimoEm = ev.em;
    });

    return { origem: "local", lojas: Object.keys(porLoja).map(function (k) { return porLoja[k]; }) };
  }

  function listar(aoTerminar) {
    if (!CONFIG.ENDPOINT) {
      aoTerminar(null, agregarLocal());
      return;
    }
    jsonp({ acao: "listar" }, function (erro, dados) {
      if (erro || !dados || !dados.lojas) {
        // backend fora do ar: mostra o que houver no aparelho, avisando na tela
        const local = agregarLocal();
        local.aviso = "Não consegui falar com a planilha. Mostrando apenas os dados deste aparelho.";
        aoTerminar(null, local);
        return;
      }
      dados.origem = "planilha";
      aoTerminar(null, dados);
    });
  }

  function limparLocal() {
    try { localStorage.removeItem(CHAVE_EVENTOS); } catch (e) {}
  }

  return {
    evento: evento,
    listar: listar,
    sincronizar: sincronizar,
    pendentes: pendentes,
    eventosLocais: lerLocal,
    limparLocal: limparLocal
  };
})();
