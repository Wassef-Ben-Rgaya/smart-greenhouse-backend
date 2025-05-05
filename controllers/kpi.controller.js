const admin = require('firebase-admin');
const MeasurementModel = require('../models/measurement');
const KPI = require('../models/kpi');
const WebSocket = require('ws');

class KPIController {
  constructor(db) {
    this.db = db;
    this.measurementsRef = this.db.ref('serre_mesures');
    this.kpisRef = this.db.ref('kpis');
    this.pumpPower = 19.0;
    this.fanPower = 35.0;
    this.heaterPower = 1000.0;
    this.lampPower = 30.0;
    this.waterFlowRate = 13.3;
    this.model = new MeasurementModel(db);
    
    // Initialisation des états
    this.lastMeasurementTime = null;
    this.processedTimestamps = new Set();
    this.measurementBuffer = [];
    this.recentMeasurementsCache = [];
    this.lastCacheUpdate = null;
    this.lastCacheTimestamp = null;
    this.bufferInterval = null;
    this.lastDailyReset = null;

    // WebSocket
    this.wss = new WebSocket.Server({ noServer: true });
    
    // Configuration initiale
    this.setupWebSocket();
    this.initializeResetTimestamp();
    this.setupMeasurementListener();
    this.startBufferProcessing();

    // Liaison des méthodes
    this.getKPIs = this.getKPIs.bind(this);
    this.calculateKPIs = this.calculateKPIs.bind(this);
    this.handleUpgrade = this.handleUpgrade.bind(this);
    this.updateKPIs = this.updateKPIs.bind(this);
    this.forceManualReset = this.forceManualReset.bind(this);
  }

  /* Méthodes d'initialisation */
  async initializeResetTimestamp() {
    try {
      const resetSnapshot = await this.kpisRef.child('resetTimestamp').once('value');
      if (!resetSnapshot.val()) {
        const now = new Date().toISOString();
        await this.kpisRef.child('resetTimestamp').set(now);
        console.log('Initialized resetTimestamp:', now);
      }
    } catch (error) {
      console.error('Error initializing reset timestamp:', error.message, error.stack);
    }
  }

  /* Méthodes de gestion WebSocket */
  handleUpgrade(request, socket, head) {
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
      
      // Envoyer les KPIs actuels dès la connexion
      this.getCurrentKPIs()
        .then(kpis => {
          ws.send(JSON.stringify({
            type: 'initial_kpis',
            data: kpis
          }));
        })
        .catch(error => {
          console.error('Error sending initial KPIs:', error.message, error.stack);
        });
      
      ws.on('close', () => console.log('KPI WebSocket client disconnected'));
    });
  }

  async getCurrentKPIs() {
    const snapshot = await this.kpisRef.child('daily').once('value');
    return snapshot.val() ? KPI.fromJSON(snapshot.val()) : new KPI({});
  }

  broadcastKPIs(kpi) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'kpi_update',
          data: kpi
        }));
      }
    });
  }

  /* Méthodes de gestion des mesures */
  setupMeasurementListener() {
    const query = this.measurementsRef
      .orderByKey()
      .startAfter(this.lastMeasurementTime || '1970-01-01T00:00:00Z');

    query.on('child_added', (snapshot) => {
      try {
        const measurement = {
          id: snapshot.key,
          ...this.convertMeasurementData(snapshot.val())
        };

        if (!this.isValidMeasurement(measurement)) {
          console.warn('Invalid measurement received:', measurement);
          return;
        }

        if (this.processedTimestamps.has(measurement.id)) {
          console.warn(`Skipping duplicate measurement: ${measurement.id}`);
          return;
        }

        this.processedTimestamps.add(measurement.id);
        this.lastMeasurementTime = measurement.id;
        this.measurementBuffer.push(measurement);
        console.log('Measurement added to buffer:', measurement.id);
        
      } catch (error) {
        console.error('Error processing new measurement:', error.message, error.stack);
      }
    }, (error) => {
      console.error('Firebase query error:', error.message, 'Code:', error.code, error.stack);
    });
  }

  convertMeasurementData(data) {
    const converted = { ...data };
    ['Pompe', 'Ventilateur', 'Chauffage', 'Lampe'].forEach(field => {
      if (field in converted && typeof converted[field] === 'number') {
        converted[field] = converted[field] === 1;
      }
    });
    return converted;
  }

  isValidMeasurement(measurement) {
    if (!measurement || typeof measurement !== 'object') return false;
    
    // Validation du timestamp
    if (!measurement.id || !this.isValidTimestamp(measurement.id)) {
      console.warn(`Invalid timestamp: ${measurement.id}`);
      return false;
    }

    // Validation des champs numériques
    const numericFields = ['Température', 'Humidité', 'Humidité du sol', 'Luminosité'];
    for (const field of numericFields) {
      if (typeof measurement[field] !== 'number' || isNaN(measurement[field]) || !isFinite(measurement[field])) {
        console.warn(`Invalid ${field}: ${measurement[field]}`);
        return false;
      }
    }

    // Validation des états booléens
    const booleanFields = ['Pompe', 'Ventilateur', 'Chauffage', 'Lampe'];
    for (const field of booleanFields) {
      if (!(typeof measurement[field] === 'boolean' || (typeof measurement[field] === 'number' && (measurement[field] === 0 || measurement[field] === 1)))) {
        console.warn(`Invalid ${field}: ${measurement[field]}`);
        return false;
      }
    }

    return true;
  }

  isValidTimestamp(timestamp) {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  startBufferProcessing() {
    if (!this.bufferInterval) {
      this.bufferInterval = setInterval(() => this.processBuffer(), 5 * 60 * 1000); // Toutes les 5 minutes
    }
  }

  async processBuffer() {
    if (this.measurementBuffer.length < 2) {
      console.log('Not enough measurements in buffer to calculate KPIs:', this.measurementBuffer.length);
      return;
    }

    console.log('Processing buffered measurements:', this.measurementBuffer.length);
    const measurementsToProcess = [...this.measurementBuffer];
    this.measurementBuffer = [];

    try {
      await this.calculateKPIsIncrementally(measurementsToProcess);
    } catch (error) {
      console.error('Error processing measurement buffer:', error.message, error.stack);
    }
  }

  /* Méthodes de calcul des KPI */
  async calculateKPIsIncrementally(measurements) {
    try {
      console.log('Starting calculateKPIsIncrementally with', measurements.length, 'measurements');
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const maxDailySeconds = 24 * 60 * 60;

      // Vérification de la réinitialisation mensuelle
      console.log('Fetching resetTimestamp');
      const resetSnapshot = await this.kpisRef.child('resetTimestamp').once('value');
      const lastReset = new Date(resetSnapshot.val() || now);
      
      if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
        console.log('Resetting monthly totals');
        await this.kpisRef.child('totals').set({
          totalPumpSeconds: 0,
          totalFanSeconds: 0,
          totalHeaterSeconds: 0,
          totalLampSeconds: 0
        });
        await this.kpisRef.child('resetTimestamp').set(now.toISOString());
        console.log('Cumuls reset for new month');
      }

      // Vérification de la réinitialisation quotidienne
      const shouldResetDaily = !this.lastDailyReset || 
        this.lastDailyReset.getDate() !== now.getDate() || 
        this.lastDailyReset.getMonth() !== now.getMonth() || 
        this.lastDailyReset.getFullYear() !== now.getFullYear();

      console.log('Fetching daily KPI');
      const kpiSnapshot = await this.kpisRef.child('daily').once('value');
      let prevKPI = kpiSnapshot.val() ? KPI.fromJSON(kpiSnapshot.val()) : new KPI({});
      
      let dailyTotals = prevKPI.dailyTotals || {
        dailyPumpSeconds: 0,
        dailyFanSeconds: 0,
        dailyHeaterSeconds: 0,
        dailyLampSeconds: 0,
        dailySunlightSeconds: 0,
        dailyLowLightSeconds: 0
      };

      if (shouldResetDaily) {
        console.log('Saving daily KPIs before reset');
        await this.saveDailyKPIs(prevKPI);
        dailyTotals = {
          dailyPumpSeconds: 0,
          dailyFanSeconds: 0,
          dailyHeaterSeconds: 0,
          dailyLampSeconds: 0,
          dailySunlightSeconds: 0,
          dailyLowLightSeconds: 0
        };
        prevKPI.dailyTotals = dailyTotals;
        prevKPI.avgTemperature = 0;
        prevKPI.avgHumidity = 0;
        prevKPI.avgLuminosity = 0;
        prevKPI.soilHumidity = 0;
        prevKPI.sunlightDuration = 0;
        prevKPI.lowLightDuration = 0;
        prevKPI.ventilationDuration = 0;
        prevKPI.heatingDuration = 0;
        prevKPI.pumpDuration = 0;
        prevKPI.lampDuration = 0;
        this.recentMeasurementsCache = [];
        this.lastDailyReset = now;
        console.log('Daily totals and durations reset for new day');
      }

      // Calcul des durées d'activation
      let durations = {
        pump: 0,
        fan: 0,
        heater: 0,
        lamp: 0,
        sunlight: 0,
        lowLight: 0
      };

      for (let i = 0; i < measurements.length - 1; i++) {
        const current = measurements[i];
        const next = measurements[i + 1];
        const duration = (new Date(next.id) - new Date(current.id)) / 1000;

        if (duration <= 0 || duration > maxDailySeconds) {
          console.warn(`Invalid duration between measurements: ${duration} seconds, skipping`, current.id, next.id);
          continue;
        }

        if (current.Pompe) durations.pump += duration;
        if (current.Ventilateur) durations.fan += duration;
        if (current.Chauffage) durations.heater += duration;
        if (current.Lampe) durations.lamp += duration;
        if (current.Luminosité > 800) {
          durations.sunlight += duration;
        } else {
          durations.lowLight += duration;
        }
      }

      // Mise à jour des totaux avec vérification des limites
      dailyTotals.dailyPumpSeconds = Math.min(dailyTotals.dailyPumpSeconds + durations.pump, maxDailySeconds);
      dailyTotals.dailyFanSeconds = Math.min(dailyTotals.dailyFanSeconds + durations.fan, maxDailySeconds);
      dailyTotals.dailyHeaterSeconds = Math.min(dailyTotals.dailyHeaterSeconds + durations.heater, maxDailySeconds);
      dailyTotals.dailyLampSeconds = Math.min(dailyTotals.dailyLampSeconds + durations.lamp, maxDailySeconds);
      dailyTotals.dailySunlightSeconds = Math.min(dailyTotals.dailySunlightSeconds + durations.sunlight, maxDailySeconds);
      dailyTotals.dailyLowLightSeconds = Math.min(dailyTotals.dailyLowLightSeconds + durations.lowLight, maxDailySeconds);

      // S'assurer que la somme de dailySunlightSeconds et dailyLowLightSeconds ne dépasse pas 24 heures
      const totalLightSeconds = dailyTotals.dailySunlightSeconds + dailyTotals.dailyLowLightSeconds;
      if (totalLightSeconds > maxDailySeconds) {
        console.warn(`Total light duration (${totalLightSeconds} seconds) exceeds 24 hours, scaling down proportionally`);
        const scaleFactor = maxDailySeconds / totalLightSeconds;
        dailyTotals.dailySunlightSeconds *= scaleFactor;
        dailyTotals.dailyLowLightSeconds *= scaleFactor;
        console.log(`Scaled sunlight to ${dailyTotals.dailySunlightSeconds} seconds and lowLight to ${dailyTotals.dailyLowLightSeconds} seconds`);
      }

      // Calcul des totaux cumulés
      console.log('Fetching totals');
      const totalsSnapshot = await this.kpisRef.child('totals').once('value');
      let totals = totalsSnapshot.val() || {
        totalPumpSeconds: 0,
        totalFanSeconds: 0,
        totalHeaterSeconds: 0,
        totalLampSeconds: 0
      };

      totals.totalPumpSeconds += durations.pump;
      totals.totalFanSeconds += durations.fan;
      totals.totalHeaterSeconds += durations.heater;
      totals.totalLampSeconds += durations.lamp;

      console.log('Saving totals:', totals);
      await this.kpisRef.child('totals').set(totals);
      console.log('Updated totals:', totals);

      // Calcul des moyennes
      const recentMeasurements = [...this.recentMeasurementsCache, ...measurements]
        .filter(m => new Date(m.id) >= todayStart);
      
      this.recentMeasurementsCache = recentMeasurements;
      this.lastCacheUpdate = now;
      console.log('Updated measurements cache with', recentMeasurements.length, 'entries');

      const avgTemperature = this.calculateAverage(recentMeasurements, 'Température');
      console.log('Calculated avgTemperature:', avgTemperature);
      const avgHumidity = this.calculateAverage(recentMeasurements, 'Humidité');
      console.log('Calculated avgHumidity:', avgHumidity);
      const avgLuminosity = this.calculateAverage(recentMeasurements, 'Luminosité');
      console.log('Calculated avgLuminosity:', avgLuminosity);
      const soilHumidity = recentMeasurements.length > 0 ? 
        recentMeasurements[recentMeasurements.length - 1]['Humidité du sol'] : 0;
      console.log('Calculated soilHumidity:', soilHumidity);

      // Calcul de la consommation énergétique (kWh)
      const energyConsumption = (
        this.pumpPower * (totals.totalPumpSeconds / 3600) +
        this.fanPower * (totals.totalFanSeconds / 3600) +
        this.heaterPower * (totals.totalHeaterSeconds / 3600) +
        this.lampPower * (totals.totalLampSeconds / 3600)
      ) / 1000;
      console.log('Calculated total energyConsumption:', energyConsumption);

      // Calcul du volume d'eau (litres)
      const totalWaterVolume = (totals.totalPumpSeconds / 3600) * 60 * this.waterFlowRate;
      console.log('Calculated totalWaterVolume:', totalWaterVolume);

      // Calcul de l'intervalle d'arrosage moyen
      let wateringIntervals = [];
      for (let i = 0; i < recentMeasurements.length - 1; i++) {
        if (recentMeasurements[i].Pompe === false && recentMeasurements[i + 1].Pompe === true) {
          const startTime = new Date(recentMeasurements[i].id);
          const endTime = new Date(recentMeasurements[i + 1].id);
          if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
            const interval = (endTime - startTime) / (1000 * 3600);
            wateringIntervals.push(interval);
          }
        }
      }
      const avgWateringInterval = wateringIntervals.length > 0
        ? wateringIntervals.reduce((sum, val) => sum + val, 0) / wateringIntervals.length
        : 0;
      console.log('Calculated avgWateringInterval:', avgWateringInterval);

      // Calcul du nombre d'interventions manuelles
      const dayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      console.log('Fetching manual commands for period:', todayStart.toISOString(), 'to', dayEnd.toISOString());
      const manualCommandsSnapshot = await this.db.ref('serre_commandes_manuelles')
        .orderByChild('timestamp')
        .startAt(todayStart.toISOString())
        .endAt(dayEnd.toISOString())
        .limitToLast(100)
        .once('value');
      const manualCommands = manualCommandsSnapshot.val();
      const manualInterventionCount = manualCommands ? Object.keys(manualCommands).length : 0;
      console.log('Calculated manualInterventionCount:', manualInterventionCount);

      // Création du KPI
      const kpi = new KPI({
        avgTemperature,
        avgHumidity,
        soilHumidity,
        avgLuminosity,
        sunlightDuration: dailyTotals.dailySunlightSeconds / 3600,
        lowLightDuration: dailyTotals.dailyLowLightSeconds / 3600,
        ventilationDuration: dailyTotals.dailyFanSeconds / 3600,
        heatingDuration: dailyTotals.dailyHeaterSeconds / 3600,
        pumpDuration: dailyTotals.dailyPumpSeconds / 3600,
        lampDuration: dailyTotals.dailyLampSeconds / 3600,
        energyConsumption,
        totalWaterVolume,
        avgWateringInterval,
        manualInterventionCount,
        lastUpdate: measurements[measurements.length - 1].id,
        updatedAt: now.toISOString(),
        dailyTotals
      });

      console.log('KPI object before validation:', kpi.toJSON());
      kpi.validate();

      console.log('Saving daily KPI');
      await this.kpisRef.child('daily').set(kpi.toJSON());
      console.log('Daily KPI saved');
      this.broadcastKPIs(kpi);

    } catch (error) {
      console.error('Error in calculateKPIsIncrementally:', error.message, 'Code:', error.code, error.stack);
      throw error;
    }
  }

  calculateAverage(measurements, field) {
    if (measurements.length === 0) return 0;
    
    const validMeasurements = measurements.filter(m => 
      typeof m[field] === 'number' && !isNaN(m[field]) && isFinite(m[field])
    );
    
    if (validMeasurements.length === 0) return 0;
    
    const sum = validMeasurements.reduce((total, m) => total + m[field], 0);
    return sum / validMeasurements.length;
  }

  async saveDailyKPIs(kpi) {
    try {
      if (!kpi.lastUpdate) {
        console.warn('No lastUpdate in KPI, skipping save');
        return;
      }
      const date = new Date(kpi.lastUpdate);
      const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const dailyAverages = await this.calculateDailyAverages(todayStart);
      
      const dailyKPI = new KPI({
        ...kpi.toJSON(),
        avgTemperature: dailyAverages.avgTemperature,
        avgHumidity: dailyAverages.avgHumidity,
        soilHumidity: dailyAverages.soilHumidity,
        avgLuminosity: dailyAverages.avgLuminosity,
        avgWateringInterval: dailyAverages.avgWateringInterval,
        manualInterventionCount: dailyAverages.manualInterventionCount
      });

      console.log('Saving daily KPIs for:', dateKey);
      await this.kpisRef.child('history').child(dateKey).set(dailyKPI.toJSON());
      console.log(`Saved daily KPIs to history for ${dateKey}`);
    } catch (error) {
      console.error('Error saving daily KPIs:', error.message, error.stack);
    }
  }

  async calculateDailyAverages(todayStart) {
    try {
      console.log('Calculating daily averages for:', todayStart.toISOString());
      const dayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      console.log('Defined dayEnd:', dayEnd.toISOString());
      
      console.log('Fetching measurements for daily averages from', todayStart.toISOString(), 'to', dayEnd.toISOString());
      console.log('Before Firebase query, dayEnd:', dayEnd.toISOString());
      
      const measurementsSnapshot = await this.measurementsRef
        .orderByKey()
        .startAt(todayStart.toISOString())
        .endAt(dayEnd.toISOString())
        .limitToLast(500)
        .once('value');
      
      console.log('After Firebase query, dayEnd:', dayEnd.toISOString());
      
      const measurements = [];
      const invalidKeys = [];
      const invalidData = [];
      
      measurementsSnapshot.forEach(child => {
        const key = child.key;
        if (!this.isValidTimestamp(key)) {
          invalidKeys.push(key);
          console.warn(`Skipping invalid measurement key: ${key}`);
          return true;
        }
        const data = this.convertMeasurementData(child.val());
        if (!this.isValidMeasurement({ id: key, ...data })) {
          invalidData.push({ key, data });
          console.warn(`Skipping invalid measurement data for key: ${key}`, data);
          return true;
        }
        measurements.push({ id: key, ...data });
        return true;
      });

      if (invalidKeys.length > 0 || invalidData.length > 0) {
        console.error('Validation issues found in measurements:', {
          invalidKeys,
          invalidData
        });
      }
      console.log('Retrieved measurements for daily averages:', measurements.length);

      const validMeasurements = measurements.filter(m => this.isValidMeasurement(m));
      if (validMeasurements.length !== measurements.length) {
        console.warn(`Filtered out ${measurements.length - validMeasurements.length} invalid measurements for daily averages`);
      }

      const avgTemperature = this.calculateAverage(validMeasurements, 'Température');
      const avgHumidity = this.calculateAverage(validMeasurements, 'Humidité');
      const avgLuminosity = this.calculateAverage(validMeasurements, 'Luminosité');
      const soilHumidity = validMeasurements.length > 0 ? 
        validMeasurements[validMeasurements.length - 1]['Humidité du sol'] : 0;

      let wateringIntervals = [];
      for (let i = 0; i < validMeasurements.length - 1; i++) {
        if (validMeasurements[i].Pompe === false && validMeasurements[i + 1].Pompe === true) {
          const startTime = new Date(validMeasurements[i].id);
          const endTime = new Date(validMeasurements[i + 1].id);
          if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
            const interval = (endTime - startTime) / (1000 * 3600);
            wateringIntervals.push(interval);
          }
        }
      }
      const avgWateringInterval = wateringIntervals.length > 0
        ? wateringIntervals.reduce((sum, val) => sum + val, 0) / wateringIntervals.length
        : 0;

      console.log('Before manual commands query, dayEnd:', dayEnd.toISOString());
      const manualCommandsSnapshot = await this.db.ref('serre_commandes_manuelles')
        .orderByChild('timestamp')
        .startAt(todayStart.toISOString())
        .endAt(dayEnd.toISOString())
        .limitToLast(100)
        .once('value');
      console.log('After manual commands query, dayEnd:', dayEnd.toISOString());
      
      const manualCommands = manualCommandsSnapshot.val();
      const manualInterventionCount = manualCommands ? Object.keys(manualCommands).length : 0;

      return {
        avgTemperature,
        avgHumidity,
        soilHumidity,
        avgLuminosity,
        avgWateringInterval,
        manualInterventionCount
      };
    } catch (error) {
      console.error('Error calculating daily averages:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        query: {
          path: '/serre_mesures',
          startAt: todayStart.toISOString(),
          endAt: dayEnd ? dayEnd.toISOString() : 'undefined',
          limit: 500
        }
      });
      return {
        avgTemperature: 0,
        avgHumidity: 0,
        soilHumidity: 0,
        avgLuminosity: 0,
        avgWateringInterval: 0,
        manualInterventionCount: 0
      };
    }
  }

  /* API Endpoints */
  async getKPIs(req, res) {
    try {
      const kpis = await this.getCurrentKPIs();
      res.status(200).json(kpis);
    } catch (error) {
      console.error('Error fetching KPIs:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to fetch KPIs' });
    }
  }

  async calculateKPIs(req, res) {
    try {
      await this.processBuffer();
      const kpis = await this.getCurrentKPIs();
      
      if (res && typeof res.status === 'function') {
        res.status(200).json(kpis);
      }
      return kpis;
    } catch (error) {
      console.error('Error calculating KPIs:', error.message, error.stack);
      
      if (res && typeof res.status === 'function') {
        res.status(500).json({ 
          error: 'Failed to calculate KPIs',
          details: error.message 
        });
      }
      throw error;
    }
  }

  async updateKPIs({ energyConsumption, totalWaterVolume }) {
    try {
      if (typeof energyConsumption !== 'number' || energyConsumption < 0) {
        throw new Error('Invalid energyConsumption: must be a non-negative number');
      }
      if (typeof totalWaterVolume !== 'number' || totalWaterVolume < 0) {
        throw new Error('Invalid totalWaterVolume: must be a non-negative number');
      }

      const kpiSnapshot = await this.kpisRef.child('daily').once('value');
      const currentKPI = kpiSnapshot.val() || {};
      const updatedKPI = {
        ...currentKPI,
        energyConsumption,
        totalWaterVolume,
        updatedAt: new Date().toISOString()
      };

      await this.kpisRef.child('daily').set(updatedKPI);
      this.broadcastKPIs(updatedKPI);
      console.log('Updated energyConsumption and totalWaterVolume:', updatedKPI);
      return updatedKPI;
    } catch (error) {
      console.error('Error updating KPIs:', error.message, error.stack);
      throw error;
    }
  }

  /* Méthodes utilitaires */
  async forceManualReset(type) {
    try {
      const now = new Date();
      console.log(`Forcing manual reset of type: ${type}`);
      
      if (type === 'daily') {
        const kpiSnapshot = await this.kpisRef.child('daily').once('value');
        const kpi = kpiSnapshot.val() ? KPI.fromJSON(kpiSnapshot.val()) : new KPI({});
        
        if (kpi.lastUpdate) {
          await this.saveDailyKPIs(kpi);
        }
        
        await this.kpisRef.child('daily').set(new KPI({
          dailyTotals: {
            dailyPumpSeconds: 0,
            dailyFanSeconds: 0,
            dailyHeaterSeconds: 0,
            dailyLampSeconds: 0,
            dailySunlightSeconds: 0,
            dailyLowLightSeconds: 0
          },
          avgTemperature: 0,
          avgHumidity: 0,
          avgLuminosity: 0,
          soilHumidity: 0,
          sunlightDuration: 0,
          lowLightDuration: 0,
          ventilationDuration: 0,
          heatingDuration: 0,
          pumpDuration: 0,
          lampDuration: 0,
          energyConsumption: 0,
          totalWaterVolume: 0,
          avgWateringInterval: 0,
          manualInterventionCount: 0,
          updatedAt: now.toISOString()
        }).toJSON());
        
        this.lastDailyReset = now;
        this.recentMeasurementsCache = [];
        this.processedTimestamps.clear();
        console.log('Manual daily reset completed');
      } 
      else if (type === 'monthly') {
        await this.kpisRef.child('totals').set({
          totalPumpSeconds: 0,
          totalFanSeconds: 0,
          totalHeaterSeconds: 0,
          totalLampSeconds: 0
        });
        
        await this.kpisRef.child('resetTimestamp').set(now.toISOString());
        console.log('Manual monthly reset completed');
      }
      else if (type === 'full') {
        // Sauvegarder les KPIs actuels avant réinitialisation complète
        const kpiSnapshot = await this.kpisRef.child('daily').once('value');
        const kpi = kpiSnapshot.val() ? KPI.fromJSON(kpiSnapshot.val()) : new KPI({});
        
        if (kpi.lastUpdate) {
          await this.saveDailyKPIs(kpi);
        }
        
        // Réinitialiser tous les champs à 0
        await this.kpisRef.child('daily').set(new KPI({
          dailyTotals: {
            dailyPumpSeconds: 0,
            dailyFanSeconds: 0,
            dailyHeaterSeconds: 0,
            dailyLampSeconds: 0,
            dailySunlightSeconds: 0,
            dailyLowLightSeconds: 0
          },
          avgTemperature: 0,
          avgHumidity: 0,
          avgLuminosity: 0,
          soilHumidity: 0,
          sunlightDuration: 0,
          lowLightDuration: 0,
          ventilationDuration: 0,
          heatingDuration: 0,
          pumpDuration: 0,
          lampDuration: 0,
          energyConsumption: 0,
          totalWaterVolume: 0,
          avgWateringInterval: 0,
          manualInterventionCount: 0,
          updatedAt: now.toISOString()
        }).toJSON());

        await this.kpisRef.child('totals').set({
          totalPumpSeconds: 0,
          totalFanSeconds: 0,
          totalHeaterSeconds: 0,
          totalLampSeconds: 0
        });

        await this.kpisRef.child('resetTimestamp').set(now.toISOString());

        // Réinitialiser l'état interne
        this.lastDailyReset = now;
        this.lastMeasurementTime = null;
        this.lastCacheUpdate = null;
        this.lastCacheTimestamp = null;
        this.recentMeasurementsCache = [];
        this.processedTimestamps.clear();
        this.measurementBuffer = [];

        console.log('Full reset completed: all KPI fields set to 0');
      }
      else {
        throw new Error(`Invalid reset type: ${type}. Must be 'daily', 'monthly', or 'full'.`);
      }

      // Diffuser les KPIs réinitialisés
      const resetKPI = await this.getCurrentKPIs();
      this.broadcastKPIs(resetKPI);
    } catch (error) {
      console.error('Error during manual reset:', error.message, error.stack);
      throw error;
    }
  }

  async archiveOldData() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      console.log('Archiving data before:', sevenDaysAgo);
      const snapshot = await this.measurementsRef
        .orderByKey()
        .endAt(sevenDaysAgo)
        .once('value');
      
      if (snapshot.exists()) {
        await this.db.ref('serre_mesures_archive').push(snapshot.val());
        await this.measurementsRef
          .orderByKey()
          .endAt(sevenDaysAgo)
          .remove();
        console.log('Archived and removed old data before', sevenDaysAgo);
      }
    } catch (error) {
      console.error('Error archiving old data:', error.message, error.stack);
    }
  }
}

module.exports = KPIController;