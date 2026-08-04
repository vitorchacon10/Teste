// js/solicitacoes.js
// Tela de Solicitações de Retirada
// Docente/Coordenador/Diretor podem criar e ver as próprias.
// Diretor vê todas e pode aprovar/rejeitar.

const CORES_STATUS = {
  PENDENTE: '#e0a800',
  APROVADA: '#1e7e34',
  REJEITADA: '#b3261e'
};

async function carregarSolicitacoes() {
  await carregarProdutosParaSolicitacao();
  preencherSolicitantePadrao();
  await listarSolicitacoes();

  const usuario = usuarioLogado();
  const titulo = document.getElementById('titulo-lista-solicitacoes');
  titulo.textContent = usuario && usuario.role === 'DIRETOR'
    ? 'Todas as solicitações'
    : 'Minhas solicitações';
}

// Pré-preenche o campo "Solicitante" com o nome de quem está logado
// (mas continua editável, caso a pessoa esteja pedindo em nome de outra)
function preencherSolicitantePadrao() {
  const campoSolicitante = document.getElementById('sol-solicitante');
  if (campoSolicitante.value) return; // não sobrescreve se já tiver algo digitado

  const usuario = usuarioLogado();
  if (usuario) {
    campoSolicitante.value = usuario.name;
  }
}

// Preenche o <select> de produtos no formulário de nova solicitação
async function carregarProdutosParaSolicitacao() {
  const select = document.getElementById('sol-produto');

  try {
    const produtos = await api.get('/products');
    select.innerHTML = '<option value="">Selecione um produto...</option>' +
      produtos.map(function (p) {
        return `<option value="${p.id}">${p.name} (disponível: ${p.quantity})</option>`;
      }).join('');
  } catch (err) {
    select.innerHTML = '<option value="">Erro ao carregar produtos</option>';
  }
}

// Busca e renderiza a lista de solicitações
async function listarSolicitacoes() {
  const corpo = document.getElementById('corpo-tabela-solicitacoes');
  corpo.innerHTML = '<tr><td colspan="8">Carregando...</td></tr>';

  try {
    const solicitacoes = await api.get('/solicitacoes');
    renderizarSolicitacoes(solicitacoes);
  } catch (err) {
    corpo.innerHTML = `<tr><td colspan="8">Erro ao carregar solicitações: ${err.message}</td></tr>`;
  }
}

function renderizarSolicitacoes(solicitacoes) {
  const corpo = document.getElementById('corpo-tabela-solicitacoes');
  const usuario = usuarioLogado();
  const ehDiretor = usuario && usuario.role === 'DIRETOR';

  if (!solicitacoes || solicitacoes.length === 0) {
    corpo.innerHTML = '<tr><td colspan="8">Nenhuma solicitação encontrada.</td></tr>';
    return;
  }

  corpo.innerHTML = '';

  solicitacoes.forEach(function (s) {
    const linha = document.createElement('tr');
    const cor = CORES_STATUS[s.status] || '#666';
    const data = new Date(s.createdAt).toLocaleString('pt-BR');

    const podeAgir = ehDiretor && s.status === 'PENDENTE';

    linha.innerHTML = `
      <td>${s.Product ? s.Product.name : '-'}</td>
      <td>${s.quantity}</td>
      <td>${s.sector || '-'}</td>
      <td>${s.solicitanteNome || '-'}</td>
      <td>${s.responsavelRetirada || '-'}</td>
      <td><strong style="color:${cor}">${s.status}</strong></td>
      <td>${data}</td>
      <td>
        ${podeAgir ? `
          <button class="btn btn-vermelho btn-pequeno btn-aprovar" data-id="${s.id}">Aprovar</button>
          <button class="btn btn-cinza btn-pequeno btn-rejeitar" data-id="${s.id}">Rejeitar</button>
        ` : '-'}
      </td>
    `;

    corpo.appendChild(linha);
  });

  // Liga os botões de ação (só existem se for Diretor)
  document.querySelectorAll('.btn-aprovar').forEach(function (botao) {
    botao.addEventListener('click', async function () {
      const id = this.dataset.id;
      const confirmar = confirm('Aprovar esta solicitação? O estoque será atualizado.');
      if (!confirmar) return;

      try {
        await api.put(`/solicitacoes/${id}/aprovar`);
        mostrarToast('Solicitação aprovada!');
        carregarSolicitacoes();
      } catch (err) {
        mostrarToast('Erro ao aprovar: ' + err.message, true);
      }
    });
  });

  document.querySelectorAll('.btn-rejeitar').forEach(function (botao) {
    botao.addEventListener('click', async function () {
      const id = this.dataset.id;
      const motivo = prompt('Motivo da rejeição (opcional):') || '';

      try {
        await api.put(`/solicitacoes/${id}/rejeitar`, { reason: motivo });
        mostrarToast('Solicitação rejeitada.');
        carregarSolicitacoes();
      } catch (err) {
        mostrarToast('Erro ao rejeitar: ' + err.message, true);
      }
    });
  });
}

// Envio do formulário de nova solicitação
document.getElementById('btn-criar-solicitacao').addEventListener('click', async function () {
  const msgEl = document.getElementById('msg-solicitacao');
  msgEl.className = 'mensagem';
  msgEl.textContent = '';

  const productId = document.getElementById('sol-produto').value;
  const quantity = document.getElementById('sol-quantidade').value;
  const solicitanteNome = document.getElementById('sol-solicitante').value.trim();
  const responsavelRetirada = document.getElementById('sol-responsavel-retirada').value.trim();
  const sector = document.getElementById('sol-setor').value.trim();
  const notes = document.getElementById('sol-observacoes').value.trim();

  if (!productId) {
    msgEl.textContent = 'Selecione um produto.';
    msgEl.classList.add('mensagem-erro');
    return;
  }
  if (!quantity || Number(quantity) <= 0) {
    msgEl.textContent = 'Informe uma quantidade válida.';
    msgEl.classList.add('mensagem-erro');
    return;
  }
  if (!solicitanteNome) {
    msgEl.textContent = 'Informe o nome do solicitante.';
    msgEl.classList.add('mensagem-erro');
    return;
  }
  if (!responsavelRetirada) {
    msgEl.textContent = 'Informe o nome do responsável pela retirada.';
    msgEl.classList.add('mensagem-erro');
    return;
  }

  try {
    await api.post('/solicitacoes', {
      productId, quantity, sector, notes, solicitanteNome, responsavelRetirada
    });
    mostrarToast('Solicitação enviada! Aguarde a aprovação da Direção.');

    // Limpa o formulário (mantém o solicitante pré-preenchido de novo)
    document.getElementById('sol-produto').value = '';
    document.getElementById('sol-quantidade').value = 1;
    document.getElementById('sol-responsavel-retirada').value = '';
    document.getElementById('sol-setor').value = '';
    document.getElementById('sol-observacoes').value = '';

    listarSolicitacoes();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.classList.add('mensagem-erro');
  }
});