(function () {
  const { $, escapar, erro, limparErros, focarPrimeiroErro, marcarLinha, avisar } = MagisCar;
  const { PERFIS } = MagisAuth;

  const DICA_PERFIL = {
    admin: "Acesso geral a todos os processos.",
    funcionario: "Cadastro de clientes, agendamento e atendimento da OS. Estoque só para consulta.",
    mecanico: "Vê as ordens de serviço e atualiza diagnóstico, execução e peças."
  };

  let lista = MagisAuth.usuarios();
  let selecionado = null; // id do usuário em edição (null = novo)
  const eu = MagisAuth.usuario();

  const persistir = () => MagisAuth.salvarUsuarios(lista);
  const porId = id => lista.find(u => u.id === id);

  $("#logo").addEventListener("click", e => { e.preventDefault(); location.href = MagisAuth.paginaInicial(); });

  function render() {
    const ordem = [...lista].sort((a, b) => (b.ativo - a.ativo) || a.nome.localeCompare(b.nome));
    $("#tabela-usuarios tbody").innerHTML = ordem.map(u => `
      <tr class="clicavel ${u.id === selecionado ? "selecionada" : ""}" data-id="${u.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-usuario" ${u.id === selecionado ? "checked" : ""} aria-label="Selecionar ${escapar(u.nome)}"></td>
        <td>${escapar(u.nome)}${u.id === eu.id ? " <small>(você)</small>" : ""}</td>
        <td>${escapar(u.login)}</td>
        <td>${escapar(PERFIS[u.perfil])}</td>
        <td><span class="etiqueta ${u.ativo ? "ok" : "andamento"}">${u.ativo ? "Ativo" : "Desativado"}</span></td>
      </tr>`).join("");
  }

  function preencher() {
    const u = selecionado ? porId(selecionado) : null;
    const form = $("#form-usuario");
    form.reset();
    limparErros(form);
    $("#titulo-form").textContent = u ? `Alterar usuário: ${u.nome}` : "Novo usuário";
    $("#s-nome").value = u ? u.nome : "";
    $("#s-login").value = u ? u.login : "";
    $("#s-perfil").value = u ? u.perfil : "funcionario";
    // o próprio administrador não pode tirar o próprio acesso
    $("#s-perfil").disabled = !!u && u.id === eu.id;
    $("#s-senha-obrig").hidden = !!u;
    $("#s-senha-dica").hidden = !u;
    $("#btn-ativar").hidden = !u || u.id === eu.id;
    if (u) $("#btn-ativar").textContent = u.ativo ? "Desativar acesso" : "Reativar acesso";
    atualizarDicaPerfil();
    render();
  }

  function atualizarDicaPerfil() { $("#s-perfil-dica").textContent = DICA_PERFIL[$("#s-perfil").value]; }
  $("#s-perfil").addEventListener("change", atualizarDicaPerfil);

  ["s-nome", "s-login", "s-senha"].forEach(id => $(`#${id}`).addEventListener("input", () => erro(id, "")));

  $("#tabela-usuarios tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    marcarLinha(e.currentTarget, tr);
    selecionado = Number(tr.dataset.id);
    preencher();
    $("#s-nome").focus();
  });

  $("#btn-novo-usuario").addEventListener("click", () => { selecionado = null; preencher(); $("#s-nome").focus(); });

  $("#btn-salvar-usuario").addEventListener("click", () => {
    const form = $("#form-usuario");
    limparErros(form);
    const u = selecionado ? porId(selecionado) : null;
    const nome = $("#s-nome").value.trim();
    const login = $("#s-login").value.trim().toLowerCase();
    const senha = $("#s-senha").value;
    const perfil = $("#s-perfil").value;

    let ok = true;
    ok = erro("s-nome", !nome ? "Informe o nome." : "") && ok;
    ok = erro("s-login", !login ? "Informe o usuário."
      : !/^[a-z0-9._-]{3,}$/.test(login) ? "Use ao menos 3 caracteres: letras, números, ponto, hífen ou sublinhado."
      : lista.some(x => x.login.toLowerCase() === login && x.id !== selecionado) ? "Já existe um usuário com este login." : "") && ok;
    ok = erro("s-senha", !u && !senha ? "Informe a senha."
      : senha && senha.length < 6 ? "A senha deve ter no mínimo 6 caracteres." : "") && ok;
    if (!ok) { focarPrimeiroErro(form); return; }

    if (u) {
      u.nome = nome;
      u.login = login;
      if (u.id !== eu.id) u.perfil = perfil;
      if (senha) u.senha = senha;
    } else {
      const novo = { id: Math.max(0, ...lista.map(x => x.id)) + 1, nome, login, senha, perfil, ativo: true };
      lista.push(novo);
      selecionado = novo.id;
    }
    // mecânico precisa de um código próprio, que é o usado nas ordens de serviço
    const salvo = porId(selecionado);
    if (salvo.perfil === "mecanico" && !salvo.mecanicoId) {
      salvo.mecanicoId = Math.max(0, ...lista.map(x => x.mecanicoId || 0)) + 1;
    }
    persistir();
    preencher();
    avisar(u ? "Usuário atualizado." : `Usuário ${salvo.login} cadastrado.`);
  });

  $("#btn-ativar").addEventListener("click", () => {
    const u = porId(selecionado);
    if (!u || u.id === eu.id) return;
    u.ativo = !u.ativo;
    persistir();
    preencher();
    avisar(u.ativo ? `Acesso de ${u.nome} reativado.` : `Acesso de ${u.nome} desativado.`);
  });

  persistir(); // grava os usuários de teste na primeira vez
  preencher();
})();
