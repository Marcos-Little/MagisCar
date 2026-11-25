# Como rodar no VS Code

1. Abra a pasta `MagisCar-main` no VS Code (Arquivo > Abrir Pasta).
2. Instale a extensão **Live Server** (o VS Code sugere ao abrir).
3. Clique com o botão direito em `index.html` > **Open with Live Server**.
   Ele abre a tela de login em http://127.0.0.1:5500/src/login/index.html

Sem extensão: no terminal da pasta, `python -m http.server 5500` e acesse http://localhost:5500.
(Também funciona abrindo `src/login/index.html` direto no navegador.)

## Login e perfis

| Perfil | Usuário | Senha | O que pode fazer |
|---|---|---|---|
| Administrador | `admin` | `admin123` | Acesso geral: todos os processos, avaliar exclusão de cadastro, cadastrar itens/fornecedores/entradas do estoque, cadastrar usuários e restaurar os dados de teste. |
| Funcionário | `funcionario` | `func123` | Cadastro e edição de clientes e veículos, agendamento (Processo 5, em breve) e atendimento da OS: abrir, registrar autorização do cliente, conferir e entregar. Estoque só para consulta. A exclusão de cadastro vira uma **solicitação** para o administrador. |
| Mecânico | `carlos`, `andre` ou `joao` | `mec123` | Vê a lista de ordens de serviço e atualiza o diagnóstico, a execução e as peças utilizadas. Estoque só para consulta. |

- As telas do mecânico (diagnóstico, execução e peças) aparecem **somente para consulta** para o funcionário.
- Quando o funcionário abre a OS, ela é encaminhada ao mecânico; quando o mecânico termina, ela volta para a conferência do atendimento.
- A sessão vale por aba do navegador: dá para testar perfis diferentes em abas diferentes. Use **Sair** no canto superior direito para trocar de usuário.
- O administrador cadastra novos usuários em **Usuários** (mecânicos novos já aparecem nas OS).

Os dados ficam no localStorage do navegador. Use "Restaurar dados de teste" (perfil administrador) na tela de pesquisa da OS para voltar ao início.

> Protótipo sem back-end: as senhas ficam no navegador e as permissões são conferidas só no front-end. No back-end, guardar a senha com hash (tabela `funcionario`) e validar as permissões também no servidor.
