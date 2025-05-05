const MeasurementModel = require('../models/measurement');
const WebSocket = require('ws');
const Joi = require('joi');

class MeasurementController {
  constructor() {
    const db = require('../config/firebaseRealtime');
    this.model = new MeasurementModel(db);

    // Schéma de validation
    this.measurementSchema = Joi.object({
        id: Joi.string().required(), // Ajout du champ id requis
        Chauffage: Joi.number().valid(0, 1).allow(null),
        Humidité: Joi.number().min(0).max(100).allow(null),
        'Humidité du sol': Joi.number().valid(0, 1).allow(null),
        Lampe: Joi.number().valid(0, 1).allow(null),
        Luminosité: Joi.number().min(0).allow(null),
        Pompe: Joi.number().valid(0, 1).allow(null),
        Température: Joi.number().allow(null),
        Ventilateur: Joi.number().valid(0, 1).allow(null),
        timestamp: Joi.string().isoDate().required() // Changé de 'time' à 'timestamp'
      });

    // WebSocket Server
    this.wss = new WebSocket.Server({ noServer: true });
    this.setupWebSocket();

    this.createMeasurement = this.createMeasurement.bind(this);
    this.getMeasurements = this.getMeasurements.bind(this);
    this.updateMeasurement = this.updateMeasurement.bind(this);
    this.deleteMeasurement = this.deleteMeasurement.bind(this);
    this.handleUpgrade = this.handleUpgrade.bind(this);
  }

    handleUpgrade(request, socket, head) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('New WebSocket connection');
            
            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });
    }

    broadcastUpdate(measurement) { 
      this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                  type: 'measurement_update',
                  data: measurement
              }));
          }
      });
  }

  async createMeasurement(req, res) {
    try {
      // Validation des données
      const { error, value } = this.measurementSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      // Transformation des noms de champs si nécessaire
      const measurementData = {
        Chauffage: value.Chauffage,
        Humidite: value['Humidité'], // Adaptation des noms
        Humidite_sol: value['Humidité du sol'],
        Lampe: value.Lampe,
        Luminosite: value['Luminosité'],
        Pompe: value.Pompe,
        Temperature: value['Température'],
        Ventilateur: value.Ventilateur,
        time: value.timestamp // Mapping timestamp -> time
      };
  
      const result = await this.model.create(measurementData);
      this.broadcastUpdate(result);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

    async getMeasurements(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const since = req.query.since;
            
            let measurements;
            if (since) {
                measurements = await this.model.getSince(since, limit);
            } else {
                measurements = await this.model.getAll(limit);
            }
            
            res.json(measurements);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateMeasurement(req, res) {
        try {
            const { id } = req.params;
            const measurementData = {
                ...req.body,
                time: new Date().toISOString()
            };

            const result = await this.model.update(id, measurementData);
            
            // Broadcast to WebSocket clients
            this.broadcastUpdate(result);
            
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async deleteMeasurement(req, res) {
        try {
            const { id } = req.params;
            const result = await this.model.delete(id);
            
            // Broadcast deletion to WebSocket clients
            this.wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'measurement_deleted',
                        id: id
                    }));
                }
            });
            
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new MeasurementController();