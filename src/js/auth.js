// controle de acesso: login, perfis e permissões
// no html, carregar no <head>, antes do comum.js, e proteger a página logo em seguida:
//   <script src="../js/auth.js"></script>
//   <script>MagisAuth.proteger("os");</script>
//
// ATENÇÃO: é só um protótipo no navegador (localStorage/sessionStorage).
// Quando existir o back-end, a senha deve ser guardada com hash (tabela funcionario)
// e as permissões precisam ser conferidas também no servidor.

window.MagisAuth = (function () {
  const CHAVE_USUARIOS = "magiscar.usuarios";
  const CHAVE_SESSAO = "magiscar.sessao";
  const LOGIN = "../login/index.html";

  const PERFIS = { admin: "Administrador", funcionario: "Funcionário", mecanico: "Mecânico" };

  // o que cada perfil pode fazer ("*" = tudo)
  //   clientes                  acessar o Processo 1 (cadastrar e editar clientes/veículos)
  //   clientes.avaliarExclusao  aprovar ou recusar exclusão de cadastro
  //   agendamento               Processo 5 (em desenvolvimento)
  //   estoque                   consultar o estoque
  //   estoque.editar            cadastrar/alterar itens, fornecedores e entradas
  //   os                        acessar o Processo 6
  //   os.atendimento            abrir OS, autorização, conferência e entrega
  //   os.mecanico               diagnóstico, execução e peças utilizadas
  //   os.restaurar              apagar os dados de teste
  //   usuarios                  cadastrar usuários do sistema
  const PERMISSOES = {
    admin: ["*"],
    funcionario: ["clientes", "agendamento", "estoque", "os", "os.atendimento"],
    mecanico: ["estoque", "os", "os.mecanico"]
  };

  // páginas do menu, na ordem em que aparecem
  const MENU = [
    { id: "clientes", texto: "Clientes", href: "../processo1/cadastro-cliente.html", perm: "clientes" },
    { id: "agendamento", texto: "Agendamento", href: null, perm: "agendamento" }, // Processo 5: ainda não existe
    { id: "estoque", texto: "Estoque", href: "../processo2/index.html", perm: "estoque" },
    { id: "os", texto: "Ordem de serviço", href: "../processo6/index.html", perm: "os" },
    { id: "usuarios", texto: "Usuários", href: "../usuarios/index.html", perm: "usuarios" }
  ];

  // usuários de teste (os mecânicos têm o mesmo id usado nas OS: mecanicoId)
  function usuariosIniciais() {
    return [
      { id: 1, nome: "Administrador", login: "admin", senha: "admin123", perfil: "admin", ativo: true },
      { id: 2, nome: "Ana Lima", login: "funcionario", senha: "func123", perfil: "funcionario", ativo: true },
      { id: 3, nome: "Carlos", login: "carlos", senha: "mec123", perfil: "mecanico", mecanicoId: 1, ativo: true },
      { id: 4, nome: "André", login: "andre", senha: "mec123", perfil: "mecanico", mecanicoId: 2, ativo: true },
      { id: 5, nome: "João", login: "joao", senha: "mec123", perfil: "mecanico", mecanicoId: 3, ativo: true }
    ];
  }

  function usuarios() {
    try {
      const salvo = localStorage.getItem(CHAVE_USUARIOS);
      if (salvo) return JSON.parse(salvo);
    } catch (e) { /* armazenamento indisponível */ }
    return usuariosIniciais();
  }

  function salvarUsuarios(lista) {
    try { localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(lista)); } catch (e) { /* não salvou */ }
  }

  // sessão por aba (sessionStorage): dá p/ testar perfis diferentes em abas diferentes
  function lerSessao() {
    try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || "null"); } catch (e) { return null; }
  }

  // usuário logado (null se não há sessão ou se ele foi desativado)
  function usuario() {
    const s = lerSessao();
    if (!s) return null;
    return usuarios().find(u => u.id === s.id && u.ativo) || null;
  }

  // devolve "" se deu certo, ou a mensagem de erro
  function entrar(login, senha) {
    const u = usuarios().find(x => x.login.toLowerCase() === String(login).trim().toLowerCase());
    if (!u || u.senha !== senha) return "Usuário ou senha inválidos.";
    if (!u.ativo) return "Este usuário está desativado. Procure o administrador.";
    try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ id: u.id, desde: new Date().toISOString() })); }
    catch (e) { return "Não foi possível iniciar a sessão neste navegador."; }
    return "";
  }

  function sair() {
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* sem acesso */ }
    location.href = LOGIN;
  }

  // exemplo: pode("os.mecanico") -> true para mecânico e administrador
  function pode(perm, u = usuario()) {
    if (!u) return false;
    const lista = PERMISSOES[u.perfil] || [];
    return lista.includes("*") || lista.includes(perm);
  }

  // página aberta logo após o login
  const INICIAL = { admin: "os", funcionario: "clientes", mecanico: "os" };

  function paginaInicial(u = usuario()) {
    if (!u) return LOGIN;
    const m = MENU.find(x => x.id === INICIAL[u.perfil] && pode(x.perm, u)) || MENU.find(x => x.href && pode(x.perm, u));
    return m ? m.href : LOGIN;
  }

  const paginaAtual = () => "../" + location.pathname.split("/").slice(-2).join("/");

  // sem login: vai p/ o login; sem permissão: vai p/ a página inicial do perfil
  function proteger(perm) {
    const u = usuario();
    if (!u) {
      location.replace(`${LOGIN}?volta=${encodeURIComponent(paginaAtual())}`);
      return false;
    }
    if (perm && !pode(perm, u)) {
      location.replace(paginaInicial(u));
      return false;
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montarTopo);
    else montarTopo();
    return true;
  }

  // mecânicos cadastrados, no formato usado pelas OS: { id, nome, ativo }
  // quem foi desativado (ou mudou de perfil) continua na lista, só que inativo,
  // p/ o nome dele não sumir das OS antigas
  function mecanicos() {
    return usuarios().filter(u => u.mecanicoId)
      .map(u => ({ id: u.mecanicoId, nome: u.nome, ativo: u.ativo && u.perfil === "mecanico" }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // monta o menu (só com o que o perfil pode ver) e a caixa do usuário com o botão Sair
  // a página indica qual item está aberto: <nav class="menu" data-atual="os">
  function montarTopo() {
    const u = usuario();
    if (!u) return;
    const nav = document.querySelector(".barra-magiscar .menu");
    if (nav) {
      const atual = nav.dataset.atual;
      nav.innerHTML = MENU.filter(m => pode(m.perm, u)).map(m => m.href
        ? `<a href="${m.href}"${m.id === atual ? ' class="atual"' : ""}>${esc(m.texto)}</a>`
        : `<span class="em-breve" title="Em desenvolvimento (Processo 5)">${esc(m.texto)}</span>`).join("");
    }
    const caixa = document.querySelector(".barra-magiscar .usuario");
    if (caixa) {
      caixa.innerHTML = `
        <div class="perfil" title="Usuário: ${esc(u.login)}">
          <img src="../img/user.svg" alt="" width="11" height="11">
          <span>${esc(u.nome)}</span>
          <span class="perfil-tag">${esc(PERFIS[u.perfil])}</span>
        </div>
        <button type="button" class="botao-sair" id="btn-sair">Sair</button>`;
      caixa.querySelector("#btn-sair").addEventListener("click", sair);
    }
  }

  return {
    PERFIS, usuarios, salvarUsuarios, usuario, entrar, sair, pode,
    paginaInicial, proteger, mecanicos, montarTopo, LOGIN
  };
})();
