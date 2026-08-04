import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../config/models.js';

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

// Cadastro público. Qualquer pessoa pode se cadastrar, mas SEMPRE entra
// como DOCENTE — mesmo que tente mandar outro "role" no corpo da requisição.
// Promoção para Coordenador/Diretor só pode ser feita por um Diretor logado
// (ver userController.promoteUser).
export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Preencha nome, e-mail e senha.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
  }

  const emailNormalizado = String(email).trim().toLowerCase();
  const exists = await User.findOne({ where: { email: emailNormalizado } });
  if (exists) return res.status(400).json({ message: 'E-mail já cadastrado.' });

  const user = await User.create({
    name: String(name).trim(),
    email: emailNormalizado,
    password,
    role: 'DOCENTE' // fixo, ignora qualquer role enviado pelo cliente
  });

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token: createToken(user)
  });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Informe e-mail e senha.' });

  const user = await User.findOne({ where: { email: String(email).trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token: createToken(user)
  });
}