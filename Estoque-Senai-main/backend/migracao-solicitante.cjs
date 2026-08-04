// Script de migração: adiciona as colunas "solicitanteNome" e "responsavelRetirada"
// na tabela de solicitações de retirada, SEM apagar dados existentes.
// Rode uma única vez.

const fs = require('fs');
const { Sequelize } = require('sequelize');

function log(msg) {
  fs.appendFileSync('migracao-log.txt', msg + '\n');
  console.log(msg);
}

fs.writeFileSync('migracao-log.txt', '');

const db = new Sequelize({ dialect: 'sqlite', storage: 'database.sqlite', logging: false });

async function adicionarColuna(tabela, coluna, definicaoSQL) {
  const [colunas] = await db.query(`PRAGMA table_info(${tabela})`);
  const jaExiste = colunas.some(function (c) { return c.name === coluna; });

  if (jaExiste) {
    log(`A coluna "${coluna}" já existe em "${tabela}". Pulando.`);
  } else {
    await db.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicaoSQL}`);
    log(`Coluna "${coluna}" adicionada em "${tabela}" com sucesso.`);
  }
}

async function migrar() {
  try {
    log('Conectando ao banco...');
    await db.authenticate();

    await adicionarColuna('solicitacoes_retirada', 'solicitanteNome', "VARCHAR(255) DEFAULT ''");
    await adicionarColuna('solicitacoes_retirada', 'responsavelRetirada', "VARCHAR(255) DEFAULT ''");

    log('Migração concluída. Solicitações antigas ficaram com esses campos vazios (não é possível preencher retroativamente, pois essa informação não existia antes).');

  } catch (erro) {
    log('ERRO: ' + erro.message);
    log(erro.stack);
  } finally {
    log('Script finalizado.');
    process.exit(0);
  }
}

migrar();
