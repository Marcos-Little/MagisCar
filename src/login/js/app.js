(function () {
  const { $, erro, limparErros, focarPrimeiroErro } = MagisCar;

  // só aceita voltar para uma página do próprio sistema (ex.: ../processo6/index.html)
  function destino() {
    const volta = new URLSearchParams(location.search).get("volta") || "";
    const valida = /^\.\.\/[a-z0-9-]+\/[a-z0-9-]+\.html$/i.test(volta) && !volta.startsWith("../login/");
    return valida ? volta : MagisAuth.paginaInicial();
  }

  // já está logado nesta aba: segue direto
  if (MagisAuth.usuario()) { location.replace(MagisAuth.paginaInicial()); return; }

  const form = $("#form-login");

  form.addEventListener("submit", e => {
    e.preventDefault();
    limparErros(form);
    $("#login-erro").hidden = true;
    const login = $("#l-login").value.trim();
    const senha = $("#l-senha").value;
    let ok = true;
    ok = erro("l-login", !login ? "Informe o usuário." : "") && ok;
    ok = erro("l-senha", !senha ? "Informe a senha." : "") && ok;
    if (!ok) { focarPrimeiroErro(form); return; }

    const msg = MagisAuth.entrar(login, senha);
    if (msg) {
      $("#login-erro").textContent = msg;
      $("#login-erro").hidden = false;
      $("#l-senha").value = "";
      $("#l-senha").focus();
      return;
    }
    // a página de destino confere de novo a permissão; se não puder, manda p/ a inicial do perfil
    location.href = destino();
  });

  ["#l-login", "#l-senha"].forEach(id => $(id).addEventListener("input", () => {
    erro(id.slice(1), "");
    $("#login-erro").hidden = true;
  }));

  $("#tabela-contas tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr[data-login]");
    if (!tr) return;
    $("#l-login").value = tr.dataset.login;
    $("#l-senha").value = tr.dataset.senha;
    limparErros(form);
    $("#login-erro").hidden = true;
  });

  $("#l-login").focus();
})();
