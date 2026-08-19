import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { sequelize } from './config/database.js';
import { User } from './config/models.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const server = http.createServer(app);

// __dirname não existe nativamente em módulos ES (import/export),
// então recriamos ele a partir da URL do próprio arquivo.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pasta do frontend: sobe 2 níveis (de src/ pra backend/, de backend/ pra raiz)
// e entra em frontend/. Ajuste aqui se a estrutura de pastas mudar.
const frontendPath = path.join(__dirname, '..', '..', 'frontend');

// Aceita o Live Server em qualquer porta (5500, 5501, etc.)
const origensPermitidas = [
  process.env.FRONTEND_URL,
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:3000',
];

export const io = new Server(server, { cors: { origin: origensPermitidas } });

app.use(cors({ origin: origensPermitidas }));
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      // 'unsafe-inline' aqui é necessário porque produtos.js gera botões
      // com onclick="..." direto no HTML (ex: Editar/Excluir na tabela).
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://res.cloudinary.com'],
      mediaSrc: ["'self'", 'blob:'], // necessário pro leitor de código de barras usar a câmera
      workerSrc: ["'self'", 'blob:']
    }
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
  extended: true
}));
fs.mkdirSync('src/uploads', { recursive: true });
app.use('/uploads', express.static('src/uploads')); 
app.use(express.static(frontendPath)); // serve index.html, cadastro.html, css/, js/
app.use('/api', routes);

io.on('connection', socket => console.log('Usuário conectado:', socket.id));

// Captura qualquer erro não tratado (inclui falhas do Multer/Cloudinary
// que acontecem antes de chegar no controller) e mostra no terminal.
app.use((error, req, res, next) => {
  console.error('ERRO NÃO TRATADO:');
  console.error(error);
  res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
});

async function seedAdmin() {
  // Em produção, defina ADMIN_EMAIL e ADMIN_PASSWORD nas variáveis de
  // ambiente do Render com valores únicos e fortes. Os valores abaixo só
  // são usados como fallback pra facilitar o desenvolvimento local.
  const email = process.env.ADMIN_EMAIL || 'admin@senai.com';
  const senhaInicial = process.env.ADMIN_PASSWORD || '123456';

  const exists = await User.findOne({ where: { email } });
  if (!exists) {
    await User.create({
      name: 'Administrador',
      email,
      password: senhaInicial,
      role: 'DIRETOR'
    });
    console.log(`Usuário inicial criado: ${email}`);
  }
}

// Migração automática: roda toda vez que o servidor sobe, mas é segura
// porque o IF NOT EXISTS só cria a coluna se ela ainda não existir.
async function migrateProductColumns() {
  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(10) NOT NULL DEFAULT 'UN';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS "invoiceNumber" VARCHAR(255);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS "purchaseLocation" VARCHAR(255);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS "cnpj" VARCHAR(20);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS "purchaseDate" DATE;
  `);
  console.log('Colunas de produto (unit, nota fiscal, local, cnpj, data da compra) verificadas/criadas com sucesso');
}

const PORT = process.env.PORT || 3333;
sequelize.sync()
  .then(migrateProductColumns)
  .then(seedAdmin)
  .then(() => server.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`)))
  .catch(error => {
    console.error('Erro ao iniciar API:', error);
    process.exit(1);
  });