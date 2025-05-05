const admin = require('firebase-admin');
const Alert = require('../models/alert');
const alertCollection = admin.firestore().collection('alerts');

// Récupérer toutes les alertes avec filtres
async function getAlerts(query) {
  let alertsQuery = alertCollection;

  // Appliquer les filtres
  if (query.status) alertsQuery = alertsQuery.where('status', '==', query.status);
  if (query.type) alertsQuery = alertsQuery.where('type', '==', query.type);
  if (query.plantId) alertsQuery = alertsQuery.where('plantId', '==', query.plantId);
  if (query.severity) alertsQuery = alertsQuery.where('severity', '==', query.severity);
  if (query.environnementId) alertsQuery = alertsQuery.where('environnementId', '==', query.environnementId);
  if (query.limit) alertsQuery = alertsQuery.limit(parseInt(query.limit));

  const snapshot = await alertsQuery.get();
  const alerts = [];
  snapshot.forEach(doc => {
    alerts.push({ id: doc.id, ...doc.data() });
  });
  return alerts;
}

// Créer une alerte
async function createAlert(alertData) {
  const alert = new Alert(alertData);
  const docRef = await alertCollection.add({
    ...alert,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  const doc = await docRef.get();
  return { id: docRef.id, ...doc.data() };
}

// Mettre à jour le statut d'une alerte
async function updateAlertStatus(id, status) {
  const alertRef = alertCollection.doc(id);
  const doc = await alertRef.get();
  if (!doc.exists) {
    throw new Error('Alerte non trouvée');
  }
  const updateData = { status };
  if (status === 'resolved') {
    updateData.resolvedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  await alertRef.update(updateData);
}

// Supprimer une alerte
async function deleteAlert(id) {
  const alertRef = alertCollection.doc(id);
  const doc = await alertRef.get();
  if (!doc.exists) {
    throw new Error('Alerte non trouvée');
  }
  await alertRef.delete();
}

// Récupérer les statistiques des alertes
async function getAlertStats() {
  const snapshot = await alertCollection.get();
  const stats = {
    total: 0,
    active: 0,
    resolved: 0,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  };

  snapshot.forEach(doc => {
    const data = doc.data();
    stats.total++;
    if (data.status === 'active') stats.active++;
    if (data.status === 'resolved') stats.resolved++;
    stats.bySeverity[data.severity] = (stats.bySeverity[data.severity] || 0) + 1;
  });

  return stats;
}

module.exports = {
  getAlerts,
  createAlert,
  updateAlertStatus,
  deleteAlert,
  getAlertStats
};