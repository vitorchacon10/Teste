import { SolicitacaoRetirada, Product, Movement, User } from '../config/models.js';
import { sendMail } from '../utils/mailer.js';

// Docente, Coordenador ou Diretor solicitam a retirada de um produto.
// Fica PENDENTE até um Diretor aprovar.
export async function createSolicitacao(req, res) {
  const { productId, quantity, sector, notes, solicitanteNome, responsavelRetirada } = req.body;

  const qtd = Number(quantity);
  if (!productId || !qtd || qtd <= 0) {
    return res.status(400).json({ message: 'Informe o produto e uma quantidade válida.' });
  }

  if (!solicitanteNome || !solicitanteNome.trim()) {
    return res.status(400).json({ message: 'Informe o nome do solicitante.' });
  }

  if (!responsavelRetirada || !responsavelRetirada.trim()) {
    return res.status(400).json({ message: 'Informe o nome do responsável pela retirada.' });
  }

  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });

  if (qtd > product.quantity) {
    return res.status(400).json({ message: 'Quantidade solicitada maior que o estoque disponível.' });
  }

  const solicitacao = await SolicitacaoRetirada.create({
    ProductId: product.id,
    requesterId: req.user.id,
    quantity: qtd,
    sector: sector || null,
    notes: notes || null,
    solicitanteNome: solicitanteNome.trim(),
    responsavelRetirada: responsavelRetirada.trim(),
    status: 'PENDENTE'
  });

  // Avisa todos os Diretores por e-mail que há uma nova solicitação
  // aguardando aprovação. Se o envio falhar, não impede a criação da
  // solicitação em si — só registra o erro nos logs.
  try {
    const diretores = await User.findAll({ where: { role: 'DIRETOR' }, attributes: ['name', 'email'] });

    await Promise.all(
      diretores
        .filter(d => d.email)
        .map(diretor =>
          sendMail({
            to: diretor.email,
            subject: 'Nova solicitação de retirada — SENAI Zerbini Estoque',
            html: `
              <p>Olá, ${diretor.name}!</p>
              <p>Uma nova solicitação de retirada foi registrada e está aguardando sua aprovação:</p>
              <ul>
                <li><strong>Produto:</strong> ${product.name}</li>
                <li><strong>Quantidade:</strong> ${qtd}</li>
                <li><strong>Solicitante:</strong> ${solicitanteNome.trim()}</li>
                <li><strong>Responsável pela retirada:</strong> ${responsavelRetirada.trim()}</li>
                ${sector ? `<li><strong>Setor:</strong> ${sector}</li>` : ''}
                ${notes ? `<li><strong>Observações:</strong> ${notes}</li>` : ''}
              </ul>
              <p>Acesse o sistema para aprovar ou rejeitar.</p>
            `
          }).catch(err => console.error(`Erro ao enviar e-mail de nova solicitação para ${diretor.email}:`, err))
        )
    );
  } catch (err) {
    console.error('Erro ao buscar/notificar diretores sobre nova solicitação:', err);
  }

  res.status(201).json(solicitacao);
}

// Docente/Coordenador veem só as próprias solicitações.
// Diretor vê todas (para poder aprovar).
export async function listSolicitacoes(req, res) {
  const where = req.user.role === 'DIRETOR' ? {} : { requesterId: req.user.id };

  const solicitacoes = await SolicitacaoRetirada.findAll({
    where,
    include: [
      { model: Product, attributes: ['id', 'name', 'quantity', 'category'] },
      { model: User, as: 'requester', attributes: ['id', 'name', 'email', 'role'] },
      { model: User, as: 'approver', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json(solicitacoes);
}

// Só Diretor. Aprova, dá baixa no estoque e registra a movimentação.
export async function approveSolicitacao(req, res) {
  const solicitacao = await SolicitacaoRetirada.findByPk(req.params.id, { include: [Product] });
  if (!solicitacao) return res.status(404).json({ message: 'Solicitação não encontrada.' });
  if (solicitacao.status !== 'PENDENTE') {
    return res.status(400).json({ message: 'Esta solicitação já foi processada.' });
  }

  const product = solicitacao.Product;
  if (solicitacao.quantity > product.quantity) {
    return res.status(400).json({ message: 'Estoque insuficiente para aprovar esta solicitação.' });
  }

  const previousQuantity = product.quantity;
  product.quantity = previousQuantity - solicitacao.quantity;
  await product.save();

  await Movement.create({
    type: 'SAIDA',
    quantity: solicitacao.quantity,
    previousQuantity,
    newQuantity: product.quantity,
    responsible: solicitacao.responsavelRetirada,
    sector: solicitacao.sector,
    notes: `Solicitação #${solicitacao.id} — solicitada por ${solicitacao.solicitanteNome}, retirada por ${solicitacao.responsavelRetirada}. Aprovada por ${req.user.name}`,
    ProductId: product.id,
    UserId: req.user.id
  });

  solicitacao.status = 'APROVADA';
  solicitacao.approverId = req.user.id;
  solicitacao.approvedAt = new Date();
  await solicitacao.save();

  res.json({ message: 'Solicitação aprovada e estoque atualizado.', solicitacao });
}

// Só Diretor. Rejeita sem mexer no estoque.
export async function rejectSolicitacao(req, res) {
  const { reason } = req.body;

  const solicitacao = await SolicitacaoRetirada.findByPk(req.params.id);
  if (!solicitacao) return res.status(404).json({ message: 'Solicitação não encontrada.' });
  if (solicitacao.status !== 'PENDENTE') {
    return res.status(400).json({ message: 'Esta solicitação já foi processada.' });
  }

  solicitacao.status = 'REJEITADA';
  solicitacao.approverId = req.user.id;
  solicitacao.rejectionReason = reason || null;
  solicitacao.approvedAt = new Date();
  await solicitacao.save();

  res.json({ message: 'Solicitação rejeitada.', solicitacao });
}