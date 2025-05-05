const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/firebase');


module.exports = {
  async login(req, res) {
    
    console.log('[LOGIN] Début de la requête - Body:', req.body);
    
    try {
      const { email, password } = req.body;
      console.log('[LOGIN] Email reçu:', email);
  
      if (!email || !password) {
        console.log('[LOGIN] Champs manquants');
        return res.status(400).json({ error: "VALIDATION_ERROR" });
      }
  
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[LOGIN] Email normalisé:', normalizedEmail);
  
      // Log Firestore query
      console.log('[LOGIN] Requête Firestore en cours...');
      const snapshot = await db.collection("users")
                            .where("email", "==", normalizedEmail)
                            .limit(1)
                            .get();
      console.log('[LOGIN] Résultats Firestore:', snapshot.size, 'utilisateur(s) trouvé(s)');
  
      if (snapshot.empty) {
        console.log('[LOGIN] Aucun utilisateur trouvé');
        return res.status(404).json({ error: "USER_NOT_FOUND" });
      }
  
      const userDoc = snapshot.docs[0];
      console.log('[LOGIN] Utilisateur trouvé. ID:', userDoc.id);
  
      const userData = userDoc.data();
      console.log('[LOGIN] Données utilisateur:', { 
        email: userData.email, 
        hasPassword: !!userData.password 
      });
  
      // Vérification BCrypt
      console.log('[LOGIN] Comparaison du mot de passe...');
      const passwordMatch = await bcrypt.compare(password, userData.password);
      console.log('[LOGIN] Résultat comparaison:', passwordMatch);
  
      if (!passwordMatch) {
        console.log('[LOGIN] Mot de passe incorrect');
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }
  
      // Vérification JWT_SECRET
      if (!process.env.JWT_SECRET) {
        console.error('[LOGIN] ERREUR CRITIQUE: JWT_SECRET non défini');
        throw new Error('JWT_SECRET manquant');
      }
  
      console.log('[LOGIN] Génération du token JWT...');
      const token = jwt.sign(
        { userId: userDoc.id },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      const { password: _unusedPassword, ...safeUserData } = userData;
      console.log('[LOGIN] Connexion réussie');
      return res.status(200).json({ 
        token,
        user: {
          id: userDoc.id,
          ...safeUserData
        }
      });
      
  
    } catch (error) {
      console.error('[LOGIN] ERREUR:', {
        message: error.message,
        stack: error.stack,
        body: req.body
      });
      return res.status(500).json({ 
        error: "SERVER_ERROR",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }
};