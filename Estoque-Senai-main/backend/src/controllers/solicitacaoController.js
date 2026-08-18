import { SolicitacaoRetirada, SolicitacaoItem, Product, Movement, User, UNIDADES_INTEIRAS } from '../config/models.js';
import { sequelize } from '../config/database.js';
import { sendMail } from '../utils/mailer.js';

// Valida um item de solicitação e retorna o produto correspondente.
// Lança um erro com "status" e "message" prontos para resposta HTTP.
async function validarItem(item) {
  const { productId, quantity } = item;
  const qtd = Number(quantity);

  if (!productId || !qtd || qtd <= 0) {
    const err = new Error('Cada item precisa de um produto e uma quantidade válida.');
    err.status = 400;
    throw err;
  }

  const product = await Product.findByPk(productId);
  if (!product) {
    const err = new Error('Produto não encontrado.');
    err.status = 404;
    throw err;
  }

  // Unidades como UN e PCT não fracionam: quantidade tem que ser inteira.
  if (UNIDADES_INTEIRAS.includes(product.unit) && !Number.isInteger(qtd)) {
    const err = new Error(`"${product.name}" é medido em ${product.unit} e não aceita quantidade fracionada.`);
    err.status = 400;
    throw err;
  }

  if (qtd > product.quantity) {
    const err = new Error(`Quantidade solicitada de "${product.name}" é maior que o estoque disponível (${product.quantity} ${product.unit}).`);
    err.status = 400;
    throw err;
  }

  return { product, qtd };
}

// Docente, Coordenador ou Diretor solicitam a retirada de um ou mais produtos.
// Fica PENDENTE até um Diretor aprovar.
export async function createSolicitacao(req, res) {
  const { items, sector, notes, solicitanteNome, responsavelRetirada } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Informe ao menos um produto na solicitação.' });
  }

  if (!solicitanteNome || !solicitanteNome.trim()) {
    return res.status(400).json({ message: 'Informe o nome do solicitante.' });
  }

  if (!responsavelRetirada || !responsavelRetirada.trim()) {
    return res.status(400).json({ message: 'Informe o nome do responsável pela retirada.' });
  }

  // Valida todos os itens antes de criar qualquer coisa no banco.
  let itensValidados;
  try {
    itensValidados = await Promise.all(items.map(validarItem));
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  // Cria o cabeçalho + os itens numa transação: ou vai tudo, ou não vai nada.
  const solicitacao = await sequelize.transaction(async (t) => {
    const nova = await SolicitacaoRetirada.create({
      requesterId: req.user.id,
      sector: sector || null,
      notes: notes || null,
      solicitanteNome: solicitanteNome.trim(),
      responsavelRetirada: responsavelRetirada.trim(),
      status: 'PENDENTE'
    }, { transaction: t });

    await SolicitacaoItem.bulkCreate(
      itensValidados.map(({ product, qtd }) => ({
        SolicitacaoRetiradaId: nova.id,
        ProductId: product.id,
        quantity: qtd,
        unit: product.unit
      })),
      { transaction: t }
    );

    return nova;
  });

  // Avisa todos os Diretores por e-mail que há uma nova solicitação
  // aguardando aprovação. Se o envio falhar, não impede a criação da
  // solicitação em si — só registra o erro nos logs.
  try {
    const diretores = await User.findAll({ where: { role: 'DIRETOR' }, attributes: ['name', 'email'] });

    const listaItensHtml = itensValidados
      .map(({ product, qtd }) => `<li><strong>${product.name}:</strong> ${qtd} ${product.unit}</li>`)
      .join('');

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
              <ul>${listaItensHtml}</ul>
              <ul>
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
      {
        model: SolicitacaoItem,
        include: [{ model: Product, attributes: ['id', 'name', 'quantity', 'unit', 'category'] }]
      },
      { model: User, as: 'requester', attributes: ['id', 'name', 'email', 'role'] },
      { model: User, as: 'approver', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json(solicitacoes);
}

// Só Diretor. Aprova, dá baixa no estoque de cada item e registra a movimentação.
export async function approveSolicitacao(req, res) {
  const solicitacao = await SolicitacaoRetirada.findByPk(req.params.id, {
    include: [{ model: SolicitacaoItem, include: [Product] }]
  });
  if (!solicitacao) return res.status(404).json({ message: 'Solicitação não encontrada.' });
  if (solicitacao.status !== 'PENDENTE') {
    return res.status(400).json({ message: 'Esta solicitação já foi processada.' });
  }

  // Revalida o estoque de todos os itens antes de aprovar qualquer um
  // (pode ter mudado desde que a solicitação foi criada).
  for (const item of solicitacao.SolicitacaoItems) {
    if (item.quantity > item.Product.quantity) {
      return res.status(400).json({
        message: `Estoque insuficiente para aprovar "${item.Product.name}" (disponível: ${item.Product.quantity} ${item.Product.unit}).`
      });
    }
  }

  await sequelize.transaction(async (t) => {
    for (const item of solicitacao.SolicitacaoItems) {
      const product = item.Product;
      const previousQuantity = product.quantity;
      product.quantity = previousQuantity - item.quantity;
      await product.save({ transaction: t });

      await Movement.create({
        type: 'SAIDA',
        quantity: item.quantity,
        previousQuantity,
        newQuantity: product.quantity,
        responsible: solicitacao.responsavelRetirada,
        sector: solicitacao.sector,
        notes: `Solicitação #${solicitacao.id} — solicitada por ${solicitacao.solicitanteNome}, retirada por ${solicitacao.responsavelRetirada}. Aprovada por ${req.user.name}`,
        ProductId: product.id,
        UserId: req.user.id
      }, { transaction: t });
    }

    solicitacao.status = 'APROVADA';
    solicitacao.approverId = req.user.id;
    solicitacao.approvedAt = new Date();
    await solicitacao.save({ transaction: t });
  });

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