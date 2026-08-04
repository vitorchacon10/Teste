// js/api.js
// Módulo para comunicação com o backend
// Disciplina: Desenvolvimento de Sistemas - 1º Ano

const API_URL = 'http://127.0.0.1:3333/api';

// Pega o token salvo no localStorage
function pegarToken() {
  return localStorage.getItem('token') || '';
}

// Função genérica para fazer requisições HTTP
async function requisicao(metodo, rota, dados = null, isFormData = false) {
  const config = {
    method: metodo,
    headers: {
      Authorization: `Bearer ${pegarToken()}`
    }
  };

  if (dados) {
    if (isFormData) {
      config.body = dados;
    } else {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(dados);
    }
  }

  try {
    const resposta = await fetch(API_URL + rota, config);

    const json = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(json.message || `Erro ${resposta.status}`);
    }

    return json;
  } catch (erro) {
    console.error('Erro completo:', erro);
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique se o backend está rodando.'
    );
  }
}

// Funções de atalho
const api = {
  get: (rota)               => requisicao('GET', rota),
  post: (rota, dados)       => requisicao('POST', rota, dados),
  postForm: (rota, fd)      => requisicao('POST', rota, fd, true),
  put: (rota, dados)        => requisicao('PUT', rota, dados),
  putForm: (rota, fd)       => requisicao('PUT', rota, fd, true),
  delete: (rota)            => requisicao('DELETE', rota),
};
