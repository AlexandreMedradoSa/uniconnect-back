const express = require('express');
const dotenv = require('dotenv');
const authController = require('./authController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rotas de Autenticação
app.post('/api/register', authController.register);
app.post('/api/login', authController.login);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
