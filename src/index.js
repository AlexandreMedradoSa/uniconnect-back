const express = require('express');
const dotenv = require('dotenv');
const authController = require('./authController');
const { verifyToken } = require('./authMiddleware');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas de Autenticação
app.post('/api/register', authController.register);
app.post('/api/login', authController.login);

// Rotas de Perfil do Usuário
app.put('/api/profile', verifyToken, authController.updateProfile);
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

// Rotas para Usuários em Grupos de Estudo
app.get('/api/grupos/:id/usuarios', verifyToken, authController.getUsuariosGrupoEstudo);
app.post('/api/grupos/:id/usuarios', verifyToken, authController.addUsuarioGrupoEstudo);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
