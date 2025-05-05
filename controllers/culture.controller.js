const cultureModel = require('../models/Culture');

// Créer une nouvelle culture liée à une plante
async function createCulture(req, res) {
  try {
    const { plantId } = req.params;
    const cultureObj = req.body;

    if (!plantId || !cultureObj.datePlantation || !Array.isArray(cultureObj.phases)) {
      return res.status(400).json({ message: 'Données manquantes ou invalides' });
    }

    // Liaison avec la plante
    cultureObj.plante = plantId;

    const cultureId = await cultureModel.createCulture(cultureObj);
    res.status(201).json({ message: 'Culture créée avec succès', cultureId });
  } catch (err) {
    console.error('Erreur lors de la création de la culture :', err);
    res.status(500).json({ message: 'Erreur lors de la création de la culture', error: err.message });
  }
}

// Récupérer toutes les cultures d'une plante
async function getCultures(req, res) {
  try {
    const { plantId } = req.params;
    const cultures = await cultureModel.getCulturesByPlantId(plantId);
    res.status(200).json(cultures);
  } catch (err) {
    console.error('Erreur lors de la récupération des cultures :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des cultures', error: err.message });
  }
}

// Récupérer une culture d'une plante par ID
async function getCultureById(req, res) {
  try {
    const { plantId, cultureId } = req.params;
    const culture = await cultureModel.getCultureById(plantId, cultureId);

    if (!culture) {
      return res.status(404).json({ message: 'Culture non trouvée pour cette plante' });
    }

    res.status(200).json(culture);
  } catch (err) {
    console.error('Erreur lors de la récupération de la culture :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de la culture', error: err.message });
  }
}

// Mettre à jour une culture liée à une plante
async function updateCulture(req, res) {
  try {
    const { plantId, cultureId } = req.params;
    const updateData = req.body;

    const updatedCulture = await cultureModel.updateCulture(plantId, cultureId, updateData);

    if (!updatedCulture) {
      return res.status(404).json({ message: 'Culture non trouvée pour cette plante' });
    }

    res.status(200).json({
      message: 'Culture mise à jour avec succès',
      culture: updatedCulture
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la culture :', err);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour de la culture',
      error: err.message
    });
  }
}

// Supprimer une culture liée à une plante
async function deleteCulture(req, res) {
  try {
    const { plantId, cultureId } = req.params;
    const success = await cultureModel.deleteCulture(plantId, cultureId);

    if (success) {
      res.status(200).json({ message: 'Culture supprimée avec succès' });
    } else {
      res.status(404).json({ message: 'Culture non trouvée pour cette plante' });
    }
  } catch (err) {
    console.error('Erreur lors de la suppression de la culture :', err);
    res.status(500).json({
      message: 'Erreur lors de la suppression de la culture',
      error: err.message
    });
  }
}
async function recalculatePhases(req, res) {
  try {
    const result = await cultureModel.recalculatePhaseForAllCultures();
    res.status(200).json({
      message: `${result.updated} cultures mises à jour`
    });
  } catch (err) {
    res.status(500).json({
      message: 'Erreur recalcul phases',
      error: err.message
    });
  }
}

module.exports = {
  createCulture,
  getCultures,
  getCultureById,
  updateCulture,
  deleteCulture,
  recalculatePhases
};
