const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'd{Dm`Sz)"y_tB3f>M=bVAPK&6/^@.(Q]';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format : "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Stocker les informations de l'utilisateur décodées dans req.user
    next();
  } catch (err) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Token invalide ou expiré' });
  }
};

/**
 * Middleware pour vérifier que l'utilisateur accède à ses propres données
 */
const checkUserAccess = (req, res, next) => {
  const userIdFromToken = req.user.userId;
  const userIdFromParams = req.params.id;

  if (userIdFromToken !== userIdFromParams) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Accès non autorisé' });
  }

  next();
};

module.exports = { authenticateToken, checkUserAccess };