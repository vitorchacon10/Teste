// js/api.js
// Módulo para comunicação com o backend
// Disciplina: Desenvolvimento de Sistemas - 1º Ano

// Detecta o ambiente automaticamente:
// - Se a página está sendo aberta via Live Server (portas 5500/5501) ou
//   outro servidor de desenvolvimento comum, aponta pro backend local.
// - Caso contrário (backend servindo o frontend direto, seja local na
//   porta 3333 ou em produção no Render), usa caminho relativo — assim
//   funciona em qualquer domínio sem precisar editar nada.
const PORTAS_DEV = ['5500', '5501', '3000'];
const usaBackendLocal = PORTAS_DEV.includes(window.location.port);

const API_ORIGIN = usaBackendLocal ? 'http://127.0.0.1:3333' : window.location.origin;
window.API_ORIGIN = API_ORIGIN; // acessível em outros arquivos JS (ex: produtos.js)
const API_URL = API_ORIGIN + '/api';

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