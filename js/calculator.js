// calculator.js
class CalculatorService {
    calculateRate(drug, preparation, weight, dose) {
        if (!drug || !preparation || dose === undefined || dose === null || !preparation.concentration) return 0;
        
        let rate = dose;
        
        const dUnit = (drug.doseUnit || '').toLowerCase();
        const cUnit = (preparation.concentrationUnit || 'mcg/ml').toLowerCase();
        
        // 1. Time conversion (to /hr)
        if (dUnit.includes('/min') || dUnit.includes('min')) {
            rate *= 60;
        }
        
        // 2. Weight conversion
        if (dUnit.includes('/kg') || dUnit.includes('kg')) {
            if (!weight) return 0;
            rate *= weight;
        }
        
        // 3. Mass unit conversion
        const getMass = (unitStr) => {
            if (unitStr.includes('mcg')) return 1;
            if (unitStr.includes('mg')) return 1000;
            if (unitStr.includes('g') && !unitStr.includes('mcg') && !unitStr.includes('mg')) return 1000000;
            if (unitStr.includes('iu') || unitStr.includes('unit')) return 'iu';
            return 1;
        };
        
        const doseMass = getMass(dUnit);
        const concMass = getMass(cUnit);
        
        if (doseMass !== 'iu' && concMass !== 'iu') {
            rate = rate * (doseMass / concMass);
        }
        
        // 4. Divide by concentration
        rate = rate / preparation.concentration;

        return Number(rate.toFixed(1));
    }

    generateDoseTable(drug, preparation, weight) {
        if (!drug || !preparation) return [];
        if (drug.weightBased && !weight) return [];

        const table = [];
        
        if (drug.dosePhases && Array.isArray(drug.dosePhases) && drug.dosePhases.length > 0) {
            drug.dosePhases.forEach(phase => {
                const mockDrug = { ...drug, doseUnit: phase.doseUnit };
                const rate = this.calculateRate(mockDrug, preparation, weight, phase.dose);
                table.push({
                    isPhase: true,
                    phaseName: phase.phase,
                    dose: phase.dose,
                    doseUnit: phase.doseUnit,
                    rate: rate
                });
            });
            return table;
        }
        
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
