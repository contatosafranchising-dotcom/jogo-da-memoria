/* =============================================================
   BACKEND DO JOGO DA MEMÓRIA — CASA DO SUSHI
   Google Apps Script + Google Sheets. De graça, sem servidor,
   sem npm e sem cartão de crédito.

   -------------------------------------------------------------
   COMO LIGAR (10 minutos, uma vez só)
   -------------------------------------------------------------
   1.  Crie uma planilha nova no Google Sheets.
       Sugestão de nome: "Jogo da Memória — Casa do Sushi".

   2.  No menu da planilha: Extensões > Apps Script.

   3.  Apague o conteúdo do arquivo que abrir e cole TUDO deste
       arquivo aqui dentro. Salve (ícone de disquete).

   4.  Clique em "Implantar" > "Nova implantação".
       - Tipo:            App da Web
       - Executar como:   Eu
       - Quem tem acesso: Qualquer pessoa
       Clique em Implantar e autorize quando o Google pedir.
       (Vai aparecer um aviso de "app não verificado" — é normal,
        o app é seu. Clique em Avançado > Acessar o projeto.)

   5.  Copie a URL que termina em /exec.

   6.  Abra /assets/js/config.js e cole a URL em ENDPOINT:
          ENDPOINT: "https://script.google.com/macros/s/.../exec",

   Pronto. A partir daí cada acesso, partida, cupom e resposta de
   franqueado vira uma linha na planilha, e o /painel.html passa a
   somar as 42 unidades em vez de só o navegador local.

   -------------------------------------------------------------
   OBSERVAÇÃO
   -------------------------------------------------------------
   A comunicação é por JSONP (tag <script>) porque é o que funciona
   com o Apps Script sem CORS e sem back-end próprio. É leitura e
   escrita de contadores, não há dado sensível trafegando.
   ============================================================= */


/* ---------- configurações ---------- */

var ABA_EVENTOS = 'eventos';

// resposta  = pergunta 1 (a unidade quer o jogo)
// resposta2 = pergunta 2 (a franqueadora publica os links por R$ 20,00)
var COLUNAS = ['quando', 'tipo', 'loja', 'nome', 'tempo', 'nivel',
               'premio', 'cupom', 'resposta', 'resposta2', 'origem'];


/* ---------- ponto de entrada ---------- */

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var callback = p.callback || 'callback';
  var resultado;

  try {
    if (p.acao === 'registrar') {
      resultado = registrar(p);
    } else if (p.acao === 'listar') {
      resultado = listar();
    } else {
      resultado = { ok: true, mensagem: 'Backend do Jogo da Memória no ar.' };
    }
  } catch (erro) {
    resultado = { ok: false, erro: String(erro) };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(resultado) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}


/* ---------- planilha ---------- */

function pegarAba() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(ABA_EVENTOS);

  if (!aba) {
    aba = planilha.insertSheet(ABA_EVENTOS);
    aba.appendRow(COLUNAS);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
  }
  return aba;
}


/* ---------- gravação ---------- */

function registrar(p) {
  var aba = pegarAba();

  // "em" chega em milissegundos do navegador; se vier torto, usa a hora do servidor
  var quando = new Date();
  var ms = Number(p.em);
  if (ms && ms > 1000000000000) quando = new Date(ms);

  aba.appendRow([
    quando,
    p.tipo || '',
    p.loja || '',
    p.nome || '',
    p.tempo || '',
    p.nivel || '',
    p.premio || '',
    p.cupom || '',
    p.resposta || '',
    p.resposta2 || '',
    p.origem || 'web'   // "painel" = a franqueadora marcou pela loja
  ]);

  return { ok: true };
}


/* ---------- leitura consolidada para o painel ---------- */

function listar() {
  var aba = pegarAba();
  var ultimaLinha = aba.getLastRow();

  if (ultimaLinha < 2) {
    return { ok: true, lojas: [] };
  }

  var valores = aba.getRange(2, 1, ultimaLinha - 1, COLUNAS.length).getValues();
  var porLoja = {};

  for (var i = 0; i < valores.length; i++) {
    var linha = valores[i];
    var quando = linha[0];
    var tipo = String(linha[1] || '');
    var slug = String(linha[2] || '(sem-loja)');
    var resposta  = String(linha[8] || '');
    var resposta2 = String(linha[9] || '');
    var origem    = String(linha[10] || '');

    if (!porLoja[slug]) {
      porLoja[slug] = {
        loja: slug, acessos: 0, inicios: 0, conclusoes: 0,
        bloqueios: 0, resgates: 0,
        resposta: '', resposta2: '', respostaOrigem: '', respostaEm: 0, ultimoEm: 0
      };
    }

    var l = porLoja[slug];
    if (tipo === 'acesso')    l.acessos++;
    if (tipo === 'inicio')    l.inicios++;
    if (tipo === 'conclusao') l.conclusoes++;
    if (tipo === 'bloqueio')  l.bloqueios++;
    if (tipo === 'resgate')   l.resgates++;

    var ts = (quando instanceof Date) ? quando.getTime() : 0;

    // vale sempre a resposta mais recente daquela unidade
    if (tipo === 'resposta' && resposta && ts >= l.respostaEm) {
      l.resposta = resposta;
      l.resposta2 = resposta2;
      l.respostaOrigem = origem;
      l.respostaEm = ts;
    }
    if (ts > l.ultimoEm) l.ultimoEm = ts;
  }

  var lista = [];
  for (var chave in porLoja) {
    if (porLoja.hasOwnProperty(chave)) lista.push(porLoja[chave]);
  }

  return { ok: true, lojas: lista };
}


/* ---------- teste rápido dentro do editor do Apps Script ----------
   Selecione a função "testar" no topo e clique em Executar.
   Se aparecer uma linha nova na aba "eventos", está tudo certo.   */

function testar() {
  registrar({ acao: 'registrar', tipo: 'acesso', loja: 'camboriu', em: String(Date.now()) });
  Logger.log(JSON.stringify(listar()));
}
