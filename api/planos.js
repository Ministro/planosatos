const base = require("../data/planos.json");

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function textoLimpo(valor) {
  return String(valor || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function formatarLocalidade(nome, info) {
  return {
    localidade: nome,
    instalacao: textoLimpo(info.instalacao),
    planos: info.planos || {},
    observacao: textoLimpo(info.obs),
  };
}

function encontrarLocalidades(termoOriginal) {
  const termo = normalizar(termoOriginal);
  if (!termo) return [];

  const { dados = {}, apelidos = {} } = base;
  const encontrados = new Set();

  // 1) Apelido exato.
  Object.entries(apelidos).forEach(([apelido, nome]) => {
    if (normalizar(apelido) === termo && dados[nome]) encontrados.add(nome);
  });

  // 2) Nome da localidade contendo o termo.
  Object.keys(dados).forEach((nome) => {
    if (normalizar(nome).includes(termo)) encontrados.add(nome);
  });

  // 3) Parte de um apelido.
  Object.entries(apelidos).forEach(([apelido, nome]) => {
    if (normalizar(apelido).includes(termo) && dados[nome]) encontrados.add(nome);
  });

  return [...encontrados];
}

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      erro: "Método não permitido. Use GET.",
    });
  }

  const termo = req.query.localidade || req.query.q || "";

  if (!String(termo).trim()) {
    const localidades = Object.entries(base.dados || {}).map(([nome, info]) =>
      formatarLocalidade(nome, info)
    );

    return res.status(200).json({
      ok: true,
      total: localidades.length,
      localidades,
    });
  }

  const nomes = encontrarLocalidades(termo);

  if (!nomes.length) {
    return res.status(404).json({
      ok: false,
      erro: "Nenhuma localidade encontrada.",
      busca: termo,
    });
  }

  const resultados = nomes.map((nome) =>
    formatarLocalidade(nome, base.dados[nome])
  );

  if (resultados.length === 1) {
    return res.status(200).json({ ok: true, ...resultados[0] });
  }

  return res.status(200).json({
    ok: true,
    busca: termo,
    total: resultados.length,
    resultados,
  });
};
