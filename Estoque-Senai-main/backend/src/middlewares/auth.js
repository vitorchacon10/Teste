import jwt from 'jsonwebtoken';
import { User } from '../config/models.js';

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header ? header.replace('Bearer ', '') : req.query.token;
    if (!token) return res.status(401).json({ message: 'Token não informado.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: ['id','name','email','role'] });
    if (!user) return res.status(401).json({ message: 'Usuário inválido.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Sem permissão.' });
    next();
  };
}
