// Script de migração: adiciona a coluna "price" na tabela de produtos
// SEM apagar nenhum dado existente. Rode uma única vez.

const fs = require('fs');
const { Sequelize } = require('sequelize');

function log(msg) {
  fs.appendFileSync('migracao-log.txt', msg + '\n');
  console.log(msg);
}

fs.writeFileSync('migracao-log.txt', '');

const db = new Sequelize({ dialect: 'sqlite', storage: 'database.sqlite', logging: false });

async function migrar() {
  try {
    log('Conectando ao banco...');
    await db.authenticate();

    // Verifica se a coluna já existe, pra não dar erro rodando duas vezes
    const [colunas] = await db.query("PRAGMA table_info(products)");
    const jaExiste = colunas.some(function (c) { return c.name === 'price'; });

    if (jaExiste) {
      log('A coluna "price" já existe. Nada a fazer.');
    } else {
      await db.query("ALTER TABLE products ADD COLUMN price FLOAT DEFAULT 0");
      log('Coluna "price" adicionada com sucesso! Todos os produtos existentes ficaram com preço 0 por padrão — edite-os depois para preencher o valor real.');
    }

  } catch (erro) {
    log('ERRO: ' + erro.message);
    log(erro.stack);
  } finally {
    log('Migração finalizada.');
    process.exit(0);
  }
}

migrar();
