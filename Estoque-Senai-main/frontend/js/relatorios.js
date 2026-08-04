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

    gradeDiv.innerHTML = `
      <div class="card">
        <h2 style="margin-bottom:12px; color:#e30613;"> Produtos Vencidos</h2>
        ${vencidosHTML}
      </div>
      <div class="card">
        <h2 style="margin-bottom:12px; color:#f0ad00;"> Próximos ao Vencimento</h2>
        ${vencendoHTML}
      </div>
      <div class="card">
        <h2 style="margin-bottom:12px; color:#888;"> Estoque Baixo</h2>
        ${baixoHTML}
      </div>
    `;
  } catch (err) {
    gradeDiv.innerHTML = '<p style="color:red;">Erro ao carregar relatórios.</p>';
  }
}

function baixarRelatorio(tipo) {
  const token = localStorage.getItem('token');
  const url = 'http://127.0.0.1:3333/api/reports/' + tipo + '?token=' + token;
  window.open(url, '_blank');
}

document.getElementById('btn-excel').addEventListener('click', function () {
  baixarRelatorio('excel');
});

document.getElementById('btn-pdf').addEventListener('click', function () {
  baixarRelatorio('pdf');
});
