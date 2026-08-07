// js/esqueci-senha.js
// Controla o formulário de "esqueci minha senha"

const btn = document.getElementById('btn-enviar');
const mensagemDiv = document.getElementById('mensagem');

btn.addEventListener('click', async function () {
  const email = document.getElementById('email').value.trim();
  mensagemDiv.style.display = 'none';

  if (!email) {
    mensagemDiv.textContent = 'Informe o e-mail.';
    mensagemDiv.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const resposta = await api.post('/auth/forgot-password', { email });
    mensagemDiv.style.background = '#d4edda';
    mensagemDiv.style.color = '#155724';
    mensagemDiv.textContent = resposta.message;
    mensagemDiv.style.display = 'block';
  } catch (erro) {
    mensagemDiv.style.background = '#f8d7da';
    mensagemDiv.style.color = '#721c24';
    mensagemDiv.textContent = erro.message;
    mensagemDiv.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar link de recuperação';
  }
});