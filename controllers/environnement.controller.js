const admin = require('firebase-admin');
const db = require('../config/firebase');

// Créer un environnement pour une plante
async function createEnvironnement(req, res) {
  try {
    const { plantId } = req.params;
    const environnementData = req.body;

    // Vérifier si la plante existe
    const plantRef = db.collection('plants').doc(plantId);
    const plantDoc = await plantRef.get();
    
    if (!plantDoc.exists) {
      return res.status(404).json({ message: 'Plante non trouvée' });
    }

    // Vérifier si un environnement existe déjà
    if (plantDoc.data().environnementId) {
      return res.status(400).json({ message: 'Un environnement existe déjà pour cette plante' });
    }

    const envRef = db.collection('environnements').doc();
    
    await envRef.set({
      ...environnementData,
      plantId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Lier l'environnement à la plante
    await plantRef.update({
      environnementId: envRef.id
    });

    res.status(201).json({ 
      message: 'Environnement créé avec succès',
      environnementId: envRef.id
    });

  } catch (err) {
    console.error('Erreur création environnement:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la création', 
      error: err.message 
    });
  }
}

// Mettre à jour un environnement
async function updateEnvironnement(req, res) {
  try {
    const { plantId, environnementId } = req.params;
    const updateData = req.body;

    // Vérifier que l'environnement appartient bien à la plante
    const plantDoc = await db.collection('plants').doc(plantId).get();
    if (!plantDoc.exists || plantDoc.data().environnementId !== environnementId) {
      return res.status(404).json({ message: 'Environnement non trouvé pour cette plante' });
    }

    const envRef = db.collection('environnements').doc(environnementId);
    
    await envRef.update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ 
      message: 'Environnement mis à jour avec succès',
      environnementId
    });

  } catch (err) {
    console.error('Erreur mise à jour environnement:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour', 
      error: err.message 
    });
  }
}

// Récupérer l'environnement d'une plante
async function getEnvironnementByPlant(req, res) {
  try {
    const { plantId } = req.params;
    const plantDoc = await db.collection('plants').doc(plantId).get();

    if (!plantDoc.exists) {
      return res.status(404).json({ message: 'Plante non trouvée' });
    }

    const envId = plantDoc.data().environnementId;
    if (!envId) {
      return res.status(404).json({ message: 'Aucun environnement trouvé pour cette plante' });
    }

    const envDoc = await db.collection('environnements').doc(envId).get();
    
    res.status(200).json({ 
      id: envDoc.id,
      ...envDoc.data() 
    });

  } catch (err) {
    console.error('Erreur récupération environnement:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération', 
      error: err.message 
    });
  }
}

// Récupérer un environnement par son ID direct
async function getEnvironnementById(req, res) {
  try {
    const { environnementId } = req.params;
    const envDoc = await db.collection('environnements').doc(environnementId).get();

    if (!envDoc.exists) {
      return res.status(404).json({ message: 'Environnement non trouvé' });
    }

    res.status(200).json({
      id: envDoc.id,
      ...envDoc.data()
    });

  } catch (err) {
    console.error('Erreur récupération environnement:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération',
      error: err.message
    });
  }
}

// Supprimer un environnement
async function deleteEnvironnement(req, res) {
  try {
    const { plantId, environnementId } = req.params;

    // Vérifier que l'environnement appartient bien à la plante
    const plantDoc = await db.collection('plants').doc(plantId).get();
    if (!plantDoc.exists || plantDoc.data().environnementId !== environnementId) {
      return res.status(404).json({ message: 'Environnement non trouvé pour cette plante' });
    }

    // Supprimer la référence dans la plante
    await db.collection('plants').doc(plantId).update({
      environnementId: admin.firestore.FieldValue.delete()
    });

    // Supprimer l'environnement
    await db.collection('environnements').doc(environnementId).delete();

    res.status(200).json({ 
      message: 'Environnement supprimé avec succès'
    });

  } catch (err) {
    console.error('Erreur suppression environnement:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression', 
      error: err.message 
    });
  }
}

module.exports = {
  createEnvironnement,
  updateEnvironnement,
  getEnvironnementByPlant,
  getEnvironnementById,
  deleteEnvironnement
};