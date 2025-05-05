const express = require('express');
const router = express.Router();
const db = require('../config/firebaseRealtime');
const KPIController = require('../controllers/kpi.controller');

const kpiController = new KPIController(db);

// Récupérer les KPI agrégés
router.get('/', kpiController.getKPIs);

// Récupérer l'historique des KPIs
router.get('/history', async (req, res) => {
  try {
    const snapshot = await db.ref('kpis/history').once('value');
    res.status(200).json(snapshot.val() || {});
  } catch (error) {
    console.error('Error fetching KPI history:', error.message);
    res.status(500).json({ error: 'Failed to fetch KPI history', details: error.message });
  }
});

// Calculer et mettre à jour les KPI (pour tests ou déclenchement manuel)
router.post('/calculate', kpiController.calculateKPIs);

// Réinitialiser manuellement les KPIs journaliers
router.post('/reset/daily', async (req, res) => {
  try {
    await kpiController.forceManualReset('daily');
    res.status(200).json({ message: 'Daily KPIs reset successfully' });
  } catch (error) {
    console.error('Error resetting daily KPIs:', error.message);
    res.status(500).json({ error: 'Failed to reset daily KPIs', details: error.message });
  }
});

// Réinitialiser manuellement les totaux mensuels
router.post('/reset/monthly', async (req, res) => {
  try {
    await kpiController.forceManualReset('monthly');
    res.status(200).json({ message: 'Monthly totals reset successfully' });
  } catch (error) {
    console.error('Error resetting monthly totals:', error.message);
    res.status(500).json({ error: 'Failed to reset monthly totals', details: error.message });
  }
});

// Mettre à jour energyConsumption et totalWaterVolume
router.post('/update', async (req, res) => {
  try {
    const { energyConsumption, totalWaterVolume } = req.body;
    if (typeof energyConsumption !== 'number' || energyConsumption < 0) {
      return res.status(400).json({ error: 'Invalid energyConsumption: must be a non-negative number' });
    }
    if (typeof totalWaterVolume !== 'number' || totalWaterVolume < 0) {
      return res.status(400).json({ error: 'Invalid totalWaterVolume: must be a non-negative number' });
    }

    const kpiSnapshot = await kpiController.kpisRef.child('daily').once('value');
    const currentKPI = kpiSnapshot.val() || {};
    const updatedKPI = {
      ...currentKPI,
      energyConsumption,
      totalWaterVolume,
      updatedAt: new Date().toISOString()
    };

    await kpiController.kpisRef.child('daily').set(updatedKPI);
    res.status(200).json({ message: 'energyConsumption and totalWaterVolume updated successfully', updatedKPI });
  } catch (error) {
    console.error('Error updating KPIs:', error.message);
    res.status(500).json({ error: 'Failed to update KPIs', details: error.message });
  }
});

module.exports = router;