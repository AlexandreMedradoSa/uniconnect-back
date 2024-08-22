const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const authController = require('./authController');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rotas de Autenticação
app.post('/api/register', authController.register);
app.post('/api/login', authController.login);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
