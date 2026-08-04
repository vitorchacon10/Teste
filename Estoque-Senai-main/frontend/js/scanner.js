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

  codigo = codigo || document.getElementById('campo-codigo').value.trim();

  if (!codigo) {
    mostrarMensagem(msgDiv, 'Digite um código de barras.', 'erro');
    return;
  }

  try {
    produtoScan = await api.get('/products/barcode/' + codigo);

    document.getElementById('nome-produto-scan').textContent = produtoScan.name;
    document.getElementById('qtd-produto-scan').textContent = produtoScan.quantity;
    resultDiv.style.display = 'block';
    mostrarMensagem(msgDiv, 'Produto encontrado!', 'sucesso');
  } catch (err) {
    produtoScan = null;
    resultDiv.style.display = 'none';
    mostrarMensagem(msgDiv, 'Produto não cadastrado.', 'erro');
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

document.getElementById('btn-saida').addEventListener('click', function () {
  movimentarEstoque('SAIDA');
});
