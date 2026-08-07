// js/usuarios.js
// Tela de Gestão de Usuários (somente Diretor)

const CARGOS = ['DOCENTE', 'COORDENADOR', 'DIRETOR'];

async function carregarUsuarios() {
  const corpo = document.getElementById('corpo-tabela-usuarios');
  corpo.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';

  try {
    const usuarios = await api.get('/users');
    renderizarUsuarios(usuarios);
  } catch (err) {
    corpo.innerHTML = `<tr><td colspan="4">Erro ao carregar usuários: ${err.message}</td></tr>`;
  }
}

function renderizarUsuarios(usuarios) {
  const corpo = document.getElementById('corpo-tabela-usuarios');
  const usuarioAtual = usuarioLogado();

  if (!usuarios || usuarios.length === 0) {
    corpo.innerHTML = '<tr><td colspan="4">Nenhum usuário encontrado.</td></tr>';
    return;
  }

  corpo.innerHTML = '';

  usuarios.forEach(function (usuario) {
    const linha = document.createElement('tr');

    const ehVoceMesmo = usuarioAtual && usuario.id === usuarioAtual.id;

    // Monta as opções de cargo, exceto o cargo atual
    const opcoesCargo = CARGOS
      .filter(function (c) { return c !== usuario.role; })
      .map(function (c) { return `<option value="${c}">${c}</option>`; })
      .join('');

    linha.innerHTML = `
      <td>${usuario.name}</td>
      <td>${usuario.email}</td>
      <td><strong>${usuario.role}</strong></td>
      <td>
        ${ehVoceMesmo
          ? '<span style="color:#888;">Você mesmo</span>'
          : `
            <select class="select-novo-cargo" data-id="${usuario.id}">
              <option value="">Alterar cargo...</option>
              ${opcoesCargo}
            </select>
            <button class="btn btn-vermelho btn-pequeno btn-confirmar-cargo" data-id="${usuario.id}">Confirmar</button>
          `
        }
      </td>
    `;

    corpo.appendChild(linha);
  });

  // Liga os botões de confirmar depois de renderizar
  document.querySelectorAll('.btn-confirmar-cargo').forEach(function (botao) {
    botao.addEventListener('click', async function () {
      const id = this.dataset.id;
      const select = document.querySelector(`.select-novo-cargo[data-id="${id}"]`);
      const novoCargo = select.value;

      if (!novoCargo) {
        mostrarToast('Selecione um cargo antes de confirmar.', true);
        return;
      }

      const confirmar = confirm(`Tem certeza que deseja alterar o cargo deste usuário para ${novoCargo}?`);
      if (!confirmar) return;

      try {
        await api.put(`/users/${id}/role`, { role: novoCargo });
        mostrarToast('Cargo atualizado com sucesso!');
        carregarUsuarios(); // recarrega a lista
      } catch (err) {
        mostrarToast('Erro ao atualizar cargo: ' + err.message, true);
      }
    });
  });
}