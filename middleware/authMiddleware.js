const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token requis' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Erreur de token:", err);  // Afficher l'erreur
      return res.status(403).json({ message: 'Token invalide' });
    }
  
    console.log("Utilisateur décodé:", decoded);  // Afficher le contenu du token
    req.user = decoded;
    next();
  });
  
};

exports.isAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Accès refusé : Admin requis' });
  }
  next();
};
