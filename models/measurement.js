const admin = require('firebase-admin');

class MeasurementModel {
  constructor(db) {
    this.db = db;
    this.ref = this.db.ref('serre_mesures');
  }

  async create(measurementData) {
    const { id, ...data } = measurementData;
    if (!id) {
      throw new Error('Le champ id est requis');
    }

    // Utiliser l'id comme clé
    const measurementKey = id;
    console.log(`Writing measurement with key: ${measurementKey}`);

    // Stocker la mesure sous la clé id
    await this.ref.child(measurementKey).set(data);

    return {
      id: measurementKey,
      ...data
    };
  }

  async getAll(limit = 50) {
    const snapshot = await this.ref
      .orderByKey()
      .limitToLast(limit)
      .once('value');

    return this._formatSnapshot(snapshot);
  }

  async getSince(sinceDate, limit = 50) {
    const snapshot = await this.ref
      .orderByKey()
      .startAt(sinceDate)
      .limitToLast(limit)
      .once('value');

    return this._formatSnapshot(snapshot);
  }

  // models/measurement.js
// models/measurement.js
_formatSnapshot(snapshot) {
  const data = snapshot.val();
  if (!data) {
      console.log('No data in snapshot');
      return [];
  }

  console.log('Raw snapshot data:', data);

  const measurements = Object.keys(data)
      .map(key => ({
          id: key,
          ...data[key]
      }))
      .filter(item => {
          const date = new Date(item.id);
          if (isNaN(date.getTime())) {
              console.log(`Skipping measurement ${item.id}: invalid id as time`);
              return false;
          }
          return true;
      });

  // Tri croissant (du plus ancien au plus récent)
  return measurements.sort((a, b) => new Date(a.id) - new Date(b.id));
}
  async update(id, measurementData) {
    const measurementRef = this.ref.child(id);
    await measurementRef.update(measurementData);
    return { id, ...measurementData };
  }

  async delete(id) {
    const measurementRef = this.ref.child(id);
    await measurementRef.remove();
    return { id, message: "Mesure supprimée avec succès" };
  }
}

module.exports = MeasurementModel;