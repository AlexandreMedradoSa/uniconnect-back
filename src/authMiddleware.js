const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Remove o "Bearer"

  if (!token) {
    return res.status(403).json({ message: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Erro ao verificar o token:', err);
      return res
        .status(401)
        .json({ message: 'Falha na autenticação do token' });
    }

    req.user = decoded; // Decodificar e anexar o usuário à requisição
    next();
  });
};

exports.optionalAuth = (req, res, next) => {
  const token = req.headers['authorization'];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
};
