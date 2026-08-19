// js/relatorios.js
// Página de Relatórios

// Rótulos amigáveis para cada unidade de medida (mesmo padrão usado em solicitacoes.js)
const ROTULO_UNIDADE_RELATORIO = {
  UN: 'un',
  PCT: 'pct',
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'L'
};

function formatarUnidade(unit) {
  return ROTULO_UNIDADE_RELATORIO[unit] || unit || '';
}

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

    // Estoque baixo — mostra a unidade junto da quantidade (ex: "0.5 kg")
    const baixoHTML = dados.lowStock.length > 0
      ? dados.lowStock.map(function (p) {
          return `<div class="item-critico">${p.name} – qtd: ${p.quantity} ${formatarUnidade(p.unit)}</div>`;
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

    const opcoesAno = gerarOpcoesAno();
    const opcoesMes = gerarOpcoesMes();

    const filtroMovimentacoesHTML = `
      <div class="card">
        <h2 style="margin-bottom:16px; color:#e30613;">Relatório de Movimentações</h2>

        <div class="campo">
          <label>Ano</label>
          <select id="filtro-ano-mov">
            <option value="">Todos</option>
            ${opcoesAno}
          </select>
        </div>

        <div class="campo">
          <label>Mês</label>
          <select id="filtro-mes-mov">
            <option value="">Todos</option>
            ${opcoesMes}
          </select>
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

// Gera as opções de ano do select (ano atual + 4 anteriores)
function gerarOpcoesAno() {
  const anoAtual = new Date().getFullYear();
  let html = '';
  for (let a = anoAtual; a >= anoAtual - 4; a--) {
    html += `<option value="${a}">${a}</option>`;
  }
  return html;
}

// Gera as opções de mês do select
function gerarOpcoesMes() {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses.map(function (nome, index) {
    return `<option value="${index + 1}">${nome}</option>`;
  }).join('');
}

function baixarRelatorio(tipo) {
  const token = localStorage.getItem('token');
  const url = window.API_ORIGIN + '/api/reports/' + tipo + '?token=' + token;
  window.open(url, '_blank');
}

// Monta a URL do relatório de movimentações com os filtros escolhidos.
// Ano e mês agora são opcionais: sem ano = todos os períodos,
// só ano = ano inteiro, ano + mês = só aquele mês.
function baixarRelatorioMovimentacoes(tipo) {
  const token = localStorage.getItem('token');
  const year = document.getElementById('filtro-ano-mov').value;
  const month = document.getElementById('filtro-mes-mov').value;
  const productId = document.getElementById('filtro-produto-mov').value;
  const userId = document.getElementById('filtro-pessoa-mov').value;

  const params = new URLSearchParams({ token });
  if (year) params.append('year', year);
  if (month) params.append('month', month);
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