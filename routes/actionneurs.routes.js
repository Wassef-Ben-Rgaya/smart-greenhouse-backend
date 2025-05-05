const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Fonction pour enregistrer les commandes manuelles dans serre_commandes_manuelles
const logManualCommand = async (name, value) => {
  const now = new Date().toISOString();
  try {
    await admin.database().ref('serre_commandes_manuelles').push({
      actionneur: name,
      value: value,
      timestamp: now,
    });
    console.log(`Commande manuelle enregistrée : ${name} = ${value} à ${now}`);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la commande manuelle:', error);
    throw error;
  }
};

// Endpoint pour mettre à jour un actionneur
router.post('/update', async (req, res) => {
  const { name, value } = req.body;

  if (!name || typeof value !== 'boolean') {
    return res.status(400).json({ message: 'Paramètres invalides' });
  }

  try {
    // Mise à jour de l'actionneur dans serre_actionneurs
    await admin.database().ref('serre_actionneurs').update({ [name]: value });
    
    // Enregistrement de la commande manuelle dans serre_commandes_manuelles
    await logManualCommand(name, value);

    return res.status(200).json({ message: `Actionneur ${name} mis à jour`, value });
  } catch (error) {
    console.error('Erreur de mise à jour des actionneurs:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
  }
});

// Endpoint pour lire tous les actionneurs
router.get('/get', async (req, res) => {
  try {
    const snapshot = await admin.database().ref('serre_actionneurs').once('value');
    const actionneurs = snapshot.val();
    return res.status(200).json(actionneurs);
  } catch (error) {
    console.error('Erreur de lecture des actionneurs:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur', error: error.message });
  }
});

module.exports = router;