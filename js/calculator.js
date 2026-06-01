// calculator.js
class CalculatorService {
    calculateRate(drug, preparation, weight, dose) {
        if (!drug || !preparation || dose === undefined || dose === null) return 0;
        
        let rate = 0;
        
        if (drug.formulaType === 'weight_based') {
            if (!weight) return 0;
            // rate_ml_hr = (dose × weight × 60) ÷ concentration
            // dose in mcg/kg/min, weight in kg, concentration in mcg/ml
            rate = (dose * weight * 60) / preparation.concentration;
        } else if (drug.formulaType === 'fixed_dose') {
            // rate_ml_hr = (dose × 60) ÷ concentration
            // Example GTN: dose in mcg/min, conc in mcg/ml
            rate = (dose * 60) / preparation.concentration;
        }

        return Number(rate.toFixed(1));
    }

    generateDoseTable(drug, preparation, weight) {
        if (!drug || !preparation) return [];
        if (drug.weightBased && !weight) return [];

        const table = [];
        
        if (drug.dosePoints && Array.isArray(drug.dosePoints)) {
            // Mode 2: Explicit dose points
            drug.dosePoints.forEach(point => {
                const rate = this.calculateRate(drug, preparation, weight, point);
                table.push({
                    dose: Number(point.toFixed(2)),
                    rate: rate
                });
            });
        } else {
            // Mode 1: Generated range
            let currentDose = drug.doseMin;
            
            // Safety guard for infinite loops
            let iterations = 0;
            while (currentDose <= drug.doseMax && iterations < 100) {
                const rate = this.calculateRate(drug, preparation, weight, currentDose);
                table.push({
                    dose: Number(currentDose.toFixed(2)),
                    rate: rate
                });
                currentDose += drug.doseStep;
                iterations++;
            }
        }
        
        return table;
    }
}

window.calculatorService = new CalculatorService();
