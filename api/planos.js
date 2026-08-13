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
    planos: info.planos,
    observacao: textoLimpo(info.obs),
  };
}

function encontrarLocalidades(termoOriginal) {
  const termo = String(termoOriginal || "").trim();
  if (!termo) return [];

  const termoNormalizado = normalizar(termo);
  const { dados, apelidos } = base;

  const apelidoDireto = Object.entries(apelidos).find(
    ([apelido]) => normalizar(apelido) === termoNormalizado
  );

  if (apelidoDireto && dados[apelidoDireto[1]]) {
    return [apelidoDireto[1]];
  }

  const porNome = Object.keys(dados).filter((nome) =>
    normalizar(nome).includes(termoNormalizado)
  );

  if (porNome.length) return porNome;

  const porApelidoParcial = Object.entries(apelidos)
    .filter(([apelido]) => normalizar(apelido).includes(termoNormalizado))
    .map(([, nome]) => nome)
    .filter((nome) => dados[nome]);

  return [...new Set(porApelidoParcial)];
}

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      erro: "Método não permitido. Use GET.",
    });
  }

  const termo = req.query.localidade || req.query.q || "";

  if (!termo) {
    const localidades = Object.entries(base.dados).map(([nome, info]) =>
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
    return res.status(200).json({
      ok: true,
      ...resultados[0],
    });
  }

  return res.status(200).json({
    ok: true,
    busca: termo,
    total: resultados.length,
    resultados,
  });
};
