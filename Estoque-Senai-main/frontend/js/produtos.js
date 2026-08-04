// js/produtos.js
// Gerenciamento de produtos (listar, cadastrar, editar, excluir)

let listaProdutos = []; // guarda os produtos carregados

function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return 'R$ ' + numero.toFixed(2).replace('.', ',');
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
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#999;">Nenhum produto cadastrado.</td></tr>';
    return;
  }

  // Regras de permissão: Editar = Coordenador e Diretor; Excluir = só Diretor
  const usuario = usuarioLogado();
  const cargo = usuario ? usuario.role : null;
  const podeEditar = cargo === 'COORDENADOR' || cargo === 'DIRETOR';
  const podeExcluir = cargo === 'DIRETOR';

  tbody.innerHTML = produtos.map(function (p) {
    const foto = p.photoUrl
      ? `<img class="thumb" src="${p.photoUrl.startsWith('http') ? p.photoUrl : 'http://127.0.0.1:3333' + p.photoUrl}" alt="${p.name}" />`
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

// ---- MODAL ----

function abrirModalNovo() {
  document.getElementById('modal-produto-titulo').textContent = 'Cadastrar produto';
  document.getElementById('produto-id').value = '';
  limparFormularioProduto();
  document.getElementById('modal-produto').style.display = 'flex';
}

function abrirModalEdicao(id) {
  const produto = listaProdutos.find(function (p) { return p.id === id; });
  if (!produto) return;

  document.getElementById('modal-produto-titulo').textContent = 'Editar produto';
  document.getElementById('produto-id').value = produto.id;
  document.getElementById('produto-nome').value = produto.name || '';
  document.getElementById('produto-marca').value = produto.brand || '';
  document.getElementById('produto-quantidade').value = produto.quantity || 0;
  document.getElementById('produto-preco').value = produto.price || 0;
  document.getElementById('produto-qtd-min').value = produto.minQuantity || 5;
  document.getElementById('produto-validade').value = produto.expirationDate || '';
  document.getElementById('produto-codigo').value = produto.barcode || '';
  document.getElementById('produto-categoria').value = produto.category || '';
  document.getElementById('produto-local').value = produto.location || '';

  document.getElementById('modal-produto').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-produto').style.display = 'none';
}

function limparFormularioProduto() {
  const campos = ['produto-nome','produto-marca','produto-quantidade','produto-preco','produto-qtd-min',
    'produto-validade','produto-codigo','produto-categoria','produto-local'];
  campos.forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('produto-foto').value = '';
}

async function salvarProduto() {
  const id = document.getElementById('produto-id').value;
  const nome = document.getElementById('produto-nome').value.trim();

  if (!nome) {
    mostrarToast('O nome do produto é obrigatório!', true);
    return;
  }

  // Monta um FormData para suportar upload de foto
  const fd = new FormData();
  fd.append('name', nome);
  fd.append('brand', document.getElementById('produto-marca').value);
  fd.append('quantity', document.getElementById('produto-quantidade').value || 0);
  fd.append('price', document.getElementById('produto-preco').value || 0);
  fd.append('minQuantity', document.getElementById('produto-qtd-min').value || 5);
  fd.append('expirationDate', document.getElementById('produto-validade').value);
  fd.append('barcode', document.getElementById('produto-codigo').value);
  fd.append('category', document.getElementById('produto-categoria').value);
  fd.append('location', document.getElementById('produto-local').value);

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