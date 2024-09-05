const express = require('express');
const dotenv = require('dotenv');
const authController = require('./authController');
const { verifyToken } = require('./authMiddleware');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/register', authController.register);
app.post('/api/login', authController.login);

app.put('/api/profile', verifyToken, authController.updateProfile);
app.get('/api/interesses', verifyToken, authController.getInteresses);
app.get('/api/cursos', verifyToken, authController.getCursos);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});