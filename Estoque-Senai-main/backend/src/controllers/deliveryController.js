import { Delivery, Product, Movement } from '../config/models.js';
import { io } from '../server.js';

export async function createDelivery(req, res) {
  const { productId, responsibleName, sector, quantity, signatureUrl } = req.body;
  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
  if (product.quantity < Number(quantity)) return res.status(400).json({ message: 'Estoque insuficiente.' });
  const previousQuantity = product.quantity;
  const newQuantity = previousQuantity - Number(quantity);
  await product.update({ quantity: newQuantity });
  const delivery = await Delivery.create({ ProductId: product.id, UserId: req.user.id, responsibleName, sector, quantity, signatureUrl });
  const movement = await Movement.create({ ProductId: product.id, UserId: req.user.id, type: 'SAIDA', quantity, previousQuantity, newQuantity, responsible: responsibleName, sector, notes: 'Entrega de material' });
  io.emit('delivery:created', { delivery, product, movement });
  res.status(201).json({ delivery, product, movement });
}
