# Especificações do Projeto


Definição do problema e ideia de solução a partir da perspectiva do usuário. É composta pela definição do  diagrama de personas, histórias de usuários, requisitos funcionais e não funcionais além das restrições do projeto.

## Personas

2.1 Personas
1. Cliente — Erick Mendes

Idade: 32 anos
Profissão: Personal Trainer

Perfil: Erick utiliza seu carro diariamente para ir ao trabalho e realizar atividades pessoais. Ele procura uma oficina de confiança e gostaria de ter mais facilidade para consultar o histórico de manutenções e serviços realizados em seu veículo.

Objetivos:

Saber quais serviços serão realizados no veículo.
Consultar informações sobre as manutenções realizadas anteriormente.
Ter facilidade para entrar em contato com a oficina.

Principais dificuldades:

Não ter acesso fácil ao histórico de manutenção do veículo.
Ter dificuldade para lembrar quais manutenções e reparos já foram feitos no veículo.

2. Atendente — Mariana Candido

Idade: 27 anos
Profissão: Atendente da oficina mecânica

Perfil: Mariana é responsável pelo atendimento dos clientes e pela organização das informações relacionadas aos veículos e serviços. Ela precisa acessar essas informações rapidamente para conseguir atender os clientes de forma eficiente.

Objetivos:

Cadastrar clientes e veículos.
Organizar os agendamentos.
Criar e consultar orçamentos.
Criar e acompanhar ordens de serviço.
Consultar o histórico dos veículos.
Encontrar rapidamente as informações dos clientes.

Principais dificuldades:

Ter informações espalhadas em papéis, planilhas ou mensagens.
Ter dificuldade para localizar rapidamente o histórico de um veículo.
Possibilidade de erros em agendamentos e informações dos clientes.
Perder tempo procurando informações solicitadas pelos clientes.

3. Mecânico — Rafael Ribeiro

Idade: 35 anos
Profissão: Mecânico

Perfil: Rafael trabalha diretamente na manutenção dos veículos. Para realizar seu trabalho, precisa saber quais serviços foram solicitados, quais problemas o veículo apresenta e quais peças serão utilizadas.

Objetivos:

Consultar as ordens de serviço.
Saber quais serviços precisam ser realizados.
Registrar os serviços realizados.
Consultar o histórico do veículo.
Verificar as peças necessárias para os serviços.

Principais dificuldades:

Receber informações incompletas sobre o problema do veículo.
Não ter acesso rápido ao histórico de manutenção.
Falta de organização das informações sobre os serviços.
Não saber rapidamente quais peças estão disponíveis para determinado serviço.

4. Gerente — Marco Túlio

Idade: 43 anos
Profissão: Gerente da oficina mecânica

Perfil: Marco Túlio é responsável pelo funcionamento geral da oficina. Ele precisa acompanhar os serviços, funcionários, estoque, clientes e ordens de serviço para manter a oficina organizada.

Objetivos:

Acompanhar os serviços em andamento.
Controlar o estoque de peças e ferramentas.
Acompanhar orçamentos e ordens de serviço.
Ter acesso às informações dos clientes e veículos.
Consultar o histórico dos serviços realizados.
Melhorar a organização dos processos da oficina.

Principais dificuldades:

Ter dificuldade para acompanhar todas as atividades da oficina.
Falta de controle sobre o estoque.
Ter informações espalhadas em diferentes lugares.
Dificuldade para ter uma visão geral dos serviços realizados e a realizar.
Falta de informações para auxiliar no gerenciamento da oficina.

## Histórias de Usuários

Com base na análise das personas forma identificadas as seguintes histórias de usuários:
| EU COMO...    | QUERO/PRECISO...                                              | PARA...                                                                    |
| ------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Erick Mendes**   | Consultar o orçamento do meu veículo                          | Saber quais serviços serão realizados e seus valores                       |
| **Erick Mendes**   | Consultar informações sobre os serviços realizados no veículo | Saber quais manutenções e reparos já foram feitos                          |
| **Erick Mendes**   | Entrar em contato com a oficina pelo sistema                  | Tirar dúvidas e solicitar informações sobre meu veículo                    |
| **Mariana Candido** | Cadastrar clientes e veículos                                 | Manter os dados dos clientes e seus veículos organizados                   |
| **Mariana Candido** | Cadastrar, alterar e excluir informações dos clientes         | Corrigir dados e manter os cadastros atualizados                           |
| **Mariana Candido** | Organizar os agendamentos                                     | Controlar os horários disponíveis para os serviços                         |
| **Mariana Candido** | Criar e consultar orçamentos                                  | Informar ao cliente os serviços necessários e seus valores                 |
| **Mariana Candido** | Criar e acompanhar ordens de serviço                          | Registrar e acompanhar os serviços que serão realizados                    |
| **Rafael Ribeiro**  | Consultar as ordens de serviço                                | Saber quais serviços devem ser realizados em cada veículo                  |
| **Rafael Ribeiro**  | Pesquisar o cliente e o veículo                               | Encontrar as informações necessárias antes de realizar o serviço           |
| **Rafael Ribeiro**  | Consultar o histórico do veículo                              | Verificar manutenções e problemas anteriores                               |
| **Rafael Ribeiro**  | Registrar os serviços realizados                              | Manter o histórico do veículo atualizado                                   |
| **Rafael Ribeiro**  | Consultar as peças disponíveis                                | Saber quais peças estão disponíveis para realizar o serviço                |
| **Marco Túlio**   | Consultar as ordens de serviço                                | Acompanhar os serviços em andamento e os que ainda precisam ser realizados |
| **Marco Túlio**   | Controlar a entrada e saída de peças e ferramentas            | Manter o estoque atualizado e evitar a falta de materiais                  |
| **Marco Túlio**   | Consultar os orçamentos e serviços                            | Acompanhar os processos realizados na oficina                              |
| **Marco Túlio**   | Consultar informações de clientes e veículos                  | Ter uma visão geral dos atendimentos realizados                            |

## Requisitos

As tabelas que se seguem apresentam os requisitos funcionais e não funcionais que detalham o escopo do projeto. Para determinar a prioridade de requisitos, aplicar uma técnica de priorização de requisitos e detalhar como a técnica foi aplicada.


### Requisitos Funcionais

|ID    | Descrição do Requisito  | Prioridade |
|------|-----------------------------------------|----|
|RF-001| O sistema deve permitir cadastrar clientes e veículos vinculados ao cliente | ALTA |
|RF-002| O sistema deve permitir consultar, alterar e excluir clientes cadastrados | ALTA |
|RF-003| O sistema deve permitir pesquisar clientes e veículos por diferentes critérios | BAIXA |
|RF-004| Permitir que o usuário contrate um serviço | ALTA |
|RF-005| O sistema deve registrar data, horário e mecânico responsável pelo atendimento | ALTA |
|RF-006| O sistema deve permitir alterar ou cancelar atendimento | ALTA |
|RF-007| O sistema deve registrar os serviços executados no veículo | ALTA |
|RF-008| O sistema deve informar o estoque disponível de cada item | ALTA |
|RF-009| O sistema deve registrar entradas e saídas no estoque | ALTA |
|RF-010| Permitir o cadastro de fornecedores e o registro de pedidos de compra para reposição de peças no estoque | ALTA |
|RF-011| O sistema deve permitir registrar a conclusão da Ordem de Serviço | MÉDIA |
|RF-012| Enviar notificações automáticas aos clientes (via e-mail ou mensagem) informando sobre o andamento e a conclusão dos serviços | MÉDIA |
|RF-013| Apresentar os serviços contratados pelo usuário e suas respectivas datas e valores | MÉDIA |

### Requisitos não Funcionais

|ID     | Descrição do Requisito  |Prioridade |
|-------|-------------------------|----|
|RNF-001| O sistema deve controlar permissões de acesso de acordo com o perfil do usuário (cliente, atendente, mecânico) | ALTA |
|RNF-002| O sistema deve ser responsivo para rodar em dispositivos móveis | MÉDIA |
|RNF-003| A interface deve ser intuitiva e de fácil utilização | MÉDIA |
|RNF-004| O sistema deve permitir realizar, alterar e cancelar agendamentos de serviços | MÉDIA |
|RNF-005| Deve processar requisições do usuário em no máximo 3s | BAIXA |
|RNF-006| O sistema deve salvar as alterações dos funcionários | ALTA |
|RNF-007| O sistema deve suportar o acesso simultâneo de múltiplos funcionários sem queda significativa de desempenho | BAIXA |


## Restrições

O projeto está restrito pelos itens apresentados na tabela a seguir.

|ID| Restrição                                             |
|--|-------------------------------------------------------|
|01| O projeto deve ser entregue até o final do semestre |
|02| O banco de dados deverá ser relacional |
|03| O projeto deverá ser executado em computadores já existentes na oficina, sem necessidade de aquisição de novos equipamentos |
|04| O sistema deverá operar com conexão à internet apenas para backups e atualizações, mantendo as funções principais disponíveis localmente |
|05| Cada veículo deverá estar obrigatoriamente vinculado a um cliente cadastrado |
|06| Uma Ordem de Serviço somente poderá ser iniciada após aprovação do orçamento pelo cliente |
|07| Apenas usuários com perfil de administrador poderão excluir cadastros ou alterar configurações do sistema |
|08| A ferramenta será entregue no ambiente web e não mobile.|




