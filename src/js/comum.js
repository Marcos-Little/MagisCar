// no html, este arquivo tem de ser carregado antes do app.js
// tem aqui:
// formatar telefone
// validar cnpj
// mostrar mensagem de erro em um campo
// trocar de tela
// mostrar avisos

window.MagisCar = (function () {
  // $("#termo") encontra um elemento da página pelo seletor CSS
  // é só um atalho p/ document.querySelector
  // exemplo: $("#termo").value  -> o texto digitado no campo de id "termo"
  const $ = sel => document.querySelector(sel);


  // tira tudo que não é número de um texto.
  // exemplo: soDigitos("(31) 99653-4312") -> "31996534312"
  // o (s || "") evita erro se vier vazio (null ou undefined).
  const soDigitos = s => (s || "").replace(/\D/g, "");


  // formatação de datas
  // o +1 no mês é porque janeiro é 0 e dezembro é 11
  function isoData(d) {
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  const hojeIso = () => isoData(new Date());

  function diasAtras(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return isoData(d);
  }

  // converte "AAAA-MM-DD" p/ "DD/MM/AAAA"
  // exemplo: fmtData("2026-11-18") -> "18/11/2026"
  const fmtData = iso => iso ? iso.split("-").reverse().join("/") : "";


  // formatação

  // deixa um texto seguro p/ colocar dentro do html ("<" vira "&lt;" etc.)
  // usar sempre que montar html com algo que o usuário digitou
  function escapar(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // coloca a pontuação do cnpj, mesmo pela metade
  // exemplo: fmtCnpj("12345678000195") -> "12.345.678/0001-95"
  function fmtCnpj(v) {
    return soDigitos(v).slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  // coloca a pontuação do telefone (fixo ou celular) enquanto a pessoa digita
  // exemplo: fmtTelefone("31996534312") -> "(31) 99653-4312"
  function fmtTelefone(v) {
    const d = soDigitos(v).slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  // exemplo: fmtMoeda(1712.5) -> "R$ 1.712,50"
  const fmtMoeda = n => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // máscara dos campos de dinheiro: o que é digitado entra como centavos
  // exemplo: digitar 2500 -> "R$ 25,00"
  const mascaraMoeda = v => fmtMoeda(Number(soDigitos(v).slice(0, 11) || 0) / 100);

  // o contrário da máscara: texto do campo -> número p/ fazer contas
  // exemplo: lerMoeda("R$ 25,00") -> 25
  const lerMoeda = v => Number(soDigitos(v) || 0) / 100;

  // número no formato brasileiro, com até 2 casas decimais
  // exemplo: fmtNumero(1500.5) -> "1.500,5"
  const fmtNumero = n => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });


  // validação (todas devolvem true ou false)

  // confere os dois dígitos verificadores do cnpj
  // números todos iguais (ex.: 11.111.111/1111-11) são recusados
  // exemplo: cnpjValido("12.345.678/0001-95") -> true
  function cnpjValido(cnpj) {
    const d = soDigitos(cnpj);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const calc = len => {
      let soma = 0, peso = len - 7;
      for (let i = 0; i < len; i++) {
        soma += Number(d[i]) * peso--;
        if (peso < 2) peso = 9;
      }
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
  }

  // só confere o formato "algo@algo.algo", não se o e-mail existe
  const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  // 10 números (fixo) ou 11 (celular), contando o ddd
  const telefoneValido = t => { const n = soDigitos(t).length; return n === 10 || n === 11; };

  // confere tipo e tamanho do arquivo; devolve a mensagem de erro ou ""
  // exemplo: erroArquivo(foto, ["image/jpeg", "image/png"], 5)
  function erroArquivo(arq, tipos, maxMb) {
    if (!arq) return "";
    if (!tipos.includes(arq.type)) return "Formato de arquivo não permitido.";
    if (arq.size > maxMb * 1024 * 1024) return `O arquivo deve ter no máximo ${maxMb} MB.`;
    return "";
  }


  // erros nos campos do formulário

  // mostra a mensagem de erro do campo (ou apaga, se msg for "")
  // devolve true quando não há erro, p/ mostrar todos os erros de uma vez
  // exemplo: ok = erro("c-nome", "Informe o nome.") && ok;
  function erro(idCampo, msg) {
    const el = idCampo && document.getElementById(idCampo);
    const span = idCampo && document.querySelector(`[data-erro-de="${idCampo}"]`);
    const campo = el && el.closest(".campo");
    if (campo) campo.classList.toggle("invalido", !!msg);
    if (span) span.textContent = msg || "";
    return !msg;
  }

  // apaga todos os erros de um formulário
  // exemplo: limparErros($("#form-item"))
  function limparErros(container) {
    container.querySelectorAll(".campo.invalido").forEach(c => c.classList.remove("invalido"));
    container.querySelectorAll(".erro").forEach(s => { s.textContent = ""; });
  }

  // põe o cursor no primeiro campo com erro
  function focarPrimeiroErro(container) {
    const c = container.querySelector(".campo.invalido input:not([type=checkbox]), .campo.invalido select, .campo.invalido textarea, .campo.invalido input");
    if (c) c.focus();
  }

  // liga as máscaras nos campos com data-mascara
  // e apaga o erro do campo assim que a pessoa começa a corrigir
  // exemplo: aplicarMascaras({ telefone: fmtTelefone, cnpj: fmtCnpj })
  function aplicarMascaras(mapa) {
    document.querySelectorAll("[data-mascara]").forEach(input => {
      const fn = mapa[input.dataset.mascara];
      if (fn) input.addEventListener("input", () => { input.value = fn(input.value); });
    });
    document.querySelectorAll("input, select, textarea").forEach(el => {
      el.addEventListener("input", () => erro(el.id, ""));
      el.addEventListener("change", () => erro(el.id, ""));
    });
  }

  // destaca a linha clicada na tabela e marca a bolinha dela
  function marcarLinha(tbody, tr) {
    tbody.querySelectorAll("tr").forEach(l => l.classList.toggle("selecionada", l === tr));
    const r = tr.querySelector("input.radio");
    if (r) r.checked = true;
  }


  // navegação entre as telas
  // só aparece a <section class="tela"> que tem a classe "ativa"

  // o que fazer quando cada tela abrir
  // exemplo: aoAbrir["tela-entrada"] = () => { /* preenche os campos */ };
  const aoAbrir = {};

  // perfil mostrado no canto superior direito
  // (com login, o auth.js mostra o usuário logado e não existe mais o #perfil-nome)
  let perfilPadrao = "Estoque";

  // regra opcional de acesso às telas (o app.js define conforme o perfil logado)
  // exemplo: definirAcesso(idTela => idTela !== "tela-exclusao")
  let podeAbrir = null;
  const definirAcesso = fn => { podeAbrir = fn; };

  // mostra a tela e esconde as outras; troca trilha, perfil e título da aba
  // exemplo: irPara("tela-entrada")
  function irPara(idTela) {
    if (podeAbrir && !podeAbrir(idTela)) {
      avisar("Seu perfil não tem acesso a esta tela.", true);
      return;
    }
    document.querySelectorAll(".tela").forEach(t => t.classList.toggle("ativa", t.id === idTela));
    const tela = document.getElementById(idTela);
    $("#trilha-tela").textContent = tela.dataset.titulo;
    if ($("#perfil-nome")) $("#perfil-nome").textContent = tela.dataset.perfil || perfilPadrao;
    document.title = `MagisCar – ${tela.dataset.titulo}`;
    if (aoAbrir[idTela]) aoAbrir[idTela]();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // faz todo botão com data-ir="tela-x" abrir aquela tela
  // exemplo: iniciarTelas({ perfil: "Estoque" })
  function iniciarTelas(opcoes) {
    perfilPadrao = opcoes.perfil || perfilPadrao;
    document.querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () => irPara(b.dataset.ir)));
  }


  // avisos
  let timerAviso;

  // mostra o aviso, que some sozinho em 4 segundos
  // exemplo: avisar("Item cadastrado.") ou avisar("Algo deu errado.", true)
  function avisar(msg, falha = false) {
    const el = $("#aviso");
    $("#aviso-texto").textContent = msg;
    $("#aviso-icone").textContent = falha ? "!" : "✓";
    el.classList.toggle("falha", falha);
    el.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { el.hidden = true; }, 3800);
  }


  // dados salvos no navegador (localStorage, temporário)
  // lê os dados salvos; se não houver nada, usa os dados de exemplo
  // exemplo: carregarDados("magiscar.processo2", dadosIniciais)
  function carregarDados(chave, iniciais) {
    try {
      const salvo = localStorage.getItem(chave);
      if (salvo) return JSON.parse(salvo);
    } catch (e) { /* armazenamento indisponível */ }
    return iniciais();
  }

  // exemplo: salvarDados("magiscar.processo2", dados)
  function salvarDados(chave, dados) {
    try { localStorage.setItem(chave, JSON.stringify(dados)); } catch (e) { /* não salvou */ }
  }


  // o que o app.js pode usar (função nova tem de entrar aqui)
  return {
    $, soDigitos, hojeIso, diasAtras, fmtData, escapar,
    fmtCnpj, fmtTelefone, fmtMoeda, mascaraMoeda, lerMoeda, fmtNumero,
    cnpjValido, emailValido, telefoneValido, erroArquivo,
    erro, limparErros, focarPrimeiroErro, aplicarMascaras, marcarLinha,
    aoAbrir, irPara, iniciarTelas, definirAcesso, avisar, carregarDados, salvarDados
  };
})();
