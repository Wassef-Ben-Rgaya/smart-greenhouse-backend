const admin = require('firebase-admin');
const db = require('../config/firebase'); // ✅

// Fonction pour créer une nouvelle plante
async function createPlant(plantObj) {
  const plantRef = db.collection('plants').doc();
  await plantRef.set({
    nom: plantObj.nom,
    nomScientifique: plantObj.nomScientifique || '',
    zone: plantObj.zone || 'Zone A',
    cultures: plantObj.cultures || [],
    environnements: plantObj.environnements || [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const plantId = plantRef.id;

  // Mise à jour des cultures
  if (plantObj.cultures) {
    for (const cultureId of plantObj.cultures) {
      await db.collection('cultures').doc(cultureId).update({
        planteId: plantId
      });
    }
  }

  // Mise à jour des environnements
  if (plantObj.environnements) {
    for (const envId of plantObj.environnements) {
      await db.collection('environnements').doc(envId).update({
        planteId: plantId
      });
    }
  }

  return plantId;
}

// Fonction pour récupérer toutes les plantes
async function getPlants() {
  const snapshot = await db.collection('plants').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Fonction pour récupérer une plante par son ID
async function getPlantById(plantId) {
  const plantDoc = await db.collection('plants').doc(plantId).get();
  if (plantDoc.exists) {
    return { id: plantDoc.id, ...plantDoc.data() };
  } else {
    return null;
  }
}

// Fonction pour ajouter une culture à une plante
async function addCultureToPlant(plantId, cultureId) {
  const plantRef = db.collection('plants').doc(plantId);
  const plantDoc = await plantRef.get();
  if (plantDoc.exists) {
    const plantData = plantDoc.data();
    const updatedCultures = [...new Set([...plantData.cultures, cultureId])];
    await plantRef.update({ cultures: updatedCultures });

    // Mise à jour de la culture pour lier la plante
    await db.collection('cultures').doc(cultureId).update({
      planteId: plantId
    });
  }
}

// Fonction pour ajouter un environnement à une plante
async function addEnvironmentToPlant(plantId, environmentId) {
  const plantRef = db.collection('plants').doc(plantId);
  const plantDoc = await plantRef.get();
  if (plantDoc.exists) {
    const plantData = plantDoc.data();
    const updatedEnvironments = [...new Set([...plantData.environnements, environmentId])];
    await plantRef.update({ environnements: updatedEnvironments });

    // Mise à jour de l'environnement pour lier la plante
    await db.collection('environnements').doc(environmentId).update({
      planteId: plantId
    });
  }
}

// Fonction pour supprimer une plante
async function deletePlant(plantId) {
  const plantRef = db.collection('plants').doc(plantId);
  await plantRef.delete();

  // Supprimer les relations
  await db.collection('cultures').where('planteId', '==', plantId).get().then(snapshot => {
    snapshot.forEach(doc => {
      doc.ref.update({ planteId: admin.firestore.FieldValue.delete() });
    });
  });

  await db.collection('environnements').where('planteId', '==', plantId).get().then(snapshot => {
    snapshot.forEach(doc => {
      doc.ref.update({ planteId: admin.firestore.FieldValue.delete() });
    });
  });
}

// Fonction pour mettre à jour une plante
async function updatePlant(plantId, plantObj) {
  const plantRef = db.collection('plants').doc(plantId);
  const plantDoc = await plantRef.get();

  if (plantDoc.exists) {
    const plantData = plantDoc.data();

    const updatedData = {
      nom: plantObj.nom || plantData.nom,
      nomScientifique: plantObj.nomScientifique || plantData.nomScientifique,
      zone: plantObj.zone || plantData.zone,
      cultures: plantObj.cultures || plantData.cultures,
      environnements: plantObj.environnements || plantData.environnements,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await plantRef.update(updatedData);

    // Mise à jour des cultures
    if (plantObj.cultures) {
      for (const cultureId of plantObj.cultures) {
        await db.collection('cultures').doc(cultureId).update({
          planteId: plantId
        });
      }
    }

    // Mise à jour des environnements
    if (plantObj.environnements) {
      for (const envId of plantObj.environnements) {
        await db.collection('environnements').doc(envId).update({
          planteId: plantId
        });
      }
    }
  }
}

module.exports = {
  createPlant,
  getPlants,
  getPlantById,
  addCultureToPlant,
  addEnvironmentToPlant,
  deletePlant,
  updatePlant
};
