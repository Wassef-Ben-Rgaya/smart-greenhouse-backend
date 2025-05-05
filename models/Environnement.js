const admin = require('firebase-admin');
const db = require('../config/firebase'); // ✅

// Fonction pour créer un environnement lié à une plante
async function createEnvironnement(environnementObj) {
  try {
    const envRef = db.collection('environnements').doc();

    // Création de l'environnement
    await envRef.set({
      plante: environnementObj.plante, // ID de la plante
      temperature: {
        min: environnementObj.temperature?.min || null,
        max: environnementObj.temperature?.max || null
      },
      humidite: {
        air: {
          min: environnementObj.humidite?.air?.min || null,
          max: environnementObj.humidite?.air?.max || null
        },
        sol: environnementObj.humidite?.sol
      },
      lumiere: {
        duree: environnementObj.lumiere?.duree || null,
        type: environnementObj.lumiere?.type || null,
        optimalRange: {
          start: environnementObj.lumiere?.optimalRange?.start || 7,
          end: environnementObj.lumiere?.optimalRange?.end || 19
        }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Mise à jour automatique de la plante liée
    const plantRef = db.collection('plants').doc(environnementObj.plante);
    await plantRef.update({
      environnements: admin.firestore.FieldValue.arrayUnion(envRef.id)
    });

    console.log('Environnement créé et lié à la plante avec succès !');
  } catch (err) {
    console.error('Erreur lors de la création de l\'environnement :', err);
  }
}

// Fonction pour récupérer tous les environnements
async function getEnvironnements() {
  try {
    const snapshot = await db.collection('environnements').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('Erreur lors de la récupération des environnements :', err);
    return [];
  }
}

// Fonction pour récupérer un environnement par ID
async function getEnvironnementById(id) {
  try {
    const doc = await db.collection('environnements').doc(id).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };
    else return null;
  } catch (err) {
    console.error('Erreur lors de la récupération :', err);
    return null;
  }
}

// Fonction pour supprimer un environnement et mettre à jour la plante liée
async function deleteEnvironnement(id) {
  try {
    const docRef = db.collection('environnements').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log("Environnement non trouvé");
      return;
    }

    const environnementData = doc.data();
    const planteId = environnementData.plante;

    // Supprimer la référence de la plante
    await db.collection('plants').doc(planteId).update({
      environnements: admin.firestore.FieldValue.arrayRemove(id)
    });

    // Supprimer l'environnement
    await docRef.delete();

    console.log("Environnement supprimé avec succès !");
  } catch (err) {
    console.error("Erreur lors de la suppression de l'environnement :", err);
  }
}

module.exports = {
  createEnvironnement,
  getEnvironnements,
  getEnvironnementById,
  deleteEnvironnement
};
