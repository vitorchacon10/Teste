// js/cadastro.js
// Tela de cadastro — usa o api.js e a mesma chave de localStorage do auth.js

const formCadastro = document.getElementById('form-cadastro');
const mensagemEl = document.getElementById('mensagem');
const btnCadastrar = document.getElementById('btn-cadastrar');

function mostrarMensagem(texto, tipo) {
  mensagemEl.textContent = texto;
  mensagemEl.style.display = 'block';
  // Reaproveita o visual de erro do login; para sucesso, aplica verde inline.
  if (tipo === 'sucesso') {
    mensagemEl.style.background = '#e6f4ea';
    mensagemEl.style.color = '#1e7e34';
  } else {
    mensagemEl.style.background = '';
    mensagemEl.style.color = '';
  }
}

formCadastro.addEventListener('submit', async (event) => {
  event.preventDefault();
  mensagemEl.style.display = 'none';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    mostrarMensagem('As senhas não coincidem.', 'erro');
    return;
  }
  if (password.length < 6) {
    mostrarMensagem('A senha deve ter no mínimo 6 caracteres.', 'erro');
    return;
  }

  btnCadastrar.disabled = true;
  btnCadastrar.textContent = 'Cadastrando...';

  try {
    // Não enviamos "role" — o backend sempre cria como DOCENTE, mesmo que
    // alguém tente forjar essa informação diretamente na requisição.
    const data = await api.post('/auth/register', { name, email, password });

    // Mesma chave que o auth.js usa ('usuario'), senão o resto do sistema
    // não reconhece o usuário como logado.
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.user));

    mostrarMensagem('Cadastro realizado com sucesso! Redirecionando...', 'sucesso');
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);

  } catch (err) {
    console.error(err);
    mostrarMensagem(err.message || 'Não foi possível concluir o cadastro.', 'erro');
  } finally {
    btnCadastrar.disabled = false;
    btnCadastrar.textContent = 'Cadastrar';
  }
});