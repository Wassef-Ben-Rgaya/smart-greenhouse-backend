require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const admin = require('firebase-admin');
const schedule = require('node-schedule'); 
const app = express();

// Import de Firebase
const db = require('./config/firebase');

// Création du serveur HTTP
const server = http.createServer(app);

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user.routes');
const influxRoutes = require('./routes/influxRoutes');
const adminRoutes = require('./routes/admin');
const plantRoutes = require('./routes/plant.routes');
const cultureRoutes = require('./routes/culture.routes');
const environnementRoutes = require('./routes/environnement.routes');
const measurementRoutes = require('./routes/measurement.routes');
const actionneursRoutes = require('./routes/actionneurs.routes');
const kpiRoutes = require('./routes/kpi.routes'); // Ajout des routes KPI
const AlertMonitor = require('./services/alertMonitor');

// Import des contrôleurs
const measurementController = require('./controllers/measurement.controller');
const KPIController = require('./controllers/kpi.controller');

// Initialiser le contrôleur KPI
const kpiController = new KPIController(admin.database());

// Middleware
app.use(cors());
app.use(express.json());

// Vérification de la connexion Firebase Firestore
db.collection('users')
  .get()
  .then((snapshot) => {
    console.log("✅ Connexion à Firebase Firestore réussie");
  })
  .catch((err) => {
    console.error("❌ Erreur de connexion à Firebase Firestore", err);
  });

// Vérification de la connexion à la Realtime Database
console.log('Connexion à Firebase Realtime Database:', admin.database() ? 'OK' : 'ERREUR');

// Instanciation d'AlertMonitor
try {
  const alertMonitorInstance = new AlertMonitor(admin.database(), admin.firestore());
  console.log('✅ AlertMonitor instancié avec succès');
} catch (error) {
  console.error('❌ Erreur lors de l\'instanciation d\'AlertMonitor:', error);
}

// WebSocket géré par measurementController
server.on('upgrade', measurementController.handleUpgrade);

// Planifier le calcul des KPI toutes les 10 minutes
schedule.scheduleJob('*/10 * * * *', async () => {
  try {
    await kpiController.calculateKPIs(); // Pas de req/res ici, utilisé par la tâche planifiée
    console.log('KPIs calculated and stored successfully');
  } catch (error) {
    console.error('Error calculating KPIs:', error);
  }
});

// Route de base
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API de la serre intelligente !');
});

// Routes API
app.use('/api/users', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/influxdata', influxRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/plants', cultureRoutes);
app.use('/api/plants', environnementRoutes);
app.use('/api/serre_mesures', measurementRoutes);
app.use('/api/serre_mesures/kpis', kpiRoutes); // Ajout des routes KPI
app.use('/alerts', require('./routes/alert.routes'));
app.use('/api/actionneurs', actionneursRoutes);

// Gestion des erreurs
app.use((req, res) => {
  res.status(404).json({ message: "Route non trouvée" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur interne du serveur" });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  console.log(`🔄 WebSocket disponible sur ws://localhost:${PORT}`);
});