(function () {
  const {
    $, soDigitos, hojeIso, diasAtras, fmtData, escapar,
    fmtCnpj, fmtTelefone, fmtMoeda, mascaraMoeda, lerMoeda, fmtNumero,
    cnpjValido, emailValido, telefoneValido, erroArquivo,
    erro, limparErros, focarPrimeiroErro, aplicarMascaras, marcarLinha,
    aoAbrir, irPara, iniciarTelas, definirAcesso, avisar, carregarDados, salvarDados
  } = MagisCar;

  const CHAVE = "magiscar.processo2";

  // perfil logado (auth.js): só o administrador cadastra/altera itens, fornecedores e entradas;
  // funcionário e mecânico consultam o estoque
  if (!MagisAuth.usuario()) return; // sem login: o auth.js já está levando para a tela de login
  const EDITA = MagisAuth.pode("estoque.editar");

  function dadosIniciais() { // temporário, apenas p/ testes enquanto não há back
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

  const db = carregarDados(CHAVE, dadosIniciais);
  const persistir = () => salvarDados(CHAVE, db);
  const novoId = () => ++db.proximoId;

  const itemPorId = id => db.itens.find(i => i.id === id);
  const fornecedorPorId = id => db.fornecedores.find(f => f.id === id);
  const pedidosAbertos = itemId => db.pedidos.filter(p => p.itemId === itemId && p.recebido < p.quantidade && p.status !== "Cancelado");


  const proximoCodigo = () =>
    String(db.itens.reduce((m, i) => Math.max(m, Number(i.codigo)), 0) + 1).padStart(6, "0");


  const estado = {
    itemId: null,// item selecionado ou recém-cadastrado
    modo: "novo",// "novo" ou "editar"
    preservarItem: false // volta do cadastro de fornecedor sem apagar o que já foi digitado
  };

  aplicarMascaras({ moeda: mascaraMoeda, cnpj: fmtCnpj, telefone: fmtTelefone });
  iniciarTelas({ perfil: "Estoque" });

  // quem só consulta não entra no cadastro de fornecedor nem na entrada
  definirAcesso(id => EDITA || ["tela-pesquisar", "tela-item"].includes(id));
  if (!EDITA) {
    $("#btn-novo-item").hidden = true;
    $("#btn-selecionar").textContent = "Consultar item";
  }

  function preencherFornecedores(select, selecionado, comVazio) {
    const ops = [...db.fornecedores].sort((a, b) => a.nome.localeCompare(b.nome))
      .map(f => `<option value="${f.id}">${escapar(f.nome)}</option>`).join("");
    select.innerHTML = (comVazio ? `<option value="">Selecione o fornecedor...</option>` : "") + ops;
    select.value = selecionado ? String(selecionado) : "";
  }

  function fimDoProcesso(msg) {
    estado.itemId = null;
    resetarPesquisa();
    irPara("tela-pesquisar");
    if (msg) avisar(msg);
  }

  $("#logo").addEventListener("click", e => { e.preventDefault(); fimDoProcesso(); });
  $("#btn-cancelar-processo").addEventListener("click", () => fimDoProcesso("Processo encerrado."));

  let selecionadoPesquisa = null;
  let ultimaPesquisa = null;

  $("#criterio").addEventListener("change", () => {
    $("#termo").placeholder = $("#criterio").value === "codigo" ? "Ex.: 000123" : "Digite no mínimo 3 caracteres...";
    $("#termo").focus();
  });

  function buscar(criterio, termo) {
    const semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const t = semAcento(termo.trim());
    const codigo = soDigitos(termo);
    return db.itens.filter(i => criterio === "codigo"
      ? codigo !== "" && i.codigo.includes(codigo)
      : semAcento(i.descricao).includes(t))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  function renderResultados(lista) {
    const tbody = $("#tabela-resultados tbody");
    selecionadoPesquisa = null;
    $("#btn-selecionar").disabled = true;

    if (!lista) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="5">Nenhuma pesquisa realizada.</td></tr>`;
      $("#dica-resultados").textContent = "Informe o termo de busca e clique em Pesquisar. Dê dois cliques em uma linha para abrir o item.";
      return;
    }
    if (!lista.length) {
      tbody.innerHTML = `<tr class="vazia"><td colspan="5">Nenhum item encontrado. Use “Cadastrar novo item” para incluí-lo no estoque.</td></tr>`;
      $("#dica-resultados").textContent = "";
      return;
    }
    tbody.innerHTML = lista.map(i => `
      <tr class="clicavel" data-id="${i.id}">
        <td class="col-sel"><input type="radio" class="radio" name="sel-item" value="${i.id}" aria-label="Selecionar ${escapar(i.descricao)}"></td>
        <td>${i.codigo}</td>
        <td>${escapar(i.descricao)}</td>
        <td>${escapar(i.categoria)}</td>
        <td>${escapar(i.marca || "—")}</td>
      </tr>`).join("");
    $("#dica-resultados").textContent = `${lista.length} item(ns) encontrado(s). Dê dois cliques em uma linha para abrir o item.`;
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
    if (tr) abrirItem(Number(tr.dataset.id));
  });

  $("#form-pesquisa").addEventListener("submit", e => {
    e.preventDefault();
    const termo = $("#termo").value.trim();
    if (termo.length < 3) {
      erro("termo", "Informe no mínimo 3 caracteres.");
      $("#termo").focus();
      return;
    }
    ultimaPesquisa = { criterio: $("#criterio").value, termo };
    renderResultados(buscar(ultimaPesquisa.criterio, termo));
  });

  function resetarPesquisa() {
    $("#criterio").value = "descricao";
    $("#termo").value = "";
    $("#termo").placeholder = "Digite no mínimo 3 caracteres...";
    ultimaPesquisa = null;
    erro("termo", "");
    renderResultados(null);
  }

  $("#btn-limpar").addEventListener("click", () => { resetarPesquisa(); $("#termo").focus(); });
  $("#btn-selecionar").addEventListener("click", () => { if (selecionadoPesquisa) abrirItem(selecionadoPesquisa); });

  $("#btn-novo-item").addEventListener("click", () => {
    if (!EDITA) return;
    estado.modo = "novo";
    estado.itemId = null;
    estado.preservarItem = false;
    $("#tela-item").dataset.titulo = "Cadastrar item";
    irPara("tela-item");
    if (ultimaPesquisa && ultimaPesquisa.criterio === "descricao") $("#i-descricao").value = ultimaPesquisa.termo;
  });

  function abrirItem(id) {
    estado.modo = "editar";
    estado.itemId = id;
    estado.preservarItem = false;
    $("#tela-item").dataset.titulo = EDITA ? "Atualizar dados do item" : "Consultar item";
    irPara("tela-item");
  }

  let fotoSelecionada = null;

  aoAbrir["tela-item"] = () => {
    if (estado.preservarItem) { // voltando do cadastro de fornecedor
      estado.preservarItem = false;
      return;
    }
    const form = $("#form-item");
    const editar = estado.modo === "editar";
    const item = editar ? itemPorId(estado.itemId) : null;
    if (editar && !item) { fimDoProcesso(); return; }

    form.reset();
    limparErros(form);
    fotoSelecionada = item ? item.foto || null : null;
    $("#i-foto-nome").textContent = fotoSelecionada || "Nenhum arquivo";
    $("#i-foto-previa").hidden = true;
    $("#i-foto-previa").removeAttribute("src");

    preencherFornecedores($("#i-fornecedor"), item && item.fornecedorId, true);
    $("#i-codigo").value = item ? item.codigo : proximoCodigo();
    $("#i-codigo-dica").hidden = editar;
    $("#i-descricao").value = item ? item.descricao : "";
    $("#i-categoria").value = item ? item.categoria : "Peça";
    $("#i-marca").value = item ? item.marca : "";
    $("#i-custo").value = fmtMoeda(item ? item.custo : 0);
    $("#i-venda").value = fmtMoeda(item ? item.venda : 0);
    $("#i-localizacao").value = item ? item.localizacao : "";
    $("#i-minimo").value = item ? item.minimo : 0;
    $("#i-saldo").value = item ? fmtNumero(item.saldo) : "";

    $("#campo-saldo").hidden = !editar;
    $("#btn-cadastrar-fornecedor").hidden = editar;
    $("#btn-concluir-item").hidden = !editar;
    $("#btn-salvar-item").textContent = editar ? "Salvar alterações" : "Salvar";

    // somente consulta: campos travados e sem os comandos de gravação
    $("#i-leitura").hidden = EDITA;
    $("#i-dica-obrig").hidden = !EDITA;
    form.querySelectorAll("input, select, textarea, button").forEach(el => { el.disabled = !EDITA && !el.readOnly; });
    $('label[for="i-foto"]').hidden = !EDITA;
    ["#btn-salvar-item", "#btn-concluir-item", "#btn-cadastrar-fornecedor"].forEach(b => { if (!EDITA) $(b).hidden = true; });
    $("#btn-cancelar-item").textContent = EDITA ? "Cancelar" : "Voltar";
    if (EDITA) setTimeout(() => $("#i-descricao").focus(), 50);
  };

  $("#i-foto").addEventListener("change", () => {
    const arq = $("#i-foto").files[0];
    $("#i-foto-previa").hidden = true;
    if (!arq) return;
    $("#i-foto-nome").textContent = arq.name;
    const msg = erroArquivo(arq, ["image/jpeg", "image/png"], 5);
    if (msg) { fotoSelecionada = null; erro("i-foto", msg === "Formato de arquivo não permitido." ? "Envie uma imagem JPG ou PNG." : msg); return; }
    fotoSelecionada = arq.name;
    const leitor = new FileReader();
    leitor.onload = () => { $("#i-foto-previa").src = leitor.result; $("#i-foto-previa").hidden = false; };
    leitor.readAsDataURL(arq);
  });

  function validarItem() {
    const form = $("#form-item");
    limparErros(form);
    let ok = true;
    const descricao = $("#i-descricao").value.trim();
    const custo = lerMoeda($("#i-custo").value);
    const venda = lerMoeda($("#i-venda").value);
    const minimo = $("#i-minimo").value;

    if (!descricao) ok = erro("i-descricao", "Informe a descrição do item.") && ok;
    if (venda < custo) ok = erro("i-venda", "O preço de venda deve ser maior ou igual ao preço de custo.") && ok;
    if (!$("#i-fornecedor").value) ok = erro("i-fornecedor", "Selecione o fornecedor padrão.") && ok;
    if (minimo === "" || Number(minimo) < 0) ok = erro("i-minimo", "A quantidade mínima deve ser maior ou igual a 0.") && ok;
    if ($("#i-foto").files[0] && !fotoSelecionada) ok = erro("i-foto", "Envie uma imagem JPG ou PNG de até 5 MB.") && ok;

    if (!ok) focarPrimeiroErro(form);
    return ok;
  }

  function dadosDoFormItem() {
    return {
      descricao: $("#i-descricao").value.trim(),
      categoria: $("#i-categoria").value,
      marca: $("#i-marca").value.trim(),
      custo: lerMoeda($("#i-custo").value),
      venda: lerMoeda($("#i-venda").value),
      localizacao: $("#i-localizacao").value.trim(),
      fornecedorId: Number($("#i-fornecedor").value),
      minimo: Number($("#i-minimo").value),
      foto: fotoSelecionada
    };
  }

  function salvarItem() {
    if (!EDITA || !validarItem()) return null;
    let item;
    if (estado.modo === "novo") {
      item = { id: novoId(), codigo: proximoCodigo(), saldo: 0, ...dadosDoFormItem() };
      db.itens.push(item);
    } else {
      item = Object.assign(itemPorId(estado.itemId), dadosDoFormItem());
    }
    persistir();
    estado.itemId = item.id;
    return item;
  }

  $("#btn-salvar-item").addEventListener("click", () => {
    const novo = estado.modo === "novo";
    const item = salvarItem();
    if (!item) return;
    irPara("tela-entrada");
    avisar(novo ? `Item ${item.codigo} cadastrado. Registre a entrada.` : "Dados do item atualizados.");
  });

  $("#btn-concluir-item").addEventListener("click", () => {
    const item = salvarItem();
    if (item) fimDoProcesso(`Dados do item ${item.codigo} salvos.`);
  });

  $("#btn-cadastrar-fornecedor").addEventListener("click", () => irPara("tela-fornecedor"));

  aoAbrir["tela-fornecedor"] = () => {
    const form = $("#form-fornecedor");
    form.reset();
    limparErros(form);
    setTimeout(() => $("#f-nome").focus(), 50);
  };

  function voltarAoItem() {
    estado.preservarItem = true;
    irPara("tela-item");
  }

  $("#btn-cancelar-fornecedor").addEventListener("click", voltarAoItem);

  $("#btn-salvar-fornecedor").addEventListener("click", () => {
    if (!EDITA) return;
    const form = $("#form-fornecedor");
    limparErros(form);
    let ok = true;
    const nome = $("#f-nome").value.trim();
    const cnpj = soDigitos($("#f-cnpj").value);
    const email = $("#f-email").value.trim();
    const categorias = [...document.querySelectorAll("#f-categorias input:checked")].map(c => c.value);

    if (!nome) ok = erro("f-nome", "Informe o nome do fornecedor.") && ok;
    if (!cnpj) ok = erro("f-cnpj", "Informe o CNPJ.") && ok;
    else if (!cnpjValido(cnpj)) ok = erro("f-cnpj", "CNPJ inválido.") && ok;
    else if (db.fornecedores.some(f => f.cnpj === cnpj)) ok = erro("f-cnpj", "Já existe um fornecedor com este CNPJ.") && ok;
    if (!soDigitos($("#f-telefone").value)) ok = erro("f-telefone", "Informe o telefone.") && ok;
    else if (!telefoneValido($("#f-telefone").value)) ok = erro("f-telefone", "Use o formato (00) 00000-0000.") && ok;
    if (!email) ok = erro("f-email", "Informe o e-mail.") && ok;
    else if (!emailValido(email)) ok = erro("f-email", "E-mail inválido.") && ok;
    if (!categorias.length) ok = erro("f-categorias", "Selecione ao menos uma categoria.") && ok;
    if (!ok) { focarPrimeiroErro(form); return; }

    const f = { id: novoId(), nome, cnpj, telefone: soDigitos($("#f-telefone").value), email, categorias };
    db.fornecedores.push(f);
    persistir();

    preencherFornecedores($("#i-fornecedor"), f.id, true);
    erro("i-fornecedor", "");
    voltarAoItem();
    avisar(`Fornecedor ${f.nome} cadastrado e selecionado.`);
  });

  document.querySelectorAll("#f-categorias input").forEach(c => c.addEventListener("change", () => erro("f-categorias", "")));

  let quantidadeDoPedido = false; // true quando a quantidade foi preenchida pelo pedido, e não digitada

  aoAbrir["tela-entrada"] = () => {
    const item = itemPorId(estado.itemId);
    if (!item) { fimDoProcesso(); return; }
    const form = $("#form-entrada");
    form.reset();
    limparErros(form);
    quantidadeDoPedido = false;

    $("#e-item").value = `${item.descricao} (${item.codigo}) – ${item.categoria}`;

    const pedidos = pedidosAbertos(item.id);
    $("#e-pedido").innerHTML = `<option value="">Sem pedido de compra</option>` + pedidos.map(p => {
      const f = fornecedorPorId(p.fornecedorId);
      return `<option value="${p.numero}">Nº ${p.numero} – ${escapar(f ? f.nome : "")} – faltam ${fmtNumero(p.quantidade - p.recebido)}</option>`;
    }).join("");
    $("#e-pedido").disabled = !pedidos.length;
    $("#e-pedido-dica").textContent = pedidos.length ? "" : "Não há pedidos em aberto para este item.";

    preencherFornecedores($("#e-fornecedor"), item.fornecedorId, true);
    $("#e-data").value = hojeIso();
    $("#e-data").max = hojeIso();
    $("#e-preco").value = fmtMoeda(item.custo);
    $("#e-arquivo-nome").textContent = "Nenhum arquivo";
    $("#e-obs-contador").textContent = "0/300";
    atualizarResumo();
    setTimeout(() => $("#e-nf").focus(), 50);
  };

  $("#e-pedido").addEventListener("change", () => {
    const p = db.pedidos.find(x => x.numero === $("#e-pedido").value);
    if (p) {
      $("#e-fornecedor").value = String(p.fornecedorId);
      erro("e-fornecedor", "");
      if (!$("#e-quantidade").value || quantidadeDoPedido) {
        $("#e-quantidade").value = p.quantidade - p.recebido;
        quantidadeDoPedido = true;
        erro("e-quantidade", "");
      }
      $("#e-pedido-dica").textContent = `Pedido feito em ${fmtData(p.data)}: ${fmtNumero(p.quantidade)} solicitados, ${fmtNumero(p.recebido)} já recebidos.`;
    } else {
      $("#e-pedido-dica").textContent = "";
      if (quantidadeDoPedido) {
        $("#e-quantidade").value = "";
        quantidadeDoPedido = false;
      }
    }
    atualizarResumo();
  });

  $("#e-quantidade").addEventListener("input", () => {
    quantidadeDoPedido = false; // a pessoa digitou: não mexer mais
    atualizarResumo();
  });

  $("#e-obs").addEventListener("input", () => {
    $("#e-obs-contador").textContent = `${$("#e-obs").value.length}/300`;
  });

  $("#e-arquivo").addEventListener("change", () => {
    const arq = $("#e-arquivo").files[0];
    $("#e-arquivo-nome").textContent = arq ? arq.name : "Nenhum arquivo";
    const msg = erroArquivo(arq, ["application/pdf", "image/jpeg", "image/png"], 10);
    erro("e-arquivo", msg === "Formato de arquivo não permitido." ? "Envie um arquivo PDF, JPG ou PNG." : msg);
  });

  function atualizarResumo() {
    const item = itemPorId(estado.itemId);
    if (!item) return;
    const q = Number($("#e-quantidade").value);
    const valida = q > 0;
    const depois = item.saldo + (valida ? q : 0);
    const situacao = depois < item.minimo
      ? `<span class="etiqueta andamento">Continua abaixo do mínimo</span>`
      : `<span class="etiqueta ok">Acima do mínimo</span>`;
    $("#resumo-saldo").innerHTML = `
      <span>Saldo atual<br><strong>${fmtNumero(item.saldo)}</strong></span>
      <span>Quantidade recebida<br><strong>${valida ? "+ " + fmtNumero(q) : "—"}</strong></span>
      <span>Saldo após a entrada<br><strong class="novo">${fmtNumero(depois)}</strong></span>
      <span>Quantidade mínima<br><strong>${fmtNumero(item.minimo)}</strong></span>
      <span>Situação<br>${situacao}</span>`;
  }

  function registrarEntrada() {
    if (!EDITA) return null;
    const form = $("#form-entrada");
    limparErros(form);
    let ok = true;
    const item = itemPorId(estado.itemId);
    const pedido = db.pedidos.find(p => p.numero === $("#e-pedido").value) || null;
    const fornecedorId = Number($("#e-fornecedor").value);
    const nf = $("#e-nf").value.trim();
    const data = $("#e-data").value;
    const q = Number($("#e-quantidade").value);
    const arq = $("#e-arquivo").files[0];

    if (!fornecedorId) ok = erro("e-fornecedor", "Selecione o fornecedor.") && ok;
    else if (pedido && pedido.fornecedorId !== fornecedorId) ok = erro("e-fornecedor", "O fornecedor deve ser o mesmo do pedido de compra.") && ok;
    if (!nf) ok = erro("e-nf", "Informe o número da nota fiscal.") && ok;
    else if (db.entradas.some(e => e.nf === nf && e.fornecedorId === fornecedorId && e.itemId === item.id))
      ok = erro("e-nf", "Esta nota fiscal já foi registrada para este item e fornecedor.") && ok;
    if (!data) ok = erro("e-data", "Informe a data de recebimento.") && ok;
    else if (data > hojeIso()) ok = erro("e-data", "A data não pode ser futura.") && ok;
    if (!$("#e-quantidade").value) ok = erro("e-quantidade", "Informe a quantidade recebida.") && ok;
    else if (!(q > 0)) ok = erro("e-quantidade", "A quantidade deve ser maior que 0.") && ok;
    const msgArq = erroArquivo(arq, ["application/pdf", "image/jpeg", "image/png"], 10);
    if (msgArq) ok = erro("e-arquivo", msgArq === "Formato de arquivo não permitido." ? "Envie um arquivo PDF, JPG ou PNG." : msgArq) && ok;
    if (!ok) { focarPrimeiroErro(form); return null; }

    // soma a quantidade ao saldo e guarda o registro da entrada
    db.entradas.push({
      id: novoId(), itemId: item.id, fornecedorId, pedido: pedido ? pedido.numero : "",
      nf, data, quantidade: q, precoUnitario: lerMoeda($("#e-preco").value),
      arquivo: arq ? arq.name : "", observacoes: $("#e-obs").value.trim()
    });
    item.saldo += q;
    if (pedido) {
      pedido.recebido += q;
      pedido.status = pedido.recebido >= pedido.quantidade ? "Recebido" : "Parcialmente recebido";
    }
    persistir();
    return item;
  }

  $("#btn-confirmar-entrada").addEventListener("click", () => {
    const item = registrarEntrada();
    if (item) fimDoProcesso(`Entrada registrada. Novo saldo de ${item.descricao}: ${fmtNumero(item.saldo)}.`);
  });

  $("#btn-confirmar-outro").addEventListener("click", () => {
    const item = registrarEntrada();
    if (!item) return;
    fimDoProcesso(`Entrada registrada (saldo de ${item.descricao}: ${fmtNumero(item.saldo)}). Pesquise o próximo item.`);
    setTimeout(() => $("#termo").focus(), 60);
  });


  resetarPesquisa();
  persistir();
})();
