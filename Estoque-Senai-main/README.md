<<<<<<< HEAD
# SENAI Zerbini – Sistema de Controle de Estoque
**Projeto escolar – 3º Ano | Desenvolvimento de Sistemas**

---

## Descrição
Sistema web para controle de estoque do SENAI Zerbini.  
Permite cadastrar produtos, registrar entradas e saídas, controlar entregas e gerar relatórios.

---

## Tecnologias utilizadas

**Frontend**
- HTML5
- CSS3
- JavaScript puro (sem frameworks)
- Chart.js (gráficos)
- Html5-QrCode (leitor de código de barras)

**Backend**
- Node.js
- Express
- SQLite (banco de dados)
- Sequelize (ORM)
- Socket.IO (atualizações em tempo real)
- JWT (autenticação)

---

## Como executar

### 1. Backend

```bash
cd backend
npm install
node src/server.js
```

O servidor vai rodar em **http://localhost:3333**

### 2. Frontend

Abra o arquivo `frontend/index.html` diretamente no navegador.  
Ou use uma extensão como **Live Server** no VS Code.

---

## Login padrão

| Campo | Valor |
|-------|-------|
| E-mail | admin@senai.com |
| Senha | 123456 |

---

## Funcionalidades

- Login com autenticação JWT
- Dashboard com gráfico de indicadores
- Cadastro, edição e exclusão de produtos
- Upload de foto do produto
- Scanner de código de barras (câmera ou manual)
- Controle de entregas de material
- Relatórios: vencidos, vencendo e estoque baixo
- Exportação para Excel e PDF

---

## Estrutura de pastas

```
projeto/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   └── routes/
│   └── package.json
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── api.js
    │   ├── auth.js
    │   ├── dashboard.js
    │   ├── produtos.js
    │   ├── scanner.js
    │   ├── entregas.js
    │   ├── relatorios.js
    │   └── app.js
    └── index.html
```
=======
# Estoque-Senai
Este projeto tem como objetivo desenvolver uma aplicação completa para gerenciamento de estoque, substituindo o controle manual realizado por planilhas.
>>>>>>> 52a8faf9c676c180d3c32132b91d33c5c3ac5f8c
