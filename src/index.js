const express = require('express');
const dotenv = require('dotenv');
const authController = require('./authController');
const { verifyToken } = require('./authMiddleware');
const cors = require('cors')

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors())
app.use(express.json());

app.post('/api/register', authController.register);
app.post('/api/login', authController.login);

app.put('/api/profile', verifyToken, authController.updateProfile);

app.get('/api/interesses', verifyToken, authController.getInteresses);
app.post('/api/interesses', verifyToken, authController.addInteresse);
app.put('/api/interesses/:id', verifyToken, authController.updateInteresse);
app.delete('/api/interesses/:id', verifyToken, authController.deleteInteresse);

app.get('/api/cursos', verifyToken, authController.getCursos);
app.post('/api/cursos', verifyToken, authController.addCurso);
app.put('/api/cursos/:id', verifyToken, authController.updateCurso);
app.delete('/api/cursos/:id', verifyToken, authController.deleteCurso);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});