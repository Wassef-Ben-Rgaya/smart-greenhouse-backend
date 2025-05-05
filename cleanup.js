const mongoose = require('mongoose');

async function removeIsAdmin() {
  try {
    // Connexion à MongoDB avec mongoose
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/serre_intelligente', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connexion réussie à MongoDB avec Mongoose.');

    // Accéder à la collection 'users'
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Suppression du champ `isAdmin`
    const result = await User.updateMany(
      { isAdmin: { $exists: true } },
      { $unset: { isAdmin: "" } }
    );

    console.log(`${result.modifiedCount} utilisateurs mis à jour (champ isAdmin supprimé).`);
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    // Fermer la connexion mongoose après l'exécution
    mongoose.connection.close();
    console.log('Connexion à MongoDB fermée.');
  }
}

removeIsAdmin().catch(console.error);
