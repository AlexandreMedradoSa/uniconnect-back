const express = require('express');
const dotenv = require('dotenv');
const authController = require('./authController');
const { verifyToken, optionalAuth } = require('./authMiddleware');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login, tente novamente em um minuto.',
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas de Autenticação
app.post('/api/register', authController.register);
app.post('/api/login', limiter, authController.login);
app.post('/api/logout', verifyToken, authController.logout);

// Rotas de Perfil do Usuário
app.put('/api/profile', verifyToken, authController.updateProfile);
app.put('/api/users/:id/senha', verifyToken, authController.updateSenha);
app.get('/api/users/search', verifyToken, authController.searchUsers);
app.get('/api/users/:id', verifyToken, authController.getUserProfile);
app.get('/api/profile', verifyToken, authController.getProfile);
app.get('/api/users', verifyToken, authController.getAllUsers);
app.get(
  '/api/users/:id/grupos',
  verifyToken,
  authController.getGruposDoUsuario,
);
app.get(
  '/api/users/:id/eventos',
  verifyToken,
  authController.getEventosDoUsuario,
);

// Rotas de Interesses
app.get('/api/interesses', verifyToken, authController.getInteresses);
app.post('/api/interesses', verifyToken, authController.addInteresse);
app.put('/api/interesses/:id', verifyToken, authController.updateInteresse);
app.delete('/api/interesses/:id', verifyToken, authController.deleteInteresse);

// Rotas de Cursos
app.get('/api/cursos', verifyToken, authController.getCursos);
app.post('/api/cursos', verifyToken, authController.addCurso);
app.put('/api/cursos/:id', verifyToken, authController.updateCurso);
app.delete('/api/cursos/:id', verifyToken, authController.deleteCurso);

// Rotas de Grupos de Estudo
app.get('/api/grupos', optionalAuth, authController.getGruposEstudo);
app.post('/api/grupos', verifyToken, authController.createGrupoEstudo);
app.put('/api/grupos/:id', verifyToken, authController.updateGrupoEstudo);
app.delete('/api/grupos/:id', verifyToken, authController.deleteGrupoEstudo);
app.get('/api/grupos/search', verifyToken, authController.searchGruposEstudo);
app.put('/api/grupos/:id/arquivar', verifyToken, authController.arquivarGrupo);
app.get('/api/grupos/:grupoId/notas', verifyToken, authController.getNotas);
app.put('/api/grupos/:grupoId/notas', verifyToken, authController.updateNotas);
app.get(
  '/api/grupos/:grupoId/objetivos',
  verifyToken,
  authController.getObjetivos,
);
app.post(
  '/api/grupos/:grupoId/objetivos',
  verifyToken,
  authController.addObjetivo,
);
app.post(
  '/api/grupos/:grupo_id/avaliacao',
  verifyToken,
  authController.enviarAvaliacaoGrupo,
);
app.post(
  '/api/grupos/:grupoId/objetivos',
  verifyToken,
  authController.addObjetivo,
);
app.get(
  '/api/grupos/:grupoId/objetivos',
  verifyToken,
  authController.getObjetivos,
);
app.put(
  '/api/objetivos/:objetivoId/status',
  verifyToken,
  authController.updateObjetivoStatus,
);
app.delete(
  '/api/objetivos/:objetivoId',
  verifyToken,
  authController.deleteObjetivo,
);

// Rotas para Usuários em Grupos de Estudo
app.get(
  '/api/grupos/:id/usuarios',
  verifyToken,
  authController.getUsuariosGrupoEstudo,
);
app.post(
  '/api/grupos/:id/usuarios',
  verifyToken,
  authController.addUsuarioGrupoEstudo,
);
app.delete(
  '/api/grupos/:id/usuarios/:usuario_id',
  verifyToken,
  authController.removeUsuarioGrupoEstudo,
);
app.put(
  '/api/grupos/:grupo_id/usuarios/:usuario_id/administrador',
  verifyToken,
  authController.definirAdministrador,
);
app.get('/api/grupos/:id', verifyToken, authController.getGrupoById);

// Rotas de Conexões entre Usuários
app.get('/api/users/:id/conexoes', verifyToken, authController.getConexoes);
app.get(
  '/api/users/:id/sugestoes',
  verifyToken,
  authController.getSugestoesConexoes,
);
app.post('/api/users/:id/conexoes', verifyToken, authController.addConexao);
app.delete(
  '/api/users/:id/conexoes',
  verifyToken,
  authController.cancelarSolicitacao,
);
app.put(
  '/api/users/:id/conexoes/aceitar',
  verifyToken,
  authController.aceitarConexao,
);
app.put(
  '/api/users/:id/conexoes/recusar',
  verifyToken,
  authController.recusarConexao,
);
app.delete(
  '/api/users/:amigo_id/conexoes/desfazer',
  verifyToken,
  authController.desfazerConexao,
);
app.put(
  '/api/users/:id/conexoes/bloquear',
  verifyToken,
  authController.bloquearConexao,
);
app.get(
  '/api/users/:id/conexoes/historico',
  verifyToken,
  authController.getHistoricoConexoes,
);
app.get(
  '/api/users/:id/conexoes/pendentes',
  verifyToken,
  authController.getSolicitacoesPendentes,
);
app.get(
  '/api/users/:id/conexoes/enviadas',
  verifyToken,
  authController.getSolicitacoesEnviadas,
);

// Rotas de Eventos Acadêmicos
app.post('/api/eventos', verifyToken, authController.createEvento);
app.get('/api/eventos', optionalAuth, authController.getEventos);
app.put('/api/eventos/:id', verifyToken, authController.updateEvento);
app.delete('/api/eventos/:id', verifyToken, authController.deleteEvento);
app.post(
  '/api/eventos/:id/participar',
  verifyToken,
  authController.participarEvento,
);
app.delete(
  '/api/eventos/:id/participar',
  verifyToken,
  authController.cancelarParticipacao,
);
app.get(
  '/api/eventos/historico',
  verifyToken,
  authController.getHistoricoParticipacao,
);
app.get(
  '/api/eventos/:eventoId/participantes',
  verifyToken,
  authController.getEventoParticipantes,
);

// Rotas de Mensagens
app.get(
  '/api/conexoes/:id/mensagens',
  verifyToken,
  authController.getMensagens,
);

app.post(
  '/api/conexoes/:id/mensagens',
  verifyToken,
  authController.enviarMensagem,
);

// Rotas para Gerenciar Administradores
app.get('/api/admins', verifyToken, authController.getAdmins);
app.post('/api/admins', verifyToken, authController.addAdmin);
app.delete('/api/admins/:id', verifyToken, authController.removeAdmin);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
