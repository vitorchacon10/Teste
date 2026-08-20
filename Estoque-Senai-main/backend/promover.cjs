const { Sequelize } = require('sequelize');

console.log('Iniciando script...');

const db = new Sequelize({ dialect: 'sqlite', storage: 'database.sqlite', logging: false });

async function promover() {
  try {
    console.log('Conectando ao banco...');
    await db.authenticate();
    console.log('Conectado! Atualizando usuário...');

    const [, metadata] = await db.query(
      "UPDATE Users SET role = 'DIRETOR' WHERE email = 'vitorsantoschacon@gmail.com'"
    );
    console.log('Linhas afetadas pelo UPDATE:', metadata);

    const [resultado] = await db.query(
      "SELECT id, name, email, role FROM Users WHERE email = 'vitorsantoschacon@gmail.com'"
    );
    console.log('Resultado final:', JSON.stringify(resultado, null, 2));

  } catch (erro) {
    console.error('ERRO CAPTURADO:', erro.message);
    console.error(erro);
  } finally {
    process.exit(0);
  }
}

promover();