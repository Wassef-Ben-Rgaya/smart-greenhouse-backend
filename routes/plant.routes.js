const express = require('express');
const router = express.Router();
const plantController = require('../controllers/plant.controller'); // .controller au lieu de Controller
const { getCultureById } = require('../controllers/culture.controller');

// Vérification que les méthodes existent
console.log('Methods in plantController:', {
  createPlant: typeof plantController.createPlant,
  getPlants: typeof plantController.getPlants,
  getCultureById : typeof plantController.getPlantById,
  // ... autres méthodes
});

// CRUD de base pour les plantes
router.post('/', plantController.createPlant);
router.get('/', plantController.getPlants);
router.get('/:id', plantController.getPlantById);
router.put('/:id', plantController.updatePlant);
router.delete('/:id', plantController.deletePlant);

module.exports = router;