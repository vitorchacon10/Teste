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
app.use(helmet({ crossOriginResourcePolicy: false }));
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
  const email = 'admin@senai.com';
  const exists = await User.findOne({ where: { email } });
  if (!exists) {
    await User.create({
      name: 'Administrador',
      email,
      password: '123456',
      role: 'DIRETOR'
    });
    console.log('Usuário inicial criado: admin@senai.com / 123456');
  }
}

const PORT = process.env.PORT || 3333;
sequelize.sync()
  .then(seedAdmin)
  .then(() => server.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`)))
  .catch(error => {
    console.error('Erro ao iniciar API:', error);
    process.exit(1);
  });