(function () {
  const {
    $, soDigitos, hojeIso, diasAtras, fmtData, escapar,
    fmtMoeda, mascaraMoeda, lerMoeda, fmtNumero, erroArquivo,
    erro, limparErros, focarPrimeiroErro, aplicarMascaras, marcarLinha,
    aoAbrir, irPara, iniciarTelas, definirAcesso, avisar, carregarDados, salvarDados
  } = MagisCar;

  const CHAVE = "magiscar.processo6";
  const CHAVE_P1 = "magiscar.processo1"; // clientes, veículos e histórico
  const CHAVE_P2 = "magiscar.processo2"; // itens e saldos do estoque

  // ---------------------------------------------------------------
  // Perfil logado (auth.js)
  //   funcionário: pesquisa, abertura, autorização, conferência e entrega;
  //                diagnóstico, execução e peças só para consulta
  //   mecânico:    lista de OS, diagnóstico, execução e peças
  //   administrador: tudo
  // ---------------------------------------------------------------

  const usuario = MagisAuth.usuario();
  if (!usuario) return; // sem login: o auth.js já está levando para a tela de login
  const PODE_ATENDER = MagisAuth.pode("os.atendimento");
  const PODE_MECANICO = MagisAuth.pode("os.mecanico");
  const meuMecanicoId = usuario.perfil === "mecanico" ? usuario.mecanicoId : null;

  const TELAS_ATENDIMENTO = ["tela-historico", "tela-abrir", "tela-autorizacao", "tela-conferencia", "tela-entrega"];
  const TELAS_MECANICO = ["tela-diagnostico", "tela-execucao", "tela-pecas"];
  const ETAPAS_MECANICO = ["Aberta", "Em diagnóstico", "Em execução"];

  // o mecânico não entra nas telas do atendimento; as do mecânico o funcionário só consulta
  definirAcesso(id => PODE_ATENDER || !TELAS_ATENDIMENTO.includes(id));

  function exigirMecanico() {
    if (PODE_MECANICO) return true;
    avisar("Somente o mecânico pode atualizar esta etapa da OS.", true);
    return false;
  }

  // deixa a tela do mecânico só para consulta (funcionário)
  // botões com data-livre (Voltar etc.) continuam funcionando
  function travar(idTela) {
    if (PODE_MECANICO) return;
    const tela = $(`#${idTela}`);
    tela.querySelectorAll("input, select, textarea, button").forEach(el => {
      if (!el.hasAttribute("data-livre")) el.disabled = true;
    });
    tela.querySelectorAll("[data-add], [data-rem]").forEach(b => { b.hidden = true; });
    const av = tela.querySelector("[data-leitura]");
    if (av) av.hidden = false;
  }

  // ---------------------------------------------------------------
  // Dados de exemplo (temporários, até existir o back-end).
  // Os de clientes/veículos e de estoque são cópia dos dados iniciais dos
  // Processos 1 e 2: só valem enquanto aqueles processos ainda não gravaram
  // nada no navegador. Depois disso, este processo lê e grava nas chaves deles.
  // ---------------------------------------------------------------

  function dadosP1() {
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
      solicitacoes: []
    };
  }

  function dadosP2() {
    return {
      proximoId: 100,
      fornecedores: [
        { id: 1, nome: "Auto Peças LTDA", cnpj: "12345678000195", telefone: "3133409762", email: "vendas@autopecas.com.br", categorias: ["Peça", "Material de consumo"] },
        { id: 2, nome: "Fras-le Distribuidora", cnpj: "45231890000180", telefone: "5432391000", email: "pedidos@frasle-dist.com.br", categorias: ["Peça"] },
        { id: 3, nome: "Lubrificantes MG", cnpj: "07881234000134", telefone: "31988776655", email: "contato@lubrificantesmg.com.br", categorias: ["Material de consumo"] },
        { id: 4, nome: "Belzer Ferramentas", cnpj: "33669912000100", telefone: "1140028922", email: "comercial@belzerferramentas.com.br", categorias: ["Ferramenta"] }
      ],
      itens: [
        { id: 11, codigo: "000123", descricao: "Filtro de óleo", categoria: "Peça", marca: "Bosch", custo: 25, venda: 45, localizacao: "Prateleira A-3", fornecedorId: 1, minimo: 10, saldo: 3 },
        { id: 12, codigo: "000456", descricao: "Pastilha de freio", categoria: "Peça", marca: "Fras-le", custo: 60, venda: 110, localizacao: "Prateleira B-1", fornecedorId: 2, minimo: 20, saldo: 12 },
        { id: 13, codigo: "000789", descricao: "Óleo de motor 5W30 (litro)", categoria: "Material de consumo", marca: "Castrol", custo: 32, venda: 55, localizacao: "Corredor C", fornecedorId: 3, minimo: 15, saldo: 9 },
        { id: 14, codigo: "001202", descricao: "Chave de roda", categoria: "Ferramenta", marca: "Belzer", custo: 48, venda: 48, localizacao: "Armário de ferramentas", fornecedorId: 4, minimo: 2, saldo: 4 }
      ],
      pedidos: [
        { numero: "0031", itemId: 11, fornecedorId: 1, quantidade: 20, recebido: 0, data: diasAtras(5), status: "Enviado" },
        { numero: "0033", itemId: 13, fornecedorId: 3, quantidade: 24, recebido: 0, data: diasAtras(2), status: "Enviado" }
      ],
      entradas: []
    };
  }

  function dadosIniciais() { // só o que é do Processo 6 (e do Processo 5, que ainda não existe)
    return {
      proximoId: 100,
      // os mecânicos agora vêm dos usuários com perfil Mecânico (MagisAuth.mecanicos())
      agendamentos: [ // virão do Processo 5
        { id: 1, clienteId: 1, veiculoId: 21, data: hojeIso(), hora: "09:00", servico: "Revisão geral", situacao: "Agendado" },
        { id: 2, clienteId: 2, veiculoId: 23, data: hojeIso(), hora: "10:30", servico: "Troca de óleo e filtro", situacao: "Agendado" },
        { id: 3, clienteId: 3, veiculoId: 24, data: diasAtras(-2), hora: "14:00", servico: "Freios fazendo barulho", situacao: "Agendado" },
        { id: 4, clienteId: 1, veiculoId: 21, data: diasAtras(40), hora: "08:00", servico: "Troca de óleo", situacao: "Atendido" }
      ],
      ordens: []
    };
  }

  const db = carregarDados(CHAVE, dadosIniciais);
  const persistir = () => salvarDados(CHAVE, db);
  const novoId = () => ++db.proximoId;

  // serviços mais comuns (valor padrão só para facilitar o teste)
  const SERVICOS = [
    ["Troca de óleo e filtro", 180],
    ["Revisão geral", 420],
    ["Troca de pastilhas de freio", 150],
    ["Alinhamento e balanceamento", 180],
    ["Suspensão", 0],
    ["Elétrica / bateria", 0],
    ["Ar-condicionado", 0]
  ];

  const SIT_SERVICO = ["Não iniciado", "Em andamento", "Concluído", "Impedido"];

  // ---------------------------------------------------------------
  // Acesso aos dados dos Processos 1 e 2
  // ---------------------------------------------------------------

  const lerP1 = () => carregarDados(CHAVE_P1, dadosP1);
  const lerP2 = () => carregarDados(CHAVE_P2, dadosP2);

  const clientePorId = id => lerP1().clientes.find(c => c.id === id);
  const veiculoPorId = id => lerP1().veiculos.find(v => v.id === id);
  const itemPorId = id => lerP2().itens.find(i => i.id === id);
  const mecanicoPorId = id => MagisAuth.mecanicos().find(m => m.id === id);
  const nomeMecanico = id => (mecanicoPorId(id) || {}).nome || "—";
  const osPorId = id => db.ordens.find(o => o.id === id);

  const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const soPlaca = v => (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  function fmtPlaca(v) {
    const p = soPlaca(v).slice(0, 7);
    return /^[A-Z]{3}\d\d/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
  }
  function fmtDoc(v) {
    const d = soDigitos(v);
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  function fmtTel(v) {
    const d = soDigitos(v);
    return d.length === 11 ? d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  const rotuloVeiculo = v => v ? `${fmtPlaca(v.placa)} – ${v.marca} ${v.modelo} ${v.ano}` : "—";

  const agora = () => {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return `${hojeIso()}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const fmtDH = s => s ? `${fmtData(s.slice(0, 10))} ${s.slice(11, 16)}` : "—";

  function opcoes(select, lista, selecionado, vazio) {
    select.innerHTML = (vazio !== undefined ? `<option value="">${escapar(vazio)}</option>` : "") +
      lista.map(o => `<option value="${escapar(o.v)}">${escapar(o.t)}</option>`).join("");
    select.value = selecionado == null ? "" : String(selecionado);
  }
  // só mecânicos ativos (e o já escolhido na OS, mesmo que tenha sido desativado)
  const opcoesMecanicos = (select, sel, vazio) =>
    opcoes(select, MagisAuth.mecanicos().filter(m => m.ativo || m.id === sel).map(m => ({ v: m.id, t: m.nome })), sel, vazio);

  // itens do estoque que podem ser consumidos por uma OS (ferramenta não é consumida)
  const itensConsumiveis = () => lerP2().itens.filter(i => i.categoria !== "Ferramenta")
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  const rotuloItem = i => `${i.codigo} – ${i.descricao}`;

  // ---------------------------------------------------------------
  // Regras da OS
  // ---------------------------------------------------------------

  const ABERTAS = ["Aberta", "Em diagnóstico", "Aguardando autorização", "Em execução", "Em conferência", "Aguardando entrega"];
  const TELA_DA_SITUACAO = {
    "Aberta": "tela-diagnostico",
    "Em diagnóstico": "tela-diagnostico",
    "Aguardando autorização": "tela-autorizacao",
    "Em execução": "tela-execucao",
    "Em conferência": "tela-conferencia",
    "Aguardando entrega": "tela-entrega"
  };

  // tela em que o usuário logado retoma a OS (null = não pode retomar)
  function telaRetomar(os) {
    if (!ABERTAS.includes(os.situacao)) return null;
    if (PODE_ATENDER && PODE_MECANICO) return TELA_DA_SITUACAO[os.situacao]; // administrador
    if (PODE_MECANICO) return ETAPAS_MECANICO.includes(os.situacao) ? TELA_DA_SITUACAO[os.situacao] : null;
    // funcionário: OS ainda não iniciada pelo mecânico volta para a abertura (ainda dá p/ corrigir)
    return os.situacao === "Aberta" ? "tela-abrir" : TELA_DA_SITUACAO[os.situacao];
  }

  const estado = {
    clienteId: null,
    veiculoId: null,
    osId: null,
    agendamentoId: null
  };

  const osAtual = () => osPorId(estado.osId);
  const perfilAtual = () => `${usuario.nome} (${MagisAuth.PERFIS[usuario.perfil]})`;

  function classeSituacao(s) {
    if (s === "Concluída") return "ok";
    if (s === "Cancelada" || s === "Encerrada sem conclusão") return "cancel";
    return "andamento";
  }
  const etiqueta = s => `<span class="etiqueta ${classeSituacao(s)}">${escapar(s)}</span>`;

  function registrar(os, texto) {
    os.historico.push({ quando: agora(), perfil: perfilAtual(), texto });
  }

  // cada serviço adicional tem a própria autorização: "Pendente", "Aprovado" ou "Recusado"
  // (assim o mecânico pode identificar novos adicionais durante a execução)
  // OS antigas não tinham o campo: herdam a decisão geral da OS
  function autDe(os, a) {
    if (a.aut) return a.aut;
    const d = os.autorizacao.decisao;
    return d === "Aprovado" || d === "Recusado" ? d : "Pendente";
  }
  const decidido = aut => aut === "Aprovado" || aut === "Recusado";
  const adicionaisPendentes = os => os.adicionais.filter(a => autDe(os, a) === "Pendente");

  // serviços que podem ser executados: os previstos e os adicionais aprovados pelo cliente
  function executaveis(os) {
    return os.servicos.concat(os.adicionais.filter(a => autDe(os, a) === "Aprovado"));
  }
  const totalPecas = os => os.pecas.reduce((s, p) => s + p.qtd * p.preco, 0);
  const totalServicosFeitos = os => executaveis(os).filter(s => s.situacao === "Concluído").reduce((s, x) => s + x.valor, 0);
  const totalPrevisto = os => executaveis(os).reduce((s, x) => s + x.valor, 0) + totalPecas(os);

  function pendencias(os) {
    const lista = [];
    executaveis(os).forEach(s => {
      if (s.situacao !== "Concluído") lista.push(`Serviço “${s.descricao}” está como ${s.situacao.toLowerCase()}.`);
    });
    if (adicionaisPendentes(os).length) lista.push("Há serviços adicionais sem decisão do cliente.");
    if (!executaveis(os).length) lista.push("Nenhum serviço registrado na OS.");
    return lista;
  }

  // mantém o histórico do veículo (Processo 1) em dia com a OS
  function sincronizarP1(os) {
    const p1 = lerP1();
    const encerrada = os.situacao === "Cancelada" || os.situacao === "Encerrada sem conclusão";
    const dados = {
      numero: os.numero,
      veiculoId: os.veiculoId,
      data: os.entrada.slice(0, 10),
      servico: executaveis(os).map(s => s.descricao).join("; ") || os.servicos.map(s => s.descricao).join("; "),
      mecanico: nomeMecanico(os.mecanicoId),
      valor: os.situacao === "Concluída" ? totalServicosFeitos(os) + totalPecas(os) : totalPrevisto(os),
      status: os.situacao === "Concluída" ? "Concluído" : encerrada ? "Cancelado" : "Em andamento"
    };
    let o = p1.ordens.find(x => x.id === os.p1OrdemId);
    if (o) Object.assign(o, dados);
    else { o = { id: ++p1.proximoId, ...dados }; p1.ordens.push(o); os.p1OrdemId = o.id; }
    salvarDados(CHAVE_P1, p1);
  }

  function gravarOs(os) {
    sincronizarP1(os);
    persistir();
  }

  function proximoNumero() {
    const nums = lerP1().ordens.map(o => Number(o.numero)).concat(db.ordens.map(o => Number(o.numero)));
    return String(Math.max(0, ...nums) + 1).padStart(5, "0");
  }

  // ---------------------------------------------------------------
  // Janela de confirmação com motivo
  // ---------------------------------------------------------------

  let resolverModal = null;

  function pedirMotivo({ titulo, texto, obrigatorio = true, rotulo = "Motivo", confirmar = "Confirmar" }) {
    $("#modal-titulo").textContent = titulo;
    $("#modal-texto").textContent = texto;
    $("#modal-rotulo").textContent = rotulo;
    $("#modal-obrig").hidden = !obrigatorio;
    $("#modal-ok").textContent = confirmar;
    $("#modal-motivo").value = "";
    erro("modal-motivo", "");
    $("#modal").hidden = false;
    $("#modal-motivo").focus();
    return new Promise(res => {
      resolverModal = { res, obrigatorio };
    });
  }

  function fecharModal(valor) {
    $("#modal").hidden = true;
    if (resolverModal) { const r = resolverModal.res; resolverModal = null; r(valor); }
  }

  $("#modal-ok").addEventListener("click", () => {
    const motivo = $("#modal-motivo").value.trim();
    if (resolverModal.obrigatorio && !motivo) {
      erro("modal-motivo", "Informe o motivo.");
      $("#modal-motivo").focus();
      return;
    }
    fecharModal(motivo);
  });
  $("#modal-voltar").addEventListener("click", () => fecharModal(null));
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") fecharModal(null); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal").hidden) fecharModal(null); });

  aplicarMascaras({ moeda: mascaraMoeda });
  iniciarTelas({ perfil: "Atendente" });

  // contadores de caracteres
  function contador(idCampo, idContador, max) {
    const f = () => { $(idContador).textContent = `${$(idCampo).value.length}/${max}`; };
    $(idCampo).addEventListener("input", f);
    return f;
  }
  const atualizarContRelato = contador("#a-relato", "#a-relato-contador", 1000);
  const atualizarContDiag = contador("#d-diagnostico", "#d-diagnostico-contador", 2000);

  // faixa com os dados da OS no topo das telas seguintes
  function faixa(idTela) {
    const os = osAtual();
    const el = $(`#${idTela} [data-faixa]`);
    if (!os || !el) return;
    el.innerHTML = `<span>OS <strong class="num">${os.numero}</strong></span>
      <span>Cliente <strong>${escapar((clientePorId(os.clienteId) || {}).nome || "—")}</strong></span>
      <span>Veículo <strong>${escapar(rotuloVeiculo(veiculoPorId(os.veiculoId)))}</strong></span>
      <span>${etiqueta(os.situacao)}</span>`;
  }

  // fim do processo: volta à pesquisa com o aviso
  function fimDoProcesso(msg, falha) {
    estado.osId = null;
    estado.clienteId = null;
    estado.veiculoId = null;
    estado.agendamentoId = null;
    resetarPesquisa();
    irPara("tela-pesquisar");
    if (msg) avisar(msg, falha);
  }

  $("#logo").addEventListener("click", e => { e.preventDefault(); fimDoProcesso(); });

  // ---------------------------------------------------------------
  // 1. Pesquisar cliente e veículo
  // ---------------------------------------------------------------

  let clienteSel = null;
  let veiculoSel = null;
  let achados = null; // clientes da última pesquisa
  let placaBuscada = "";

  $("#criterio").addEventListener("change", () => {
    const c = $("#criterio").value;
    $("#termo").placeholder = c === "doc" ? "CPF ou CNPJ" : c === "telefone" ? "Telefone com DDD" : c === "placa" ? "Ex.: ABC1234" : "Digite no mínimo 3 caracteres...";
    $("#termo").focus();
  });

  function buscarClientes(criterio, termo) {
    const p1 = lerP1();
    const t = semAcento(termo.trim());
    const d = soDigitos(termo);
    const p = soPlaca(termo);
    return p1.clientes.filter(c => c.ativo !== false && (
      criterio === "nome" ? semAcento(c.nome).includes(t) :
      criterio === "doc" ? d !== "" && c.doc.includes(d) :
      criterio === "telefone" ? d !== "" && soDigitos(c.telefone).includes(d) :
      p !== "" && p1.veiculos.some(v => v.clienteId === c.id && v.ativo !== false && soPlaca(v.placa).includes(p))
    )).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function renderClientes() {
    const tbody = $("#tabela-clientes tbody");
    if (!achados) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="4">Nenhuma pesquisa realizada.</td></tr>`;
      $("#dica-clientes").textContent = "Informe o termo de busca e clique em Pesquisar.";
      return;
    }
    if (!achados.length) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="4">Nenhum cliente encontrado. Use “Cadastrar cliente/veículo” para registrá-lo no Processo 1.</td></tr>`;
      $("#dica-clientes").textContent = "";
      return;
    }
    tbody.innerHTML = achados.map(c => `
      <tr class="clicavel" data-id="${c.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-cliente" aria-label="Selecionar ${escapar(c.nome)}"></td>
        <td>${escapar(c.nome)}</td><td>${fmtDoc(c.doc)}</td><td>${fmtTel(c.telefone)}</td>
      </tr>`).join("");
    $("#dica-clientes").textContent = `${achados.length} cliente(s) encontrado(s).`;
  }

  function renderVeiculos() {
    const tbody = $("#tabela-veiculos tbody");
    veiculoSel = null;
    if (!clienteSel) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="5">Selecione um cliente para ver os veículos.</td></tr>`;
      atualizarBotaoSelecionar();
      return;
    }
    const lista = lerP1().veiculos.filter(v => v.clienteId === clienteSel && v.ativo !== false);
    if (!lista.length) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="5">Este cliente não tem veículo cadastrado. Use “Cadastrar cliente/veículo”.</td></tr>`;
      atualizarBotaoSelecionar();
      return;
    }
    tbody.innerHTML = lista.map(v => `
      <tr class="clicavel" data-id="${v.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-veiculo" aria-label="Selecionar ${escapar(fmtPlaca(v.placa))}"></td>
        <td>${fmtPlaca(v.placa)}</td><td>${escapar(v.marca)}</td><td>${escapar(v.modelo)}</td><td class="centro">${v.ano}</td>
      </tr>`).join("");
    // se achou pela placa, ou só há um veículo, já deixa marcado
    const pre = lista.find(v => placaBuscada && soPlaca(v.placa).includes(placaBuscada)) || (lista.length === 1 ? lista[0] : null);
    if (pre) {
      const tr = tbody.querySelector(`tr[data-id="${pre.id}"]`);
      marcarLinha(tbody, tr);
      veiculoSel = pre.id;
    }
    atualizarBotaoSelecionar();
  }

  const atualizarBotaoSelecionar = () => { $("#btn-selecionar").disabled = !(clienteSel && veiculoSel); };

  $("#tabela-clientes tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    marcarLinha(e.currentTarget, tr);
    clienteSel = Number(tr.dataset.id);
    $("#erro-veiculo").textContent = "";
    renderVeiculos();
  });

  $("#tabela-veiculos tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    marcarLinha(e.currentTarget, tr);
    veiculoSel = Number(tr.dataset.id);
    $("#erro-veiculo").textContent = "";
    atualizarBotaoSelecionar();
  });

  $("#form-pesquisa").addEventListener("submit", e => {
    e.preventDefault();
    const termo = $("#termo").value.trim();
    if (termo.length < 3) {
      erro("termo", "Informe no mínimo 3 caracteres.");
      $("#termo").focus();
      return;
    }
    const criterio = $("#criterio").value;
    placaBuscada = criterio === "placa" ? soPlaca(termo) : "";
    achados = buscarClientes(criterio, termo);
    clienteSel = null;
    renderClientes();
    renderVeiculos();
    if (achados.length === 1) { // um só resultado: já seleciona
      const tr = $("#tabela-clientes tbody tr.clicavel");
      marcarLinha($("#tabela-clientes tbody"), tr);
      clienteSel = achados[0].id;
      renderVeiculos();
    }
  });

  function resetarPesquisa() {
    $("#criterio").value = "nome";
    $("#termo").value = "";
    $("#termo").placeholder = "Digite no mínimo 3 caracteres...";
    erro("termo", "");
    $("#erro-veiculo").textContent = "";
    achados = null;
    clienteSel = null;
    veiculoSel = null;
    placaBuscada = "";
    renderClientes();
    renderVeiculos();
    renderOrdens();
  }

  $("#btn-limpar").addEventListener("click", () => { resetarPesquisa(); $("#termo").focus(); });

  $("#btn-selecionar").addEventListener("click", () => {
    if (!clienteSel) { avisar("Selecione um cliente.", true); return; }
    if (!veiculoSel) { $("#erro-veiculo").textContent = "Selecione o veículo que será atendido."; return; }
    estado.clienteId = clienteSel;
    estado.veiculoId = veiculoSel;
    estado.osId = null;
    estado.agendamentoId = null;
    irPara("tela-historico");
  });

  // o cadastro é feito no Processo 1; depois a pessoa volta e pesquisa de novo
  $("#btn-cadastrar").addEventListener("click", () => {
    window.location.href = "../processo1/cadastro-cliente.html";
  });

  // OS já abertas, para retomar o atendimento
  let osSel = null;

  function renderOrdens() {
    const tbody = $("#tabela-os tbody");
    osSel = null;
    $("#btn-retomar").disabled = true;
    // mecânico: primeiro as OS que estão na etapa dele, e as atribuídas a ele no topo
    const peso = o => !PODE_ATENDER ? (ETAPAS_MECANICO.includes(o.situacao) ? 0 : 2) - (o.mecanicoId === meuMecanicoId ? 1 : 0) : 0;
    const lista = [...db.ordens].sort((a, b) => peso(a) - peso(b) || b.id - a.id);
    if (!lista.length) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="7">Nenhuma OS aberta por este processo ainda.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(o => `
      <tr class="clicavel" data-id="${o.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-os" aria-label="Selecionar OS ${o.numero}"></td>
        <td>${o.numero}</td>
        <td>${escapar((clientePorId(o.clienteId) || {}).nome || "—")}</td>
        <td>${escapar(rotuloVeiculo(veiculoPorId(o.veiculoId)))}</td>
        <td>${o.mecanicoId ? escapar(nomeMecanico(o.mecanicoId)) + (o.mecanicoId === meuMecanicoId ? " (você)" : "") : "—"}</td>
        <td>${fmtDH(o.entrada)}</td>
        <td>${etiqueta(o.situacao)}</td>
      </tr>`).join("");
  }

  $("#tabela-os tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    marcarLinha(e.currentTarget, tr);
    osSel = Number(tr.dataset.id);
    const os = osPorId(osSel);
    $("#btn-retomar").disabled = !telaRetomar(os);
    if (!PODE_ATENDER && ABERTAS.includes(os.situacao) && !telaRetomar(os)) {
      avisar(`OS ${os.numero} está “${os.situacao}”: etapa do atendimento.`, true);
    }
  });

  $("#btn-retomar").addEventListener("click", () => {
    const os = osSel && osPorId(osSel);
    const tela = os && telaRetomar(os);
    if (!tela) return;
    estado.osId = os.id;
    estado.clienteId = os.clienteId;
    estado.veiculoId = os.veiculoId;
    irPara(tela);
  });

  // mecânico: a tela inicial é só a lista de OS
  if (!PODE_ATENDER) {
    $("#bloco-busca").hidden = true;
    $("#titulo-os").outerHTML = `<h1 id="titulo-os">Ordens de serviço</h1>`;
    $("#tela-pesquisar").dataset.titulo = "Ordens de serviço";
    $("#trilha-tela").textContent = "Ordens de serviço";
    $("#dica-os").textContent = "Selecione uma OS aberta, em diagnóstico ou em execução para registrar o diagnóstico e o andamento dos serviços.";
    $("#btn-retomar").textContent = "Abrir OS";
  }
  if (!MagisAuth.pode("os.restaurar")) $("#btn-restaurar").hidden = true;

  // só para o teste: volta tudo ao estado inicial
  $("#btn-restaurar").addEventListener("click", async () => {
    if (!MagisAuth.pode("os.restaurar")) return;
    const ok = await pedirMotivo({
      titulo: "Restaurar dados de teste",
      texto: "Apaga os dados salvos neste navegador pelos Processos 1, 2 e 6 e volta aos dados de exemplo.",
      obrigatorio: false, rotulo: "Observação", confirmar: "Restaurar"
    });
    if (ok === null) return;
    [CHAVE, CHAVE_P1, CHAVE_P2].forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* sem acesso */ } });
    location.reload();
  });

  // ---------------------------------------------------------------
  // 2. Consultar agendamento e histórico do veículo
  // ---------------------------------------------------------------

  const agendamentosDoVeiculo = () => db.agendamentos
    .filter(a => a.veiculoId === estado.veiculoId && a.clienteId === estado.clienteId)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  function renderHistorico() {
    const lista = lerP1().ordens.filter(o => o.veiculoId === estado.veiculoId)
      .sort((a, b) => b.data.localeCompare(a.data) || b.numero.localeCompare(a.numero));
    $("#tabela-historico tbody").innerHTML = lista.length ? lista.map(o => `
      <tr><td>${fmtData(o.data)}</td><td>${o.numero}</td><td>${escapar(o.servico)}</td><td>${escapar(o.mecanico)}</td>
      <td class="valor">${fmtMoeda(o.valor)}</td><td>${escapar(o.status)}</td></tr>`).join("")
      : `<tr class="vazia"><td colspan="6">Este veículo ainda não tem serviços registrados.</td></tr>`;
  }

  aoAbrir["tela-historico"] = () => {
    const cli = clientePorId(estado.clienteId), vei = veiculoPorId(estado.veiculoId);
    if (!cli || !vei) { fimDoProcesso(); return; }
    $("#h-cliente").value = cli.nome;
    $("#h-veiculo").value = rotuloVeiculo(vei);
    const ags = agendamentosDoVeiculo();
    $("#tabela-agendamentos tbody").innerHTML = ags.length ? ags.map(a => `
      <tr><td>${fmtData(a.data)}</td><td>${a.hora}</td><td>${escapar(a.servico)}</td><td>${escapar(a.situacao)}</td></tr>`).join("")
      : `<tr class="vazia"><td colspan="4">Nenhum agendamento para este veículo.</td></tr>`;
    opcoes($("#h-origem"), ags.filter(a => a.situacao === "Agendado")
      .map(a => ({ v: a.id, t: `${fmtData(a.data)} ${a.hora} – ${a.servico}` })), estado.agendamentoId, "Sem agendamento");
    renderHistorico();
  };

  $("#btn-consultar-historico").addEventListener("click", () => { renderHistorico(); avisar("Histórico atualizado."); });

  $("#btn-abrir-os").addEventListener("click", () => {
    estado.agendamentoId = $("#h-origem").value ? Number($("#h-origem").value) : null;
    estado.osId = null;
    irPara("tela-abrir");
  });

  // ---------------------------------------------------------------
  // 3. Abrir ordem de serviço
  // ---------------------------------------------------------------

  $("#a-servicos").innerHTML = SERVICOS.map(([nome], i) =>
    `<label><input type="checkbox" value="${escapar(nome)}" id="a-serv-${i}"> ${escapar(nome)}</label>`).join("");

  aoAbrir["tela-abrir"] = () => {
    const form = $("#form-abrir");
    form.reset();
    limparErros(form);
    const os = osAtual();
    const cli = clientePorId(os ? os.clienteId : estado.clienteId);
    const vei = veiculoPorId(os ? os.veiculoId : estado.veiculoId);
    if (!cli || !vei) { fimDoProcesso(); return; }
    const ag = db.agendamentos.find(a => a.id === (os ? os.agendamentoId : estado.agendamentoId));

    $("#a-numero").value = os ? os.numero : proximoNumero();
    $("#a-situacao").value = os ? os.situacao : "Aberta";
    $("#a-cliente").value = cli.nome;
    $("#a-veiculo").value = rotuloVeiculo(vei);
    $("#a-agendamento").value = ag ? `${fmtData(ag.data)} ${ag.hora} – ${ag.servico}` : "Sem agendamento";
    $("#a-entrada").value = os ? os.entrada : agora();
    $("#a-km").value = os ? os.km : (vei.km ?? "");
    $("#a-relato").value = os ? os.relato : "";
    opcoesMecanicos($("#a-mecanico"), os && os.mecanicoId, "Definir depois");

    let marcados = os ? os.solicitados : [], outros = os ? os.outros : "";
    if (!os && ag) { // serviços do agendamento já vêm preenchidos
      if (SERVICOS.some(([n]) => n === ag.servico)) marcados = [ag.servico]; else outros = ag.servico;
    }
    SERVICOS.forEach(([nome], i) => { $(`#a-serv-${i}`).checked = marcados.includes(nome); });
    $("#a-outros").value = outros;
    atualizarContRelato();
    $("#btn-voltar-abrir").dataset.ir = os ? "tela-diagnostico" : "tela-historico";
  };

  // “Voltar” leva à tela de onde a pessoa veio
  $("#btn-voltar-abrir").addEventListener("click", () => {
    if (!osAtual()) irPara("tela-historico");
    else if (PODE_MECANICO) irPara("tela-diagnostico");
    else fimDoProcesso(); // funcionário: volta para a lista de OS
  });

  const linhas = txt => txt.split("\n").map(l => l.trim()).filter(Boolean);

  $("#btn-salvar-abrir").addEventListener("click", () => {
    const form = $("#form-abrir");
    limparErros(form);
    const os = osAtual();
    const entrada = $("#a-entrada").value;
    const km = $("#a-km").value;
    const relato = $("#a-relato").value.trim();
    const marcados = SERVICOS.filter((s, i) => $(`#a-serv-${i}`).checked).map(s => s[0]);
    const outros = linhas($("#a-outros").value);

    let ok = true;
    ok = erro("a-entrada", !entrada ? "Informe a data e hora de entrada." : entrada > agora() ? "A entrada não pode ser posterior ao momento atual." : "") && ok;
    ok = erro("a-km", km === "" ? "Informe a quilometragem." : Number(km) < 0 || !Number.isInteger(Number(km)) ? "Informe um número inteiro maior ou igual a 0." : "") && ok;
    ok = erro("a-relato", !relato ? "Informe o relato do cliente." : "") && ok;
    ok = erro("a-servicos", !marcados.length && !outros.length ? "Informe ao menos um serviço." : "") && ok;
    if (!ok) { focarPrimeiroErro(form); return; }

    const mecId = $("#a-mecanico").value ? Number($("#a-mecanico").value) : null;
    const todos = marcados.concat(outros);

    if (!os) { // nova OS
      const nova = {
        id: novoId(), numero: proximoNumero(),
        clienteId: estado.clienteId, veiculoId: estado.veiculoId, agendamentoId: estado.agendamentoId,
        entrada, km: Number(km), relato, solicitados: marcados, outros: $("#a-outros").value.trim(),
        mecanicoId: mecId, situacao: "Aberta",
        servicos: [], pecasPrevistas: [], adicionais: [],
        diagnostico: "", obsTecnicas: "",
        autorizacao: { decisao: "Aguardando resposta", dataHora: "", meio: "", obs: "", arquivo: "" },
        execucao: { mecanicoId: mecId, dataHora: "", obs: "" },
        pecas: [], obsFinais: "", entrega: null, motivoEncerramento: "",
        historico: [], p1OrdemId: null
      };
      nova.servicos = todos.map(d => novoServico(d));
      registrar(nova, `OS aberta. Entrada com ${nova.km} km.`);
      db.ordens.push(nova);
      const ag = db.agendamentos.find(a => a.id === nova.agendamentoId);
      if (ag) ag.situacao = "Atendido";
      estado.osId = nova.id;
      gravarOs(nova);
      // funcionário: a OS segue para o mecânico; administrador continua no diagnóstico
      if (!PODE_MECANICO) { fimDoProcesso(`OS ${nova.numero} aberta e encaminhada para o mecânico.`); return; }
      avisar(`OS ${nova.numero} aberta.`);
    } else { // edição antes da execução
      os.entrada = entrada; os.km = Number(km); os.relato = relato;
      os.solicitados = marcados; os.outros = $("#a-outros").value.trim();
      os.mecanicoId = mecId;
      os.execucao.mecanicoId = os.execucao.mecanicoId || mecId;
      const antigos = os.servicos.filter(s => s.origem === "solicitado");
      os.servicos = os.servicos.filter(s => s.origem !== "solicitado");
      todos.forEach(d => os.servicos.push(antigos.find(s => s.descricao === d) || novoServico(d)));
      registrar(os, "Dados da abertura atualizados.");
      gravarOs(os);
      if (!PODE_MECANICO) { fimDoProcesso(`Dados da OS ${os.numero} atualizados.`); return; }
      avisar("Dados da OS atualizados.");
    }
    irPara("tela-diagnostico");
  });

  function novoServico(descricao) {
    const cat = SERVICOS.find(([n]) => n === descricao);
    return { id: novoId(), descricao, valor: cat ? cat[1] : 0, origem: "solicitado", situacao: "Não iniciado", realizado: "", mecanicoId: null };
  }

  $("#btn-cancelar-abertura").addEventListener("click", async () => {
    const os = osAtual();
    const motivo = await pedirMotivo({
      titulo: "Cancelar abertura da OS",
      texto: os ? `A OS ${os.numero} será cancelada antes da execução.` : "Os dados digitados serão descartados e nenhuma OS será registrada.",
      obrigatorio: false, confirmar: "Cancelar abertura"
    });
    if (motivo === null) return;
    if (!os) { fimDoProcesso("Abertura cancelada. Nenhuma OS foi registrada."); return; }
    os.situacao = "Cancelada";
    os.motivoEncerramento = motivo;
    registrar(os, `OS cancelada antes da execução${motivo ? `: ${motivo}` : "."}`);
    gravarOs(os);
    fimDoProcesso(`OS ${os.numero} cancelada.`);
  });

  // ---------------------------------------------------------------
  // 4. Registrar diagnóstico e serviços previstos
  // ---------------------------------------------------------------

  let dg = null; // cópia de trabalho; só vai para a OS ao salvar

  const campoNumero = v => (v === "" || v == null) ? "" : v;

  function renderDiagnostico() {
    const itens = itensConsumiveis();
    $("#tb-servicos").innerHTML = dg.servicos.length ? dg.servicos.map((s, i) => `
      <tr>
        <td><input type="text" data-t="servicos" data-i="${i}" data-k="descricao" maxlength="100" value="${escapar(s.descricao)}" aria-label="Descrição do serviço"></td>
        <td class="valor"><input type="text" inputmode="numeric" data-t="servicos" data-i="${i}" data-k="valor" data-moeda value="${fmtMoeda(s.valor)}" aria-label="Valor estimado"></td>
        <td class="col-acao"><button type="button" class="botao perigo-mini" data-rem="servicos" data-i="${i}" aria-label="Remover serviço">×</button></td>
      </tr>`).join("") : `<tr class="vazia"><td colspan="3">Nenhum serviço previsto.</td></tr>`;

    $("#tb-pecas").innerHTML = dg.pecasPrevistas.length ? dg.pecasPrevistas.map((p, i) => {
      const it = itemPorId(p.itemId);
      return `<tr>
        <td><select class="lista" data-t="pecasPrevistas" data-i="${i}" data-k="itemId" aria-label="Item do estoque">
          <option value="">Selecione o item...</option>
          ${itens.map(x => `<option value="${x.id}" ${x.id === p.itemId ? "selected" : ""}>${escapar(rotuloItem(x))}</option>`).join("")}
        </select></td>
        <td class="centro"><input type="number" min="0" step="any" data-t="pecasPrevistas" data-i="${i}" data-k="qtd" value="${campoNumero(p.qtd)}" aria-label="Quantidade"></td>
        <td class="centro" data-saldo="${i}">${it ? fmtNumero(it.saldo) : "—"}</td>
        <td class="col-acao"><button type="button" class="botao perigo-mini" data-rem="pecasPrevistas" data-i="${i}" aria-label="Remover peça">×</button></td>
      </tr>`;
    }).join("") : `<tr class="vazia"><td colspan="4">Nenhuma peça prevista.</td></tr>`;

    // adicionais que já tiveram decisão do cliente ficam travados; os novos/pendentes podem ser editados
    $("#tb-adicionais").innerHTML = dg.adicionais.length ? dg.adicionais.map((s, i) => {
      const trava = decidido(s.aut) ? "readonly" : "";
      const aut = s.aut || "Pendente";
      return `<tr>
        <td><input type="text" data-t="adicionais" data-i="${i}" data-k="descricao" maxlength="255" value="${escapar(s.descricao)}" ${trava} aria-label="Descrição do serviço adicional"></td>
        <td><input type="text" data-t="adicionais" data-i="${i}" data-k="justificativa" maxlength="255" value="${escapar(s.justificativa)}" ${trava} aria-label="Justificativa"></td>
        <td class="valor"><input type="text" inputmode="numeric" data-t="adicionais" data-i="${i}" data-k="valor" data-moeda value="${fmtMoeda(s.valor)}" ${trava} aria-label="Valor previsto"></td>
        <td><span class="etiqueta ${aut === "Aprovado" ? "ok" : aut === "Recusado" ? "cancel" : "andamento"}">${s.id && !s.aut ? "Novo" : aut}</span></td>
        <td class="col-acao">${trava ? "" : `<button type="button" class="botao perigo-mini" data-rem="adicionais" data-i="${i}" aria-label="Remover serviço adicional">×</button>`}</td>
      </tr>`;
    }).join("") : `<tr class="vazia"><td colspan="5">Nenhum serviço adicional identificado.</td></tr>`;
    travar("tela-diagnostico");
  }

  aoAbrir["tela-diagnostico"] = () => {
    const os = osAtual();
    if (!os) { fimDoProcesso(); return; }
    const form = $("#form-diagnostico");
    limparErros(form);
    faixa("tela-diagnostico");
    dg = {
      servicos: os.servicos.map(s => ({ id: s.id, descricao: s.descricao, valor: s.valor })),
      pecasPrevistas: os.pecasPrevistas.map(p => ({ ...p })),
      adicionais: os.adicionais.map(a => ({ ...a, aut: autDe(os, a) }))
    };
    // voltando da execução: o mecânico pode incluir novos adicionais e depois retomar
    const emExecucao = os.situacao === "Em execução";
    $("#btn-iniciar-exec").textContent = emExecucao ? "Voltar à execução" : "Iniciar execução";
    $("#d-dica-adicionais").hidden = !emExecucao;
    // mecânico logado já aparece como responsável quando a OS ainda não tem um
    opcoesMecanicos($("#d-mecanico"), os.mecanicoId || meuMecanicoId, "Selecione o mecânico...");
    $("#d-diagnostico").value = os.diagnostico;
    $("#d-obs").value = os.obsTecnicas;
    $("#d-situacao").value = os.situacao === "Aberta" ? "Em diagnóstico" : (["Aguardando autorização", "Em execução"].includes(os.situacao) ? os.situacao : "Em diagnóstico");
    atualizarContDiag();
    renderDiagnostico();
  };

  // edição das tabelas: o que é digitado vai direto para a cópia de trabalho
  function editar(e, estadoTabelas) {
    const el = e.target;
    const t = el.dataset.t;
    if (!t) return;
    const linha = estadoTabelas[t][Number(el.dataset.i)];
    const k = el.dataset.k;
    if (el.hasAttribute("data-moeda")) { el.value = mascaraMoeda(el.value); linha[k] = lerMoeda(el.value); }
    else if (k === "itemId") { linha[k] = el.value ? Number(el.value) : null; }
    else if (k === "qtd") { linha[k] = el.value === "" ? "" : Number(el.value); }
    else linha[k] = el.value;
    if (t === "pecasPrevistas" && k === "itemId") {
      const it = itemPorId(linha.itemId);
      const cel = el.closest("tr").querySelector("[data-saldo]");
      if (cel) cel.textContent = it ? fmtNumero(it.saldo) : "—";
    }
  }

  $("#tela-diagnostico").addEventListener("input", e => editar(e, dg));
  $("#tela-diagnostico").addEventListener("change", e => { if (e.target.tagName === "SELECT") editar(e, dg); });

  const CHAVE_LISTA = { servicos: "servicos", pecas: "pecasPrevistas", adicionais: "adicionais" };

  $("#tela-diagnostico").addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    const rem = e.target.closest("[data-rem]");
    if (add) {
      const t = CHAVE_LISTA[add.dataset.add];
      dg[t].push(t === "servicos" ? { id: novoId(), descricao: "", valor: 0 }
        : t === "pecasPrevistas" ? { itemId: null, qtd: 1 }
        : { id: novoId(), descricao: "", justificativa: "", valor: 0 });
      renderDiagnostico();
      const novo = document.querySelector(`#tela-diagnostico [data-t="${t}"][data-i="${dg[t].length - 1}"]`);
      if (novo) novo.focus();
    }
    if (rem) {
      dg[rem.dataset.rem].splice(Number(rem.dataset.i), 1);
      renderDiagnostico();
    }
  });

  // devolve true se está tudo certo; completo = exigir diagnóstico e serviços
  function validarDiagnostico(completo) {
    const form = $("#form-diagnostico");
    limparErros(form);
    let ok = true;
    const diag = $("#d-diagnostico").value.trim();
    ok = erro("d-mecanico", !$("#d-mecanico").value ? "Selecione o mecânico responsável." : "") && ok;
    ok = erro("d-diagnostico", completo && !diag ? "Informe o diagnóstico." : "") && ok;
    ok = erro("d-servicos", dg.servicos.some(s => !s.descricao.trim()) ? "Preencha a descrição de todos os serviços."
      : completo && !dg.servicos.length ? "Informe ao menos um serviço previsto." : "") && ok;
    ok = erro("d-pecas", dg.pecasPrevistas.some(p => !p.itemId) ? "Selecione o item de todas as peças."
      : dg.pecasPrevistas.some(p => !(Number(p.qtd) > 0)) ? "A quantidade das peças deve ser maior que 0."
      : new Set(dg.pecasPrevistas.map(p => p.itemId)).size !== dg.pecasPrevistas.length ? "Há o mesmo item lançado mais de uma vez." : "") && ok;
    ok = erro("d-adicionais", dg.adicionais.some(a => !a.descricao.trim() || !a.justificativa.trim()) ? "Preencha a descrição e a justificativa dos serviços adicionais."
      : dg.adicionais.some(a => !(a.valor > 0)) ? "Informe o valor previsto dos serviços adicionais." : "") && ok;
    if (!ok) { focarPrimeiroErro(form); avisar("Corrija os campos destacados.", true); }
    return ok;
  }

  // grava a cópia de trabalho na OS
  function gravarDiagnostico(os, situacao) {
    os.mecanicoId = Number($("#d-mecanico").value);
    os.execucao.mecanicoId = os.execucao.mecanicoId || os.mecanicoId;
    os.diagnostico = $("#d-diagnostico").value.trim();
    os.obsTecnicas = $("#d-obs").value.trim();
    os.servicos = dg.servicos.map(s => {
      const antigo = os.servicos.find(x => x.id === s.id);
      return antigo ? { ...antigo, descricao: s.descricao.trim(), valor: s.valor }
        : { id: s.id, descricao: s.descricao.trim(), valor: s.valor, origem: "previsto", situacao: "Não iniciado", realizado: "", mecanicoId: null };
    });
    os.pecasPrevistas = dg.pecasPrevistas.map(p => ({ itemId: p.itemId, qtd: Number(p.qtd) }));
    // adicionais já decididos pelo cliente não mudam; os novos entram como "Pendente"
    os.adicionais = dg.adicionais.map(a => {
      const antigo = os.adicionais.find(x => x.id === a.id);
      if (antigo && decidido(autDe(os, antigo))) return { ...antigo, aut: autDe(os, antigo) };
      return { ...(antigo || { situacao: "Não iniciado", realizado: "", mecanicoId: null, origem: "adicional" }), aut: "Pendente", id: a.id, descricao: a.descricao.trim(), justificativa: a.justificativa.trim(), valor: a.valor };
    });
    os.situacao = situacao;
    $("#d-situacao").value = situacao;
  }

  $("#btn-salvar-diag").addEventListener("click", () => {
    const os = osAtual();
    if (!exigirMecanico() || !validarDiagnostico(false)) return;
    gravarDiagnostico(os, os.situacao === "Aguardando autorização" || os.situacao === "Em execução" ? os.situacao : "Em diagnóstico");
    registrar(os, "Diagnóstico salvo.");
    gravarOs(os);
    faixa("tela-diagnostico");
    avisar("Diagnóstico salvo.");
  });

  $("#btn-solicitar-aut").addEventListener("click", () => {
    const os = osAtual();
    if (!exigirMecanico() || !validarDiagnostico(true)) return;
    if (!dg.adicionais.some(a => !decidido(a.aut))) {
      erro("d-adicionais", dg.adicionais.length ? "Os adicionais listados já tiveram decisão do cliente. Inclua um novo serviço adicional para pedir autorização."
        : "Registre ao menos um serviço adicional para pedir autorização.");
      avisar("Não há serviço adicional novo para autorizar.", true);
      return;
    }
    const emExecucao = os.situacao === "Em execução";
    gravarDiagnostico(os, "Aguardando autorização");
    registrar(os, `${emExecucao ? "Durante a execução, novos serviços adicionais identificados." : "Diagnóstico salvo."} Autorização solicitada para ${adicionaisPendentes(os).length} serviço(s) adicional(is).`);
    gravarOs(os);
    // mecânico: quem registra a decisão do cliente é o atendimento
    if (!PODE_ATENDER) { fimDoProcesso(`OS ${os.numero}: autorização solicitada. O atendimento vai registrar a decisão do cliente.`); return; }
    irPara("tela-autorizacao");
  });

  $("#btn-iniciar-exec").addEventListener("click", () => {
    const os = osAtual();
    if (!exigirMecanico() || !validarDiagnostico(true)) return;
    if (dg.adicionais.some(a => !decidido(a.aut))) {
      erro("d-adicionais", "Há serviços adicionais sem decisão do cliente. Solicite a autorização ou remova os novos antes de seguir.");
      avisar("Há autorização pendente.", true);
      return;
    }
    const retomando = os.situacao === "Em execução";
    gravarDiagnostico(os, "Em execução");
    registrar(os, retomando ? "Diagnóstico atualizado. Execução retomada." : "Diagnóstico salvo. Execução iniciada.");
    gravarOs(os);
    irPara("tela-execucao");
  });

  // em execução, Voltar leva de novo para a execução (sem salvar o que foi mexido aqui)
  $("#btn-voltar-diag").addEventListener("click", () => {
    const os = osAtual();
    if (os && os.situacao === "Em execução" && PODE_MECANICO) irPara("tela-execucao");
    else if (PODE_ATENDER) irPara("tela-abrir");
    else fimDoProcesso();
  });

  // ---------------------------------------------------------------
  // 5. Solicitar autorização para serviços adicionais
  // ---------------------------------------------------------------

  let arquivoAut = "";

  aoAbrir["tela-autorizacao"] = () => {
    const os = osAtual();
    if (!os) { fimDoProcesso(); return; }
    const form = $("#form-autorizacao");
    limparErros(form);
    faixa("tela-autorizacao");
    // só os adicionais que ainda esperam a decisão do cliente
    const pend = adicionaisPendentes(os);
    $("#tabela-adicionais tbody").innerHTML = pend.length ? pend.map(a => `
      <tr><td>${escapar(a.descricao)}</td><td>${escapar(a.justificativa)}</td><td class="valor">${fmtMoeda(a.valor)}</td></tr>`).join("")
      : `<tr class="vazia"><td colspan="3">Nenhum serviço adicional aguardando autorização.</td></tr>`;
    $("#u-total").textContent = fmtMoeda(pend.reduce((s, a) => s + a.valor, 0));
    const decididos = os.adicionais.length - pend.length;
    $("#u-ja-decididos").hidden = !decididos;
    $("#u-ja-decididos").textContent = `${decididos} serviço(s) adicional(is) desta OS já tiveram decisão do cliente e não aparecem aqui.`;
    // nova rodada de autorização começa com os campos em branco
    const aut = pend.length && decidido(os.autorizacao.decisao) ? { decisao: "Aguardando resposta" } : os.autorizacao;
    $("#u-decisao").value = aut.decisao;
    $("#u-datahora").value = aut.dataHora || agora();
    $("#u-meio").value = aut.meio || "";
    $("#u-obs").value = aut.obs || "";
    arquivoAut = aut.arquivo || "";
    $("#u-arquivo-nome").textContent = arquivoAut || "Nenhum arquivo";
    $("#u-arquivo").value = "";
  };

  $("#u-arquivo").addEventListener("change", e => {
    const arq = e.target.files[0];
    const msg = erroArquivo(arq, ["application/pdf", "image/jpeg", "image/png"], 5);
    erro("u-arquivo", msg);
    if (msg) { e.target.value = ""; return; }
    arquivoAut = arq ? arq.name : "";
    $("#u-arquivo-nome").textContent = arquivoAut || "Nenhum arquivo";
  });

  // confere os campos comuns da decisão; devolve os valores ou null
  function lerDecisao({ exigirMeio, exigirObs }) {
    const form = $("#form-autorizacao");
    limparErros(form);
    const dataHora = $("#u-datahora").value;
    const meio = $("#u-meio").value;
    const obs = $("#u-obs").value.trim();
    let ok = true;
    ok = erro("u-datahora", !dataHora ? "Informe a data e hora da decisão." : dataHora > agora() ? "A decisão não pode ser posterior ao momento atual." : "") && ok;
    ok = erro("u-meio", exigirMeio && !meio ? "Informe o meio da autorização." : "") && ok;
    ok = erro("u-obs", exigirObs && !obs ? "Informe a justificativa da recusa." : "") && ok;
    if (!ok) { focarPrimeiroErro(form); return null; }
    return { dataHora, meio, obs, arquivo: arquivoAut };
  }

  // aplica a decisão aos adicionais pendentes; os.autorizacao guarda a última decisão
  // e os.autorizacoes o histórico de todas as rodadas
  function decidir(decisao, dados, situacao, evento) {
    const os = osAtual();
    const pend = adicionaisPendentes(os);
    os.adicionais.forEach(a => { a.aut = autDe(os, a); });
    pend.forEach(a => { a.aut = decisao; });
    os.autorizacao = { decisao, ...dados };
    (os.autorizacoes = os.autorizacoes || []).push({ decisao, ...dados, servicos: pend.map(a => a.id) });
    os.situacao = situacao;
    registrar(os, evento);
    $("#u-decisao").value = decisao;
    gravarOs(os);
  }

  $("#btn-aprovar").addEventListener("click", () => {
    const os = osAtual();
    if (!adicionaisPendentes(os).length) { avisar("Não há serviço adicional para autorizar.", true); return; }
    const d = lerDecisao({ exigirMeio: true, exigirObs: false });
    if (!d) return;
    const total = adicionaisPendentes(os).reduce((s, a) => s + a.valor, 0);
    decidir("Aprovado", d, "Em execução", `Cliente aprovou os serviços adicionais (${fmtMoeda(total)}) – ${d.meio}.`);
    if (!PODE_MECANICO) { fimDoProcesso(`Aprovação registrada. A OS ${os.numero} foi liberada para o mecânico.`); return; }
    avisar("Aprovação registrada.");
    irPara("tela-execucao");
  });

  $("#btn-recusar").addEventListener("click", () => {
    const os = osAtual();
    if (!adicionaisPendentes(os).length) { avisar("Não há serviço adicional para autorizar.", true); return; }
    const d = lerDecisao({ exigirMeio: true, exigirObs: true });
    if (!d) return;
    decidir("Recusado", d, "Em execução", `Cliente recusou os serviços adicionais – ${d.meio}. Execução segue sem eles.`);
    if (!PODE_MECANICO) { fimDoProcesso(`Recusa registrada. A OS ${os.numero} segue com o mecânico sem os adicionais recusados.`); return; }
    avisar("Recusa registrada. A execução segue sem os adicionais recusados.");
    irPara("tela-execucao");
  });

  $("#btn-desistir").addEventListener("click", async () => {
    const os = osAtual();
    const d = lerDecisao({ exigirMeio: false, exigirObs: false });
    if (!d) return;
    const motivo = await pedirMotivo({
      titulo: "Registrar desistência",
      texto: `O cliente desistiu do atendimento. A OS ${os.numero} será cancelada.`,
      confirmar: "Registrar desistência"
    });
    if (motivo === null) return;
    os.adicionais.forEach(a => { a.aut = autDe(os, a) === "Pendente" ? "Recusado" : autDe(os, a); });
    os.autorizacao = { decisao: "Recusado", ...d };
    os.situacao = "Cancelada";
    os.motivoEncerramento = motivo;
    registrar(os, `Cliente desistiu do atendimento: ${motivo}`);
    gravarOs(os);
    fimDoProcesso(`OS ${os.numero} cancelada por desistência do cliente.`);
  });

  $("#btn-aguardar").addEventListener("click", () => {
    const os = osAtual();
    const d = lerDecisao({ exigirMeio: false, exigirObs: false });
    if (!d) return;
    os.adicionais.forEach(a => { a.aut = autDe(os, a); }); // fixa a decisão dos já decididos antes de mudar a geral
    os.autorizacao = { decisao: "Aguardando resposta", ...d, dataHora: "" };
    os.situacao = "Aguardando autorização";
    registrar(os, "Autorização mantida aguardando resposta do cliente.");
    gravarOs(os);
    fimDoProcesso(`OS ${os.numero} aguardando a resposta do cliente. Use “Retomar OS” para continuar.`);
  });

  // ---------------------------------------------------------------
  // 6. Registrar execução dos serviços
  // ---------------------------------------------------------------

  let ex = null; // cópia de trabalho: { servicos: [{ id, situacao, realizado }] }

  function renderExecucao() {
    const os = osAtual();
    const lista = executaveis(os);
    $("#tb-execucao").innerHTML = lista.length ? lista.map((s, i) => `
      <tr class="${ex.servicos[i].situacao === "Impedido" ? "linha-impedida" : ""}">
        <td>${escapar(s.descricao)}${s.origem === "adicional" ? ` <span class="etiqueta adicional">adicional</span>` : ""}</td>
        <td class="valor">${fmtMoeda(s.valor)}</td>
        <td><select class="lista" data-t="servicos" data-i="${i}" data-k="situacao" aria-label="Situação de ${escapar(s.descricao)}">
          ${SIT_SERVICO.map(x => `<option ${x === ex.servicos[i].situacao ? "selected" : ""}>${x}</option>`).join("")}
        </select></td>
        <td><input type="text" data-t="servicos" data-i="${i}" data-k="realizado" maxlength="500" value="${escapar(ex.servicos[i].realizado)}" placeholder="O que foi feito..." aria-label="Descrição do realizado"></td>
      </tr>`).join("") : `<tr class="vazia"><td colspan="4">Nenhum serviço autorizado.</td></tr>`;
    travar("tela-execucao");
  }

  aoAbrir["tela-execucao"] = () => {
    const os = osAtual();
    if (!os) { fimDoProcesso(); return; }
    limparErros($("#form-execucao"));
    faixa("tela-execucao");
    // na consulta (funcionário) mostra a situação real, sem sugerir "Em andamento"
    ex = { servicos: executaveis(os).map(s => ({ id: s.id, situacao: s.situacao === "Não iniciado" && PODE_MECANICO ? "Em andamento" : s.situacao, realizado: s.realizado })) };
    // executor: o mecânico logado; senão o último registrado na OS
    opcoesMecanicos($("#x-mecanico"), meuMecanicoId || os.execucao.mecanicoId || os.mecanicoId, "Selecione o mecânico...");
    $("#x-datahora").value = PODE_MECANICO ? agora() : (os.execucao.dataHora || "");
    $("#x-obs").value = os.execucao.obs;
    $("#btn-voltar-exec").hidden = PODE_ATENDER && PODE_MECANICO; // administrador segue o fluxo completo
    $("#btn-exec-adicionais").hidden = !PODE_MECANICO;
    renderExecucao();
  };

  $("#btn-voltar-exec").addEventListener("click", () => fimDoProcesso());

  $("#tela-execucao").addEventListener("input", e => { if (e.target.dataset.t) editar(e, ex); });
  $("#tela-execucao").addEventListener("change", e => {
    if (e.target.tagName === "SELECT" && e.target.dataset.t) { editar(e, ex); renderExecucao(); }
  });

  function salvarExecucao(situacao, evento) {
    if (!exigirMecanico()) return false;
    const os = osAtual();
    const form = $("#form-execucao");
    limparErros(form);
    let ok = true;
    const dh = $("#x-datahora").value;
    ok = erro("x-mecanico", !$("#x-mecanico").value ? "Selecione o mecânico executor." : "") && ok;
    ok = erro("x-datahora", !dh ? "Informe a data e hora." : dh > agora() ? "A data e hora não podem ser futuras." : "") && ok;
    const semDescricao = ex.servicos.filter(s => s.situacao === "Concluído" && !s.realizado.trim());
    ok = erro("x-servicos", !ex.servicos.length ? "Não há serviço autorizado para executar."
      : semDescricao.length ? "Descreva o que foi realizado nos serviços concluídos." : "") && ok;
    if (!ok) { focarPrimeiroErro(form); avisar("Corrija os campos destacados.", true); return false; }

    const mec = Number($("#x-mecanico").value);
    executaveis(os).forEach((s, i) => {
      const novo = ex.servicos[i];
      if (s.situacao !== novo.situacao || s.realizado !== novo.realizado.trim()) s.mecanicoId = mec;
      s.situacao = novo.situacao;
      s.realizado = novo.realizado.trim();
    });
    os.execucao = { mecanicoId: mec, dataHora: dh, obs: $("#x-obs").value.trim() };
    os.situacao = situacao;
    registrar(os, evento);
    gravarOs(os);
    return true;
  }

  $("#btn-salvar-exec").addEventListener("click", () => {
    const os = osAtual();
    if (salvarExecucao("Em execução", `Andamento salvo por ${nomeMecanico(Number($("#x-mecanico").value))}.`)) {
      faixa("tela-execucao");
      avisar("Andamento salvo.");
    }
  });

  $("#btn-ir-pecas").addEventListener("click", () => {
    if (!PODE_MECANICO) { irPara("tela-pecas"); return; } // funcionário: só consulta
    if (salvarExecucao("Em execução", `Andamento salvo por ${nomeMecanico(Number($("#x-mecanico").value))}.`)) irPara("tela-pecas");
  });

  // mecânico encaminha e volta para a lista; a conferência é do atendimento
  function encaminharConferencia() {
    const os = osAtual();
    if (PODE_ATENDER) irPara("tela-conferencia");
    else fimDoProcesso(`OS ${os.numero} encaminhada para a conferência do atendimento.`);
  }

  // volta ao diagnóstico para incluir novos serviços adicionais (o andamento é salvo antes)
  $("#btn-exec-adicionais").addEventListener("click", () => {
    if (salvarExecucao("Em execução", `Andamento salvo por ${nomeMecanico(Number($("#x-mecanico").value))}. Retorno ao diagnóstico para incluir serviços adicionais.`)) {
      irPara("tela-diagnostico");
      const btn = document.querySelector('#tela-diagnostico [data-add="adicionais"]');
      if (btn) btn.scrollIntoView({ block: "center" });
    }
  });

  $("#btn-conferir").addEventListener("click", () => {
    if (adicionaisPendentes(osAtual()).length) {
      avisar("Há serviços adicionais aguardando a decisão do cliente. Solicite a autorização antes de encaminhar.", true);
      return;
    }
    if (salvarExecucao("Em conferência", "Execução encaminhada para conferência.")) encaminharConferencia();
  });

  // ---------------------------------------------------------------
  // 7. Registrar peças e materiais utilizados
  // ---------------------------------------------------------------

  let pecaSel = null; // id do lançamento selecionado para correção

  function atualizarSaldoCampo() {
    const it = itemPorId(Number($("#p-item").value));
    $("#p-saldo").value = it ? fmtNumero(it.saldo) : "";
  }

  function renderPecas() {
    const os = osAtual();
    $("#tabela-pecas tbody").innerHTML = os.pecas.length ? os.pecas.map(p => {
      const it = itemPorId(p.itemId);
      const sv = os.servicos.concat(os.adicionais).find(s => s.id === p.servicoId);
      return `<tr class="clicavel ${p.id === pecaSel ? "selecionada" : ""}" data-id="${p.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-peca" ${p.id === pecaSel ? "checked" : ""} aria-label="Selecionar lançamento"></td>
        <td>${escapar(it ? rotuloItem(it) : "—")}</td><td class="centro">${fmtNumero(p.qtd)}</td>
        <td class="valor">${fmtMoeda(p.preco)}</td><td class="valor">${fmtMoeda(p.qtd * p.preco)}</td>
        <td>${escapar(sv ? sv.descricao : "—")}</td></tr>`;
    }).join("") : `<tr class="vazia"><td colspan="6">Nenhuma peça ou material lançado nesta OS.</td></tr>`;
    $("#p-total").textContent = fmtMoeda(totalPecas(os));
    $("#btn-corrigir-peca").disabled = !pecaSel;
    $("#btn-add-peca").disabled = !!pecaSel;
    $("#btn-novo-lancamento").hidden = !pecaSel;
    $("#p-item").disabled = !!pecaSel;
    travar("tela-pecas");
  }

  function limparFormPecas() {
    const os = osAtual();
    pecaSel = null;
    limparErros($("#form-pecas"));
    opcoes($("#p-item"), itensConsumiveis().map(i => ({ v: i.id, t: rotuloItem(i) })), "", "Selecione o item...");
    opcoes($("#p-servico"), executaveis(os).map(s => ({ v: s.id, t: s.descricao })), "", "Sem serviço específico");
    $("#p-qtd").value = "";
    $("#p-preco").value = fmtMoeda(0);
    atualizarSaldoCampo();
    renderPecas();
  }

  aoAbrir["tela-pecas"] = () => {
    if (!osAtual()) { fimDoProcesso(); return; }
    faixa("tela-pecas");
    limparFormPecas();
  };

  $("#p-item").addEventListener("change", () => {
    const it = itemPorId(Number($("#p-item").value));
    atualizarSaldoCampo();
    $("#p-preco").value = fmtMoeda(it ? it.venda : 0);
  });

  $("#tabela-pecas tbody").addEventListener("click", e => {
    const tr = e.target.closest("tr.clicavel");
    if (!tr) return;
    const os = osAtual();
    const p = os.pecas.find(x => x.id === Number(tr.dataset.id));
    pecaSel = p.id;
    limparErros($("#form-pecas"));
    renderPecas();
    $("#p-item").value = String(p.itemId);
    atualizarSaldoCampo();
    $("#p-qtd").value = p.qtd;
    $("#p-preco").value = fmtMoeda(p.preco);
    $("#p-servico").value = p.servicoId ? String(p.servicoId) : "";
    $("#p-qtd").focus();
  });

  $("#btn-novo-lancamento").addEventListener("click", limparFormPecas);

  // confere os campos do lançamento; delta = quanto o saldo vai diminuir
  function lerLancamento(delta) {
    const form = $("#form-pecas");
    limparErros(form);
    const it = itemPorId(Number($("#p-item").value));
    const qtd = Number($("#p-qtd").value);
    const preco = lerMoeda($("#p-preco").value);
    let ok = true;
    ok = erro("p-item", !it ? "Selecione o item do estoque." : "") && ok;
    ok = erro("p-qtd", !(qtd > 0) ? "A quantidade deve ser maior que 0." : "") && ok;
    ok = erro("p-preco", preco < 0 ? "Informe um preço válido." : "") && ok;
    if (ok && delta(it, qtd) > it.saldo) {
      erro("p-qtd", `Saldo insuficiente: disponível ${fmtNumero(it.saldo)}. Revise o serviço ou aguarde a reposição.`);
      ok = false;
    }
    if (!ok) { focarPrimeiroErro(form); return null; }
    return { it, qtd, preco, servicoId: $("#p-servico").value ? Number($("#p-servico").value) : null };
  }

  function baixarEstoque(itemId, delta) { // delta positivo = sai do estoque
    const p2 = lerP2();
    const item = p2.itens.find(i => i.id === itemId);
    item.saldo = Math.round((item.saldo - delta) * 1000) / 1000;
    salvarDados(CHAVE_P2, p2);
    return item;
  }

  function avisoMinimo(item) {
    return item.saldo < item.minimo ? ` Atenção: saldo de ${item.descricao} abaixo do mínimo.` : "";
  }

  $("#btn-add-peca").addEventListener("click", () => {
    if (!exigirMecanico()) return;
    const os = osAtual();
    const itemId = Number($("#p-item").value);
    if (itemId && os.pecas.some(p => p.itemId === itemId)) {
      erro("p-item", "Este item já foi lançado nesta OS. Selecione a linha e use Corrigir lançamento.");
      return;
    }
    const d = lerLancamento((it, qtd) => qtd);
    if (!d) return;
    const lanc = { id: novoId(), itemId: d.it.id, qtd: d.qtd, preco: d.preco, servicoId: d.servicoId };
    os.pecas.push(lanc);
    const item = baixarEstoque(d.it.id, d.qtd);
    registrar(os, `Baixa de ${fmtNumero(d.qtd)} × ${d.it.descricao} (saldo: ${fmtNumero(item.saldo)}).`);
    gravarOs(os);
    limparFormPecas();
    avisar(`Item lançado.${avisoMinimo(item)}`);
  });

  $("#btn-corrigir-peca").addEventListener("click", () => {
    if (!exigirMecanico()) return;
    const os = osAtual();
    const lanc = os.pecas.find(p => p.id === pecaSel);
    if (!lanc) return;
    const d = lerLancamento((it, qtd) => qtd - lanc.qtd);
    if (!d) return;
    const delta = d.qtd - lanc.qtd;
    const antes = lanc.qtd;
    lanc.qtd = d.qtd; lanc.preco = d.preco; lanc.servicoId = d.servicoId;
    const item = delta ? baixarEstoque(lanc.itemId, delta) : itemPorId(lanc.itemId);
    registrar(os, `Correção de lançamento: ${d.it.descricao} de ${fmtNumero(antes)} para ${fmtNumero(d.qtd)} (saldo: ${fmtNumero(item.saldo)}).`);
    gravarOs(os);
    limparFormPecas();
    avisar(`Lançamento corrigido.${avisoMinimo(item)}`);
  });

  $("#btn-concluir-pecas").addEventListener("click", () => {
    if (!exigirMecanico()) return;
    const os = osAtual();
    if (pecaSel) { avisar("Há um lançamento em edição. Clique em Corrigir lançamento ou em Novo lançamento.", true); return; }
    registrar(os, os.pecas.length ? "Registro de peças concluído." : "Registro de peças concluído (sem uso de peças).");
    os.situacao = "Em conferência";
    gravarOs(os);
    encaminharConferencia();
  });

  // ---------------------------------------------------------------
  // 8. Conferir e finalizar OS
  // ---------------------------------------------------------------

  aoAbrir["tela-conferencia"] = () => {
    const os = osAtual();
    if (!os) { fimDoProcesso(); return; }
    faixa("tela-conferencia");
    const lista = executaveis(os);
    $("#tabela-conf-servicos tbody").innerHTML = lista.length ? lista.map(s => `
      <tr class="${s.situacao === "Impedido" ? "linha-impedida" : ""}"><td>${escapar(s.descricao)}${s.origem === "adicional" ? ` <span class="etiqueta adicional">adicional</span>` : ""}</td>
      <td>${escapar(s.mecanicoId ? nomeMecanico(s.mecanicoId) : nomeMecanico(os.mecanicoId))}</td><td>${escapar(s.situacao)}</td>
      <td class="valor">${fmtMoeda(s.valor)}</td></tr>`).join("")
      : `<tr class="vazia"><td colspan="4">Nenhum serviço registrado.</td></tr>`;
    $("#tabela-conf-pecas tbody").innerHTML = os.pecas.length ? os.pecas.map(p => {
      const it = itemPorId(p.itemId) || {};
      return `<tr><td>${it.codigo || "—"}</td><td>${escapar(it.descricao || "—")}</td><td class="centro">${fmtNumero(p.qtd)}</td><td class="valor">${fmtMoeda(p.qtd * p.preco)}</td></tr>`;
    }).join("") : `<tr class="vazia"><td colspan="4">Nenhuma peça ou material utilizado.</td></tr>`;
    const ts = totalServicosFeitos(os), tp = totalPecas(os);
    $("#c-total-serv").textContent = fmtMoeda(ts);
    $("#c-total-pecas").textContent = fmtMoeda(tp);
    $("#c-total").textContent = fmtMoeda(ts + tp);
    const pend = pendencias(os);
    $("#c-pendencias").innerHTML = pend.length
      ? `<ul>${pend.map(p => `<li>${escapar(p)}</li>`).join("")}</ul>`
      : `<span class="ok-msg">Nenhuma pendência. A OS pode ser finalizada.</span>`;
    $("#c-obs").value = os.obsFinais;
    $("#tabela-log tbody").innerHTML = [...os.historico].reverse().map(h => `
      <tr><td>${fmtDH(h.quando)}</td><td>${escapar(h.perfil)}</td><td>${escapar(h.texto)}</td></tr>`).join("");
  };

  $("#btn-finalizar").addEventListener("click", () => {
    const os = osAtual();
    const pend = pendencias(os);
    if (pend.length) {
      avisar("Há pendências impeditivas. Corrija os serviços ou encerre sem conclusão.", true);
      return;
    }
    os.obsFinais = $("#c-obs").value.trim();
    os.situacao = "Aguardando entrega";
    registrar(os, `OS conferida e finalizada. Valor total ${fmtMoeda(totalServicosFeitos(os) + totalPecas(os))}.`);
    gravarOs(os);
    irPara("tela-entrega");
  });

  $("#btn-corrigir-servicos").addEventListener("click", () => {
    const os = osAtual();
    os.obsFinais = $("#c-obs").value.trim();
    os.situacao = "Em execução";
    registrar(os, "OS devolvida para correção dos serviços.");
    gravarOs(os);
    if (!PODE_MECANICO) { fimDoProcesso(`OS ${os.numero} devolvida ao mecânico para correção dos serviços.`); return; }
    irPara("tela-execucao");
  });

  $("#btn-manter-pendente").addEventListener("click", () => {
    const os = osAtual();
    os.obsFinais = $("#c-obs").value.trim();
    os.situacao = "Em conferência";
    registrar(os, "OS mantida pendente na conferência.");
    gravarOs(os);
    fimDoProcesso(`OS ${os.numero} mantida pendente. Use “Retomar OS” para continuar.`);
  });

  $("#btn-encerrar-sem").addEventListener("click", async () => {
    const os = osAtual();
    const motivo = await pedirMotivo({
      titulo: "Encerrar sem conclusão",
      texto: `A OS ${os.numero} será encerrada sem a conclusão do serviço. As peças já lançadas continuam baixadas do estoque.`,
      confirmar: "Encerrar sem conclusão"
    });
    if (motivo === null) return;
    os.obsFinais = $("#c-obs").value.trim();
    os.situacao = "Encerrada sem conclusão";
    os.motivoEncerramento = motivo;
    registrar(os, `Atendimento encerrado sem conclusão: ${motivo}`);
    gravarOs(os);
    fimDoProcesso(`OS ${os.numero} encerrada sem conclusão.`);
  });

  // ---------------------------------------------------------------
  // 9. Registrar entrega do veículo
  // ---------------------------------------------------------------

  aoAbrir["tela-entrega"] = () => {
    const os = osAtual();
    if (!os) { fimDoProcesso(); return; }
    limparErros($("#form-entrega"));
    faixa("tela-entrega");
    const cli = clientePorId(os.clienteId);
    $("#e-cliente").value = cli ? cli.nome : "—";
    $("#e-veiculo").value = rotuloVeiculo(veiculoPorId(os.veiculoId));
    $("#e-datahora").value = agora();
    $("#e-km").value = os.km;
    $("#e-recebedor").value = cli ? cli.nome : "";
    $("#e-obs").value = "";
    $("#e-situacao").value = "Aguardando entrega";
  };

  $("#btn-confirmar-entrega").addEventListener("click", () => {
    const os = osAtual();
    const form = $("#form-entrega");
    limparErros(form);
    const dh = $("#e-datahora").value;
    const km = $("#e-km").value;
    const rec = $("#e-recebedor").value.trim();
    let ok = true;
    ok = erro("e-datahora", !dh ? "Informe a data e hora da entrega." : dh < os.entrada ? "A entrega não pode ser anterior à abertura da OS." : dh > agora() ? "A entrega não pode ser futura." : "") && ok;
    ok = erro("e-km", km === "" ? "Informe a quilometragem de saída." : Number(km) < os.km ? `A saída não pode ser menor que a entrada (${os.km} km).` : "") && ok;
    ok = erro("e-recebedor", !rec ? "Informe quem recebeu o veículo." : "") && ok;
    if (!ok) { focarPrimeiroErro(form); return; }

    os.entrega = { dataHora: dh, km: Number(km), recebedor: rec, obs: $("#e-obs").value.trim() };
    os.situacao = "Concluída";
    os.valorTotal = totalServicosFeitos(os) + totalPecas(os);
    registrar(os, `Veículo entregue a ${rec}. OS concluída.`);
    // a quilometragem de saída passa a ser a do veículo (Processo 1)
    const p1 = lerP1();
    const vei = p1.veiculos.find(v => v.id === os.veiculoId);
    if (vei) { vei.km = Number(km); salvarDados(CHAVE_P1, p1); }
    gravarOs(os);
    $("#e-situacao").value = "Concluída";
    fimDoProcesso(`OS ${os.numero} concluída e veículo entregue.`);
  });

  // ---------------------------------------------------------------

  resetarPesquisa();
})();
