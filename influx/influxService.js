const Influx = require('influx');

const influx = new Influx.InfluxDB({
  host: '192.168.1.6',
  database: 'serre_db',
  username: 'wassef',
  password: 'admin',
});

const checkConnection = async () => {
  try {
    const databases = await influx.getDatabaseNames();
    if (databases.includes('serre_db')) {
      console.log("✅ Connexion à InfluxDB réussie");
    } else {
      console.log("❌ La base de données 'serre_db' n'existe pas !");
    }
  } catch (error) {
    console.error("❌ Erreur de connexion à InfluxDB:", error.message);
  }
};

const getData = async () => {
  try {
    const result = await influx.query(`
      SELECT "Température", "Humidité", "Humidité du sol", "Luminosité", "Chauffage", "Lampe", "Pompe", "Ventilateur"
      FROM "Serre"
      WHERE time > now() - 2d
      ORDER BY time DESC
      LIMIT 1
    `);
    return result;
  } catch (error) {
    throw new Error('Erreur lors de la récupération des données InfluxDB: ' + error.message);
  }
};

const insertData = async (data) => {
  const { temperature, humidity, soilHumidity, luminosity, heating, lamp, pump, fan } = data;

  try {
    await influx.writePoints([
      {
        measurement: 'serre_final',
        fields: {
          Température: parseFloat(temperature),
          Humidité: parseFloat(humidity),
          'Humidité du sol': parseFloat(soilHumidity),
          Luminosité: parseFloat(luminosity),
          Chauffage: parseInt(heating),
          Lampe: parseInt(lamp),
          Pompe: parseInt(pump),
          Ventilateur: parseInt(fan),
        },
      },
    ]);
    console.log("✅ Données insérées avec succès");
  } catch (error) {
    throw new Error('Erreur lors de l\'insertion des données dans InfluxDB: ' + error.message);
  }
};

checkConnection();

module.exports = { getData, insertData };
