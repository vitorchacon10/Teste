// js/dashboard.js
// Carrega os dados da página Dashboard

let graficoBarras = null; // referência ao gráfico Chart.js

async function carregarDashboard() {
  try {
    const dados = await api.get('/dashboard');

    // Preenche os cards de estatísticas
    document.getElementById('cards-dashboard').innerHTML = `
      <div class="card-stat">
        <p>Total de produtos</p>
        <h2>${dados.total}</h2>
      </div>
      <div class="card-stat">
        <p>Próximos ao vencimento</p>
        <h2>${dados.expiring}</h2>
      </div>
      <div class="card-stat">
        <p>Vencidos</p>
        <h2 class="vermelho">${dados.expired}</h2>
      </div>
      <div class="card-stat">
        <p>Estoque baixo</p>
        <h2>${dados.lowStock}</h2>
      </div>
    `;

    // Monta o gráfico de barras com Chart.js
    const ctx = document.getElementById('grafico-barras').getContext('2d');
    const dadosGrafico = {
      labels: ['Produtos', 'Vencendo', 'Vencidos', 'Estoque Baixo'],
      datasets: [{
        label: 'Quantidade',
        data: [dados.total, dados.expiring, dados.expired, dados.lowStock],
        backgroundColor: ['#4a90d9', '#f0ad00', '#e30613', '#888888'],
        borderRadius: 6,
      }]
    };

    if (graficoBarras) {
      graficoBarras.destroy(); // destroi o gráfico anterior antes de criar um novo
    }

    graficoBarras = new Chart(ctx, {
      type: 'bar',
      data: dadosGrafico,
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });

    // Lista as últimas movimentações
    const listaMov = document.getElementById('lista-movimentacoes');
    if (!dados.latestMovements || dados.latestMovements.length === 0) {
      listaMov.innerHTML = '<p style="color:#999; font-size:13px;">Nenhuma movimentação ainda.</p>';
      return;
    }

    listaMov.innerHTML = dados.latestMovements.map(function (m) {
      const tipo = m.type === 'ENTRADA'
        ? '<span class="badge-entrada">ENTRADA</span>'
        : '<span class="badge-saida">SAÍDA</span>';
      const data = new Date(m.createdAt).toLocaleString('pt-BR');
      const produto = m.Product ? m.Product.name : '–';
      const responsavel = m.responsible ? m.responsible : 'Não informado';
      return `
        <div class="item-movimentacao">
          ${tipo} <strong>${produto}</strong> | Qtd: ${m.quantity} | ${data}
          <br><span style="font-size:12px; color:#777;">Responsável: ${responsavel}${m.sector ? ' · Setor: ' + m.sector : ''}</span>
        </div>  
      `;
    }).join('');

  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}