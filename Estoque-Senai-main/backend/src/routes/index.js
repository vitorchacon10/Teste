import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { listUsers, promoteUser } from '../controllers/userController.js';
import { auth, allowRoles } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { createProduct, dashboard, deleteProduct, getProductByBarcode, listProducts, moveStock, updateProduct } from '../controllers/productController.js';
import { createDelivery } from '../controllers/deliveryController.js';
import { approveSolicitacao, createSolicitacao, listSolicitacoes, rejectSolicitacao } from '../controllers/solicitacaoController.js';
import { deliveries, exportProductsExcel, exportProductsPdf, movements, reportCritical } from '../controllers/reportController.js';

const routes = Router();

// --- Autenticação ---
// Cadastro é público: qualquer um pode criar conta, mas sempre entra como DOCENTE.
routes.post('/auth/register', register);
routes.post('/auth/login', login);

// --- Gerenciamento de usuários/papéis (só Diretor) ---
routes.get('/users', auth, allowRoles('DIRETOR'), listUsers);
routes.put('/users/:id/role', auth, allowRoles('DIRETOR'), promoteUser);

// --- Dashboard e produtos ---
routes.get('/dashboard', auth, dashboard);
routes.get('/products', auth, listProducts);
routes.get('/products/barcode/:barcode', auth, getProductByBarcode);

// Adicionar/editar produto: Coordenador e Diretor
routes.post('/products', auth, allowRoles('COORDENADOR', 'DIRETOR'), upload.single('photo'), createProduct);
routes.put('/products/:id', auth, allowRoles('COORDENADOR', 'DIRETOR'), upload.single('photo'), updateProduct);

// Excluir produto: só Diretor
routes.delete('/products/:id', auth, allowRoles('DIRETOR'), deleteProduct);

// Entrada de estoque (scanner): Coordenador e Diretor podem dar entrada.
// (Retirada direta continua exclusiva do Diretor — feita via moveStock com type=SAIDA)
routes.post('/stock/move', auth, allowRoles('COORDENADOR', 'DIRETOR'), moveStock);
routes.post('/deliveries', auth, allowRoles('DIRETOR'), createDelivery);

// --- Solicitações de retirada ---
// Docente, Coordenador e Diretor podem solicitar
routes.post('/solicitacoes', auth, allowRoles('DOCENTE', 'COORDENADOR', 'DIRETOR'), createSolicitacao);
// Cada um vê as próprias; Diretor vê todas (checado dentro do controller)
routes.get('/solicitacoes', auth, listSolicitacoes);
// Só Diretor aprova/rejeita
routes.put('/solicitacoes/:id/aprovar', auth, allowRoles('DIRETOR'), approveSolicitacao);
routes.put('/solicitacoes/:id/rejeitar', auth, allowRoles('DIRETOR'), rejectSolicitacao);

// --- Relatórios ---
routes.get('/reports/excel', auth, exportProductsExcel);
routes.get('/reports/pdf', auth, exportProductsPdf);
routes.get('/reports/critical', auth, reportCritical);
routes.get('/reports/movements', auth, movements);
routes.get('/reports/deliveries', auth, deliveries);

export default routes;