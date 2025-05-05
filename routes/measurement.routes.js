const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurement.controller');

// Routes normales
router.post('/', measurementController.createMeasurement);
router.get('/', measurementController.getMeasurements);
router.put('/:id', measurementController.updateMeasurement);
router.delete('/:id', measurementController.deleteMeasurement);

router.get('/updates', (req, res) => {
    res.status(426).json({ 
        message: 'Upgrade required',
        description: 'Cette endpoint nécessite une connexion WebSocket'
    });
});

router.get('/check-connection', async (req, res) => {
    try {
        const ref = require('../config/firebaseRealtime').ref('test_connection');
        await ref.set({ 
            status: 'ok', 
            timestamp: new Date().toISOString() 
        });
        res.status(200).json({ message: 'Connexion réussie' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Exportez uniquement le router
module.exports = router;