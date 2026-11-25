CREATE DATABASE oficina_mecanica;
USE oficina_mecanica;

CREATE TABLE funcionario (
    id_funcionario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE atendente (
    id_funcionario INT PRIMARY KEY,
    FOREIGN KEY (id_funcionario) REFERENCES funcionario(id_funcionario)
);

CREATE TABLE mecanico (
    id_funcionario INT PRIMARY KEY,
    FOREIGN KEY (id_funcionario) REFERENCES funcionario(id_funcionario)
);

CREATE TABLE administrador (
    id_funcionario INT PRIMARY KEY,
    FOREIGN KEY (id_funcionario) REFERENCES funcionario(id_funcionario)
);

CREATE TABLE responsavel_estoque (
    id_funcionario INT PRIMARY KEY,
    FOREIGN KEY (id_funcionario) REFERENCES funcionario(id_funcionario)
);

CREATE TABLE cliente (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    tipo_pessoa VARCHAR(2) NOT NULL,
    cpf_cnpj VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    endereco VARCHAR(200),
    data_nascimento DATE,
    ativo BOOLEAN DEFAULT TRUE,
    id_atendente INT NOT NULL,
    FOREIGN KEY (id_atendente) REFERENCES atendente(id_funcionario)
);

CREATE TABLE veiculo (
    id_veiculo INT PRIMARY KEY AUTO_INCREMENT,
    placa VARCHAR(7) NOT NULL UNIQUE,
    chassi VARCHAR(17) UNIQUE,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    cor VARCHAR(30),
    combustivel VARCHAR(20),
    quilometragem INT,
    ativo BOOLEAN DEFAULT TRUE,
    id_cliente INT NOT NULL,
    id_atendente INT NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_atendente) REFERENCES atendente(id_funcionario)
);

CREATE TABLE agendamento (
    id_agendamento INT PRIMARY KEY AUTO_INCREMENT,
    data_agendamento DATE NOT NULL,
    horario TIME NOT NULL,
    servico_solicitado VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'AGENDADO',
    id_veiculo INT NOT NULL,
    id_atendente INT NOT NULL,
    FOREIGN KEY (id_veiculo) REFERENCES veiculo(id_veiculo),
    FOREIGN KEY (id_atendente) REFERENCES atendente(id_funcionario)
);

CREATE TABLE servico (
    id_servico INT PRIMARY KEY AUTO_INCREMENT,
    descricao VARCHAR(150) NOT NULL,
    valor_previsto DECIMAL(10,2) NOT NULL
);

CREATE TABLE fornecedor (
    id_fornecedor INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(100),
    categorias_fornecidas VARCHAR(255)
);

CREATE TABLE item_estoque (
    id_item INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(6) NOT NULL UNIQUE,
    descricao VARCHAR(150) NOT NULL,
    tipo_item VARCHAR(20) NOT NULL,
    marca_fabricante VARCHAR(80),
    preco_custo DECIMAL(10,2) NOT NULL,
    preco_venda DECIMAL(10,2) NOT NULL,
    saldo DECIMAL(10,2) DEFAULT 0,
    qtde_minima DECIMAL(10,2) DEFAULT 0,
    localizacao VARCHAR(50),
    foto VARCHAR(255),
    id_fornecedor INT NOT NULL,
    id_responsavel INT NOT NULL,
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id_fornecedor),
    FOREIGN KEY (id_responsavel) REFERENCES responsavel_estoque(id_funcionario)
);

CREATE TABLE pedido_compra (
    id_pedido INT PRIMARY KEY AUTO_INCREMENT,
    numero VARCHAR(30) NOT NULL UNIQUE,
    data_pedido DATE NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    qtde_recebida DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(25) DEFAULT 'Enviado',
    id_item INT NOT NULL,
    id_fornecedor INT NOT NULL,
    FOREIGN KEY (id_item) REFERENCES item_estoque(id_item),
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id_fornecedor)
);

CREATE TABLE entrada_estoque (
    id_entrada INT PRIMARY KEY AUTO_INCREMENT,
    nf VARCHAR(44) NOT NULL,
    pedido VARCHAR(30),
    data_entrada DATE NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    arquivo VARCHAR(255),
    observacoes VARCHAR(300),
    id_item INT NOT NULL,
    id_fornecedor INT NOT NULL,
    FOREIGN KEY (id_item) REFERENCES item_estoque(id_item),
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedor(id_fornecedor),
    FOREIGN KEY (pedido) REFERENCES pedido_compra(numero)
);

CREATE TABLE orcamento (
    id_orcamento INT PRIMARY KEY AUTO_INCREMENT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    valor_total DECIMAL(10,2) DEFAULT 0,
    decisao VARCHAR(20) DEFAULT 'PENDENTE',
    data_decisao DATETIME,
    motivo_recusa VARCHAR(255),
    id_veiculo INT NOT NULL,
    FOREIGN KEY (id_veiculo) REFERENCES veiculo(id_veiculo)
);

CREATE TABLE orcamento_servico (
    id_orcamento INT,
    id_servico INT,
    valor DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id_orcamento, id_servico),
    FOREIGN KEY (id_orcamento) REFERENCES orcamento(id_orcamento),
    FOREIGN KEY (id_servico) REFERENCES servico(id_servico)
);

CREATE TABLE orcamento_item (
    id_orcamento INT,
    id_item INT,
    quantidade DECIMAL(10,2) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id_orcamento, id_item),
    FOREIGN KEY (id_orcamento) REFERENCES orcamento(id_orcamento),
    FOREIGN KEY (id_item) REFERENCES item_estoque(id_item)
);

CREATE TABLE ordem_servico (
    id_os INT PRIMARY KEY AUTO_INCREMENT,
    data_hora_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'ABERTA',
    quilometragem INT,
    diagnostico TEXT,
    valor_total DECIMAL(10,2) DEFAULT 0,
    id_veiculo INT NOT NULL,
    id_mecanico INT NOT NULL,
    id_agendamento INT UNIQUE,
    id_orcamento INT UNIQUE,
    FOREIGN KEY (id_veiculo) REFERENCES veiculo(id_veiculo),
    FOREIGN KEY (id_mecanico) REFERENCES mecanico(id_funcionario),
    FOREIGN KEY (id_agendamento) REFERENCES agendamento(id_agendamento),
    FOREIGN KEY (id_orcamento) REFERENCES orcamento(id_orcamento)
);

CREATE TABLE execucao_servico (
    id_execucao INT PRIMARY KEY AUTO_INCREMENT,
    id_os INT NOT NULL,
    id_servico INT NOT NULL,
    id_mecanico INT NOT NULL,
    data_hora_execucao DATETIME,
    descricao TEXT,
    status VARCHAR(20) DEFAULT 'PENDENTE',
    FOREIGN KEY (id_os) REFERENCES ordem_servico(id_os),
    FOREIGN KEY (id_servico) REFERENCES servico(id_servico),
    FOREIGN KEY (id_mecanico) REFERENCES mecanico(id_funcionario)
);

CREATE TABLE servico_adicional (
    id_servico_adicional INT PRIMARY KEY AUTO_INCREMENT,
    id_os INT NOT NULL,
    id_mecanico INT NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor_adicional DECIMAL(10,2) NOT NULL,
    decisao_cliente VARCHAR(20) DEFAULT 'PENDENTE',
    data_hora_decisao DATETIME,
    observacoes TEXT,
    comprovacao VARCHAR(255),
    FOREIGN KEY (id_os) REFERENCES ordem_servico(id_os),
    FOREIGN KEY (id_mecanico) REFERENCES mecanico(id_funcionario)
);

CREATE TABLE peca_utilizada (
    id_os INT,
    id_item INT,
    quantidade DECIMAL(10,2) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id_os, id_item),
    FOREIGN KEY (id_os) REFERENCES ordem_servico(id_os),
    FOREIGN KEY (id_item) REFERENCES item_estoque(id_item)
);

CREATE TABLE solicitacao_exclusao (
    id_solicitacao INT PRIMARY KEY AUTO_INCREMENT,
    tipo_alvo VARCHAR(10) NOT NULL,
    justificativa VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDENTE',
    data_solicitacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_avaliacao DATETIME,
    id_cliente INT NOT NULL,
    id_veiculo INT,
    id_administrador INT,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_veiculo) REFERENCES veiculo(id_veiculo),
    FOREIGN KEY (id_administrador) REFERENCES administrador(id_funcionario)
);

CREATE VIEW vw_historico_veiculo AS
SELECT v.id_veiculo, v.placa, os.id_os, os.data_hora_abertura, os.quilometragem,
       os.diagnostico, s.descricao AS servico, es.data_hora_execucao,
       f.nome AS mecanico, os.valor_total
FROM veiculo v
JOIN ordem_servico os ON os.id_veiculo = v.id_veiculo
LEFT JOIN execucao_servico es ON es.id_os = os.id_os
LEFT JOIN servico s ON s.id_servico = es.id_servico
LEFT JOIN funcionario f ON f.id_funcionario = es.id_mecanico;
