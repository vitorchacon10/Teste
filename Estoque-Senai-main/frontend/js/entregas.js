// js/entregas.js
// Controle de entregas de materiais

// Rótulos amigáveis e regra de fracionamento por unidade (mesmo padrão das outras telas)
const ROTULO_UNIDADE_ENTREGA = {
  UN: 'un',
  PCT: 'pct',
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'L'
};
const UNIDADES_INTEIRAS_ENTREGA = ['UN', 'PCT'];

async function carregarProdutosEntrega() {
  try {
    const produtos = await api.get('/products');
    const select = document.getElementById('entrega-produto');

    // Limpa e repopula o select — guarda a unidade em data-unit pra usar depois
    select.innerHTML = '<option value="">Selecione um produto...</option>';
    produtos.forEach(function (p) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.dataset.unit = p.unit;
      const unidade = ROTULO_UNIDADE_ENTREGA[p.unit] || p.unit;
      opt.textContent = p.name + ' – estoque: ' + p.quantity + ' ' + unidade;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar produtos para entrega:', err);
  }
}

// Ajusta o "step" (e mostra a unidade) do campo de quantidade conforme
// o produto escolhido: inteiro para Unidade/Pacote, decimal para os demais.
function ajustarQuantidadeEntrega() {
  const select = document.getElementById('entrega-produto');
  const opt = select.selectedOptions[0];
  const inputQtd = document.getElementById('entrega-qtd');
  const spanUnidade = document.getElementById('entrega-unidade');

  const unidade = opt ? opt.dataset.unit : '';
  inputQtd.step = unidade && UNIDADES_INTEIRAS_ENTREGA.includes(unidade) ? '1' : '0.01';
  if (spanUnidade) {
    spanUnidade.textContent = unidade ? (ROTULO_UNIDADE_ENTREGA[unidade] || unidade) : '';
  }
}
document.getElementById('entrega-produto').addEventListener('change', ajustarQuantidadeEntrega);

async function registrarEntrega() {
  const select = document.getElementById('entrega-produto');
  const produtoId = select.value;
  const responsavel = document.getElementById('entrega-responsavel').value.trim();
  const setor = document.getElementById('entrega-setor').value.trim();
  // Antes: parseInt truncava qualquer fração (0.5 virava 0). Agora usa Number
  // pra preservar quantidades fracionadas quando a unidade permite.
  const quantidade = Number(document.getElementById('entrega-qtd').value) || 1;
  const assinatura = document.getElementById('entrega-assinatura').value.trim();
  const msgDiv = document.getElementById('msg-entrega');

  // Validação simples
  if (!produtoId || !responsavel || !setor) {
    msgDiv.textContent = 'Preencha produto, responsável e setor.';
    msgDiv.className = 'mensagem erro';
    msgDiv.style.display = 'block';
    return;
  }

  // Valida a regra de fração antes de mandar pro servidor
  const opt = select.selectedOptions[0];
  const unidade = opt ? opt.dataset.unit : '';
  if (unidade && UNIDADES_INTEIRAS_ENTREGA.includes(unidade) && !Number.isInteger(quantidade)) {
    msgDiv.textContent = `Este produto é medido em ${ROTULO_UNIDADE_ENTREGA[unidade] || unidade} e não aceita quantidade fracionada.`;
    msgDiv.className = 'mensagem erro';
    msgDiv.style.display = 'block';
    return;
  }

  try {
    await api.post('/deliveries', {
      productId: produtoId,
      responsibleName: responsavel,
      sector: setor,
      quantity: quantidade,
      signatureUrl: assinatura || null
    });

    msgDiv.textContent = 'Entrega registrada e estoque atualizado!';
    msgDiv.className = 'mensagem sucesso';
    msgDiv.style.display = 'block';

    // Limpa o formulário
    document.getElementById('entrega-produto').value = '';
    document.getElementById('entrega-responsavel').value = '';
    document.getElementById('entrega-setor').value = '';
    document.getElementById('entrega-qtd').value = 1;
    document.getElementById('entrega-assinatura').value = '';
    ajustarQuantidadeEntrega();

    // Recarrega a lista de produtos para atualizar o estoque no select
    carregarProdutosEntrega();

    mostrarToast('Entrega registrada com sucesso!');
  } catch (err) {
    msgDiv.textContent = 'Erro: ' + err.message;
    msgDiv.className = 'mensagem erro';
    msgDiv.style.display = 'block';
  }
}

document.getElementById('btn-registrar-entrega').addEventListener('click', registrarEntrega);