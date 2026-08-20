import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../config/models.js';
import { sendMail } from '../utils/mailer.js';

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

// Solicita o link de redefinição de senha. Por segurança, SEMPRE retorna a
// mesma mensagem de sucesso — mesmo se o e-mail não existir no banco — pra
// não revelar quais e-mails têm cadastro no sistema.
export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Informe o e-mail.' });

  const emailNormalizado = String(email).trim().toLowerCase();
  const user = await User.findOne({ where: { email: emailNormalizado } });

  if (user) {
    // Token de uso único, expira em 30 minutos, e só serve pra essa finalidade
    // (o campo "purpose" evita que um token de login normal seja reaproveitado aqui).
    const token = jwt.sign(
      { id: user.id, purpose: 'reset-password' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    const link = `${process.env.FRONTEND_URL}/redefinir-senha.html?token=${token}`;

    try {
      await sendMail({
        to: user.email,
        subject: 'Redefinição de senha — SENAI Zerbini Estoque',
        html: `
          <p>Olá, ${user.name}!</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta no sistema de estoque.</p>
          <p><a href="${link}">Clique aqui para criar uma nova senha</a></p>
          <p>Esse link é válido por 30 minutos. Se você não pediu isso, pode ignorar este e-mail.</p>
        `
      });
    } catch (err) {
      console.error('Erro ao enviar e-mail de redefinição de senha:', err);
    }
  }

  res.json({ message: 'Se esse e-mail estiver cadastrado, você receberá um link de redefinição em instantes.' });
}

// Confirma a redefinição de senha a partir do token recebido por e-mail.
export async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ message: 'Link inválido ou expirado. Solicite um novo.' });
  }

  if (payload.purpose !== 'reset-password') {
    return res.status(400).json({ message: 'Link inválido.' });
  }

  const user = await User.findByPk(payload.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

  // O hook beforeUpdate no models.js cuida de criptografar essa senha
  // automaticamente antes de salvar.
  user.password = password;
  await user.save();

  res.json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' });
}