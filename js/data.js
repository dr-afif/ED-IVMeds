// data.js
class DataService {
    constructor() {
        this.drugs = [];
        this.sortedDrugs = [];
        this.alphabeticalGroups = [];
        this.alphabetLetters = [];
    }

    async loadData() {
        try {
            const response = await fetch('data/drugs.json');
            if (!response.ok) {
                throw new Error('Failed to load medication data');
            }
            this.drugs = await response.json();
            this.buildAlphabeticalIndex();
            return this.drugs;
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback for offline if fetch fails but service worker hasn't cached yet
            return [];
        }
    }

    buildAlphabeticalIndex() {
        this.sortedDrugs = [...this.drugs].sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });

        const groupMap = new Map();
        this.sortedDrugs.forEach(drug => {
            const firstChar = (drug.name || '#').trim().charAt(0).toUpperCase();
            const letter = firstChar && firstChar.match(/[A-Z]/) ? firstChar : '#';
            if (!groupMap.has(letter)) groupMap.set(letter, []);
            groupMap.get(letter).push(drug);
        });

        this.alphabeticalGroups = Array.from(groupMap, ([letter, drugs]) => ({ letter, drugs }));
        this.alphabetLetters = this.alphabeticalGroups.map(group => group.letter);
    }

    getAllDrugs() {
        return this.drugs;
    }

    getAlphabeticalGroups() {
        return this.alphabeticalGroups;
    }

    getAlphabetLetters() {
        return this.alphabetLetters;
    }

    getLatestDatabaseUpdate() {
        const dates = this.drugs
            .map(drug => drug.lastReviewed)
            .filter(Boolean)
            .sort();

        return dates.length > 0 ? dates[dates.length - 1] : null;
    }

    getDrugById(id) {
        return this.drugs.find(drug => drug.id === id);
    }
}

window.dataService = new DataService();
