
const express = require('express');
const router = express.Router();
const environnementController = require('../controllers/environnement.controller');

// Créer un environnement pour une plante
router.post('/:plantId/environnements',environnementController.createEnvironnement);

// Mettre à jour un environnement
router.put('/:plantId/environnements/:environnementId',environnementController.updateEnvironnement);

// Récupérer l'environnement d'une plante
router.get('/:plantId/environnements', environnementController.getEnvironnementByPlant);

// Récupérer un environnement par son ID
router.get('/environnements/:environnementId',environnementController.getEnvironnementById);

// Supprimer un environnement
router.delete('/:plantId/environnements/:environnementId',environnementController.deleteEnvironnement);

module.exports = router;