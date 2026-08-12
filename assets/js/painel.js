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

  function linkDaLoja(slug) {
    const base = baseCalculada();
    return base + (base.indexOf("?") > -1 ? "&" : "?") + "loja=" + slug;
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
          resposta: m.resposta || "pendente"
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
      const casaResposta = !filtro || l.resposta === filtro;
      return casaTexto && casaResposta;
    });

    lista.sort(function (a, b) {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      return (b[ordem] || 0) - (a[ordem] || 0);
    });

    return lista;
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

      // números
      ["acessos", "inicios", "conclusoes", "bloqueios", "resgates"].forEach(function (campo) {
        const td = document.createElement("td");
        td.className = "num" + (l[campo] ? "" : " zero");
        td.textContent = l[campo];
        tr.appendChild(td);
      });

      // resposta
      const tdResp = document.createElement("td");
      const marcador = document.createElement("span");
      marcador.className = "marcador marcador--" + l.resposta;
      marcador.textContent = l.resposta === "sim" ? "Sim, quer"
                           : l.resposta === "nao" ? "Agora não"
                           : "Sem resposta";
      tdResp.appendChild(marcador);
      tr.appendChild(tdResp);

      // link
      const tdLink = document.createElement("td");
      const caixa = document.createElement("div");
      caixa.className = "celula-link";
      const texto = document.createElement("span");
      texto.className = "link-loja";
      texto.textContent = linkDaLoja(l.slug);
      const botao = document.createElement("button");
      botao.className = "mini";
      botao.textContent = "Copiar";
      botao.addEventListener("click", function () {
        copiar(linkDaLoja(l.slug), "Link de " + l.nome + " copiado!");
      });
      const abrir = document.createElement("a");
      abrir.className = "mini";
      abrir.textContent = "Abrir";
      abrir.target = "_blank";
      abrir.rel = "noopener";
      abrir.href = linkDaLoja(l.slug);
      caixa.appendChild(texto);
      caixa.appendChild(botao);
      caixa.appendChild(abrir);
      tdLink.appendChild(caixa);
      tr.appendChild(tdLink);

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
    const sim = dados.filter(function (l) { return l.resposta === "sim"; }).length;

    $("#n-acessos").textContent = acessos;
    $("#n-inicios").textContent = inicios;
    $("#n-conclusoes").textContent = conclusoes;
    $("#n-resgates").textContent = resgates;
    $("#n-sim").textContent = sim;
    $("#n-total-lojas").textContent = dados.length;
    $("#n-taxa").textContent = inicios ? Math.round((conclusoes / inicios) * 100) + "%" : "0%";
    $("#n-receita").textContent = "R$ " + (sim * CONFIG.VALOR_COMBO).toLocaleString("pt-BR");
  }

  /* =========================================================
     exportações
     ========================================================= */

  function copiarTodosOsLinks() {
    const linhas = dados.map(function (l) {
      return l.nome + "\t" + linkDaLoja(l.slug);
    });
    copiar(linhas.join("\n"), dados.length + " links copiados! Cole no Excel ou no WhatsApp.");
  }

  function baixarCsv() {
    const cabecalho = ["Unidade", "Codigo", "Slug", "Acessos", "Partidas", "Concluidas",
                       "Bloqueios", "Cupons", "Resposta", "Link"];

    const escapar = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };

    const linhas = [cabecalho.join(";")].concat(
      filtrarEOrdenar().map(function (l) {
        return [l.nome, l.cod, l.slug, l.acessos, l.inicios, l.conclusoes,
                l.bloqueios, l.resgates, l.resposta, linkDaLoja(l.slug)]
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

    $("#btn-copiar-links").textContent = "Copiar os " + LOJAS.length + " links";
  }

  ligar();
  carregar();
})();
