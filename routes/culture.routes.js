const express = require('express');
const router = express.Router();
const cultureController = require('../controllers/culture.controller');

router.post('/:plantId/cultures', cultureController.createCulture);
router.get('/:plantId/cultures', cultureController.getCultures);
router.get('/:plantId/cultures/:cultureId', cultureController.getCultureById);
router.put('/:plantId/cultures/:cultureId', cultureController.updateCulture);
router.delete('/:plantId/cultures/:cultureId', cultureController.deleteCulture);

module.exports = router;
