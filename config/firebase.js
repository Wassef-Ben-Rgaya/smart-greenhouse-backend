const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/etc/secrets', 'firebase-key.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
}, 'firestore'); // ⚠️ nommer l'instance

const firestoreDB = admin.app('firestore').firestore();

module.exports = firestoreDB;
