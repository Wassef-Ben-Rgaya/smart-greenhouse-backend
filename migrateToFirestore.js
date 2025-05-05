const mongoose = require('mongoose');
const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-key.json');
const Plant = require('./models/Plant');
const Culture = require('./models/Culture');
const Environnement = require('./models/Environnement');
const User = require('./models/User'); // si tu as un modèle User

// Init Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const firestore = admin.firestore();

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/serre_intelligente')
  .then(() => console.log("✅ Connexion à MongoDB réussie"))
  .catch((err) => console.error("❌ Erreur de connexion à MongoDB", err));
async function migrate() {
    try {
      // 🔁 Migrer les plantes
      // 🔁 Migrer les utilisateurs
    const users = await User.find();
    for (const user of users) {
      const userObj = user.toObject();
      delete userObj.password; // Pour ne pas stocker les mots de passe

      await firestore.collection('users').doc(user._id.toString()).set({
        username: userObj.username,
        email: userObj.email,
        role: userObj.role,
        firstName: userObj.firstName,
        lastName: userObj.lastName,
        gender: userObj.gender,
        birthDate: userObj.birthDate,
        phoneNumber: userObj.phoneNumber,
        address: userObj.address,
        city: userObj.city,
        country: userObj.country,
        postalCode: userObj.postalCode,
      });
    }
      
  
      console.log('✅ Migration terminée avec succès !');
      process.exit(0);
    } catch (err) {
      console.error('❌ Erreur pendant la migration :', err);
      process.exit(1);
    }
}

migrate();
