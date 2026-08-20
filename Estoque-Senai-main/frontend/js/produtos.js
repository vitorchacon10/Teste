// js/produtos.js
// Gerenciamento de produtos (listar, cadastrar, editar, excluir)

let listaProdutos = []; // guarda os produtos carregados

// Rótulos amigáveis e regra de fracionamento por unidade
const ROTULO_UNIDADE_PRODUTO = {
  UN: 'un',
  PCT: 'pct',
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'L'
};
const UNIDADES_INTEIRAS_PRODUTO = ['UN', 'PCT'];

// Converte a unidade "grande" do pacote pra menor unidade fracionável
// (Kg -> g, L -> mL), e calcula o preço proporcional automaticamente.
// Ex: comprou 5 kg por R$ 50 -> vira 5000 g a R$ 0,01/g.
// Ex: comprou 500 g por R$ 10 -> vira 500 g a R$ 0,02/g (sem conversão, fator 1).
const CONVERSAO_PACOTE = {
  KG: { unidadeFinal: 'G',  fator: 1000 },
  L:  { unidadeFinal: 'ML', fator: 1000 },
  G:  { unidadeFinal: 'G',  fator: 1 },
  ML: { unidadeFinal: 'ML', fator: 1 },
  UN: { unidadeFinal: 'UN', fator: 1 },
  PCT:{ unidadeFinal: 'PCT',fator: 1 }
};

function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return 'R$ ' + numero.toFixed(2).replace('.', ',');
}

function formatarUnidadeProduto(unit) {
  return ROTULO_UNIDADE_PRODUTO[unit] || unit || '-';
}

async function carregarProdutos() {
  try {
    listaProdutos = await api.get('/products');
    renderizarTabela(listaProdutos);
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
}

function renderizarTabela(produtos) {
  const tbody = document.getElementById('corpo-tabela-produtos');

  if (produtos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:#999;">Nenhum produto cadastrado.</td></tr>';
    return;
  }

  // Regras de permissão: Editar = Coordenador e Diretor; Excluir = só Diretor
  const usuario = usuarioLogado();
  const cargo = usuario ? usuario.role : null;
  const podeEditar = cargo === 'COORDENADOR' || cargo === 'DIRETOR';
  const podeExcluir = cargo === 'DIRETOR';

  tbody.innerHTML = produtos.map(function (p) {
    const foto = p.photoUrl
      ? `<img class="thumb" src="${p.photoUrl.startsWith('http') ? p.photoUrl : API_ORIGIN + p.photoUrl}" alt="${p.name}" />`
      : '–';

    const validade = p.expirationDate || '–';

    const botaoEditar = podeEditar
      ? `<button class="btn-acao btn-editar" onclick="abrirModalEdicao(${p.id})">Editar</button>`
      : '';

    const botaoExcluir = podeExcluir
      ? `<button class="btn-acao btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>`
      : '';

    const separador = (podeEditar && podeExcluir) ? '&nbsp;' : '';
    const acoes = (botaoEditar || botaoExcluir)
      ? `${botaoEditar}${separador}${botaoExcluir}`
      : '<span style="color:#999;">–</span>';

    return `
      <tr>
        <td>${foto}</td>
        <td><strong>${p.name}</strong></td>
        <td>${p.brand || '–'}</td>
        <td>${p.quantity}</td>
        <td>${formatarUnidadeProduto(p.unit)}</td>
        <td>${formatarMoeda(p.price)}</td>
        <td>${validade}</td>
        <td>${p.barcode || '–'}</td>
        <td>${p.category || '–'}</td>
        <td>${p.location || '–'}</td>
        <td>${acoes}</td>
      </tr>
    `;
  }).join('');
}

// Filtro de busca ao digitar
document.getElementById('busca-produto').addEventListener('input', function () {
  const termo = this.value.toLowerCase();
  const filtrado = listaProdutos.filter(function (p) {
    return p.name.toLowerCase().includes(termo)
      || (p.brand || '').toLowerCase().includes(termo)
      || (p.category || '').toLowerCase().includes(termo);
  });
  renderizarTabela(filtrado);
});

// Ajusta o "step" do campo de quantidade conforme a unidade escolhida:
// inteiro (1) para Unidade/Pacote, decimal (0.01) para os fracionáveis.
function ajustarStepQuantidade() {
  const unidade = document.getElementById('produto-unidade').value;
  const inputQtd = document.getElementById('produto-quantidade');
  inputQtd.step = UNIDADES_INTEIRAS_PRODUTO.includes(unidade) ? '1' : '0.01';
}
document.getElementById('produto-unidade').addEventListener('change', ajustarStepQuantidade);

// ---- CALCULADORA DE PACOTE ----
// Preenche Quantidade / Unidade / Preço Unitário automaticamente a partir
// de "comprei X [unidade do pacote] por R$ Y no total".
// A caixa fica sempre visível; só recalcula quando todos os campos
// necessários estiverem preenchidos com valores válidos.
function recalcularPorPacote() {
  const numPacotes = Number(document.getElementById('produto-calc-num-pacotes').value) || 1;
  const qtdPorPacote = Number(document.getElementById('produto-calc-qtd').value);
  const unidadePacote = document.getElementById('produto-calc-unidade').value;
  const valorTotal = Number(document.getElementById('produto-calc-valor').value);

  if (!numPacotes || numPacotes <= 0 || !qtdPorPacote || qtdPorPacote <= 0 || !valorTotal || valorTotal <= 0) return;

  const conv = CONVERSAO_PACOTE[unidadePacote];
  // Ex: 20 pacotes de 5 kg cada = 100 kg = 100000 g no total
  const quantidadeFinal = numPacotes * qtdPorPacote * conv.fator;
  const precoFinal = valorTotal / quantidadeFinal;

  document.getElementById('produto-quantidade').value = quantidadeFinal;
  document.getElementById('produto-unidade').value = conv.unidadeFinal;
  document.getElementById('produto-preco').value = precoFinal.toFixed(4);
  ajustarStepQuantidade();
}

['produto-calc-num-pacotes', 'produto-calc-qtd', 'produto-calc-unidade', 'produto-calc-valor'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', recalcularPorPacote);
  document.getElementById(id).addEventListener('change', recalcularPorPacote);
});

// ---- MODAL ----

function abrirModalNovo() {
  document.getElementById('modal-produto-titulo').textContent = 'Cadastrar produto';
  document.getElementById('produto-id').value = '';
  limparFormularioProduto();
  document.getElementById('modal-produto').style.display = 'flex';
}

// Usada pelo scanner: quando um código de barras é lido e não existe
// nenhum produto cadastrado com ele, abre o modal de cadastro já com
// o código preenchido, pra não precisar digitar de novo.
function abrirModalNovoComCodigo(codigo) {
  abrirModalNovo();
  document.getElementById('produto-codigo').value = codigo || '';
}

function abrirModalEdicao(id) {
  const produto = listaProdutos.find(function (p) { return p.id === id; });
  if (!produto) return;

  document.getElementById('modal-produto-titulo').textContent = 'Editar produto';
  document.getElementById('produto-id').value = produto.id;
  document.getElementById('produto-nome').value = produto.name || '';
  document.getElementById('produto-marca').value = produto.brand || '';
  document.getElementById('produto-quantidade').value = produto.quantity || 0;
  document.getElementById('produto-unidade').value = produto.unit || 'UN';
  document.getElementById('produto-preco').value = produto.price || 0;
  document.getElementById('produto-qtd-min').value = produto.minQuantity || 5;
  document.getElementById('produto-validade').value = produto.expirationDate || '';
  document.getElementById('produto-codigo').value = produto.barcode || '';
  document.getElementById('produto-categoria').value = produto.category || '';
  document.getElementById('produto-local').value = produto.location || '';
  document.getElementById('produto-nota-fiscal').value = produto.invoiceNumber || '';
  document.getElementById('produto-local-compra').value = produto.purchaseLocation || '';
  document.getElementById('produto-cnpj').value = produto.cnpj || '';
  document.getElementById('produto-data-compra').value = produto.purchaseDate || '';

  // Ao editar um produto já existente, limpa os campos da calculadora
  // (os valores já estão certos, não precisa recalcular).
  document.getElementById('produto-calc-num-pacotes').value = '';
  document.getElementById('produto-calc-qtd').value = '';
  document.getElementById('produto-calc-valor').value = '';
  document.getElementById('produto-calc-unidade').value = 'KG';

  ajustarStepQuantidade();
  document.getElementById('modal-produto').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-produto').style.display = 'none';
}

function limparFormularioProduto() {
  const campos = ['produto-nome','produto-marca','produto-quantidade','produto-preco','produto-qtd-min',
    'produto-validade','produto-codigo','produto-categoria','produto-local',
    'produto-nota-fiscal','produto-local-compra','produto-cnpj','produto-data-compra'];
  campos.forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('produto-unidade').value = 'UN';
  document.getElementById('produto-foto').value = '';

  document.getElementById('produto-calc-num-pacotes').value = '';
  document.getElementById('produto-calc-qtd').value = '';
  document.getElementById('produto-calc-valor').value = '';
  document.getElementById('produto-calc-unidade').value = 'KG';

  ajustarStepQuantidade();
}

async function salvarProduto() {
  const id = document.getElementById('produto-id').value;
  const nome = document.getElementById('produto-nome').value.trim();
  const unidade = document.getElementById('produto-unidade').value;
  const quantidade = document.getElementById('produto-quantidade').value || 0;

  if (!nome) {
    mostrarToast('O nome do produto é obrigatório!', true);
    return;
  }

  if (UNIDADES_INTEIRAS_PRODUTO.includes(unidade) && !Number.isInteger(Number(quantidade))) {
    mostrarToast(`Produtos com unidade "${formatarUnidadeProduto(unidade)}" não aceitam quantidade fracionada.`, true);
    return;
  }

  // Monta um FormData para suportar upload de foto
  const fd = new FormData();
  fd.append('name', nome);
  fd.append('brand', document.getElementById('produto-marca').value);
  fd.append('quantity', quantidade);
  fd.append('unit', unidade);
  fd.append('price', document.getElementById('produto-preco').value || 0);
  fd.append('minQuantity', document.getElementById('produto-qtd-min').value || 5);
  fd.append('expirationDate', document.getElementById('produto-validade').value);
  fd.append('barcode', document.getElementById('produto-codigo').value);
  fd.append('category', document.getElementById('produto-categoria').value);
  fd.append('location', document.getElementById('produto-local').value);
  fd.append('invoiceNumber', document.getElementById('produto-nota-fiscal').value);
  fd.append('purchaseLocation', document.getElementById('produto-local-compra').value);
  fd.append('cnpj', document.getElementById('produto-cnpj').value);
  fd.append('purchaseDate', document.getElementById('produto-data-compra').value);

  const fotoInput = document.getElementById('produto-foto');
  if (fotoInput.files[0]) {
    fd.append('photo', fotoInput.files[0]);
  }

  try {
    if (id) {
      await api.putForm('/products/' + id, fd);
      mostrarToast('Produto atualizado com sucesso!');
    } else {
      await api.postForm('/products', fd);
      mostrarToast('Produto cadastrado com sucesso!');
    }
    fecharModal();
    carregarProdutos();
  } catch (err) {
    mostrarToast('Erro ao salvar: ' + err.message, true);
  }
}

async function excluirProduto(id) {
  const confirmar = confirm('Tem certeza que deseja excluir este produto?');
  if (!confirmar) return;

  try {
    await api.delete('/products/' + id);
    mostrarToast('Produto excluído.');
    carregarProdutos();
  } catch (err) {
    mostrarToast('Erro ao excluir: ' + err.message, true);
  }
}

// Eventos dos botões do modal
document.getElementById('btn-novo-produto').addEventListener('click', abrirModalNovo);
document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
document.getElementById('btn-cancelar-produto').addEventListener('click', fecharModal);
document.getElementById('btn-salvar-produto').addEventListener('click', salvarProduto);

// Fecha o modal ao clicar fora
document.getElementById('modal-produto').addEventListener('click', function (e) {
  if (e.target === this) fecharModal();
});