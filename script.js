let dados = {};
let apelidos = {};

const btnBuscar = document.getElementById("btnBuscar");
const btnImprimir = document.getElementById("btnImprimir");
const resultado = document.getElementById("resultado");
const busca = document.getElementById("busca");

async function carregarPlanos() {
  try {
    const resposta = await fetch("/data/planos.json", { cache: "no-store" });
    if (!resposta.ok) throw new Error("Não foi possível carregar os planos.");

    const payload = await resposta.json();
    dados = payload.dados || {};
    apelidos = payload.apelidos || {};
  } catch (erro) {
    console.error(erro);
    resultado.innerHTML = "<strong>Não foi possível carregar os planos.</strong>";
  }
}

const planosProntos = carregarPlanos();

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

function encontrarChave(termoOriginal) {
  const termo = String(termoOriginal || "").trim();
  if (!termo) return null;

  const termoNormalizado = normalizar(termo);

  const apelidoDireto = Object.entries(apelidos).find(
    ([apelido]) => normalizar(apelido) === termoNormalizado
  );

  if (apelidoDireto && dados[apelidoDireto[1]]) {
    return apelidoDireto[1];
  }

  return Object.keys(dados).find((nome) =>
    normalizar(nome).includes(termoNormalizado)
  );
}

async function pesquisar() {
  await planosProntos;

  const chave = encontrarChave(busca.value);

  if (!chave) {
    resultado.innerHTML = "<strong>Nenhuma localidade encontrada.</strong>";
    btnImprimir.style.display = "none";
    return;
  }

  const info = dados[chave];
  let html = `<h2>${chave}</h2>`;
  html += `<p><strong>Instalação:</strong><br>${info.instalacao}</p>`;
  html += `<p><strong>Planos:</strong></p><ul>`;
  for (const plano in info.planos) {
    html += `<li class="plano">${plano}: R$ ${info.planos[plano]}</li>`;
  }
  html += `</ul>`;
  html += `<p><strong>Observações:</strong><br>${info.obs || "Nenhuma"}</p>`;

  resultado.innerHTML = html;
  btnImprimir.style.display = "inline-flex";
}

function imprimir() {
  if (!resultado.innerHTML) {
    alert("Nenhum resultado para imprimir.");
    return;
  }
  const logoUrl = "https://i.supaimg.com/12820c3b-da0c-4cbf-86c0-12ae6f6217c6.png";
  const janela = window.open("", "_blank");
  janela.document.write(`<html><head><title>Impressão</title><style>
      body{font-family:Poppins,sans-serif;padding:20px;}
      h1{text-align:center;color:#333;}
      h2{color:#5e72e4;}
      ul{padding-left:20px;}
      img{display:block;margin:0 auto 15px auto; max-width:150px;}
    </style></head><body>
      <img src="${logoUrl}" alt="Logo Atos Telecom">
      <h1>Planos Atos Telecom</h1>
      ${resultado.innerHTML}
    </body></html>`);
  janela.document.close();
  janela.onload = function () {
    janela.print();
    janela.close();
  };
}
