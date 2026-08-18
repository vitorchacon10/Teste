import { Op } from 'sequelize';
import dayjs from 'dayjs';
import { Product, Movement, UNIDADES, UNIDADES_INTEIRAS } from '../config/models.js';
import { io } from '../server.js';

// O Postgres (produção) rejeita strings vazias ou "Invalid date" em campos
// de data — o SQLite (dev) deixava passar. Convertemos pra null quando o
// campo vem vazio ou inválido, já que a validade é opcional.
function sanitizeExpirationDate(value) {
  if (!value) return null;
  const data = new Date(value);
  return isNaN(data.getTime()) ? null : value;
}

// Garante que a unidade veio válida e que a quantidade respeita a regra
// da unidade (UN/PCT não fracionam, G/KG/ML/L podem). Retorna a mensagem
// de erro (string) se algo estiver errado, ou null se estiver tudo certo.
function validarUnidadeQuantidade(unit, quantity) {
  if (unit && !UNIDADES.includes(unit)) {
    return `Unidade "${unit}" inválida.`;
  }
  const qtd = Number(quantity);
  if (unit && UNIDADES_INTEIRAS.includes(unit) && quantity !== undefined && !Number.isInteger(qtd)) {
    return `Produtos com unidade ${unit} não aceitam quantidade fracionada.`;
  }
  return null;
}

export async function listProducts(req, res) {
  const { search = '', category } = req.query;
  const where = { name: { [Op.like]: `%${search}%` } };
  if (category) where.category = category;
  const products = await Product.findAll({ where, order: [['name','ASC']] });
  res.json(products);
}

export async function getProductByBarcode(req, res) {
  const product = await Product.findOne({ where: { barcode: req.params.barcode } });
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
  res.json(product);
}

export async function createProduct(req, res) {
  try {
    const erroUnidade = validarUnidadeQuantidade(req.body.unit, req.body.quantity);
    if (erroUnidade) return res.status(400).json({ message: erroUnidade });

    const photoUrl = req.file
      ? (req.file.path?.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`)
      : null;

    const product = await Product.create({
      ...req.body,
      expirationDate: sanitizeExpirationDate(req.body.expirationDate),
      photoUrl
    });

    io.emit('products:update', {
      action: 'created',
      product
    });

    return res.status(201).json(product);

  } catch (error) {

    console.error('ERRO AO CADASTRAR PRODUTO');
    console.error(error);

    return res.status(500).json({
      message: error.message
    });
  }
}

export async function updateProduct(req, res) {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });

  const unidadeFinal = req.body.unit || product.unit;
  const quantidadeFinal = req.body.quantity !== undefined ? req.body.quantity : product.quantity;
  const erroUnidade = validarUnidadeQuantidade(unidadeFinal, quantidadeFinal);
  if (erroUnidade) return res.status(400).json({ message: erroUnidade });

  const photoUrl = req.file
    ? (req.file.path?.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`)
    : product.photoUrl;
  await product.update({
    ...req.body,
    expirationDate: sanitizeExpirationDate(req.body.expirationDate),
    photoUrl
  });
  io.emit('products:update', { action: 'updated', product });
  res.json(product);
}

export async function deleteProduct(req, res) {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
  await product.destroy();
  io.emit('products:update', { action: 'deleted', id: req.params.id });
  res.json({ message: 'Produto excluído.' });
}

export async function moveStock(req, res) {
  const { productId, barcode, type, quantity, responsible, sector, notes } = req.body;
  const product = productId ? await Product.findByPk(productId) : await Product.findOne({ where: { barcode } });
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });

  const amount = Number(quantity);
  if (UNIDADES_INTEIRAS.includes(product.unit) && !Number.isInteger(amount)) {
    return res.status(400).json({ message: `Produtos com unidade ${product.unit} não aceitam quantidade fracionada.` });
  }

  const previousQuantity = product.quantity;
  const newQuantity = type === 'ENTRADA' ? previousQuantity + amount : previousQuantity - amount;
  if (newQuantity < 0) return res.status(400).json({ message: 'Estoque insuficiente.' });
  await product.update({ quantity: newQuantity });
  const movement = await Movement.create({ ProductId: product.id, UserId: req.user.id, type, quantity: amount, previousQuantity, newQuantity, responsible, sector, notes });
  io.emit('stock:moved', { product, movement });
  res.json({ product, movement });
}

export async function dashboard(req, res) {
  const today = dayjs();
  const limit = today.add(30, 'day').format('YYYY-MM-DD');
  const total = await Product.count();
  const expiring = await Product.count({ where: { expirationDate: { [Op.between]: [today.format('YYYY-MM-DD'), limit] } } });
  const expired = await Product.count({ where: { expirationDate: { [Op.lt]: today.format('YYYY-MM-DD') } } });
  const lowStockItems = await Product.findAll();
  const lowStock = lowStockItems.filter(p => p.quantity <= p.minQuantity).length;
  const latestMovements = await Movement.findAll({ include: [Product], order: [['createdAt','DESC']], limit: 8 });
  res.json({ total, expiring, expired, lowStock, latestMovements });
}