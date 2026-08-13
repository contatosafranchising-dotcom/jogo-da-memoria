/* =============================================================
   painel.js — painel da franqueadora.

   Mostra, por unidade: acessos, partidas, conclusões, bloqueios,
   cupons enviados e a resposta do franqueado sobre contratar o
   jogo. Também monta e copia o link exclusivo de cada loja.

   Sem CONFIG.ENDPOINT, lê o localStorage deste navegador —
   serve para demonstrar. Com endpoint, lê a planilha e junta as
   42 unidades.
   ============================================================= */

(function () {
  "use strict";

  const $ = function (s) { return document.querySelector(s); };

  const CHAVE_BASE = "casadosushi_base_url";

  let dados = [];        // linhas já cruzadas com a lista de lojas
  let baseUrl = "";

  /* =========================================================
     apoio
     ========================================================= */

  let avisoTimer = null;
  function avisar(texto) {
    const el = $("#aviso-flutuante");
    el.textContent = texto;
    el.classList.add("visivel");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.classList.remove("visivel"); }, 2600);
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

  function baseCalculada() {
    if (baseUrl) return baseUrl;
    // sem endereço informado, usa o desta própria página
    return window.location.href.replace(/painel\.html.*$/, "index.html");
  }

  /* Cada unidade tem DOIS links, do mesmo jogo publicado:

     cliente    -> ?loja=slug                  acaba na tela do prêmio
     franqueado -> ?loja=slug&modo=franqueado  acaba nas duas perguntas

     É o link que decide, não o config: dá para mandar o do franqueado para
     o dono da loja e o do cliente para o Instagram no mesmo dia.        */
  function linkDaLoja(slug, paraFranqueado) {
    const base = baseCalculada();
    const junta = base.indexOf("?") > -1 ? "&" : "?";
    return base + junta + "loja=" + slug + (paraFranqueado ? "&modo=franqueado" : "");
  }

  /* =========================================================
     carga
     ========================================================= */

  function carregar() {
    $("#etiqueta-origem").textContent = "carregando...";
    $("#etiqueta-origem").className = "etiqueta";

    API.listar(function (erro, resposta) {
      const porSlug = {};
      (resposta && resposta.lojas ? resposta.lojas : []).forEach(function (l) {
        porSlug[l.loja] = l;
      });

      // a lista completa manda: uma unidade sem nenhum acesso
      // precisa aparecer zerada, não sumir do painel
      dados = LOJAS.map(function (loja) {
        const m = porSlug[loja.slug] || {};
        return {
          slug: loja.slug,
          cod: loja.cod,
          nome: loja.nome,
          acessos: m.acessos || 0,
          inicios: m.inicios || 0,
          conclusoes: m.conclusoes || 0,
          bloqueios: m.bloqueios || 0,
          resgates: m.resgates || 0,
          resposta: m.resposta || "pendente",     // P1 — quer o jogo
          resposta2: m.resposta2 || "pendente",    // P2 — agendamento de stories por R$ 20,00
          respostaOrigem: m.respostaOrigem || ""    // "painel" = marcada pela franqueadora
        };
      });

      const origem = (resposta && resposta.origem) || "local";
      const etq = $("#etiqueta-origem");
      etq.textContent = origem === "planilha" ? "dados da planilha" : "dados deste navegador";
      etq.className = "etiqueta etiqueta--" + origem;

      const alerta = $("#alerta");
      if (resposta && resposta.aviso) {
        alerta.textContent = resposta.aviso;
        alerta.classList.remove("oculto");
      } else {
        alerta.classList.add("oculto");
      }

      $("#rodape-modo").textContent = CONFIG.ENDPOINT
        ? "Modo real: os eventos das 42 unidades são gravados na planilha do Google."
        : "Modo demonstração: CONFIG.ENDPOINT está vazio, então os números vêm só deste navegador. Veja /backend/apps-script.gs para ligar a planilha.";

      desenhar();
    });
  }

  /* =========================================================
     desenho
     ========================================================= */

  function filtrarEOrdenar() {
    const termo = $("#busca").value.toLowerCase().trim();
    const filtro = $("#filtro-resposta").value;
    const ordem = $("#ordem").value;

    let lista = dados.filter(function (l) {
      const casaTexto = !termo || l.nome.toLowerCase().indexOf(termo) > -1 || l.slug.indexOf(termo) > -1;

      let casaResposta = true;
      if (filtro === "pendente")            casaResposta = l.resposta === "pendente";
      else if (filtro.indexOf("p1:") === 0) casaResposta = l.resposta  === filtro.slice(3);
      else if (filtro.indexOf("p2:") === 0) casaResposta = l.resposta2 === filtro.slice(3);

      return casaTexto && casaResposta;
    });

    lista.sort(function (a, b) {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      return (b[ordem] || 0) - (a[ordem] || 0);
    });

    return lista;
  }

  /* A resposta pode chegar de dois jeitos:
     - o franqueado abriu o link dele e respondeu no celular;
     - ou ligou/mandou no grupo e a franqueadora marca aqui.
     Os dois viram o mesmo evento "resposta"; o que muda é a origem, que
     aparece embaixo do seletor para não confundir depois. */
  function celulaResposta(loja, qual, textoSim, textoNao) {
    const td = document.createElement("td");
    const valor = qual === 1 ? loja.resposta : loja.resposta2;

    const sel = document.createElement("select");
    sel.className = "escolha escolha--" + valor;
    sel.setAttribute("aria-label",
      (qual === 1 ? "Quer o jogo" : "Aceita o agendamento") + " — " + loja.nome);

    [["pendente", "— sem resposta"], ["sim", textoSim], ["nao", textoNao]]
      .forEach(function (par) {
        const op = document.createElement("option");
        op.value = par[0];
        op.textContent = par[1];
        if (par[0] === valor) op.selected = true;
        sel.appendChild(op);
      });

    const nota = document.createElement("span");
    nota.className = "marca-painel";
    nota.textContent = valor === "pendente" ? ""
                     : (loja.respostaOrigem === "painel" ? "marcado por você" : "respondeu no link");

    sel.addEventListener("change", function () {
      if (qual === 1) loja.resposta = sel.value; else loja.resposta2 = sel.value;
      loja.respostaOrigem = "painel";

      // manda as DUAS respostas: o consolidado guarda a última linha inteira
      API.evento("resposta", {
        loja: loja.slug,
        resposta: loja.resposta,
        resposta2: loja.resposta2,
        nome: "",
        origem: "painel"
      });

      sel.className = "escolha escolha--" + sel.value;
      nota.textContent = sel.value === "pendente" ? "" : "marcado por você";
      atualizarResumo();
      avisar(loja.nome + ": " + (qual === 1 ? "quer o jogo" : "agenda stories") +
             " = " + (sel.value === "pendente" ? "sem resposta" : sel.value.toUpperCase()));
    });

    td.appendChild(sel);
    td.appendChild(nota);
    return td;
  }

  /* Os dois links da unidade na MESMA célula, um embaixo do outro.
     Antes cada um tinha sua coluna com a URL inteira escrita, o que jogava a
     tabela para o lado e obrigava a rolar até achar o botão de copiar. */
  function celulaLinks(l) {
    const td = document.createElement("td");
    const caixa = document.createElement("div");
    caixa.className = "links-loja";

    [[false, "cliente", "Cliente"], [true, "franqueado", "Franqueado"]]
      .forEach(function (par) {
        const paraFranqueado = par[0];
        const endereco = linkDaLoja(l.slug, paraFranqueado);

        const linha = document.createElement("div");
        linha.className = "link-linha";

        const etq = document.createElement("span");
        etq.className = "etq etq--" + par[1];
        etq.textContent = par[2];

        const botao = document.createElement("button");
        botao.className = "mini";
        botao.textContent = "Copiar";
        botao.title = endereco;
        botao.addEventListener("click", function () {
          copiar(linkDaLoja(l.slug, paraFranqueado),
                 "Link do " + par[2].toLowerCase() + " de " + l.nome + " copiado!");
        });

        const abrir = document.createElement("a");
        abrir.className = "mini";
        abrir.textContent = "Abrir";
        abrir.target = "_blank";
        abrir.rel = "noopener";
        abrir.href = endereco;
        abrir.title = endereco;

        linha.appendChild(etq);
        linha.appendChild(botao);
        linha.appendChild(abrir);
        caixa.appendChild(linha);
      });

    td.appendChild(caixa);
    return td;
  }

  function desenhar() {
    const lista = filtrarEOrdenar();
    const corpo = $("#corpo-tabela");
    corpo.innerHTML = "";

    lista.forEach(function (l) {
      const tr = document.createElement("tr");

      // unidade
      const tdNome = document.createElement("td");
      const nome = document.createElement("div");
      nome.className = "nome-loja";
      nome.textContent = l.nome;
      const cod = document.createElement("div");
      cod.className = "cod-loja";
      cod.textContent = l.cod + " · " + l.slug;
      tdNome.appendChild(nome);
      tdNome.appendChild(cod);
      tr.appendChild(tdNome);

      // os dois links da unidade
      tr.appendChild(celulaLinks(l));

      // as duas respostas do final, editáveis
      tr.appendChild(celulaResposta(l, 1, "Sim, quer",    "Agora não"));
      tr.appendChild(celulaResposta(l, 2, "Sim, agendar", "Não agendar"));

      // números
      ["acessos", "inicios", "conclusoes", "bloqueios", "resgates"].forEach(function (campo) {
        const td = document.createElement("td");
        td.className = "num" + (l[campo] ? "" : " zero");
        td.textContent = l[campo];

        // quantos dos que terminaram o jogo foram até o WhatsApp da loja
        if (campo === "resgates" && l.conclusoes) {
          const taxa = document.createElement("span");
          taxa.className = "marca-painel";
          taxa.textContent = Math.round((l.resgates / l.conclusoes) * 100) + "% de " + l.conclusoes;
          td.appendChild(taxa);
        }

        tr.appendChild(td);
      });

      corpo.appendChild(tr);
    });

    $("#vazio").classList.toggle("oculto", lista.length > 0);
    atualizarResumo();
  }

  function atualizarResumo() {
    const soma = function (campo) {
      return dados.reduce(function (t, l) { return t + (l[campo] || 0); }, 0);
    };

    const acessos = soma("acessos");
    const inicios = soma("inicios");
    const conclusoes = soma("conclusoes");
    const resgates = soma("resgates");
    const sim  = dados.filter(function (l) { return l.resposta  === "sim"; }).length;
    const sim2 = dados.filter(function (l) { return l.resposta2 === "sim"; }).length;

    $("#n-acessos").textContent = acessos;
    $("#n-inicios").textContent = inicios;
    $("#n-conclusoes").textContent = conclusoes;
    $("#n-resgates").textContent = resgates;
    $("#n-sim").textContent = sim;
    $("#n-sim2").textContent = sim2;
    $("#n-total-lojas").textContent = dados.length;
    $("#n-taxa").textContent = inicios ? Math.round((conclusoes / inicios) * 100) + "%" : "0%";
    $("#n-taxa-resgate").textContent = conclusoes ? Math.round((resgates / conclusoes) * 100) + "%" : "0%";
    // quem paga os R$ 20,00 é quem disse sim na PERGUNTA 2 (a publicação),
    // não quem disse sim ao jogo — o jogo em si não é cobrado
    $("#n-receita").textContent = "R$ " + (sim2 * CONFIG.VALOR_COMBO).toLocaleString("pt-BR");
  }

  /* =========================================================
     exportações
     ========================================================= */

  function copiarUmaColuna(paraFranqueado) {
    const linhas = dados.map(function (l) {
      return l.nome + "\t" + linkDaLoja(l.slug, paraFranqueado);
    });
    copiar(linhas.join("\n"),
      dados.length + (paraFranqueado ? " links do franqueado" : " links do cliente") +
      " copiados! Cole no Excel ou no WhatsApp.");
  }

  function copiarTodosOsLinks() {
    const linhas = [["Unidade", "Link do cliente", "Link do franqueado"].join("\t")].concat(
      dados.map(function (l) {
        return l.nome + "\t" + linkDaLoja(l.slug, false) + "\t" + linkDaLoja(l.slug, true);
      })
    );
    copiar(linhas.join("\n"), dados.length + " unidades com os 2 links, prontas para colar no Excel.");
  }

  function baixarCsv() {
    const cabecalho = ["Unidade", "Codigo", "Slug", "Acessos", "Partidas", "Concluidas",
                       "Bloqueios", "Cupons",
                       "P1 quer o jogo", "P2 agenda stories R$ " + CONFIG.VALOR_COMBO,
                       "Link do cliente", "Link do franqueado"];

    const escapar = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };

    const linhas = [cabecalho.join(";")].concat(
      filtrarEOrdenar().map(function (l) {
        return [l.nome, l.cod, l.slug, l.acessos, l.inicios, l.conclusoes,
                l.bloqueios, l.resgates, l.resposta, l.resposta2,
                linkDaLoja(l.slug, false), linkDaLoja(l.slug, true)]
               .map(escapar).join(";");
      })
    );

    // BOM na frente para o Excel abrir os acentos direito
    const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jogo-da-memoria-casa-do-sushi.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    avisar("CSV baixado.");
  }

  /* =========================================================
     ligações
     ========================================================= */

  function ligar() {
    $("#busca").addEventListener("input", desenhar);
    $("#filtro-resposta").addEventListener("change", desenhar);
    $("#ordem").addEventListener("change", desenhar);
    $("#btn-atualizar").addEventListener("click", carregar);
    $("#btn-copiar-links").addEventListener("click", copiarTodosOsLinks);
    $("#btn-copiar-publicos").addEventListener("click", function () { copiarUmaColuna(false); });
    $("#btn-copiar-franqueados").addEventListener("click", function () { copiarUmaColuna(true); });
    $("#btn-csv").addEventListener("click", baixarCsv);

    const campoBase = $("#base-url");
    try { baseUrl = localStorage.getItem(CHAVE_BASE) || ""; } catch (e) { baseUrl = ""; }
    campoBase.value = baseUrl;
    campoBase.addEventListener("input", function () {
      baseUrl = campoBase.value.trim();
      try { localStorage.setItem(CHAVE_BASE, baseUrl); } catch (e) {}
      desenhar();
    });

    $("#btn-limpar").addEventListener("click", function () {
      API.limparLocal();
      avisar("Dados de teste apagados deste navegador.");
      carregar();
    });

    $("#btn-copiar-publicos").textContent = "Copiar os " + LOJAS.length + " links do cliente";
    $("#btn-copiar-franqueados").textContent = "Copiar os " + LOJAS.length + " links do franqueado";
  }

  ligar();
  carregar();
})();
