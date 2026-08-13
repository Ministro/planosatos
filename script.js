const btnBuscar = document.getElementById("btnBuscar");
const btnImprimir = document.getElementById("btnImprimir");
const resultado = document.getElementById("resultado");
const busca = document.getElementById("busca");

let htmlAtual = "";
let baseLocal = null;

busca.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    pesquisar();
  }
});

btnBuscar.addEventListener("click", pesquisar);
btnImprimir.addEventListener("click", imprimir);

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function textoParaHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function montarCard(item) {
  const nome = item.localidade || item.nome || "Localidade";
  const instalacao = item.instalacao || "Não informado";
  const planos = item.planos || {};
  const observacao = item.observacao ?? item.obs ?? "";

  let html = `<h2>${textoParaHtml(nome)}</h2>`;
  html += `<p><strong>Instalação:</strong><br>${textoParaHtml(instalacao)}</p>`;
  html += `<p><strong>Planos:</strong></p><ul>`;

  Object.entries(planos).forEach(([plano, valor]) => {
    html += `<li class="plano">${textoParaHtml(plano)}: R$ ${textoParaHtml(valor)}</li>`;
  });

  html += `</ul>`;
  html += `<p><strong>Observações:</strong><br>${textoParaHtml(observacao || "Nenhuma")}</p>`;
  return html;
}

function mostrarResultados(itens) {
  const lista = Array.isArray(itens) ? itens : [itens];
  htmlAtual = lista.map(montarCard).join('<hr style="margin:24px 0;border:0;border-top:1px solid #ddd">');
  resultado.innerHTML = htmlAtual;
  btnImprimir.style.display = "inline-flex";
}

async function buscarNaApi(termo) {
  const url = `/api/planos?localidade=${encodeURIComponent(termo)}&_=${Date.now()}`;
  const resposta = await fetch(url, { cache: "no-store" });
  const payload = await resposta.json().catch(() => ({}));

  if (!resposta.ok || payload.ok === false) {
    const erro = new Error(payload.erro || "Nenhuma localidade encontrada.");
    erro.status = resposta.status;
    throw erro;
  }

  if (Array.isArray(payload.resultados)) return payload.resultados;
  if (payload.localidade) return [payload];
  if (Array.isArray(payload.localidades)) return payload.localidades;

  throw new Error("Resposta inválida da API de planos.");
}

async function carregarBaseLocal() {
  if (baseLocal) return baseLocal;

  const resposta = await fetch(`/data/planos.json?_=${Date.now()}`, {
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível carregar a base local de planos.");
  }

  baseLocal = await resposta.json();
  return baseLocal;
}

function buscarNaBaseLocal(base, termoOriginal) {
  const dados = base?.dados || {};
  const apelidos = base?.apelidos || {};
  const termo = normalizar(termoOriginal);

  if (!termo) return [];

  const resultados = new Set();

  // Apelido exato: green, rancho, caju, 55a etc.
  Object.entries(apelidos).forEach(([apelido, nome]) => {
    if (normalizar(apelido) === termo && dados[nome]) resultados.add(nome);
  });

  // Nome da localidade contém o que foi digitado.
  Object.keys(dados).forEach((nome) => {
    if (normalizar(nome).includes(termo)) resultados.add(nome);
  });

  // Também aceita parte de um apelido.
  Object.entries(apelidos).forEach(([apelido, nome]) => {
    if (normalizar(apelido).includes(termo) && dados[nome]) resultados.add(nome);
  });

  return [...resultados].map((nome) => {
    const info = dados[nome];
    return {
      localidade: nome,
      instalacao: String(info.instalacao || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, ""),
      planos: info.planos || {},
      observacao: String(info.obs || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, ""),
    };
  });
}

async function pesquisar() {
  const termo = busca.value.trim();

  if (!termo) {
    resultado.innerHTML = "<strong>Digite uma localidade para pesquisar.</strong>";
    btnImprimir.style.display = "none";
    htmlAtual = "";
    busca.focus();
    return;
  }

  btnBuscar.disabled = true;
  const textoOriginal = btnBuscar.innerHTML;
  btnBuscar.textContent = "Buscando...";
  resultado.innerHTML = "<strong>Buscando planos...</strong>";
  btnImprimir.style.display = "none";

  try {
    // O site consulta a mesma API que será usada pelo Jhop Chat.
    const itens = await buscarNaApi(termo);
    mostrarResultados(itens);
  } catch (erroApi) {
    console.warn("Falha ao consultar API, usando base local:", erroApi);

    try {
      // Fallback: mantém a consulta funcionando mesmo se a Function da Vercel
      // estiver temporariamente indisponível.
      const base = await carregarBaseLocal();
      const itens = buscarNaBaseLocal(base, termo);

      if (!itens.length) {
        resultado.innerHTML = "<strong>Nenhuma localidade encontrada.</strong>";
        htmlAtual = "";
        return;
      }

      mostrarResultados(itens);
    } catch (erroLocal) {
      console.error(erroLocal);
      resultado.innerHTML =
        "<strong>Não foi possível consultar os planos agora. Atualize a página e tente novamente.</strong>";
      htmlAtual = "";
    }
  } finally {
    btnBuscar.disabled = false;
    btnBuscar.innerHTML = textoOriginal;
  }
}

function imprimir() {
  if (!htmlAtual) {
    alert("Nenhum resultado para imprimir.");
    return;
  }

  const logoUrl =
    "https://i.supaimg.com/12820c3b-da0c-4cbf-86c0-12ae6f6217c6.png";
  const janela = window.open("", "_blank");

  if (!janela) {
    alert("O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.");
    return;
  }

  janela.document.write(`<html><head><title>Impressão</title><style>
      body{font-family:Poppins,Arial,sans-serif;padding:20px;color:#222;}
      h1{text-align:center;color:#333;}
      h2{color:#5e72e4;margin-top:18px;}
      ul{padding-left:20px;}
      li{margin:5px 0;}
      img{display:block;margin:0 auto 15px auto;max-width:150px;}
      hr{margin:24px 0;border:0;border-top:1px solid #ddd;}
    </style></head><body>
      <img src="${logoUrl}" alt="Logo Atos Telecom">
      <h1>Planos Atos Telecom</h1>
      ${htmlAtual}
    </body></html>`);
  janela.document.close();

  setTimeout(() => {
    janela.focus();
    janela.print();
    janela.close();
  }, 500);
}
