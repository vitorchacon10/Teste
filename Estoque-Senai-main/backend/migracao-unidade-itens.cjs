// migracao-unidade-itens.cjs
//
// 1) Adiciona a coluna "unit" na tabela de produtos (default 'UN')
// 2) Cria a tabela "solicitacao_itens" (um produto por linha, várias por solicitação)
// 3) Migra as solicitações antigas (que tinham productId + quantity direto no
//    cabeçalho) para a nova tabela de itens, sem perder histórico
//
// Rode com: node migracao-unidade-itens.cjs

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function columnExists(rows, columnName) {
  return rows.some(r => r.name === columnName);
}

async function main() {
  console.log('Iniciando migração de unidade de medida e itens de solicitação...');

  // --- 1) Coluna "unit" em products ---
  const productColumns = await all('PRAGMA table_info(products);');
  if (!columnExists(productColumns, 'unit')) {
    await run(`ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'UN';`);
    console.log('✔ Coluna "unit" adicionada em products.');
  } else {
    console.log('- Coluna "unit" já existe em products, pulando.');
  }

  // --- 2) Tabela solicitacao_itens ---
  const tables = await all(`SELECT name FROM sqlite_master WHERE type='table' AND name='solicitacao_itens';`);
  if (tables.length === 0) {
    await run(`
      CREATE TABLE solicitacao_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quantity FLOAT NOT NULL,
        unit TEXT NOT NULL,
        "SolicitacaoRetiradaId" INTEGER NOT NULL REFERENCES solicitacoes_retirada(id) ON DELETE CASCADE,
        "ProductId" INTEGER NOT NULL REFERENCES products(id),
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ Tabela "solicitacao_itens" criada.');
  } else {
    console.log('- Tabela "solicitacao_itens" já existe, pulando criação.');
  }

  // --- 3) Migrar dados antigos (productId + quantity no cabeçalho) para itens ---
  const solicitacaoColumns = await all('PRAGMA table_info(solicitacoes_retirada);');
  const temColunasAntigas = columnExists(solicitacaoColumns, 'ProductId') && columnExists(solicitacaoColumns, 'quantity');

  if (temColunasAntigas) {
    const solicitacoesAntigas = await all(`
      SELECT id, "ProductId", quantity FROM solicitacoes_retirada WHERE "ProductId" IS NOT NULL;
    `);

    let migradas = 0;
    for (const s of solicitacoesAntigas) {
      // Pega a unidade atual do produto (se existir) pra registrar no item histórico
      const produto = await all(`SELECT unit FROM products WHERE id = ?;`, [s.ProductId]);
      const unidade = produto[0]?.unit || 'UN';

      await run(
        `INSERT INTO solicitacao_itens (quantity, unit, "SolicitacaoRetiradaId", "ProductId", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        [s.quantity, unidade, s.id, s.ProductId]
      );
      migradas++;
    }
    console.log(`✔ ${migradas} solicitação(ões) antiga(s) migrada(s) para solicitacao_itens.`);

    console.log('⚠ As colunas antigas "ProductId" e "quantity" continuam em solicitacoes_retirada');
    console.log('  (SQLite não permite DROP COLUMN direto de forma simples). Elas não serão mais');
    console.log('  usadas pelo código novo e podem ficar aí sem problema, ou ser limpas depois');
    console.log('  com uma migração de recriação de tabela, se quiser deixar 100% limpo.');
  } else {
    console.log('- Solicitações já não têm as colunas antigas, nada a migrar.');
  }

  console.log('Migração concluída com sucesso.');
  db.close();
}

main().catch(err => {
  console.error('Erro na migração:', err);
  db.close();
  process.exit(1);
});
