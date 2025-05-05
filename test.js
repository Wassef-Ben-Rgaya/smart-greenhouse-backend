// controllers/kpi.controller.js
const MeasurementModel = require('../models/measurement');
const KPI = require('../models/kpi');
const WebSocket = require('ws');

class KPIController {
  constructor(db) {
    this.db = db;
    this.measurementsRef = this.db.ref('serre_mesures');
    this.kpisRef = this.db.ref('kpis');
    this.pumpPower = 50.0; // Puissance en watts
    this.fanPower = 30.0;
    this.heaterPower = 100.0;
    this.lampPower = 20.0;
    this.model = new MeasurementModel(db);
    this.lastMeasurementTime = null; // Pour éviter des calculs inutiles

    // Configuration WebSocket
    this.wss = new WebSocket.Server({ noServer: true });
    this.setupWebSocket();

    this.getKPIs = this.getKPIs.bind(this);
    this.calculateKPIs = this.calculateKPIs.bind(this);
    this.handleUpgrade = this.handleUpgrade.bind(this);
  }

  handleUpgrade(request, socket, head) {
    // Vérifier si la requête concerne les KPI
    if (request.url === '/kpis/updates') {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection for KPIs');

      // Envoyer les KPI actuels au nouveau client
      this.getKPIs(null, { status: () => ({ json: (data) => ws.send(JSON.stringify({ type: 'kpi_update', data })) }) });

      ws.on('close', () => {
        console.log('KPI WebSocket client disconnected');
      });
    });
  }

  broadcastKPIs(kpi) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'kpi_update',
          data: kpi,
        }));
      }
    });
  }

  async calculateKPIs(req, res) {
    try {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        console.log('Fetching measurements from:', last24Hours.toISOString());

        const snapshot = await this.measurementsRef
            .limitToLast(100)
            .once('value');
        console.log('Snapshot data:', snapshot.val());

        const measurements = this.model._formatSnapshot(snapshot);
        console.log('Formatted measurements length:', measurements.length);
        if (measurements.length === 0) {
            console.log('No valid measurements found');
            const emptyKPI = new KPI({});
            if (req) {
                res.status(200).json(emptyKPI);
            }
            this.broadcastKPIs(emptyKPI);
            return emptyKPI;
        }

        const recentMeasurements = measurements.filter(m => {
            const date = new Date(m.id);
            return !isNaN(date.getTime()) && date >= last24Hours;
        });
        console.log('Recent measurements length:', recentMeasurements.length);

        const latestMeasurement = recentMeasurements[recentMeasurements.length - 1];
        if (latestMeasurement && this.lastMeasurementTime && latestMeasurement.id === this.lastMeasurementTime) {
            const snapshot = await this.kpisRef.child('daily').once('value');
            const kpi = snapshot.val() ? KPI.fromJSON(snapshot.val()) : new KPI({});
            if (req) {
                res.status(200).json(kpi);
            }
            return kpi;
        }
        this.lastMeasurementTime = latestMeasurement ? latestMeasurement.id : null;

        // Calcul des KPI environnementaux
        const avgTemperature = recentMeasurements
            .filter(m => m["Température"] != null && typeof m["Température"] === 'number')
            .reduce((sum, m) => sum + m["Température"], 0) / recentMeasurements.length || 0;
        console.log('Calculated avgTemperature:', avgTemperature);

        const avgHumidity = recentMeasurements
            .filter(m => m["Humidité"] != null && typeof m["Humidité"] === 'number')
            .reduce((sum, m) => sum + m["Humidité"], 0) / recentMeasurements.length || 0;
        console.log('Calculated avgHumidity:', avgHumidity);

        const lastSoilMeasurement = recentMeasurements.find(m => m["Humidité du sol"] != null && typeof m["Humidité du sol"] === 'number');
        const soilHumidity = lastSoilMeasurement ? lastSoilMeasurement["Humidité du sol"] : 0;
        console.log('Calculated soilHumidity:', soilHumidity);

        const avgLuminosity = recentMeasurements
            .filter(m => m["Luminosité"] != null && typeof m["Luminosité"] === 'number')
            .reduce((sum, m) => sum + m["Luminosité"], 0) / recentMeasurements.length || 0;
        console.log('Calculated avgLuminosity:', avgLuminosity);

        let sunlightSeconds = 0;
        let lowLightSeconds = 0;
        for (let i = 0; i < recentMeasurements.length - 1; i++) {
            const currentTime = new Date(recentMeasurements[i].id);
            const nextTime = new Date(recentMeasurements[i + 1].id);
            if (isNaN(currentTime.getTime()) || isNaN(nextTime.getTime())) {
                console.log(`Invalid time for indices ${i} and ${i + 1}: ${recentMeasurements[i].id}, ${recentMeasurements[i + 1].id}`);
                continue;
            }
            const duration = (nextTime - currentTime) / 1000;
            if (recentMeasurements[i]["Luminosité"] > 800) { // Seuil ajusté à 800 lux
                sunlightSeconds += duration;
            } else {
                lowLightSeconds += duration;
            }
        }
        const sunlightDuration = sunlightSeconds / 3600;
        const lowLightDuration = lowLightSeconds / 3600;
        console.log('Calculated sunlightDuration:', sunlightDuration);
        console.log('Calculated lowLightDuration:', lowLightDuration);

        const lastUpdate = recentMeasurements[recentMeasurements.length - 1]?.id || now.toISOString();
        console.log('Calculated lastUpdate:', lastUpdate);

        const todayMeasurements = recentMeasurements.filter(m => {
            const date = new Date(m.id);
            return !isNaN(date.getTime()) && date >= todayStart;
        });
        let wateringCount = 0;
        let wasPumpOn = false;
        let ventilationSeconds = 0;
        let heatingSeconds = 0;
        let pumpSeconds = 0;
        let fanSeconds = 0;
        let heaterSeconds = 0;
        let lampSeconds = 0;

        for (let i = 0; i < todayMeasurements.length - 1; i++) {
            const m = todayMeasurements[i];
            const next = todayMeasurements[i + 1];
            const currentTime = new Date(m.id);
            const nextTime = new Date(next.id);
            if (isNaN(currentTime.getTime()) || isNaN(nextTime.getTime())) {
                console.log(`Invalid time for today indices ${i} and ${i + 1}: ${m.id}, ${next.id}`);
                continue;
            }
            const duration = (nextTime - currentTime) / 1000;

            if (m.Pompe && !wasPumpOn) wateringCount++;
            wasPumpOn = m.Pompe;

            if (m.Ventilateur) ventilationSeconds += duration;
            if (m.Chauffage) heatingSeconds += duration;
            if (m.Pompe) pumpSeconds += duration;
            if (m.Ventilateur) fanSeconds += duration;
            if (m.Chauffage) heaterSeconds += duration;
            if (m.Lampe) lampSeconds += duration;
        }

        const ventilationDuration = ventilationSeconds / 3600;
        const heatingDuration = heatingSeconds / 3600;
        const pumpDuration = pumpSeconds / 3600;
        const lampDuration = lampSeconds / 3600;

        const energyConsumption = (
            this.pumpPower * (pumpSeconds / 3600) +
            this.fanPower * (fanSeconds / 3600) +
            this.heaterPower * (heaterSeconds / 3600) +
            this.lampPower * (lampSeconds / 3600)
        ) / 1000;
        console.log('Calculated energyConsumption:', energyConsumption);

        // Temps moyen entre deux arrosages
        let wateringIntervals = [];
        for (let i = 0; i < recentMeasurements.length - 1; i++) {
            if (recentMeasurements[i].Pompe === 0 && recentMeasurements[i + 1].Pompe === 1) {
                const startTime = new Date(recentMeasurements[i].id);
                const endTime = new Date(recentMeasurements[i + 1].id);
                if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                    const interval = (endTime - startTime) / (1000 * 3600);
                    wateringIntervals.push(interval);
                }
            }
        }
        const avgWateringInterval = wateringIntervals.length > 0 ? wateringIntervals.reduce((sum, val) => sum + val, 0) / wateringIntervals.length : 0;
        console.log('Calculated avgWateringInterval:', avgWateringInterval);

        // Nombre d’interventions manuelles
        const manualCommandsSnapshot = await admin.database().ref('serre_commandes_manuelles')
            .orderByChild('timestamp')
            .startAt(last24Hours.toISOString())
            .once('value');
        const manualCommands = manualCommandsSnapshot.val();
        const manualInterventionCount = manualCommands ? Object.keys(manualCommands).length : 0;
        console.log('Calculated manualInterventionCount:', manualInterventionCount);

        // Efficacité lumineuse
        const lightEfficiency = lowLightDuration > 0 ? lampDuration / lowLightDuration : 0;
        console.log('Calculated lightEfficiency:', lightEfficiency);

        // Volume total d’eau utilisé (L), débit ajusté à 800 L/h (13.33 L/min)
        const waterFlowRate = 13.33; // 800 L/h = 13.33 L/min
        const totalWaterVolume = pumpDuration * 60 * waterFlowRate;
        console.log('Calculated totalWaterVolume:', totalWaterVolume);

        const kpi = new KPI({
            avgTemperature,
            avgHumidity,
            soilHumidity,
            avgLuminosity,
            sunlightDuration,
            lastUpdate,
            wateringCount,
            ventilationDuration,
            heatingDuration,
            energyConsumption,
            avgWateringInterval,
            manualInterventionCount,
            lightEfficiency,
            totalWaterVolume,
            updatedAt: now.toISOString(),
        });

        console.log('KPI object before validation:', kpi.toJSON());
        kpi.validate();
        await this.kpisRef.child('daily').set(kpi.toJSON());
        this.broadcastKPIs(kpi);

        if (req) {
            res.status(200).json(kpi);
        }
        return kpi;
    } catch (error) {
        console.error('Error calculating KPIs:', error.stack);
        if (req && !res.headersSent) {
            res.status(500).json({ error: 'Failed to calculate KPIs', details: error.message });
        }
        throw error;
    }
}

  async getKPIs(req, res) {
    try {
      const snapshot = await this.kpisRef.child('daily').once('value');
      const data = snapshot.val();
      const kpi = data ? KPI.fromJSON(data) : new KPI({});
      res.status(200).json(kpi);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      res.status(500).json({ error: 'Failed to fetch KPIs' });
    }
  }
}

module.exports = KPIController;