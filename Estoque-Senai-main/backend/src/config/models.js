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

// Importante: sem esse hook, redefinir senha (ex: recuperação de senha)
// salvaria a senha em texto puro, sem criptografia, sempre que o campo
// "password" for alterado num user.update()/user.save() já existente.
User.beforeUpdate(async user => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// Unidades de medida aceitas no estoque.
// UN e PCT sempre em quantidade inteira (não fracionam).
// G, KG, ML, L aceitam quantidade fracionada (ex: 0.25 kg).
export const UNIDADES_FRACIONAVEIS = ['G', 'KG', 'ML', 'L'];
export const UNIDADES_INTEIRAS = ['UN', 'PCT'];
export const UNIDADES = [...UNIDADES_INTEIRAS, ...UNIDADES_FRACIONAVEIS];

export const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  brand: DataTypes.STRING,
  // FLOAT em vez de INTEGER para permitir itens fracionados (ex: 1.5 kg, 250 g)
  quantity: { type: DataTypes.FLOAT, defaultValue: 0 },
  minQuantity: { type: DataTypes.FLOAT, defaultValue: 5 },
  price: { type: DataTypes.FLOAT, defaultValue: 0 }, // preço unitário do produto
  unit: { type: DataTypes.ENUM(...UNIDADES), allowNull: false, defaultValue: 'UN' },
  expirationDate: DataTypes.DATEONLY,
  barcode: { type: DataTypes.STRING, unique: true },
  photoUrl: DataTypes.STRING,
  category: DataTypes.STRING,
  location: DataTypes.STRING
}, { tableName: 'products' });

export const Movement = sequelize.define('Movement', {
  type: { type: DataTypes.ENUM('ENTRADA', 'SAIDA', 'AJUSTE'), allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  previousQuantity: DataTypes.FLOAT,
  newQuantity: DataTypes.FLOAT,
  responsible: DataTypes.STRING,
  sector: DataTypes.STRING,
  notes: DataTypes.TEXT
}, { tableName: 'movements' });

export const Delivery = sequelize.define('Delivery', {
  responsibleName: { type: DataTypes.STRING, allowNull: false },
  sector: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  signatureUrl: DataTypes.STRING
}, { tableName: 'deliveries' });

// Solicitação de retirada: criada por Docente/Coordenador/Diretor,
// fica PENDENTE até um Diretor aprovar ou rejeitar.
// A partir de agora é só o "cabeçalho" — os produtos ficam em SolicitacaoItem,
// permitindo pedir vários produtos numa única solicitação.
export const SolicitacaoRetirada = sequelize.define('SolicitacaoRetirada', {
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

// Um item por produto dentro de uma solicitação.
// Guarda a unidade usada no momento do pedido (histórico não muda
// se o produto for editado depois).
export const SolicitacaoItem = sequelize.define('SolicitacaoItem', {
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  unit: { type: DataTypes.ENUM(...UNIDADES), allowNull: false }
}, { tableName: 'solicitacao_itens' });

User.hasMany(Movement); Movement.belongsTo(User);
Product.hasMany(Movement); Movement.belongsTo(Product);
Product.hasMany(Delivery); Delivery.belongsTo(Product);
User.hasMany(Delivery); Delivery.belongsTo(User);

// Quem solicitou (usuário logado no sistema)
User.hasMany(SolicitacaoRetirada, { foreignKey: 'requesterId', as: 'solicitacoes' });
SolicitacaoRetirada.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });

// Quem aprovou/rejeitou (Diretor)
User.hasMany(SolicitacaoRetirada, { foreignKey: 'approverId', as: 'aprovacoes' });
SolicitacaoRetirada.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

// Uma solicitação tem vários itens; se a solicitação for apagada, os itens vão junto.
SolicitacaoRetirada.hasMany(SolicitacaoItem, { onDelete: 'CASCADE' });
SolicitacaoItem.belongsTo(SolicitacaoRetirada);

Product.hasMany(SolicitacaoItem);
SolicitacaoItem.belongsTo(Product);