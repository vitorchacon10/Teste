// js/relatorios.js
// Página de Relatórios

async function carregarRelatorios() {
  const gradeDiv = document.getElementById('grade-relatorios');
  gradeDiv.innerHTML = '<p style="color:#999">Carregando...</p>';

  try {
    const dados = await api.get('/reports/critical');

    // Produtos Vencidos
    const vencidosHTML = dados.expired.length > 0
      ? dados.expired.map(function (p) {
          return `<div class="item-critico vermelho">${p.name} – ${p.expirationDate}</div>`;
        }).join('')
      : '<p style="color:#999; font-size:13px;">Nenhum produto vencido.</p>';

    // Próximos do vencimento
    const vencendoHTML = dados.expiring.length > 0
      ? dados.expiring.map(function (p) {
          return `<div class="item-critico">${p.name} – ${p.expirationDate}</div>`;
        }).join('')
      : '<p style="color:#999; font-size:13px;">Nenhum produto vencendo em breve.</p>';

    // Estoque baixo
    const baixoHTML = dados.lowStock.length > 0
      ? dados.lowStock.map(function (p) {
          return `<div class="item-critico">${p.name} – qtd: ${p.quantity}</div>`;
        }).join('')
      : '<p style="color:#999; font-size:13px;">Todos os produtos estão com estoque ok.</p>';

    // Carrega opções dos dropdowns do relatório de movimentações
    const produtos = await api.get('/products');
    const pessoas = await api.get('/reports/people');

    const opcoesProduto = produtos.map(function (p) {
      return `<option value="${p.id}">${p.name}</option>`;
    }).join('');

    const opcoesPessoa = pessoas.map(function (p) {
      return `<option value="${p.id}">${p.name}</option>`;
    }).join('');

    const mesAtual = mesAtualFormatado(); // ex: "2026-08"

    const filtroMovimentacoesHTML = `
      <div class="card">
        <h2 style="margin-bottom:16px; color:#e30613;">Relatório de Movimentações</h2>

        <div class="campo">
          <label>Mês</label>
          <input type="month" id="filtro-mes-mov" value="${mesAtual}">
        </div>

        <div class="campo">
          <label>Produto</label>
          <select id="filtro-produto-mov">
            <option value="">Todos</option>
            ${opcoesProduto}
          </select>
        </div>

        <div class="campo">
          <label>Pessoa</label>
          <select id="filtro-pessoa-mov">
            <option value="">Todas</option>
            ${opcoesPessoa}
          </select>
        </div>

        <div class="linha-botoes">
          <button id="btn-excel-mov" class="btn btn-vermelho">Baixar Excel</button>
          <button id="btn-pdf-mov" class="btn btn-contorno">Baixar PDF</button>
        </div>
      </div>
    `;

    gradeDiv.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:12px; color:#e30613;">Produtos Vencidos</h2>
        ${vencidosHTML}
      </div>
      <div class="card">
        <h2 style="margin-bottom:12px; color:#f0ad00;">Próximos ao Vencimento</h2>
        ${vencendoHTML}
      </div>
      <div class="card">
        <h2 style="margin-bottom:12px; color:#888;">Estoque Baixo</h2>
        ${baixoHTML}
      </div>
      ${filtroMovimentacoesHTML}
    `;

    document.getElementById('btn-excel-mov').addEventListener('click', function () {
      baixarRelatorioMovimentacoes('excel');
    });

    document.getElementById('btn-pdf-mov').addEventListener('click', function () {
      baixarRelatorioMovimentacoes('pdf');
    });

  } catch (err) {
    gradeDiv.innerHTML = '<p style="color:red;">Erro ao carregar relatórios.</p>';
  }
}

// Retorna o mês atual no formato exigido pelo <input type="month"> (YYYY-MM)
function mesAtualFormatado() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

function baixarRelatorio(tipo) {
  const token = localStorage.getItem('token');
  const url = window.API_ORIGIN + '/api/reports/' + tipo + '?token=' + token;
  window.open(url, '_blank');
}

// Monta a URL do relatório mensal de movimentações (com filtros de
// mês/ano, produto e pessoa) e abre para download, no mesmo padrão
// de baixarRelatorio().
function baixarRelatorioMovimentacoes(tipo) {
  const token = localStorage.getItem('token');
  const mesInput = document.getElementById('filtro-mes-mov').value; // formato YYYY-MM
  const [year, month] = mesInput.split('-');
  const productId = document.getElementById('filtro-produto-mov').value;
  const userId = document.getElementById('filtro-pessoa-mov').value;

  const params = new URLSearchParams({ token, year, month });
  if (productId) params.append('productId', productId);
  if (userId) params.append('userId', userId);

  const url = window.API_ORIGIN + '/api/reports/movements/' + tipo + '?' + params.toString();
  window.open(url, '_blank');
}

document.getElementById('btn-excel').addEventListener('click', function () {
  baixarRelatorio('excel');
});

document.getElementById('btn-pdf').addEventListener('click', function () {
  baixarRelatorio('pdf');
});