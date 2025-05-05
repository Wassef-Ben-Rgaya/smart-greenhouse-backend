// routes/admin.js
const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const router = express.Router();
const User = require('../models/User');


router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
