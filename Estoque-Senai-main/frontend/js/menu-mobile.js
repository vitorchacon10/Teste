// js/menu-mobile.js
// Controla o menu "hambúrguer" que aparece em telas pequenas (celular).
// Não interfere na navegação entre páginas — isso continua sendo
// controlado pelo app.js normalmente.

document.addEventListener('DOMContentLoaded', function () {
  const btnMenu = document.getElementById('btn-menu-mobile');
  const menu = document.querySelector('.menu');

  if (!btnMenu || !menu) return;

  btnMenu.addEventListener('click', function () {
    menu.classList.toggle('aberto');
  });

  // Fecha o menu automaticamente depois de escolher uma página,
  // pra não ficar aberto cobrindo a tela.
  menu.querySelectorAll('.menu-link').forEach(function (link) {
    link.addEventListener('click', function () {
      menu.classList.remove('aberto');
    });
  });
});