const express = require('express');
const router = express.Router();
const Joi = require('joi');
const alertController = require('../controllers/alert.controller');

// Schéma de validation pour la création d'alerte
const createAlertSchema = Joi.object({
  type: Joi.string().required(),
  message: Joi.string().required(),
  status: Joi.string().valid('active', 'resolved').default('active'),
  timestamp: Joi.date().iso().default(() => new Date()),
  plantId: Joi.string().allow(null),
  plantName: Joi.string().default('Inconnu'),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  value: Joi.number().allow(null),
  threshold: Joi.number().allow(null),
  optimalRange: Joi.string().default('N/A'),
  environnementId: Joi.string().allow(null)
});

// Middleware de validation
const validateCreateAlert = (req, res, next) => {
  const { error } = createAlertSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};

// Récupérer toutes les alertes (avec filtres)
router.get('/', async (req, res) => {
  try {
    const alerts = await alertController.getAlerts(req.query);
    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Créer une alerte manuellement
router.post('/', validateCreateAlert, async (req, res) => {
  try {
    const alert = await alertController.createAlert(req.body);
    res.status(201).json(alert);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Données invalides' });
  }
});

// Mettre à jour le statut d'une alerte
router.patch('/:id/status', async (req, res) => {
  try {
    await alertController.updateAlertStatus(req.params.id, req.body.status);
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: 'Alerte non trouvée' });
  }
});

// Supprimer une alerte
router.delete('/:id', async (req, res) => {
  try {
    await alertController.deleteAlert(req.params.id);
    res.json({ message: 'Alerte supprimée' });
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: 'Alerte non trouvée' });
  }
});

// Statistiques des alertes
router.get('/stats', async (req, res) => {
  try {
    const stats = await alertController.getAlertStats();
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;