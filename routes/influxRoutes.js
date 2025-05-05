const express = require('express');
const router = express.Router();
const { insertInfluxData, getInfluxData } = require('../controllers/influxController');

// Correct usage: Express route handlers
router.post('/', insertInfluxData);
router.get('/', getInfluxData);

module.exports = router;
