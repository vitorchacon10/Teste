import { Delivery, Product, Movement, UNIDADES_INTEIRAS } from '../config/models.js';
import { io } from '../server.js';

export async function createDelivery(req, res) {
  const { productId, responsibleName, sector, quantity, signatureUrl } = req.body;
  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });

  const qtd = Number(quantity);
  if (!qtd || qtd <= 0) return res.status(400).json({ message: 'Informe uma quantidade válida.' });

  // Produtos medidos em Unidade/Pacote não podem ser entregues em fração
  // (ex: não faz sentido entregar "1.5 pacote").
  if (UNIDADES_INTEIRAS.includes(product.unit) && !Number.isInteger(qtd)) {
    return res.status(400).json({
      message: `Este produto é medido em ${product.unit} e não aceita quantidade fracionada.`
    });
  }

  if (product.quantity < qtd) return res.status(400).json({ message: 'Estoque insuficiente.' });

  const previousQuantity = product.quantity;
  const newQuantity = previousQuantity - qtd;
  await product.update({ quantity: newQuantity });
  const delivery = await Delivery.create({ ProductId: product.id, UserId: req.user.id, responsibleName, sector, quantity: qtd, signatureUrl });
  const movement = await Movement.create({ ProductId: product.id, UserId: req.user.id, type: 'SAIDA', quantity: qtd, previousQuantity, newQuantity, responsible: responsibleName, sector, notes: 'Entrega de material' });
  io.emit('delivery:created', { delivery, product, movement });
  res.status(201).json({ delivery, product, movement });
}