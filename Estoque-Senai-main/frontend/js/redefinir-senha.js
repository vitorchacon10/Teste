// js/redefinir-senha.js
// Controla o formulário de redefinição de senha (chegada via link do e-mail)

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const mensagemDiv = document.getElementById('mensagem');
const formDiv = document.getElementById('form-nova-senha');
const btn = document.getElementById('btn-redefinir');

function mostrarMensagem(texto, sucesso) {
  mensagemDiv.style.background = sucesso ? '#d4edda' : '#f8d7da';
  mensagemDiv.style.color = sucesso ? '#155724' : '#721c24';
  mensagemDiv.textContent = texto;
  mensagemDiv.style.display = 'block';
}

if (!token) {
  formDiv.style.display = 'none';
  mostrarMensagem('Link inválido. Solicite a recuperação de senha novamente.', false);
} else {
  btn.addEventListener('click', async function () {
    const senha = document.getElementById('senha').value;
    const confirmar = document.getElementById('confirmar-senha').value;

    if (!senha || senha.length < 6) {
      mostrarMensagem('A senha deve ter no mínimo 6 caracteres.', false);
      return;
    }
    if (senha !== confirmar) {
      mostrarMensagem('As senhas não coincidem.', false);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
      const resposta = await api.post('/auth/reset-password', { token, password: senha });
      mostrarMensagem(resposta.message, true);
      formDiv.style.display = 'none';
    } catch (erro) {
      mostrarMensagem(erro.message, false);
      btn.disabled = false;
      btn.textContent = 'Redefinir senha';
    }
  });
}