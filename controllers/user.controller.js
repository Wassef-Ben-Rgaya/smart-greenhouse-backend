const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const db = require('../config/firebase');

/**
 * Crée un nouvel utilisateur avec mot de passe hashé
 * @param {Object} userObj - Données utilisateur
 * @returns {Promise<{id: string}|void>}
 */
async function createUser(userObj) {
  try {
    console.log('Body de la requête:', userObj);
    
    if (!userObj.password) {
      console.error('❌ Le mot de passe est manquant !');
      throw new Error('Mot de passe requis');
    }

    console.log('Mot de passe reçu:', userObj.password);

    const hashedPassword = await bcrypt.hash(userObj.password, 10);

    const userRef = db.collection('users').doc();
    await userRef.set({
      username: userObj.username,
      email: userObj.email,
      password: hashedPassword,
      role: userObj.role || 'utilisateur',
      firstName: userObj.firstName || '',
      lastName: userObj.lastName || '',
      gender: userObj.gender || '',
      birthDate: userObj.birthDate || '',
      phoneNumber: userObj.phoneNumber || '',
      address: userObj.address || '',
      city: userObj.city || '',
      country: userObj.country || 'Tunisie',
      postalCode: userObj.postalCode || '',
      profileImageUrl: userObj.profileImageUrl || '', // Ajout du champ pour la photo de profil
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Utilisateur créé avec succès !');
    return { id: userRef.id };
  } catch (err) {
    console.error('❌ Erreur création utilisateur:', err);
    throw err;
  }
}

/**
 * Récupère tous les utilisateurs
 * @returns {Promise<Array<{id: string, ...}>>}
 */
async function getAllUsers() {
  try {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      password: undefined // Ne pas retourner le mot de passe
    }));
  } catch (err) {
    console.error('❌ Erreur récupération utilisateurs:', err);
    throw err;
  }
}

/**
 * Récupère un utilisateur par son ID
 * @param {string} userId 
 * @returns {Promise<{id: string, ...}|null>}
 */
async function getUserById(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    
    return { 
      id: doc.id, 
      ...doc.data(),
      password: undefined // Ne pas retourner le mot de passe
    };
  } catch (err) {
    console.error('❌ Erreur récupération utilisateur:', err);
    throw err;
  }
}

/**
 * Met à jour un utilisateur
 * @param {string} userId 
 * @param {Object} updateData 
 * @returns {Promise<void>}
 */
async function updateUser(userId, updateData) {
  try {
    const updateObj = { ...updateData };
    
    if (updateObj.password) {
      updateObj.password = await bcrypt.hash(updateObj.password, 10);
    }

    updateObj.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('users').doc(userId).update(updateObj);
    console.log('✅ Utilisateur mis à jour avec succès !');
  } catch (err) {
    console.error('❌ Erreur mise à jour utilisateur:', err);
    throw err;
  }
}

/**
 * Supprime un utilisateur
 * @param {string} userId 
 * @returns {Promise<void>}
 */
async function deleteUser(userId) {
  try {
    await db.collection('users').doc(userId).delete();
    console.log('🗑️ Utilisateur supprimé avec succès !');
  } catch (err) {
    console.error('❌ Erreur suppression utilisateur:', err);
    throw err;
  }
}

/**
 * Gère l'upload de la photo de profil et met à jour l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} filePath - Chemin du fichier uploadé
 * @returns {Promise<string>} - URL de la photo de profil
 */
async function uploadProfilePicture(userId, filePath) {
  try {
    // Vérifier si l'utilisateur existe
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('Utilisateur non trouvé');
    }

    // Construire l'URL de la photo de profil
    const profilePictureUrl = `/uploads/profile-pictures/${filePath.split('/').pop()}`;

    // Mettre à jour l'utilisateur avec l'URL de la photo de profil
    await db.collection('users').doc(userId).update({
      profileImageUrl: profilePictureUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Photo de profil mise à jour avec succès !');
    return profilePictureUrl;
  } catch (err) {
    console.error('❌ Erreur lors de la mise à jour de la photo de profil:', err);
    throw err;
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfilePicture, // Nouvelle méthode exportée
};