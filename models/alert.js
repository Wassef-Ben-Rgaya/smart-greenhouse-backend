class Alert {
  constructor({
    type,
    message,
    status = 'active',
    timestamp = new Date(),
    plantId = null,
    plantName = 'Inconnu',
    severity = 'medium',
    value = null,
    threshold = null,
    optimalRange = 'N/A',
    environnementId = null
  }) {
    this.type = type;
    this.message = message;
    this.status = status;
    this.timestamp = timestamp;
    this.plantId = plantId;
    this.plantName = plantName;
    this.severity = severity;
    this.value = value;
    this.threshold = threshold;
    this.optimalRange = optimalRange;
    this.environnementId = environnementId;
  }
}

module.exports = Alert;