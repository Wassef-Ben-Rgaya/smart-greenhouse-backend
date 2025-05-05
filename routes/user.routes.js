const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userController = require('../controllers/user.controller');

// Configuration de Multer pour l'upload des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile-pictures/'); // Dossier où stocker les images
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPEG, JPG et PNG sont autorisés !'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

// Middleware pour gérer les erreurs de Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'MULTER_ERROR', message: err.message });
  } else if (err) {
    return res.status(400).json({ error: 'FILE_ERROR', message: err.message });
  }
  next();
};

// Routes CRUD
router.post('/', async (req, res) => {
  try {
    const result = await userController.createUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await userController.getAllUsers();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await userController.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Utilisateur non trouvé' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await userController.updateUser(req.params.id, req.body);
    res.status(200).json({ message: 'Utilisateur mis à jour avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await userController.deleteUser(req.params.id);
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// Nouvelle route pour l'upload de la photo de profil
router.post(
  '/:id/profile-picture',
  upload.single('profilePicture'), // Middleware Multer pour gérer l'upload
  handleMulterError, // Middleware pour gérer les erreurs de Multer
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'NO_FILE', message: 'Aucun fichier fourni' });
      }

      const profilePictureUrl = await userController.uploadProfilePicture(
        req.params.id,
        req.file.path
      );

      res.status(200).json({ profilePictureUrl });
    } catch (err) {
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  }
);

module.exports = router;