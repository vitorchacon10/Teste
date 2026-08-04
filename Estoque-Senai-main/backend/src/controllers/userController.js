import { User } from '../config/models.js';

const ROLES_VALIDOS = ['DOCENTE', 'COORDENADOR', 'DIRETOR'];

// Lista usuários (sem a senha) — usado na tela de gerenciar permissões.
export async function listUsers(req, res) {
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'role', 'createdAt'],
    order: [['name', 'ASC']]
  });
  res.json(users);
}

// Só o Diretor pode promover/rebaixar o papel de um usuário.
export async function promoteUser(req, res) {
  const { role } = req.body;

  if (!ROLES_VALIDOS.includes(role)) {
    return res.status(400).json({ message: `Papel inválido. Use: ${ROLES_VALIDOS.join(', ')}.` });
  }

  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

  // Evita o Diretor se auto-rebaixar sem querer e ficar todo mundo sem Diretor
  if (user.id === req.user.id && role !== 'DIRETOR') {
    return res.status(400).json({ message: 'Você não pode remover seu próprio papel de Diretor por aqui.' });
  }

  user.role = role;
  await user.save();

  res.json({ message: 'Papel atualizado com sucesso.', user: { id: user.id, name: user.name, role: user.role } });
}