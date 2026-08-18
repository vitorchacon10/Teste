// js/solicitacoes.js
// Tela de Solicitações de Retirada
// Docente/Coordenador/Diretor podem criar e ver as próprias.
// Diretor vê todas e pode aprovar/rejeitar.
// Agora suporta solicitar VÁRIOS produtos numa única solicitação.

const CORES_STATUS = {
  PENDENTE: '#e0a800',
  APROVADA: '#1e7e34',
  REJEITADA: '#b3261e'
};

// Rótulos amigáveis para cada unidade de medida
const ROTULO_UNIDADE = {
  UN: 'un',
  PCT: 'pct',
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'L'
};

// Unidades que NÃO aceitam quantidade fracionada
const UNIDADES_INTEIRAS = ['UN', 'PCT'];

let produtosDisponiveis = [];
let contadorLinhaItem = 0;

async function carregarSolicitacoes() {
  await carregarProdutosParaSolicitacao();
  preencherSolicitantePadrao();
  resetarItensSolicitacao();
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

// Busca os produtos disponíveis (usado para popular cada linha de item)
async function carregarProdutosParaSolicitacao() {
  try {
    produtosDisponiveis = await api.get('/products');
  } catch (err) {
    produtosDisponiveis = [];
    console.error('Erro ao carregar produtos para solicitação:', err);
  }
}

// Limpa a lista de itens do formulário e deixa só uma linha em branco
function resetarItensSolicitacao() {
  const container = document.getElementById('sol-itens-container');
  container.innerHTML = '';
  contadorLinhaItem = 0;
  adicionarLinhaItem();
}

// Monta o <select> de opções de produto para uma linha
function montarOpcoesProduto() {
  return '<option value="">Selecione um produto...</option>' +
    produtosDisponiveis.map(function (p) {
      return `<option value="${p.id}" data-unit="${p.unit}" data-estoque="${p.quantity}">` +
        `${p.name} (disponível: ${p.quantity} ${ROTULO_UNIDADE[p.unit] || p.unit})</option>`;
    }).join('');
}

// Adiciona uma nova linha de "produto + quantidade" ao formulário
function adicionarLinhaItem() {
  contadorLinhaItem++;
  const id = contadorLinhaItem;
  const container = document.getElementById('sol-itens-container');

  const linha = document.createElement('div');
  linha.className = 'linha-item-solicitacao';
  linha.dataset.linhaId = id;
  linha.innerHTML = `
    <select class="item-produto" data-linha="${id}">${montarOpcoesProduto()}</select>
    <input type="number" class="item-quantidade" data-linha="${id}" min="0" step="any" placeholder="Qtd." value="1">
    <span class="item-unidade" data-linha="${id}"></span>
    <button type="button" class="btn btn-cinza btn-pequeno btn-remover-item" data-linha="${id}">Remover</button>
  `;
  container.appendChild(linha);

  const select = linha.querySelector('.item-produto');
  const inputQtd = linha.querySelector('.item-quantidade');
  const spanUnidade = linha.querySelector('.item-unidade');

  // Ao trocar o produto, mostra a unidade e ajusta o "step" do input
  // (inteiro para UN/PCT, decimal para os fracionáveis)
  select.addEventListener('change', function () {
    const opt = select.selectedOptions[0];
    const unidade = opt ? opt.dataset.unit : '';
    spanUnidade.textContent = unidade ? (ROTULO_UNIDADE[unidade] || unidade) : '';
    inputQtd.step = unidade && UNIDADES_INTEIRAS.includes(unidade) ? '1' : '0.01';
  });

  linha.querySelector('.btn-remover-item').addEventListener('click', function () {
    // Sempre deixa pelo menos uma linha no formulário
    const totalLinhas = container.querySelectorAll('.linha-item-solicitacao').length;
    if (totalLinhas <= 1) {
      mostrarToast('A solicitação precisa ter ao menos um produto.', true);
      return;
    }
    linha.remove();
  });
}

// Lê todas as linhas preenchidas do formulário e valida cada uma
function coletarItensDoFormulario() {
  const linhas = document.querySelectorAll('#sol-itens-container .linha-item-solicitacao');
  const itens = [];
  const erros = [];
  const produtosUsados = new Set();

  linhas.forEach(function (linha) {
    const select = linha.querySelector('.item-produto');
    const inputQtd = linha.querySelector('.item-quantidade');
    const productId = select.value;
    const quantity = Number(inputQtd.value);

    if (!productId && !inputQtd.value) return; // linha em branco, ignora

    if (!productId) {
      erros.push('Selecione um produto em todas as linhas preenchidas.');
      return;
    }
    if (!quantity || quantity <= 0) {
      erros.push('Informe uma quantidade válida para todos os produtos escolhidos.');
      return;
    }

    const opt = select.selectedOptions[0];
    const unidade = opt.dataset.unit;
    if (UNIDADES_INTEIRAS.includes(unidade) && !Number.isInteger(quantity)) {
      erros.push(`"${opt.textContent}" não aceita quantidade fracionada (unidade: ${ROTULO_UNIDADE[unidade]}).`);
      return;
    }

    if (produtosUsados.has(productId)) {
      erros.push('Cada produto deve aparecer apenas uma vez na solicitação — some as quantidades numa única linha.');
      return;
    }
    produtosUsados.add(productId);

    itens.push({ productId, quantity });
  });

  return { itens, erros: [...new Set(erros)] };
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

// Monta o texto "Produto A: 2 un, Produto B: 250 g" a partir dos itens
function formatarItens(solicitacao) {
  const itens = solicitacao.SolicitacaoItems || [];
  if (itens.length === 0) return '-';
  return itens.map(function (item) {
    const nomeProduto = item.Product ? item.Product.name : 'Produto removido';
    const unidade = ROTULO_UNIDADE[item.unit] || item.unit;
    return `${nomeProduto}: ${item.quantity} ${unidade}`;
  }).join('<br>');
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
      <td>${formatarItens(s)}</td>
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

// Botão "+ Adicionar produto"
document.getElementById('btn-adicionar-item-solicitacao').addEventListener('click', function () {
  adicionarLinhaItem();
});

// Envio do formulário de nova solicitação
document.getElementById('btn-criar-solicitacao').addEventListener('click', async function () {
  const msgEl = document.getElementById('msg-solicitacao');
  msgEl.className = 'mensagem';
  msgEl.textContent = '';

  const { itens, erros } = coletarItensDoFormulario();

  if (itens.length === 0) {
    msgEl.textContent = 'Adicione ao menos um produto com quantidade.';
    msgEl.classList.add('mensagem-erro');
    return;
  }
  if (erros.length > 0) {
    msgEl.textContent = erros.join(' ');
    msgEl.classList.add('mensagem-erro');
    return;
  }

  const solicitanteNome = document.getElementById('sol-solicitante').value.trim();
  const responsavelRetirada = document.getElementById('sol-responsavel-retirada').value.trim();
  const sector = document.getElementById('sol-setor').value.trim();
  const notes = document.getElementById('sol-observacoes').value.trim();

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
      items: itens, sector, notes, solicitanteNome, responsavelRetirada
    });
    mostrarToast('Solicitação enviada! Aguarde a aprovação da Direção.');

    // Limpa o formulário (mantém o solicitante pré-preenchido de novo)
    resetarItensSolicitacao();
    document.getElementById('sol-responsavel-retirada').value = '';
    document.getElementById('sol-setor').value = '';
    document.getElementById('sol-observacoes').value = '';

    listarSolicitacoes();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.classList.add('mensagem-erro');
  }
});