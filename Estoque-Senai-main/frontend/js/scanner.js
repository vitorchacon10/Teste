// js/scanner.js
// Leitor de código de barras + entrada/saída de estoque

let produtoScan = null; // produto encontrado pelo scanner
let scannerAtivo = null; // instância do Html5QrcodeScanner

function iniciarScanner() {
  // Verifica se a biblioteca está disponível
  if (typeof Html5QrcodeScanner === 'undefined') return;

  scannerAtivo = new Html5QrcodeScanner('leitor-camera', {
    fps: 10,
    qrbox: 250
  });

  scannerAtivo.render(function (codigoLido) {
    document.getElementById('campo-codigo').value = codigoLido;
    buscarProdutoPorCodigo(codigoLido);
    scannerAtivo.clear().catch(function () {});
  }, function (erro) {
    // silenciosamente ignora erros de frame
  });
}

function pararScanner() {
  if (scannerAtivo) {
    scannerAtivo.clear().catch(function () {});
    scannerAtivo = null;
  }
}

async function buscarProdutoPorCodigo(codigo) {
  const msgDiv = document.getElementById('msg-scanner');
  const resultDiv = document.getElementById('resultado-produto');
  const btnCadastrar = document.getElementById('btn-cadastrar-do-scanner');

  codigo = codigo || document.getElementById('campo-codigo').value.trim();

  if (!codigo) {
    mostrarMensagem(msgDiv, 'Digite um código de barras.', 'erro');
    btnCadastrar.style.display = 'none';
    return;
  }

  try {
    produtoScan = await api.get('/products/barcode/' + codigo);

    const unidadeFormatada = formatarUnidadeProduto(produtoScan.unit);

    document.getElementById('nome-produto-scan').textContent = produtoScan.name;
    document.getElementById('qtd-produto-scan').textContent = produtoScan.quantity;
    document.getElementById('unidade-produto-scan').textContent = unidadeFormatada;
    document.getElementById('unidade-movimentacao-scan').textContent = unidadeFormatada;
    resultDiv.style.display = 'block';
    btnCadastrar.style.display = 'none';
    mostrarMensagem(msgDiv, 'Produto encontrado!', 'sucesso');
  } catch (err) {
    produtoScan = null;
    resultDiv.style.display = 'none';
    mostrarMensagem(msgDiv, 'Produto não cadastrado.', 'erro');
    // Mostra o botão pra ir direto pro cadastro com o código já preenchido
    btnCadastrar.style.display = 'inline-block';
    btnCadastrar.dataset.codigo = codigo;
  }
}

async function movimentarEstoque(tipo) {
  if (!produtoScan) return;

  const codigo = document.getElementById('campo-codigo').value.trim();
  const quantidade = parseInt(document.getElementById('qtd-movimentacao').value) || 1;

  try {
    const resposta = await api.post('/stock/move', {
      barcode: codigo,
      type: tipo,
      quantity: quantidade
    });

    // Atualiza a quantidade exibida
    document.getElementById('qtd-produto-scan').textContent = resposta.product.quantity;
    document.getElementById('unidade-produto-scan').textContent = formatarUnidadeProduto(resposta.product.unit);
    produtoScan = resposta.product;
    mostrarToast(tipo + ' registrada com sucesso!');
  } catch (err) {
    mostrarToast('Erro: ' + err.message, true);
  }
}

// Função utilitária para mostrar mensagens no scanner
function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = 'mensagem ' + tipo;
  elemento.style.display = 'block';
}

// Eventos
document.getElementById('btn-buscar-manual').addEventListener('click', function () {
  buscarProdutoPorCodigo();
});

document.getElementById('campo-codigo').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') buscarProdutoPorCodigo();
});

document.getElementById('btn-entrada').addEventListener('click', function () {
  movimentarEstoque('ENTRADA');
});

const btnSaidaScanner = document.getElementById('btn-saida');
if (btnSaidaScanner) {
  btnSaidaScanner.addEventListener('click', function () {
    movimentarEstoque('SAIDA');
  });
}

// Quando o código lido não existe no banco: leva o usuário pra tela de
// Produtos e já abre o modal de cadastro com o código de barras preenchido.
document.getElementById('btn-cadastrar-do-scanner').addEventListener('click', function () {
  const codigo = this.dataset.codigo || document.getElementById('campo-codigo').value.trim();

  // Ativa a aba/página "Produtos" (mesmo mecanismo usado pelos links do menu)
  const linkProdutos = document.querySelector('.menu-link[data-pagina="produtos"]');
  if (linkProdutos) linkProdutos.click();

  abrirModalNovoComCodigo(codigo);
});