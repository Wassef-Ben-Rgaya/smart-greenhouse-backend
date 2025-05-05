const { getData, insertData } = require('../influx/influxService');

// Route POST pour insérer des données dans InfluxDB
exports.insertInfluxData = async (req, res) => {
  const { temperature, humidity, soilHumidity, luminosity, heating, lamp, pump, fan } = req.body;

  try {
    await insertData({
      temperature,
      humidity,
      soilHumidity,
      luminosity,
      heating,
      lamp,
      pump,
      fan,
    });
    res.json({ message: "✅ Données insérées avec succès" });
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données dans InfluxDB', error);
    res.status(500).json({ message: 'Erreur lors de l\'insertion des données dans InfluxDB', error: error.message });
  }
};

// Route GET pour récupérer les données d'InfluxDB
exports.getInfluxData = async (req, res) => {
  try {
    const data = await getData();
    if (data.length > 0) {
      const lastPoint = data[0];
      res.json(lastPoint);
    } else {
      res.status(404).json({ message: 'Aucune donnée trouvée dans InfluxDB' });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des données InfluxDB', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des données InfluxDB', error: error.message });
  }
};
