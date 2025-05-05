// config/firebaseRealtime.js
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/etc/secrets', 'firebase-realtime-key.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://serre-intelligente-bac7c-default-rtdb.europe-west1.firebasedatabase.app/'
});

module.exports = admin.database();
