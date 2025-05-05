const admin = require('firebase-admin');
const Alert = require('../models/alert');

class AlertMonitor {
  constructor(db, firestore) {
    this.db = db;
    this.firestore = firestore;
    this.ref = this.db.ref('serre_mesures');
    console.log('Référence Realtime Database configurée:', this.ref ? 'OK' : 'ERREUR');
    if (!this.ref) {
      console.error('Erreur: Référence Realtime Database non définie');
      throw new Error('Référence Realtime Database non définie');
    }
    this.alertCache = new Set();
    this.lastProcessed = new Map();
    this.plantCache = new Map();
    this.pollInterval = 300000;
    this.setupPolling();
  }

  async setupPolling() {

    try {
      await this.fetchPlants();
      this.checkLatestMeasurement();
      let lastKey = null;
      setInterval(async () => {
        const snapshot = await this.ref.orderByChild('time').limitToLast(1).once('value');
        const newKey = Object.keys(snapshot.val())[0];
        if (newKey !== lastKey) {
          lastKey = newKey;
          await this.checkLatestMeasurement();
        }
      }, this.pollInterval);


    } catch (error) {
    }
  }

  async fetchPlants() {

    try {
      const plantsSnapshot = await this.firestore.collection('environnements').get();

      plantsSnapshot.forEach(doc => {
        this.plantCache.set(doc.id, doc.data());
        console.log(`Plante ${doc.id} ajoutée au cache`);
      });
    } catch (error) {
      console.error('Erreur lors du chargement des plantes:', error);
    }
  }

  async checkLatestMeasurement() {

    try {
      const snapshot = await this.ref.orderByChild('time').limitToLast(1).once('value');
      if (!snapshot.exists()) {
        console.log('Aucune mesure trouvée dans serre_mesures');
        return;
      }

      snapshot.forEach(child => {
        const key = child.key;
        const data = child.val();


        if (!data || !data.Température) {
          console.error(`Données invalides pour clé: ${key}`);
          return;
        }

        const timestampStr = data.time || data.id || new Date().toISOString();
        const timestamp = new Date(timestampStr).getTime();
        if (isNaN(timestamp)) {
          console.error(`Timestamp invalide: ${timestampStr}`);
          return;
        }
        console.log(`Timestamp: ${timestampStr}`);

        const plantId = data.plantId || 'all';
        const lastProcessedTime = this.lastProcessed.get(plantId) || 0;
        if (timestamp - lastProcessedTime < 1000) {
          console.log(`Mesure ignorée pour ${plantId} (trop proche)`);
          return;
        }
        this.lastProcessed.set(plantId, timestamp);

        for (const [plantId, thresholds] of this.plantCache) {
          if (data.plantId && data.plantId !== plantId) {
            console.log(`Mesure ignorée pour ${plantId} (plantId: ${data.plantId})`);
            continue;
          }
          this.checkConditions(
            {
              temperature: data['Température'],
              humidity: data['Humidité'],
              soilMoisture: data['Humidité du sol'],
              light: data['Luminosité'],
              timestamp: new Date(timestamp),
              key: timestampStr
            },
            plantId,
            thresholds
          );
        }
      });

      // Nettoyage du cache
      if (this.alertCache.size > 10000) {
        console.log('Nettoyage du cache alertCache...');
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        const newCache = new Set();
        for (const key of this.alertCache) {
          const timestampPart = key.split('_').pop().replace('Z', '');
          const timestamp = new Date(timestampPart).getTime();
          if (timestamp > oneHourAgo) {
            newCache.add(key);
          }
        }
        this.alertCache = newCache;
        console.log(`Cache nettoyé, taille: ${this.alertCache.size}`);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
    }
  }

  async checkConditions(measurement, plantId, thresholds) {
    console.log('Vérification des conditions:', measurement, plantId);
    const { temperature, humidity, soilMoisture, light, timestamp, key } = measurement;
    const alerts = [];
    const satisfiedConditions = [];
    const timestampKey = new Date(timestamp).toISOString().split('.')[0] + 'Z';

    if (temperature !== undefined) {
      const tempThreshold = thresholds.temperature;
      if (!tempThreshold || tempThreshold.min === undefined || tempThreshold.max === undefined) {
        console.log(`Seuils de température manquants pour ${plantId}`);
      } else if (temperature < tempThreshold.min || temperature > tempThreshold.max) {
        alerts.push({
          type: 'temperature_out_of_range',
          message: `Température hors seuils pour ${plantId}: ${temperature} (min: ${tempThreshold.min}, max: ${tempThreshold.max})`,
          value: temperature,
          threshold: temperature < tempThreshold.min ? tempThreshold.min : tempThreshold.max,
          optimalRange: `${tempThreshold.min}-${tempThreshold.max}`,
          severity: temperature > tempThreshold.max && temperature > 30 ? 'high' : 'medium'
        });
      } else {
        satisfiedConditions.push(`Température OK: ${temperature}`);
      }
    }

    if (humidity !== undefined) {
      const humThreshold = thresholds.humidite?.air;
      if (!humThreshold || humThreshold.min === undefined || humThreshold.max === undefined) {
        console.log(`Seuils d'humidité manquants pour ${plantId}`);
      } else if (humidity < humThreshold.min || humidity > humThreshold.max) {
        alerts.push({
          type: 'humidity_out_of_range',
          message: `Humidité hors seuils pour ${plantId}: ${humidity} (min: ${humThreshold.min}, max: ${humThreshold.max})`,
          value: humidity,
          threshold: humidity < humThreshold.min ? humThreshold.min : humThreshold.max,
          optimalRange: `${humThreshold.min}-${humThreshold.max}`,
          severity: 'medium'
        });
      } else {
        satisfiedConditions.push(`Humidité OK: ${humidity}`);
      }
    }

    if (soilMoisture !== undefined) {
      const soilThreshold = thresholds.humidite?.sol;
      if (soilThreshold === undefined) {
        console.log(`Seuil d'humidité du sol manquant pour ${plantId}`);
      } else if (soilMoisture !== soilThreshold) {
        alerts.push({
          type: 'soilMoisture_out_of_range',
          message: `Humidité du sol hors seuils pour ${plantId}: ${soilMoisture} (attendu: ${soilThreshold})`,
          value: soilMoisture,
          threshold: soilThreshold,
          optimalRange: `${soilThreshold}`,
          severity: 'medium'
        });
      } else {
        satisfiedConditions.push(`Humidité du sol OK: ${soilMoisture}`);
      }
    }

    if (light !== undefined) {
      const lightThreshold = thresholds.lumiere;
      const lightMin = lightThreshold?.min ?? 800;
      if (!lightThreshold || !lightThreshold.optimalRange) {
        console.log(`Seuils de luminosité manquants pour ${plantId}`);
      } else {
        const hour = timestamp.getHours();
        const isInRange = hour >= lightThreshold.optimalRange.start && hour <= lightThreshold.optimalRange.end;
        if (isInRange && !isNaN(light) && light < lightMin) {
          alerts.push({
            type: 'light_out_of_range',
            message: `Luminosité trop faible pour ${plantId}: ${light} lux (min: ${lightMin})`,
            value: light,
            threshold: lightMin,
            optimalRange: `${lightThreshold.optimalRange.start}h-${lightThreshold.optimalRange.end}h`,
            severity: 'medium'
          });
        } else if (isInRange && !isNaN(light)) {
          satisfiedConditions.push(`Luminosité OK: ${light} lux`);
        }
      }
    }

    if (satisfiedConditions.length > 0) {
      console.log(`Conditions satisfaites pour ${plantId}:`, satisfiedConditions);
    }

    if (alerts.length === 0) {
      console.log(`Aucune alerte pour ${plantId}`);
    } else {
      for (const alert of alerts) {
        const alertKey = `${plantId}_${alert.type}_${timestampKey}`;
        if (!this.alertCache.has(alertKey)) {
          console.log(`Création alerte: ${alert.message}`);
          await this.createAlert({
            plantId,
            type: alert.type,
            message: alert.message,
            value: alert.value,
            threshold: alert.threshold,
            optimalRange: alert.optimalRange,
            timestamp,
            status: 'active',
            severity: alert.severity,
            plantName: this.plantCache.get(plantId)?.nom || `Plante ${plantId}`,
            plantScientificName: this.plantCache.get(plantId)?.nomScientifique || '',
            environnementId: plantId
          });
          this.alertCache.add(alertKey);
        } else {
          console.log(`Alerte déjà créée: ${alertKey}`);
        }
      }
    }

    await this.resolveAlerts(measurement, plantId, thresholds);
  }

  async createAlert(alertData) {
    try {
      // Vérifier si une alerte active existe déjà
      const existingAlert = await this.firestore
        .collection('alerts')
        .where('plantId', '==', alertData.plantId)
        .where('type', '==', alertData.type)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!existingAlert.empty) {
        console.log(`Alerte active existante pour ${alertData.plantId}, type: ${alertData.type}`);
        return;
      }

      const alert = new Alert(alertData);
      const docRef = await this.firestore.collection('alerts').add({
        ...alert,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resolvedAt: null
      });
      console.log(`Alerte créée, ID: ${docRef.id}`);
    } catch (error) {
      console.error('Erreur création alerte:', error);
    }
  }

  async resolveAlerts(measurement, plantId, thresholds) {
    console.log(`Résolution alertes pour ${plantId}`);
    const { temperature, humidity, soilMoisture, light, timestamp } = measurement;
    const lightThreshold = thresholds.lumiere;
    const lightMin = lightThreshold?.min ?? 800;

    const alertTypes = [
      'temperature_out_of_range',
      'humidity_out_of_range',
      'soilMoisture_out_of_range',
      'light_out_of_range'
    ];

    for (const alertType of alertTypes) {
      const alertsSnapshot = await this.firestore
        .collection('alerts')
        .where('plantId', '==', plantId)
        .where('type', '==', alertType)
        .where('status', '==', 'active')
        .limit(5) // Limiter à 5 alertes pour réduire les lectures
        .get();

      if (alertsSnapshot.empty) {
        console.log(`Aucune alerte active pour ${alertType}, ${plantId}`);
        continue;
      }

      let shouldResolve = false;

      switch (alertType) {
        case 'temperature_out_of_range':
          if (temperature !== undefined && thresholds.temperature &&
            temperature >= thresholds.temperature.min && temperature <= thresholds.temperature.max) {
            shouldResolve = true;
          }
          break;
        case 'humidity_out_of_range':
          if (humidity !== undefined && thresholds.humidite?.air &&
            humidity >= thresholds.humidite.air.min && humidity <= thresholds.humidite.air.max) {
            shouldResolve = true;
          }
          break;
        case 'soilMoisture_out_of_range':
          if (soilMoisture !== undefined && thresholds.humidite?.sol !== undefined &&
            soilMoisture === thresholds.humidite.sol) {
            shouldResolve = true;
          }
          break;
        case 'light_out_of_range':
          if (light !== undefined && lightThreshold && !isNaN(light) &&
            timestamp.getHours() >= lightThreshold.optimalRange.start &&
            timestamp.getHours() <= lightThreshold.optimalRange.end &&
            light >= lightMin) {
            shouldResolve = true;
          }
          break;
      }

      if (shouldResolve) {
        console.log(`Résolution de ${alertsSnapshot.size} alerte(s) pour ${alertType}, ${plantId}`);
        for (const doc of alertsSnapshot.docs) {
          try {
            await doc.ref.update({
              status: 'resolved',
              resolvedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Alerte résolue, ID: ${doc.id}`);
          } catch (error) {
            console.error(`Erreur résolution alerte ${doc.id}:`, error);
          }
        }
      }
    }
  }
}

module.exports = AlertMonitor;