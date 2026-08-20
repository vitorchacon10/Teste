// js/app.js
// Arquivo principal: controla a navegação entre páginas e inicializa o app

// ==========================================
// NAVEGAÇÃO ENTRE PÁGINAS
// ==========================================

function mostrarPagina(nomePagina) {
  // Esconde todas as páginas
  document.querySelectorAll('.pagina').forEach(function (pg) {
    pg.classList.remove('ativa');
  });

  // Mostra a página pedida
  const paginaAlvo = document.getElementById('pagina-' + nomePagina);
  if (paginaAlvo) {
    paginaAlvo.classList.add('ativa');
  }

  // Atualiza o menu: marca o link ativo
  document.querySelectorAll('.menu-link').forEach(function (link) {
    link.classList.remove('ativo');
    if (link.dataset.pagina === nomePagina) {
      link.classList.add('ativo');
    }
  });

  // Carrega os dados da página ao trocar para ela
  if (nomePagina === 'dashboard') {
    carregarDashboard();
  } else if (nomePagina === 'produtos') {
    carregarProdutos();
  } else if (nomePagina === 'scanner') {
    // Inicia a câmera do scanner quando entrar na página
    setTimeout(iniciarScanner, 300);
  } else if (nomePagina === 'entregas') {
    carregarProdutosEntrega();
  } else if (nomePagina === 'relatorios') {
    carregarRelatorios();
  } else if (nomePagina === 'usuarios') {
    carregarUsuarios();
  } else if (nomePagina === 'solicitacoes') {
    carregarSolicitacoes();
  }

  // Para o scanner se sair da página
  if (nomePagina !== 'scanner') {
    pararScanner();
  }
}

// Cliques nos links do menu
document.querySelectorAll('.menu-link').forEach(function (link) {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    mostrarPagina(this.dataset.pagina);
  });
});

// ==========================================
// TOAST (notificação flutuante)
// ==========================================

function mostrarToast(mensagem, ehErro) {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.style.backgroundColor = ehErro ? '#c0392b' : '#27ae60';
  toast.classList.add('visivel');

  setTimeout(function () {
    toast.classList.remove('visivel');
  }, 3000);
}

// ==========================================
// CONTROLE DE VISIBILIDADE POR CARGO
// ==========================================

function ajustarMenuPorCargo() {
  const usuario = usuarioLogado(); // função já existe em auth.js
  const cargo = usuario ? usuario.role : null;

  const linkUsuarios = document.getElementById('link-usuarios');
  const linkEntregas = document.getElementById('link-entregas');
  const linkDashboard = document.getElementById('link-dashboard');
  const linkScanner = document.getElementById('link-scanner');
  const linkRelatorios = document.getElementById('link-relatorios');
  const btnNotificacoes = document.getElementById('btn-ativar-notificacoes');
  const btnNovoProduto = document.getElementById('btn-novo-produto');
  const btnEntrada = document.getElementById('btn-entrada');
  const btnSaida = document.getElementById('btn-saida');

  // --- Usuários: só Diretor ---
  linkUsuarios.style.display = cargo === 'DIRETOR' ? 'inline-block' : 'none';

  // --- Retirada direta (sem aprovação): só Diretor ---
  // Docente/Coordenador usam "Solicitações" em vez disso.
  linkEntregas.style.display = cargo === 'DIRETOR' ? 'inline-block' : 'none';

  // --- Dashboard, Scanner e Relatórios: Docente não usa, então some pra ele ---
  const escondeDoDocente = cargo === 'DOCENTE' ? 'none' : 'inline-block';
  linkDashboard.style.display = escondeDoDocente;
  linkScanner.style.display = escondeDoDocente;
  linkRelatorios.style.display = escondeDoDocente;

  // --- Entrada/Saída no Scanner: mesmo endpoint da retirada direta, só Diretor ---
  if (btnEntrada) btnEntrada.style.display = cargo === 'DIRETOR' ? 'inline-block' : 'none';
  if (btnSaida) btnSaida.style.display = cargo === 'DIRETOR' ? 'inline-block' : 'none';

  // --- Novo Produto: Coordenador e Diretor ---
  if (btnNovoProduto) {
    btnNovoProduto.style.display = (cargo === 'COORDENADOR' || cargo === 'DIRETOR') ? 'inline-block' : 'none';
  }

  // --- Notificações do navegador: só Diretor ---
  if (cargo === 'DIRETOR') {
    const suportaNotificacao = 'Notification' in window;
    if (suportaNotificacao && Notification.permission === 'default') {
      btnNotificacoes.style.display = 'inline-block';
    } else {
      btnNotificacoes.style.display = 'none';
    }
  } else {
    btnNotificacoes.style.display = 'none';
  }

  // Se o usuário estiver numa página que acabou de ficar escondida
  // (ex: um Docente que estava em "Retirada" e foi rebaixado/trocado),
  // manda ele de volta pro dashboard por segurança.
  const paginaAtiva = document.querySelector('.pagina.ativa');
  if (paginaAtiva) {
    const nomePaginaAtiva = paginaAtiva.id.replace('pagina-', '');
    const paginasRestritas = {
      entregas: cargo === 'DIRETOR',
      usuarios: cargo === 'DIRETOR',
      dashboard: cargo !== 'DOCENTE',
      scanner: cargo !== 'DOCENTE',
      relatorios: cargo !== 'DOCENTE'
    };
    if (paginasRestritas.hasOwnProperty(nomePaginaAtiva) && !paginasRestritas[nomePaginaAtiva]) {
      mostrarPagina(cargo === 'DOCENTE' ? 'produtos' : 'dashboard');
    }
  }
}

// Clique no botão: pede a permissão (isso PRECISA ser disparado por um clique
// real do usuário, senão o navegador ignora o pedido silenciosamente)
document.getElementById('btn-ativar-notificacoes').addEventListener('click', async function () {
  if (!('Notification' in window)) {
    mostrarToast('Seu navegador não suporta notificações.', true);
    return;
  }

  const permissao = await Notification.requestPermission();

  if (permissao === 'granted') {
    mostrarToast('Notificações ativadas com sucesso!');
    this.style.display = 'none';
  } else {
    mostrarToast('Permissão não concedida. Você pode ativar depois pelo navegador.', true);
  }
});

// ==========================================
// NOTIFICAÇÃO DE NOVAS SOLICITAÇÕES (só Diretor)
// ==========================================

let idsSolicitacoesConhecidas = null; // null = ainda não inicializado
let intervaloNotificacoes = null;

async function verificarNovasSolicitacoes() {
  try {
    const solicitacoes = await api.get('/solicitacoes');
    const pendentes = solicitacoes.filter(function (s) { return s.status === 'PENDENTE'; });
    const idsPendentesAtuais = pendentes.map(function (s) { return s.id; });

    // Primeira verificação: só guarda a "linha de base", sem notificar
    // (evita notificar solicitações antigas toda vez que a página carrega)
    if (idsSolicitacoesConhecidas === null) {
      idsSolicitacoesConhecidas = new Set(idsPendentesAtuais);
      atualizarBadgeSolicitacoes(pendentes.length);
      return;
    }

    // Descobre quais são realmente novas (não vistas antes)
    const novas = pendentes.filter(function (s) {
      return !idsSolicitacoesConhecidas.has(s.id);
    });

    if (novas.length > 0) {
      novas.forEach(function (s) {
        const nomeProduto = s.Product ? s.Product.name : 'produto';
        const nomeSolicitante = s.requester ? s.requester.name : 'alguém';
        const texto = `Nova solicitação: ${nomeSolicitante} pediu ${s.quantity}x ${nomeProduto}`;

        mostrarToast(texto);
        dispararNotificacaoNavegador('SENAI Zerbini - Estoque', texto);
      });
      idsSolicitacoesConhecidas = new Set(idsPendentesAtuais);
    }

    atualizarBadgeSolicitacoes(pendentes.length);

  } catch (err) {
    console.error('Erro ao verificar novas solicitações:', err);
  }
}

function atualizarBadgeSolicitacoes(quantidade) {
  const badge = document.getElementById('badge-solicitacoes');
  if (!badge) return;

  if (quantidade > 0) {
    badge.textContent = quantidade;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// Mostra uma notificação do sistema operacional (fora da aba do navegador).
// Só funciona se a permissão já tiver sido concedida.
function dispararNotificacaoNavegador(titulo, corpo) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notificacao = new Notification(titulo, {
    body: corpo,
    icon: 'img/icone-notificacao.png', // opcional; se não existir, o navegador usa um ícone padrão
    tag: 'senai-solicitacao' // evita empilhar muitas notificações de uma vez
  });

  // Ao clicar na notificação, foca a aba do sistema e vai direto para a página de solicitações
  notificacao.onclick = function () {
    window.focus();
    mostrarPagina('solicitacoes');
    notificacao.close();
  };
}

function iniciarNotificacoesSolicitacoes() {
  const usuario = usuarioLogado();
  if (!usuario || usuario.role !== 'DIRETOR') return;

  // A permissão de notificação é pedida pelo botão "Ativar notificações"
  // no cabeçalho (precisa ser um clique real do usuário, senão o
  // navegador ignora o pedido). Aqui só cuidamos da checagem periódica.
  verificarNovasSolicitacoes();
  intervaloNotificacoes = setInterval(verificarNovasSolicitacoes, 20000);
}

function pararNotificacoesSolicitacoes() {
  if (intervaloNotificacoes) {
    clearInterval(intervaloNotificacoes);
    intervaloNotificacoes = null;
  }
}

// ==========================================
// INICIALIZAÇÃO DO APP
// ==========================================

function mostrarApp() {
  // Esconde o login e mostra o app
  document.getElementById('pagina-login').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  // Ajusta o menu conforme o cargo do usuário logado
  ajustarMenuPorCargo();

  // Página inicial: Docente não tem Dashboard, então entra direto em Produtos
  const usuario = usuarioLogado();
  const paginaInicial = (usuario && usuario.role === 'DOCENTE') ? 'produtos' : 'dashboard';
  mostrarPagina(paginaInicial);

  // Inicia o monitoramento de novas solicitações (se for Diretor)
  iniciarNotificacoesSolicitacoes();
}

// Ao carregar a página, verifica se já tem sessão
window.addEventListener('load', function () {
  const usuario = localStorage.getItem('usuario');
  const token = localStorage.getItem('token');

  if (usuario && token) {
    mostrarApp();
  }
  // Se não tiver sessão, a tela de login já está visível por padrão
});