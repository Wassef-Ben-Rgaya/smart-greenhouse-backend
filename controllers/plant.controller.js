const db = require('../config/firebase'); // ✅
const plantModel = require('../models/Plant');

// Fonction pour créer une plante
async function createPlant(req, res) {
  try {
    const plantObj = req.body;
    const plantId = await plantModel.createPlant(plantObj);
    res.status(201).json({ id: plantId, message: 'Plante créée avec succès' });
  } catch (err) {
    console.error('Erreur lors de la création de la plante :', err);
    res.status(500).json({ message: 'Erreur lors de la création de la plante' });
  }
}

// Fonction pour récupérer toutes les plantes
async function getPlants(req, res) {
  try {
    const plants = await plantModel.getPlants();
    res.status(200).json(plants);
  } catch (err) {
    console.error('Erreur lors de la récupération des plantes :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des plantes' });
  }
}

// Fonction pour récupérer une plante par son ID
async function getPlantById(req, res) {
  try {
    const plantId = req.params.id;
    const plant = await plantModel.getPlantById(plantId);
    if (plant) {
      res.status(200).json(plant);
    } else {
      res.status(404).json({ message: 'Plante non trouvée' });
    }
  } catch (err) {
    console.error('Erreur lors de la récupération de la plante :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de la plante' });
  }
}

// Fonction pour ajouter une culture à une plante
async function addCultureToPlant(req, res) {
  try {
    const { plantId, cultureId } = req.body;
    await plantModel.addCultureToPlant(plantId, cultureId);
    res.status(200).json({ message: 'Culture ajoutée à la plante avec succès' });
  } catch (err) {
    console.error('Erreur lors de l\'ajout de culture à la plante :', err);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de culture à la plante' });
  }
}

// Fonction pour ajouter un environnement à une plante
async function addEnvironmentToPlant(req, res) {
  try {
    const { plantId, environmentId } = req.body;
    await plantModel.addEnvironmentToPlant(plantId, environmentId);
    res.status(200).json({ message: 'Environnement ajouté à la plante avec succès' });
  } catch (err) {
    console.error('Erreur lors de l\'ajout d\'environnement à la plante :', err);
    res.status(500).json({ message: 'Erreur lors de l\'ajout d\'environnement à la plante' });
  }
}

// Fonction pour supprimer une plante
async function deletePlant(req, res) {
  try {
    const plantId = req.params.id;
    await plantModel.deletePlant(plantId);
    res.status(200).json({ message: 'Plante supprimée avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression de la plante :', err);
    res.status(500).json({ message: 'Erreur lors de la suppression de la plante' });
  }
}

// Fonction pour mettre à jour une plante
async function updatePlant(req, res) {
  try {
    const plantId = req.params.id;
    const plantObj = req.body;
    await plantModel.updatePlant(plantId, plantObj);
    res.status(200).json({ message: 'Plante mise à jour avec succès' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la plante :', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la plante' });
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
