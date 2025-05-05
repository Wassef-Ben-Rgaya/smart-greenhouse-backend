const express = require('express');
const {login } = require('../controllers/auth.controller');
const router = express.Router();


// Route pour la connexion
router.post('/login', login);

module.exports = router;
