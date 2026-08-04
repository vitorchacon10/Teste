// js/auth.js
// Controla login e logout do usuário

function usuarioLogado() {
  return JSON.parse(localStorage.getItem('usuario') || 'null');
}

async function fazerLogin(email, senha) {
  const dados = await api.post('/auth/login', { email, password: senha });
  localStorage.setItem('token', dados.token);
  localStorage.setItem('usuario', JSON.stringify(dados.user));
  return dados.user;
}

function fazerLogout() {
  localStorage.clear();
  location.reload();
}

// Configura o formulário de login
document.getElementById('btn-entrar').addEventListener('click', async function () {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erroDiv = document.getElementById('erro-login');

  erroDiv.style.display = 'none';

  if (!email || !senha) {
    erroDiv.textContent = 'Preencha e-mail e senha.';
    erroDiv.style.display = 'block';
    return;
  }

  try {
    await fazerLogin(email, senha);
    mostrarApp();
  } catch (err) {
    erroDiv.textContent = 'E-mail ou senha inválidos.';
    erroDiv.style.display = 'block';
  }
});

// Permite pressionar Enter para fazer login
document.getElementById('login-senha').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    document.getElementById('btn-entrar').click();
  }
});

// Botão de sair
document.getElementById('btn-sair').addEventListener('click', fazerLogout);
