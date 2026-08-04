// js/entregas.js
// Controle de entregas de materiais

async function carregarProdutosEntrega() {
  try {
    const produtos = await api.get('/products');
    const select = document.getElementById('entrega-produto');

    // Limpa e repopula o select
    select.innerHTML = '<option value="">Selecione um produto...</option>';
    produtos.forEach(function (p) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + ' – estoque: ' + p.quantity;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar produtos para entrega:', err);
  }
}

async function registrarEntrega() {
  const produtoId = document.getElementById('entrega-produto').value;
  const responsavel = document.getElementById('entrega-responsavel').value.trim();
  const setor = document.getElementById('entrega-setor').value.trim();
  const quantidade = parseInt(document.getElementById('entrega-qtd').value) || 1;
  const assinatura = document.getElementById('entrega-assinatura').value.trim();
  const msgDiv = document.getElementById('msg-entrega');

  // Validação simples
  if (!produtoId || !responsavel || !setor) {
    msgDiv.textContent = 'Preencha produto, responsável e setor.';
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
