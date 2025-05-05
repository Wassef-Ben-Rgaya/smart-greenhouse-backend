const admin = require('firebase-admin');
const db = require('../config/firebase');

const PHASES_POSSIBLES = [
  'Germination',
  'Levée',
  'Développement des feuilles',
  'Croissance des tiges et racines',
  'Montaison',
  'Formation de la tête',
  'Floraison',
  'Pollinisation',
  'Fructification',
  'Maturation',
  'Récolte',
  'Sénescence',
  'Épuisé'
];

function calculerPhaseActuelle(datePlantation, phases) {
  const now = new Date();
  const elapsedDays = Math.floor((now - datePlantation) / (1000 * 60 * 60 * 24));
  let accumulated = 0;
  let currentPhase = 'Épuisé';

  for (const phase of phases) {
    accumulated += phase.duree;
    if (elapsedDays < accumulated) {
      currentPhase = phase.nom;
      break;
    }
  }

  return currentPhase;
}

async function createCulture(cultureObj) {
  try {
    const datePlantation = cultureObj.datePlantation
      ? new Date(cultureObj.datePlantation)
      : new Date();

    const phaseActuelle = calculerPhaseActuelle(datePlantation, cultureObj.phases || []);
    const cultureRef = db.collection('cultures').doc();

    await cultureRef.set({
      plante: cultureObj.plante,
      datePlantation,
      phases: cultureObj.phases || [],
      phaseActuelle,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('plants').doc(cultureObj.plante).update({
      cultures: admin.firestore.FieldValue.arrayUnion(cultureRef.id)
    });

    return cultureRef.id;
  } catch (err) {
    console.error('Erreur lors de la création de la culture :', err);
    throw err;
  }
}

// ✅ Récupérer toutes les cultures d'une plante
async function getCulturesByPlantId(plantId) {
  try {
    const snapshot = await db.collection('cultures').where('plante', '==', plantId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('Erreur lors de la récupération des cultures :', err);
    return [];
  }
}

// ✅ Récupérer une culture par ID et plante
async function getCultureById(plantId, cultureId) {
  try {
    const doc = await db.collection('cultures').doc(cultureId).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (data.plante !== plantId) return null;

    return { id: doc.id, ...data };
  } catch (err) {
    console.error('Erreur lors de la récupération de la culture :', err);
    return null;
  }
}

// ✅ Mettre à jour une culture liée à une plante
async function updateCulture(plantId, cultureId, updateData) {
  try {
    const cultureRef = db.collection('cultures').doc(cultureId);
    const doc = await cultureRef.get();

    if (!doc.exists) return null;

    const data = doc.data();
    if (data.plante !== plantId) return null;

    const newDate = updateData.datePlantation ? new Date(updateData.datePlantation) : data.datePlantation;
    const newPhases = updateData.phases || data.phases;

    const newPhaseActuelle = calculerPhaseActuelle(newDate, newPhases);

    await cultureRef.update({
      ...updateData,
      datePlantation: newDate,
      phaseActuelle: newPhaseActuelle,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await cultureRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la culture :', err);
    throw err;
  }
}

// ✅ Supprimer une culture liée à une plante
async function deleteCulture(plantId, cultureId) {
  try {
    const cultureRef = db.collection('cultures').doc(cultureId);
    const doc = await cultureRef.get();

    if (!doc.exists) return false;
    const data = doc.data();
    if (data.plante !== plantId) return false;

    await db.collection('plants').doc(plantId).update({
      cultures: admin.firestore.FieldValue.arrayRemove(cultureId)
    });

    await cultureRef.delete();
    return true;
  } catch (err) {
    console.error("Erreur lors de la suppression de la culture :", err);
    throw err;
  }
}
async function recalculatePhaseForAllCultures() {
  try {
    const snapshot = await db.collection('cultures').get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      const culture = doc.data();
      const newPhase = calculerPhaseActuelle(
        culture.datePlantation.toDate(), 
        culture.phases
      );
      
      if (culture.phaseActuelle !== newPhase) {
        batch.update(doc.ref, {
          phaseActuelle: newPhase,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    
    await batch.commit();
    return { updated: snapshot.size };
  } catch (err) {
    console.error('Erreur recalcul phases:', err);
    throw err;
  }
}


module.exports = {
  createCulture,
  getCulturesByPlantId,
  getCultureById,
  updateCulture,
  deleteCulture,
  recalculatePhaseForAllCultures
};
