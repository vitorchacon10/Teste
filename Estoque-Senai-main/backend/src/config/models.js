import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from './database.js';

export const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  // Papéis do sistema:
  // DOCENTE      -> só pode solicitar retirada de produtos
  // COORDENADOR  -> pode adicionar produtos + solicitar retirada
  // DIRETOR      -> pode adicionar produtos, aprovar/rejeitar solicitações e retirar direto
  role: { type: DataTypes.ENUM('DOCENTE', 'COORDENADOR', 'DIRETOR'), defaultValue: 'DOCENTE' }
}, { tableName: 'users' });

User.beforeCreate(async user => { user.password = await bcrypt.hash(user.password, 10); });

export const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  brand: DataTypes.STRING,
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  minQuantity: { type: DataTypes.INTEGER, defaultValue: 5 },
  price: { type: DataTypes.FLOAT, defaultValue: 0 }, // preço unitário do produto
  expirationDate: DataTypes.DATEONLY,
  barcode: { type: DataTypes.STRING, unique: true },
  photoUrl: DataTypes.STRING,
  category: DataTypes.STRING,
  location: DataTypes.STRING
}, { tableName: 'products' });

export const Movement = sequelize.define('Movement', {
  type: { type: DataTypes.ENUM('ENTRADA', 'SAIDA', 'AJUSTE'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  previousQuantity: DataTypes.INTEGER,
  newQuantity: DataTypes.INTEGER,
  responsible: DataTypes.STRING,
  sector: DataTypes.STRING,
  notes: DataTypes.TEXT
}, { tableName: 'movements' });

export const Delivery = sequelize.define('Delivery', {
  responsibleName: { type: DataTypes.STRING, allowNull: false },
  sector: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  signatureUrl: DataTypes.STRING
}, { tableName: 'deliveries' });

// Solicitação de retirada: criada por Docente/Coordenador/Diretor,
// fica PENDENTE até um Diretor aprovar ou rejeitar.
export const SolicitacaoRetirada = sequelize.define('SolicitacaoRetirada', {
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  sector: DataTypes.STRING,
  notes: DataTypes.TEXT,
  // Nome de quem está solicitando (pode ser diferente de quem fisicamente retira o material)
  solicitanteNome: { type: DataTypes.STRING, allowNull: false },
  // Nome de quem vai efetivamente retirar o material no estoque
  responsavelRetirada: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('PENDENTE', 'APROVADA', 'REJEITADA'), defaultValue: 'PENDENTE' },
  rejectionReason: DataTypes.TEXT,
  approvedAt: DataTypes.DATE
}, { tableName: 'solicitacoes_retirada' });

User.hasMany(Movement); Movement.belongsTo(User);
Product.hasMany(Movement); Movement.belongsTo(Product);
Product.hasMany(Delivery); Delivery.belongsTo(Product);
User.hasMany(Delivery); Delivery.belongsTo(User);

Product.hasMany(SolicitacaoRetirada); SolicitacaoRetirada.belongsTo(Product);

// Quem solicitou (usuário logado no sistema)
User.hasMany(SolicitacaoRetirada, { foreignKey: 'requesterId', as: 'solicitacoes' });
SolicitacaoRetirada.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });

// Quem aprovou/rejeitou (Diretor)
User.hasMany(SolicitacaoRetirada, { foreignKey: 'approverId', as: 'aprovacoes' });
SolicitacaoRetirada.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });