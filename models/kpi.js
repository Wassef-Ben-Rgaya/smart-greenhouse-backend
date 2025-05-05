class KPI {
    constructor({
        avgTemperature = 0,
        avgHumidity = 0,
        soilHumidity = 0,
        avgLuminosity = 0,
        sunlightDuration = 0,
        lastUpdate = null,
        ventilationDuration = 0,
        heatingDuration = 0,
        energyConsumption = 0,
        avgWateringInterval = 0,
        manualInterventionCount = 0,
        lightEfficiency = 0,
        totalWaterVolume = 0,
        updatedAt = null,
        pumpDuration = 0,
        lampDuration = 0,
        lowLightDuration = 0,
        dailyTotals = null
    } = {}) {
        this.avgTemperature = avgTemperature;
        this.avgHumidity = avgHumidity;
        this.soilHumidity = soilHumidity;
        this.avgLuminosity = avgLuminosity;
        this.sunlightDuration = sunlightDuration;
        this.lastUpdate = lastUpdate;
        this.ventilationDuration = ventilationDuration;
        this.heatingDuration = heatingDuration;
        this.energyConsumption = energyConsumption;
        this.avgWateringInterval = avgWateringInterval;
        this.manualInterventionCount = manualInterventionCount;
        this.lightEfficiency = lightEfficiency;
        this.totalWaterVolume = totalWaterVolume;
        this.updatedAt = updatedAt;
        this.pumpDuration = pumpDuration;
        this.lampDuration = lampDuration;
        this.lowLightDuration = lowLightDuration;
        this.dailyTotals = dailyTotals;
    }

    validate() {
        if (this.ventilationDuration < 0) throw new Error('Validation error: "ventilationDuration" must be greater than or equal to 0');
        if (this.heatingDuration < 0) throw new Error('Validation error: "heatingDuration" must be greater than or equal to 0');
        if (this.energyConsumption < 0) throw new Error('Validation error: "energyConsumption" must be greater than or equal to 0');
        if (this.avgWateringInterval < 0) throw new Error('Validation error: "avgWateringInterval" must be greater than or equal to 0');
        if (this.lightEfficiency < 0) throw new Error('Validation error: "lightEfficiency" must be greater than or equal to 0');
        if (this.totalWaterVolume < 0) throw new Error('Validation error: "totalWaterVolume" must be greater than or equal to 0');
        if (this.pumpDuration < 0) throw new Error('Validation error: "pumpDuration" must be greater than or equal to 0');
        if (this.lampDuration < 0) throw new Error('Validation error: "lampDuration" must be greater than or equal to 0');
        if (this.lowLightDuration < 0) throw new Error('Validation error: "lowLightDuration" must be greater than or equal to 0');
    }

    toJSON() {
        return {
            avgTemperature: this.avgTemperature,
            avgHumidity: this.avgHumidity,
            soilHumidity: this.soilHumidity,
            avgLuminosity: this.avgLuminosity,
            sunlightDuration: this.sunlightDuration,
            lastUpdate: this.lastUpdate,
            ventilationDuration: this.ventilationDuration,
            heatingDuration: this.heatingDuration,
            energyConsumption: this.energyConsumption,
            avgWateringInterval: this.avgWateringInterval,
            manualInterventionCount: this.manualInterventionCount,
            lightEfficiency: this.lightEfficiency,
            totalWaterVolume: this.totalWaterVolume,
            updatedAt: this.updatedAt,
            pumpDuration: this.pumpDuration,
            lampDuration: this.lampDuration,
            lowLightDuration: this.lowLightDuration,
            dailyTotals: this.dailyTotals
        };
    }

    static fromJSON(json) {
        return new KPI(json);
    }
}

module.exports = KPI;