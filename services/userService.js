const admin = require('firebase-admin');
const db = admin.firestore();

// Fonction pour créer un utilisateur
async function createUser(userObj) {
  try {
    const userRef = db.collection('users').doc(); // Génère un ID aléatoire
    await userRef.set({
      username: userObj.username,
      email: userObj.email,
      password: userObj.password,  // ⚠️ Ne pas oublier de hasher avec bcrypt
      role: userObj.role || 'utilisateur',
      firstName: userObj.firstName,
      lastName: userObj.lastName,
      gender: userObj.gender,
      birthDate: userObj.birthDate,
      phoneNumber: userObj.phoneNumber,
      address: userObj.address,
      city: userObj.city,
      country: userObj.country || 'Tunisie',
      postalCode: userObj.postalCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    console.error('❌ Erreur dans le service userService > createUser :', err.message);
    throw err;
  }
}

module.exports = { createUser };
