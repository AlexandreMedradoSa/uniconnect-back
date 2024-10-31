const express = require('express');
const dotenv = require('dotenv');
const authController = require('./authController');
const { verifyToken } = require('./authMiddleware');
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
app.get('/api/users/:id', verifyToken, authController.getUserProfile);

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
app.get('/api/grupos', verifyToken, authController.getGruposEstudo);
app.post('/api/grupos', verifyToken, authController.createGrupoEstudo);
app.put('/api/grupos/:id', verifyToken, authController.updateGrupoEstudo);
app.delete('/api/grupos/:id', verifyToken, authController.deleteGrupoEstudo);
app.get('/api/grupos/search', verifyToken, authController.searchGruposEstudo);

// Rotas para Usuários em Grupos de Estudo
app.get('/api/grupos/:id/usuarios', verifyToken, authController.getUsuariosGrupoEstudo);
app.post('/api/grupos/:id/usuarios', verifyToken, authController.addUsuarioGrupoEstudo);
app.delete('/api/grupos/:id/usuarios', verifyToken, authController.removeUsuarioGrupoEstudo);

// Rotas de Conexões entre Usuários
app.get('/api/users/:id/conexoes', verifyToken, authController.getConexoes);
app.post('/api/users/:id/conexoes', verifyToken, authController.addConexao);
app.put('/api/users/:id/conexoes/aceitar', verifyToken, authController.aceitarConexao);
app.put('/api/users/:id/conexoes/recusar', verifyToken, authController.recusarConexao);
app.put('/api/users/:id/conexoes/bloquear', verifyToken, authController.bloquearConexao);
app.get('/api/users/:id/conexoes/historico', verifyToken, authController.getHistoricoConexoes);

// Rotas de Eventos Acadêmicos
app.post('/api/eventos', verifyToken, authController.createEvento);
app.get('/api/eventos', verifyToken, authController.getEventos);
app.post('/api/eventos/:id/participar', verifyToken, authController.participarEvento);
app.delete('/api/eventos/:id/participar', verifyToken, authController.cancelarParticipacao);
app.get('/api/eventos/historico', verifyToken, authController.getHistoricoParticipacao);



app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
