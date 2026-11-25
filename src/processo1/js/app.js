(function () {
  const {
    $, soDigitos, hojeIso, diasAtras, fmtData, escapar,
    fmtCnpj, fmtTelefone, fmtMoeda,
    cnpjValido, emailValido, telefoneValido, erroArquivo,
    erro, limparErros, focarPrimeiroErro, aplicarMascaras, marcarLinha,
    aoAbrir, irPara, iniciarTelas, avisar, carregarDados, salvarDados
  } = MagisCar;

  const CHAVE = "magiscar.processo1";

  // perfil logado (auth.js): o funcionário cadastra e edita, mas a exclusão
  // de cadastro só é feita pelo administrador (o funcionário envia a solicitação)
  const usuario = MagisAuth.usuario();
  if (!usuario) return; // sem login: o auth.js já está levando para a tela de login
  const AVALIA_EXCLUSAO = MagisAuth.pode("clientes.avaliarExclusao");

  // ---------------------------------------------------------------
  // Funções só deste processo (CPF, CEP, placa e chassi).
  // Ficaram aqui para não mexer no comum.js da equipe; se outro
  // processo precisar delas, é só mover para o comum.js.
  // ---------------------------------------------------------------

  // exemplo: fmtCpf("52998224725") -> "529.982.247-25" (funciona pela metade também)
  function fmtCpf(v) {
    return soDigitos(v).slice(0, 11).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  // exemplo: fmtCep("30130010") -> "30130-010"
  const fmtCep = v => soDigitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

  // placa em maiúsculo; padrão antigo ganha hífen e o Mercosul não
  // exemplo: fmtPlaca("abc1234") -> "ABC-1234"   fmtPlaca("abc1d23") -> "ABC1D23"
  function fmtPlaca(v) {
    const p = (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    return /^[A-Z]{3}\d\d/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
  }

  // chassi: só letras e números, em maiúsculo, até 17
  const fmtChassi = v => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);

  // CPF ou CNPJ com a pontuação certa, pelo tamanho (11 dígitos = CPF)
  const fmtDoc = v => soDigitos(v).length > 11 ? fmtCnpj(v) : fmtCpf(v);

  // confere os dois dígitos verificadores; números todos iguais são recusados
  // exemplo: cpfValido("529.982.247-25") -> true
  function cpfValido(cpf) {
    const d = soDigitos(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const calc = len => {
      let soma = 0;
      for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
  }

  // AAA-0000 (hífen opcional) ou Mercosul AAA0A00; recebe a placa em maiúsculo
  const placaValida = p => /^[A-Z]{3}-?\d{4}$/.test(p) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(p);

  const soPlaca = v => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  // ---------------------------------------------------------------
  // Dados
  // ---------------------------------------------------------------

  const MARCAS = [
    "Audi", "BMW", "BYD", "Caoa Chery", "Chevrolet", "Citroën", "Fiat", "Ford", "Honda", "Hyundai",
    "Jeep", "Kia", "Land Rover", "Mercedes-Benz", "Mitsubishi", "Nissan", "Peugeot", "Renault",
    "Toyota", "Volkswagen", "Volvo", "Outra"
  ];
  const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
    "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

  // OS com um desses status já não contam como "em aberto"
  const OS_ENCERRADA = ["Concluído", "Cancelado"];

  function dadosIniciais() { // temporário, apenas p/ testes enquanto não há back
    return {
      proximoId: 100,
      clientes: [
        { id: 1, nome: "João da Silva", tipo: "PF", doc: "52998224725", nascimento: "1985-04-12", telefone: "31996534312", email: "joaosilva@gmail.com", endereco: "Rua Exemplo, 123 - Bairro Exemplo - Belo Horizonte/MG - CEP 30130-010", ativo: true },
        { id: 2, nome: "Maria Souza", tipo: "PF", doc: "11144477735", nascimento: "1992-09-30", telefone: "31992936787", email: "", endereco: "Av. Brasil, 500 - Funcionários - Belo Horizonte/MG", ativo: true },
        { id: 3, nome: "AutoPeças LTDA", tipo: "PJ", doc: "12345678000195", nascimento: "2010-06-01", telefone: "3133409762", email: "contato@autopecas.com.br", endereco: "Rua das Oficinas, 77 - Santa Efigênia - Belo Horizonte/MG", ativo: true }
      ],
      veiculos: [
        { id: 21, clienteId: 1, placa: "ABC1234", chassi: "9BWZZZ377VT004251", marca: "Toyota", modelo: "Corolla", ano: 2020, cor: "Prata", combustivel: "Flex", km: 48200, foto: null, ativo: true },
        { id: 22, clienteId: 1, placa: "DEF5678", chassi: null, marca: "Honda", modelo: "Civic", ano: 2017, cor: "Preto", combustivel: "Flex", km: 91300, foto: null, ativo: true },
        { id: 23, clienteId: 2, placa: "GHI1J23", chassi: null, marca: "Fiat", modelo: "Argo", ano: 2022, cor: "Branco", combustivel: "Flex", km: 22100, foto: null, ativo: true },
        { id: 24, clienteId: 3, placa: "JKL2M34", chassi: null, marca: "Fiat", modelo: "Fiorino", ano: 2021, cor: "Branco", combustivel: "Diesel", km: 60500, foto: null, ativo: true },
        { id: 25, clienteId: 3, placa: "MNO9876", chassi: null, marca: "Volkswagen", modelo: "Saveiro", ano: 2018, cor: "Cinza", combustivel: "Flex", km: 130400, foto: null, ativo: true }
      ],
      ordens: [
        { id: 31, numero: "00123", veiculoId: 21, data: diasAtras(40), servico: "Troca de óleo", mecanico: "Carlos", valor: 250, status: "Concluído" },
        { id: 32, numero: "00098", veiculoId: 21, data: diasAtras(120), servico: "Revisão geral", mecanico: "André", valor: 420, status: "Concluído" },
        { id: 33, numero: "00076", veiculoId: 21, data: diasAtras(300), servico: "Troca de pastilha", mecanico: "Carlos", valor: 150, status: "Concluído" },
        { id: 34, numero: "00045", veiculoId: 21, data: diasAtras(500), servico: "Limpeza de bicos", mecanico: "João", valor: 360, status: "Concluído" },
        { id: 35, numero: "00130", veiculoId: 22, data: diasAtras(3), servico: "Alinhamento e balanceamento", mecanico: "João", valor: 180, status: "Em andamento" },
        { id: 36, numero: "00110", veiculoId: 23, data: diasAtras(60), servico: "Troca de correia dentada", mecanico: "André", valor: 780, status: "Concluído" },
        { id: 37, numero: "00140", veiculoId: 24, data: diasAtras(30), servico: "Troca de óleo", mecanico: "Carlos", valor: 260, status: "Concluído" }
      ],
      solicitacoes: [] // pedidos de exclusão avaliados (tabela solicitacao_exclusao)
    };
  }

  const db = carregarDados(CHAVE, dadosIniciais);
  const persistir = () => salvarDados(CHAVE, db);
  const novoId = () => ++db.proximoId;

  const clientePorId = id => db.clientes.find(c => c.id === id);
  const veiculoPorId = id => db.veiculos.find(v => v.id === id);
  const veiculosDoCliente = id => db.veiculos.filter(v => v.clienteId === id && v.ativo);

  // OS ainda não encerradas do cliente (todos os veículos dele) ou de um veículo só
  function osEmAberto(alvo) {
    const ids = alvo.tipo === "Cliente"
      ? db.veiculos.filter(v => v.clienteId === alvo.id).map(v => v.id)
      : [alvo.id];
    return db.ordens.filter(o => ids.includes(o.veiculoId) && !OS_ENCERRADA.includes(o.status));
  }

  const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const estado = {
    clienteId: null,        // cliente selecionado ou recém-cadastrado
    veiculoId: null,        // último veículo cadastrado/selecionado
    alvoExclusao: null,     // { tipo: "Cliente" | "Veículo", id }
    solicitacaoId: null,    // solicitação pendente que o administrador está avaliando
    origemExclusao: null,   // "cliente" (tela do cliente) ou "pendentes" (lista do administrador)
    clienteNoForm: null,    // cliente cujos dados estão hoje na tela "Conferir e atualizar"
    manterEdicao: false     // volta p/ essa tela sem apagar o que a pessoa já digitou
  };

  aplicarMascaras({
    telefone: fmtTelefone,
    cep: fmtCep,
    placa: fmtPlaca,
    chassi: fmtChassi,
    cpfcnpj: v => $("#c-tipo").value === "PJ" ? fmtCnpj(v) : fmtCpf(v)
  });
  iniciarTelas({ perfil: "Atendente" });

  function preencherLista(select, itens, selecionado, textoVazio) {
    select.innerHTML = (textoVazio ? `<option value="">${textoVazio}</option>` : "") +
      itens.map(i => `<option value="${escapar(i)}">${escapar(i)}</option>`).join("");
    select.value = selecionado || "";
  }
  preencherLista($("#c-uf"), UFS, "MG");
  preencherLista($("#v-marca"), MARCAS, "", "Selecione a marca...");

  function fimDoProcesso(msg) {
    estado.clienteId = null;
    estado.veiculoId = null;
    estado.alvoExclusao = null;
    estado.solicitacaoId = null;
    estado.clienteNoForm = null;
    estado.manterEdicao = false;
    resetarPesquisa();
    irPara("tela-pesquisar");
    if (msg) avisar(msg);
  }

  $("#logo").addEventListener("click", e => { e.preventDefault(); fimDoProcesso(); });
  $("#btn-cancelar-processo").addEventListener("click", () => fimDoProcesso("Processo encerrado."));

  // ---------------------------------------------------------------
  // 1. Pesquisar cliente
  // ---------------------------------------------------------------

  let selecionadoPesquisa = null;
  let ultimaPesquisa = null;

  const PLACEHOLDERS = {
    nome: "Digite no mínimo 3 caracteres...",
    doc: "Ex.: 529.982.247-25",
    telefone: "Ex.: (31) 99653-4312",
    placa: "Ex.: ABC-1234"
  };

  $("#criterio").addEventListener("change", () => {
    $("#termo").placeholder = PLACEHOLDERS[$("#criterio").value];
    $("#termo").focus();
  });

  function buscar(criterio, termo) {
    const ativos = db.clientes.filter(c => c.ativo);
    let achados;
    if (criterio === "nome") {
      const t = semAcento(termo.trim());
      achados = ativos.filter(c => semAcento(c.nome).includes(t));
    } else if (criterio === "doc") {
      const d = soDigitos(termo);
      achados = ativos.filter(c => c.doc.includes(d));
    } else if (criterio === "telefone") {
      const d = soDigitos(termo);
      achados = ativos.filter(c => c.telefone.includes(d));
    } else {
      const p = soPlaca(termo);
      achados = ativos.filter(c => veiculosDoCliente(c.id).some(v => v.placa.includes(p)));
    }
    return achados.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function renderResultados(lista) {
    const tbody = $("#tabela-resultados tbody");
    selecionadoPesquisa = null;
    $("#btn-selecionar").disabled = true;

    if (!lista) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="5">Nenhuma pesquisa realizada.</td></tr>`;
      $("#dica-resultados").textContent = "Informe o termo de busca e clique em Pesquisar. Dê dois cliques em uma linha para abrir o cliente.";
      return;
    }
    if (!lista.length) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="5">Nenhum cliente encontrado. Use “Cadastrar novo cliente” para incluí-lo.</td></tr>`;
      $("#dica-resultados").textContent = "";
      return;
    }
    tbody.innerHTML = lista.map(c => `
      <tr class="clicavel" data-id="${c.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-cliente" value="${c.id}" aria-label="Selecionar ${escapar(c.nome)}"></td>
        <td>${escapar(c.nome)}</td>
        <td>${fmtDoc(c.doc)}</td>
        <td>${fmtTelefone(c.telefone)}</td>
        <td class="centro">${veiculosDoCliente(c.id).length}</td>
      </tr>`).join("");
    $("#dica-resultados").textContent = `${lista.length} cliente(s) encontrado(s). Dê dois cliques em uma linha para abrir o cliente.`;
  }

  $("#tabela-resultados tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    marcarLinha(e.currentTarget, tr);
    selecionadoPesquisa = Number(tr.dataset.id);
    $("#btn-selecionar").disabled = false;
  });

  $("#tabela-resultados tbody").addEventListener("dblclick", e => {
    const tr = e.target.closest("tr.clicavel");
    if (tr) abrirCliente(Number(tr.dataset.id));
  });

  $("#form-pesquisa").addEventListener("submit", e => {
    e.preventDefault();
    const criterio = $("#criterio").value;
    const termo = $("#termo").value.trim();
    const qtde = criterio === "nome" ? termo.length
      : criterio === "placa" ? soPlaca(termo).length
      : soDigitos(termo).length;

    if (qtde < 3) {
      erro("termo", criterio === "doc" || criterio === "telefone" ? "Informe no mínimo 3 números." : "Informe no mínimo 3 caracteres.");
      $("#termo").focus();
      return;
    }
    ultimaPesquisa = { criterio, termo };
    renderResultados(buscar(criterio, termo));
  });

  function resetarPesquisa() {
    $("#criterio").value = "nome";
    $("#termo").value = "";
    $("#termo").placeholder = PLACEHOLDERS.nome;
    ultimaPesquisa = null;
    erro("termo", "");
    renderResultados(null);
    renderSolicitacoes();
  }

  // ao voltar p/ a pesquisa, refaz a busca: o cadastro pode ter mudado (veículo novo, cliente excluído)
  aoAbrir["tela-pesquisar"] = () => {
    if (ultimaPesquisa) renderResultados(buscar(ultimaPesquisa.criterio, ultimaPesquisa.termo));
    renderSolicitacoes();
  };

  // solicitações de exclusão aguardando o administrador
  const pendentes = () => db.solicitacoes.filter(s => s.status === "PENDENTE");
  const pendenteDe = alvo => pendentes().find(s => s.tipoAlvo === alvo.tipo &&
    (alvo.tipo === "Cliente" ? s.clienteId === alvo.id && !s.veiculoId : s.veiculoId === alvo.id));

  function identificacao(s) {
    if (s.tipoAlvo === "Cliente") {
      const c = clientePorId(s.clienteId);
      return c ? `${c.nome} – ${fmtDoc(c.doc)}` : "—";
    }
    const v = veiculoPorId(s.veiculoId);
    return v ? `${fmtPlaca(v.placa)} – ${v.marca} ${v.modelo}` : "—";
  }

  function renderSolicitacoes() {
    $("#bloco-solicitacoes").hidden = !AVALIA_EXCLUSAO;
    if (!AVALIA_EXCLUSAO) return;
    const lista = pendentes();
    $("#tabela-solicitacoes tbody").innerHTML = lista.length ? lista.map(s => `
      <tr class="clicavel" data-id="${s.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-solicitacao" aria-label="Avaliar solicitação"></td>
        <td>${escapar(s.tipoAlvo)}</td>
        <td>${escapar(identificacao(s))}</td>
        <td>${escapar(s.justificativa)}</td>
        <td>${escapar(s.solicitante || "—")}</td>
        <td>${fmtData(s.dataSolicitacao.slice(0, 10))}</td>
      </tr>`).join("")
      : `<tr class="vazia"><td colspan="6">Nenhuma solicitação pendente.</td></tr>`;
  }

  $("#tabela-solicitacoes tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    const s = db.solicitacoes.find(x => x.id === Number(tr.dataset.id));
    estado.clienteId = s.clienteId;
    estado.alvoExclusao = s.tipoAlvo === "Cliente" ? { tipo: "Cliente", id: s.clienteId } : { tipo: "Veículo", id: s.veiculoId };
    estado.solicitacaoId = s.id;
    estado.origemExclusao = "pendentes";
    irPara("tela-exclusao");
  });

  $("#btn-limpar").addEventListener("click", () => { resetarPesquisa(); $("#termo").focus(); });
  $("#btn-selecionar").addEventListener("click", () => { if (selecionadoPesquisa) abrirCliente(selecionadoPesquisa); });

  function abrirCliente(id) {
    estado.clienteId = id;
    estado.veiculoId = null;
    estado.clienteNoForm = null;
    estado.manterEdicao = false;
    irPara("tela-conferir");
  }

  // ---------------------------------------------------------------
  // 2. Cadastrar cliente
  // ---------------------------------------------------------------

  function ajustarTipoPessoa() {
    const pj = $("#c-tipo").value === "PJ";
    $("#c-doc").placeholder = pj ? "00.000.000/0000-00" : "000.000.000-00";
    $("#c-doc").value = pj ? fmtCnpj($("#c-doc").value) : fmtCpf($("#c-doc").value);
    document.querySelector('label[for="c-nasc"]').textContent = pj ? "Data de fundação" : "Data de nascimento";
  }

  $("#c-tipo").addEventListener("change", () => { ajustarTipoPessoa(); erro("c-doc", ""); });

  $("#btn-novo-cliente").addEventListener("click", () => {
    irPara("tela-cliente");
    // aproveita o que foi pesquisado, p/ a pessoa não digitar de novo
    if (!ultimaPesquisa) return;
    const { criterio, termo } = ultimaPesquisa;
    if (criterio === "nome") $("#c-nome").value = termo;
    else if (criterio === "doc") $("#c-doc").value = fmtCpf(termo);
    else if (criterio === "telefone") $("#c-tel").value = fmtTelefone(termo);
  });

  aoAbrir["tela-cliente"] = () => {
    const form = $("#form-cliente");
    form.reset();
    limparErros(form);
    $("#c-tipo").value = "PF";
    $("#c-cidade").value = "Belo Horizonte";
    $("#c-uf").value = "MG";
    ajustarTipoPessoa();
    setTimeout(() => $("#c-nome").focus(), 50);
  };

  // nome, telefone e e-mail são validados igual no cadastro (prefixo c) e na atualização (prefixo u)
  function validarContato(nomeId, telId, emailId) {
    let ok = true;
    const nome = $(`#${nomeId}`).value.trim();
    const tel = $(`#${telId}`).value;
    const email = $(`#${emailId}`).value.trim();

    if (!nome) ok = erro(nomeId, "Informe o nome completo.") && ok;
    if (!soDigitos(tel)) ok = erro(telId, "Informe o telefone.") && ok;
    else if (!telefoneValido(tel)) ok = erro(telId, "Use o formato (00) 00000-0000.") && ok;
    if (email && !emailValido(email)) ok = erro(emailId, "E-mail inválido.") && ok;
    return ok;
  }

  $("#btn-salvar-cliente").addEventListener("click", () => {
    const form = $("#form-cliente");
    limparErros(form);
    let ok = validarContato("c-nome", "c-tel", "c-email");
    const tipo = $("#c-tipo").value;
    const doc = soDigitos($("#c-doc").value);
    const nasc = $("#c-nasc").value;
    const cep = soDigitos($("#c-cep").value);

    if (!doc) ok = erro("c-doc", `Informe o ${tipo === "PJ" ? "CNPJ" : "CPF"}.`) && ok;
    else if (!(tipo === "PJ" ? cnpjValido(doc) : cpfValido(doc))) ok = erro("c-doc", tipo === "PJ" ? "CNPJ inválido." : "CPF inválido.") && ok;
    else {
      const existente = db.clientes.find(c => c.doc === doc);
      if (existente) ok = erro("c-doc", existente.ativo ? "Já existe um cliente com este CPF/CNPJ." : "Este CPF/CNPJ pertence a um cadastro excluído.") && ok;
    }
    if (nasc && nasc > hojeIso()) ok = erro("c-nasc", "A data não pode ser futura.") && ok;
    if (cep && cep.length !== 8) ok = erro("c-cep", "Use o formato 00000-000.") && ok;
    if (!ok) { focarPrimeiroErro(form); return; }

    // o banco guarda o endereço em um campo só (cliente.endereco, 200 caracteres)
    const endereco = [
      $("#c-end").value.trim(),
      $("#c-bairro").value.trim(),
      [$("#c-cidade").value.trim(), $("#c-uf").value].filter(Boolean).join("/"),
      cep ? `CEP ${fmtCep(cep)}` : ""
    ].filter(Boolean).join(" - ");

    const cliente = {
      id: novoId(), nome: $("#c-nome").value.trim(), tipo, doc, nascimento: nasc,
      telefone: soDigitos($("#c-tel").value), email: $("#c-email").value.trim(), endereco, ativo: true
    };
    db.clientes.push(cliente);
    persistir();

    estado.clienteId = cliente.id;
    estado.veiculoId = null;
    irPara("tela-veiculo");
    avisar(`Cliente ${cliente.nome} cadastrado. Agora cadastre o veículo.`);
  });

  // ---------------------------------------------------------------
  // 3. Conferir e atualizar dados do cliente
  // ---------------------------------------------------------------

  let selecionadoVeiculo = null; // veículo marcado na tabela desta tela

  function renderVeiculosCliente() {
    const tbody = $("#tabela-veiculos-cliente tbody");
    const lista = veiculosDoCliente(estado.clienteId);
    selecionadoVeiculo = null;
    tbody.innerHTML = lista.length ? lista.map(v => `
      <tr class="clicavel" data-id="${v.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-veiculo" value="${v.id}" aria-label="Selecionar ${fmtPlaca(v.placa)}"></td>
        <td>${fmtPlaca(v.placa)}</td>
        <td>${escapar(v.marca)}</td>
        <td>${escapar(v.modelo)}</td>
        <td>${v.ano}</td>
      </tr>`).join("")
      : `<tr class="vazia"><td colspan="5">Nenhum veículo vinculado. Use “Cadastrar veículo”.</td></tr>`;
  }

  $("#tabela-veiculos-cliente tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    const id = Number(tr.dataset.id);
    if (selecionadoVeiculo === id) { // clicou de novo: desmarca
      selecionadoVeiculo = null;
      tr.classList.remove("selecionada");
      tr.querySelector("input.radio").checked = false;
    } else {
      marcarLinha(e.currentTarget, tr);
      selecionadoVeiculo = id;
    }
  });

  aoAbrir["tela-conferir"] = () => {
    const c = clientePorId(estado.clienteId);
    if (!c) { fimDoProcesso(); return; }
    renderVeiculosCliente();

    // voltando de outra tela sem salvar: não apaga o que já foi digitado
    const manter = estado.manterEdicao && estado.clienteNoForm === c.id;
    estado.manterEdicao = false;
    if (manter) return;

    const form = $("#form-conferir");
    form.reset();
    limparErros(form);
    $("#u-nome").value = c.nome;
    $("#u-doc").value = fmtDoc(c.doc);
    $("#u-tel").value = fmtTelefone(c.telefone);
    $("#u-email").value = c.email || "";
    $("#u-end").value = c.endereco || "";
    estado.clienteNoForm = c.id;
    setTimeout(() => $("#u-nome").focus(), 50);
  };

  // veículo a mostrar no histórico: o marcado na tabela, senão o último cadastrado/selecionado
  function abrirHistorico() {
    if (!veiculosDoCliente(estado.clienteId).length) {
      avisar("Este cliente ainda não tem veículo. Cadastre um veículo primeiro.", true);
      return;
    }
    if (selecionadoVeiculo) estado.veiculoId = selecionadoVeiculo;
    irPara("tela-historico");
  }

  $("#btn-salvar-alteracoes").addEventListener("click", () => {
    const form = $("#form-conferir");
    limparErros(form);
    if (!validarContato("u-nome", "u-tel", "u-email")) { focarPrimeiroErro(form); return; }

    const c = clientePorId(estado.clienteId);
    c.nome = $("#u-nome").value.trim();
    c.telefone = soDigitos($("#u-tel").value);
    c.email = $("#u-email").value.trim();
    c.endereco = $("#u-end").value.trim();
    persistir();

    if (!veiculosDoCliente(c.id).length) {
      avisar("Dados do cliente atualizados. Ele ainda não tem veículo cadastrado.");
      return;
    }
    abrirHistorico();
    avisar("Dados do cliente atualizados.");
  });

  $("#btn-conf-veiculo").addEventListener("click", () => irPara("tela-veiculo"));
  $("#btn-conf-historico").addEventListener("click", abrirHistorico);

  $("#btn-solicitar-exclusao").addEventListener("click", () => {
    const alvo = selecionadoVeiculo
      ? { tipo: "Veículo", id: selecionadoVeiculo }
      : { tipo: "Cliente", id: estado.clienteId };
    const pend = pendenteDe(alvo);
    if (pend && !AVALIA_EXCLUSAO) {
      avisar(`Já existe uma solicitação de exclusão deste ${alvo.tipo === "Cliente" ? "cliente" : "veículo"} aguardando o administrador.`, true);
      return;
    }
    estado.alvoExclusao = alvo;
    estado.solicitacaoId = pend ? pend.id : null; // administrador avalia a que já estava pendente
    estado.origemExclusao = "cliente";
    irPara("tela-exclusao");
  });

  // ---------------------------------------------------------------
  // 4. Cadastrar veículo
  // ---------------------------------------------------------------

  let fotoSelecionada = null;

  function prepararFormVeiculo() {
    const c = clientePorId(estado.clienteId);
    const form = $("#form-veiculo");
    form.reset();
    limparErros(form);
    fotoSelecionada = null;
    $("#v-foto-nome").textContent = "Nenhum arquivo";
    $("#v-foto-previa").hidden = true;
    $("#v-foto-previa").removeAttribute("src");

    $("#v-cliente").value = c.nome;
    $("#v-marca").value = "";
    $("#v-comb").value = "Flex";
    $("#v-km").value = 0;
  }

  aoAbrir["tela-veiculo"] = () => {
    if (!clientePorId(estado.clienteId)) { fimDoProcesso(); return; }
    prepararFormVeiculo();
    setTimeout(() => $("#v-placa").focus(), 50);
  };

  $("#v-foto").addEventListener("change", () => {
    const arq = $("#v-foto").files[0];
    $("#v-foto-previa").hidden = true;
    if (!arq) { fotoSelecionada = null; $("#v-foto-nome").textContent = "Nenhum arquivo"; return; }
    $("#v-foto-nome").textContent = arq.name;
    const msg = erroArquivo(arq, ["image/jpeg", "image/png"], 5);
    if (msg) { fotoSelecionada = null; erro("v-foto", msg === "Formato de arquivo não permitido." ? "Envie uma imagem JPG ou PNG." : msg); return; }
    fotoSelecionada = arq.name;
    const leitor = new FileReader();
    leitor.onload = () => { $("#v-foto-previa").src = leitor.result; $("#v-foto-previa").hidden = false; };
    leitor.readAsDataURL(arq);
  });

  // valida e grava; devolve o veículo ou null se houver erro
  function salvarVeiculo() {
    const form = $("#form-veiculo");
    limparErros(form);
    let ok = true;
    const placa = soPlaca($("#v-placa").value);
    const chassi = fmtChassi($("#v-chassi").value);
    const ano = $("#v-ano").value;
    const km = $("#v-km").value;
    const anoMax = new Date().getFullYear() + 1;

    if (!placa) ok = erro("v-placa", "Informe a placa.") && ok;
    else if (!placaValida(placa)) ok = erro("v-placa", "Use o formato AAA-0000 ou Mercosul AAA0A00.") && ok;
    else {
      const existente = db.veiculos.find(v => v.placa === placa);
      if (existente) {
        const msg = !existente.ativo ? "Esta placa pertence a um cadastro excluído."
          : existente.clienteId === estado.clienteId ? "Este veículo já está vinculado a este cliente."
          : "Esta placa já está cadastrada para outro cliente.";
        ok = erro("v-placa", msg) && ok;
      }
    }
    if (!$("#v-marca").value) ok = erro("v-marca", "Selecione a marca.") && ok;
    if (!$("#v-modelo").value.trim()) ok = erro("v-modelo", "Informe o modelo.") && ok;
    if (!ano) ok = erro("v-ano", "Informe o ano de fabricação.") && ok;
    else if (!Number.isInteger(Number(ano)) || Number(ano) < 1950 || Number(ano) > anoMax)
      ok = erro("v-ano", `Informe um ano entre 1950 e ${anoMax}.`) && ok;
    if (km !== "" && (!Number.isInteger(Number(km)) || Number(km) < 0)) ok = erro("v-km", "A quilometragem deve ser um número inteiro maior ou igual a 0.") && ok;
    if (chassi) {
      if (chassi.length !== 17) ok = erro("v-chassi", "O chassi deve ter 17 caracteres alfanuméricos.") && ok;
      else if (db.veiculos.some(v => v.chassi === chassi)) ok = erro("v-chassi", "Já existe um veículo com este chassi.") && ok;
    }
    if ($("#v-foto").files[0] && !fotoSelecionada) ok = erro("v-foto", "Envie uma imagem JPG ou PNG de até 5 MB.") && ok;

    if (!ok) { focarPrimeiroErro(form); return null; }

    const veiculo = {
      id: novoId(), clienteId: estado.clienteId, placa, chassi: chassi || null,
      marca: $("#v-marca").value, modelo: $("#v-modelo").value.trim(), ano: Number(ano),
      cor: $("#v-cor").value.trim(), combustivel: $("#v-comb").value, km: Number(km || 0),
      foto: fotoSelecionada, ativo: true
    };
    db.veiculos.push(veiculo);
    persistir();
    estado.veiculoId = veiculo.id;
    return veiculo;
  }

  $("#btn-salvar-veiculo").addEventListener("click", () => {
    const v = salvarVeiculo();
    if (!v) return;
    irPara("tela-historico");
    avisar(`Veículo ${fmtPlaca(v.placa)} cadastrado.`);
  });

  $("#btn-salvar-outro").addEventListener("click", () => {
    const v = salvarVeiculo();
    if (!v) return;
    prepararFormVeiculo();
    avisar(`Veículo ${fmtPlaca(v.placa)} cadastrado. Cadastre o próximo.`);
    setTimeout(() => $("#v-placa").focus(), 60);
  });

  $("#btn-cancelar-veiculo").addEventListener("click", () => {
    estado.manterEdicao = true;
    irPara("tela-conferir");
  });

  // ---------------------------------------------------------------
  // 5. Consultar histórico do veículo
  // ---------------------------------------------------------------

  aoAbrir["tela-historico"] = () => {
    const c = clientePorId(estado.clienteId);
    if (!c) { fimDoProcesso(); return; }
    const lista = veiculosDoCliente(c.id);
    const select = $("#h-veiculo");

    select.innerHTML = lista.map(v =>
      `<option value="${v.id}">${fmtPlaca(v.placa)} – ${escapar(v.marca)} ${escapar(v.modelo)} (${v.ano})</option>`).join("");
    const atual = lista.some(v => v.id === estado.veiculoId) ? estado.veiculoId
      : (lista.length ? lista[lista.length - 1].id : null); // padrão: último cadastrado
    select.value = atual ? String(atual) : "";
    estado.veiculoId = atual;

    $("#h-inicio").max = $("#h-fim").max = hojeIso();
    $("#h-inicio").value = diasAtras(365); // padrão: últimos 12 meses
    $("#h-fim").value = hojeIso();
    $("#btn-orcamento").disabled = !atual;
    renderHistorico();
  };

  function renderHistorico() {
    const tbody = $("#tabela-historico tbody");
    const veiculoId = Number($("#h-veiculo").value);
    const ini = $("#h-inicio").value;
    const fim = $("#h-fim").value;
    const vazia = msg => { tbody.innerHTML = `<tr class="vazia"><td colspan="6">${msg}</td></tr>`; $("#dica-historico").textContent = ""; };

    erro("h-inicio", "");
    if (!veiculoId) { vazia("Este cliente não tem veículo cadastrado."); return; }
    if (ini && fim && ini > fim) {
      erro("h-inicio", "A data inicial deve ser menor ou igual à data final.");
      vazia("Corrija o período para ver o histórico.");
      return;
    }

    const lista = db.ordens
      .filter(o => o.veiculoId === veiculoId && (!ini || o.data >= ini) && (!fim || o.data <= fim))
      .sort((a, b) => b.data.localeCompare(a.data));

    if (!lista.length) { vazia("Nenhum serviço registrado para este veículo no período."); return; }
    tbody.innerHTML = lista.map(o => `
      <tr>
        <td>${fmtData(o.data)}</td>
        <td>${escapar(o.numero)}</td>
        <td>${escapar(o.servico)}</td>
        <td>${escapar(o.mecanico)}</td>
        <td class="valor">${fmtMoeda(o.valor)}</td>
        <td><span class="etiqueta ${o.status === "Concluído" ? "ok" : "andamento"}">${escapar(o.status)}</span></td>
      </tr>`).join("");
    $("#dica-historico").textContent = `${lista.length} registro(s) no período.`;
  }

  $("#h-veiculo").addEventListener("change", () => { estado.veiculoId = Number($("#h-veiculo").value); renderHistorico(); });
  $("#h-inicio").addEventListener("change", renderHistorico);
  $("#h-fim").addEventListener("change", renderHistorico);

  $("#btn-orcamento").addEventListener("click", () => {
    // TODO: quando o Processo 3 (Orçamento) existir, abrir a página dele levando cliente e veículo,
    // ex.: location.href = `../processo3/index.html?cliente=${estado.clienteId}&veiculo=${estado.veiculoId}`
    avisar("O Processo 3 (Orçamento) ainda não está disponível nesta versão.", true);
  });

  $("#btn-voltar-historico").addEventListener("click", () => {
    estado.manterEdicao = true;
    irPara("tela-conferir");
  });

  $("#btn-concluir-historico").addEventListener("click", () => fimDoProcesso("Processo concluído: cliente e veículo atualizados."));

  // ---------------------------------------------------------------
  // 6. Avaliar exclusão de cadastro (Administrador)
  // ---------------------------------------------------------------

  aoAbrir["tela-exclusao"] = () => {
    const alvo = estado.alvoExclusao;
    const cliente = alvo && clientePorId(alvo.tipo === "Cliente" ? alvo.id : (veiculoPorId(alvo.id) || {}).clienteId);
    if (!alvo || !cliente) { fimDoProcesso(); return; }

    const form = $("#form-exclusao");
    form.reset();
    limparErros(form);
    $("#x-tipo").value = alvo.tipo;
    $("#x-nao").checked = true; // padrão: Não
    $("#x-contador").textContent = "0/500";

    let ident, resumo;
    const abertas = osEmAberto(alvo);
    if (alvo.tipo === "Cliente") {
      ident = `${cliente.nome} – ${fmtDoc(cliente.doc)}`;
      resumo = `<span>Cliente<br><strong>${escapar(cliente.nome)}</strong></span>
                <span>Veículos vinculados<br><strong>${veiculosDoCliente(cliente.id).length}</strong></span>`;
    } else {
      const v = veiculoPorId(alvo.id);
      ident = `${fmtPlaca(v.placa)} – ${v.marca} ${v.modelo} (${v.ano})`;
      resumo = `<span>Veículo<br><strong>${fmtPlaca(v.placa)}</strong></span>
                <span>Proprietário<br><strong>${escapar(cliente.nome)}</strong></span>`;
    }
    $("#x-ident").value = ident;
    $("#resumo-exclusao").innerHTML = resumo + `
      <span>OS em aberto<br><strong>${abertas.length}</strong></span>
      <span>Situação<br>${abertas.length
        ? `<span class="etiqueta andamento">Exclusão não permitida</span>`
        : `<span class="etiqueta ok">Pode ser excluído</span>`}</span>`;
    $("#btn-confirmar-exclusao").disabled = abertas.length > 0;

    // administrador avalia; funcionário só envia a solicitação
    const sol = estado.solicitacaoId && db.solicitacoes.find(s => s.id === estado.solicitacaoId);
    const titulo = AVALIA_EXCLUSAO ? "Avaliar exclusão de cadastro" : "Solicitar exclusão de cadastro";
    $("#x-titulo").textContent = titulo;
    $("#tela-exclusao").dataset.titulo = titulo;
    $("#trilha-tela").textContent = titulo;
    document.title = `MagisCar – ${titulo}`;
    $("#x-dica").hidden = AVALIA_EXCLUSAO && !sol;
    $("#x-dica").textContent = sol
      ? `Solicitado por ${sol.solicitante || "—"} em ${fmtData(sol.dataSolicitacao.slice(0, 10))}.`
      : "A exclusão só é feita depois da aprovação do administrador.";
    if (sol) $("#x-motivo").value = sol.justificativa;
    $("#x-contador").textContent = `${$("#x-motivo").value.length}/500`;
    $("#campo-confirma").hidden = !AVALIA_EXCLUSAO;
    $("#btn-confirmar-exclusao").hidden = !AVALIA_EXCLUSAO;
    $("#btn-recusar-exclusao").hidden = !AVALIA_EXCLUSAO;
    $("#btn-enviar-solicitacao").hidden = AVALIA_EXCLUSAO;
    $("#btn-enviar-solicitacao").disabled = abertas.length > 0;
    setTimeout(() => $("#x-motivo").focus(), 50);
  };

  $("#x-motivo").addEventListener("input", () => {
    $("#x-contador").textContent = `${$("#x-motivo").value.length}/500`;
  });
  document.querySelectorAll('input[name="x-confirma"]').forEach(r => r.addEventListener("change", () => erro("x-confirma", "")));

  // registra o pedido (tabela solicitacao_exclusao)
  // status: PENDENTE (enviado pelo funcionário), APROVADA ou RECUSADA (decisão do administrador)
  function registrarSolicitacao(status, motivo) {
    const alvo = estado.alvoExclusao;
    const agora = new Date().toISOString();
    const existente = estado.solicitacaoId && db.solicitacoes.find(s => s.id === estado.solicitacaoId);
    if (existente) { // administrador decidindo uma solicitação pendente
      Object.assign(existente, { status, justificativa: motivo, avaliador: usuario.nome, dataAvaliacao: agora });
      return;
    }
    db.solicitacoes.push({
      id: novoId(), tipoAlvo: alvo.tipo, justificativa: motivo, status,
      dataSolicitacao: agora, solicitante: usuario.nome,
      avaliador: status === "PENDENTE" ? null : usuario.nome,
      dataAvaliacao: status === "PENDENTE" ? null : agora,
      clienteId: alvo.tipo === "Cliente" ? alvo.id : veiculoPorId(alvo.id).clienteId,
      veiculoId: alvo.tipo === "Veículo" ? alvo.id : null
    });
  }

  // funcionário: envia a solicitação para o administrador
  $("#btn-enviar-solicitacao").addEventListener("click", () => {
    const form = $("#form-exclusao");
    limparErros(form);
    const alvo = estado.alvoExclusao;
    const motivo = $("#x-motivo").value.trim();
    if (!motivo) { erro("x-motivo", "Informe o motivo da exclusão."); focarPrimeiroErro(form); return; }
    if (osEmAberto(alvo).length) { avisar("Não é permitido excluir cadastro com OS em aberto.", true); return; }
    if (pendenteDe(alvo)) { avisar("Já existe uma solicitação pendente para este cadastro.", true); return; }
    registrarSolicitacao("PENDENTE", motivo);
    persistir();
    fimDoProcesso("Solicitação de exclusão enviada ao administrador.");
  });

  // volta para onde a pessoa estava: lista de pendentes (pesquisa) ou dados do cliente
  $("#btn-cancelar-exclusao").addEventListener("click", () => {
    if (estado.origemExclusao === "pendentes") { fimDoProcesso(); return; }
    estado.manterEdicao = true;
    irPara("tela-conferir");
  });

  $("#btn-confirmar-exclusao").addEventListener("click", () => {
    if (!AVALIA_EXCLUSAO) return;
    const form = $("#form-exclusao");
    limparErros(form);
    const alvo = estado.alvoExclusao;
    const motivo = $("#x-motivo").value.trim();
    let ok = true;

    if (!motivo) ok = erro("x-motivo", "Informe o motivo da exclusão.") && ok;
    if (!$("#x-sim").checked) ok = erro("x-confirma", "Marque “Sim” para confirmar a exclusão ou use Recusar.") && ok;
    else if (osEmAberto(alvo).length) ok = erro("x-confirma", "Não é permitido excluir cadastro com OS em aberto.") && ok;
    if (!ok) { focarPrimeiroErro(form); return; }

    // exclusão lógica: o cadastro fica no banco com ativo = false, p/ não perder o histórico
    if (alvo.tipo === "Cliente") {
      clientePorId(alvo.id).ativo = false;
      db.veiculos.filter(v => v.clienteId === alvo.id).forEach(v => { v.ativo = false; });
    } else {
      veiculoPorId(alvo.id).ativo = false;
    }
    registrarSolicitacao("APROVADA", motivo);
    persistir();
    fimDoProcesso(`${alvo.tipo === "Cliente" ? "Cliente" : "Veículo"} excluído do sistema.`);
  });

  $("#btn-recusar-exclusao").addEventListener("click", () => {
    if (!AVALIA_EXCLUSAO) return;
    const form = $("#form-exclusao");
    limparErros(form);
    const motivo = $("#x-motivo").value.trim();
    if (!motivo) { erro("x-motivo", "Informe o motivo da exclusão."); focarPrimeiroErro(form); return; }
    registrarSolicitacao("RECUSADA", motivo);
    persistir();
    fimDoProcesso("Exclusão recusada. O cadastro foi mantido.");
  });

  resetarPesquisa();
  persistir();
})();
