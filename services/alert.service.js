const admin = require('firebase-admin');
const Alert = require('../models/alert');

const alertCollection = admin.firestore().collection('alerts');

async function createAlert(alertData) {
  const alert = new Alert(alertData);
  const docRef = await alertCollection.add({ 
    ...alert,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { id: docRef.id, ...alert };
}

module.exports = {
  createAlert
};