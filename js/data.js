// data.js
class DataService {
    constructor() {
        this.drugs = [];
    }

    async loadData() {
        try {
            const response = await fetch('data/drugs.json');
            if (!response.ok) {
                throw new Error('Failed to load medication data');
            }
            this.drugs = await response.json();
            return this.drugs;
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback for offline if fetch fails but service worker hasn't cached yet
            return [];
        }
    }

    getAllDrugs() {
        return this.drugs;
    }

    getDrugById(id) {
        return this.drugs.find(drug => drug.id === id);
    }
}

window.dataService = new DataService();
