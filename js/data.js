// data.js
class DataService {
    constructor() {
        this.remoteDrugsUrl = 'https://dr-afif.github.io/ED-IVMeds-Admin/data/drugs.json';
        this.remoteMetaUrl = 'https://dr-afif.github.io/ED-IVMeds-Admin/data/database-meta.json';
        this.localDrugsUrl = 'data/drugs.json';
        this.cacheKeys = {
            drugs: 'ed_ivmeds_remote_drugs_cache',
            meta: 'ed_ivmeds_remote_database_meta_cache',
            syncTime: 'ed_ivmeds_remote_last_sync_time'
        };
        this.drugs = [];
        this.sortedDrugs = [];
        this.alphabeticalGroups = [];
        this.alphabetLetters = [];
        this.databaseMeta = {};
        this.dataSource = 'Local fallback';
    }

    async loadData() {
        const cachedDrugs = this.getCachedJson(this.cacheKeys.drugs);
        if (this.isValidMedicationArray(cachedDrugs)) {
            this.setData(cachedDrugs, this.getCachedJson(this.cacheKeys.meta) || {}, 'Cached online');
            return this.drugs;
        }

        const localDrugs = await this.fetchJson(this.localDrugsUrl);
        if (this.isValidMedicationArray(localDrugs)) {
            this.setData(localDrugs, {}, 'Local fallback');
            return this.drugs;
        }

        console.error('No valid medication data source available.');
        this.setData([], {}, 'Local fallback');
        return this.drugs;
    }

    async revalidateRemoteData() {
        const remoteMeta = await this.fetchRemoteMeta(true);
        const remoteDrugs = await this.fetchJson(this.remoteDrugsUrl, { silent: true });

        if (!remoteDrugs) return false;

        if (!this.isValidMedicationArray(remoteDrugs)) {
            console.warn('Remote medication data failed validation. Keeping current data.');
            return false;
        }

        if (!this.isRemoteNewer(remoteMeta)) return false;

        const syncTime = new Date().toISOString();
        this.saveCachedJson(this.cacheKeys.drugs, remoteDrugs);
        if (remoteMeta) this.saveCachedJson(this.cacheKeys.meta, remoteMeta);
        localStorage.setItem(this.cacheKeys.syncTime, syncTime);
        this.setData(remoteDrugs, remoteMeta || {}, 'Updated online');
        window.searchService?.init(this.drugs);
        window.dispatchEvent(new CustomEvent('edivmeds:data-updated', {
            detail: this.getDatabaseMetadata()
        }));
        return true;
    }

    async fetchRemoteMeta(silent = false) {
        const meta = await this.fetchJson(this.remoteMetaUrl, { silent });
        return meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : null;
    }

    async fetchJson(url, options = {}) {
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            if (!options.silent) console.warn(`Unable to load ${url}:`, error);
            return null;
        }
    }

    isValidMedicationArray(value) {
        return Array.isArray(value) && value.length > 0 && value.every(drug => {
            return drug &&
                typeof drug === 'object' &&
                typeof drug.id === 'string' &&
                typeof drug.name === 'string' &&
                typeof drug.category === 'string' &&
                Array.isArray(drug.preparations);
        });
    }

    setData(drugs, meta, source) {
        this.drugs = drugs;
        this.databaseMeta = meta || {};
        this.dataSource = source;
        this.buildAlphabeticalIndex();
    }

    saveCachedJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Unable to cache ${key}:`, error);
        }
    }

    getCachedJson(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn(`Unable to read cached ${key}:`, error);
            return null;
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

    getDatabaseMetadata() {
        const version = this.databaseMeta.version ||
            this.databaseMeta.databaseVersion ||
            this.databaseMeta.drugDatabaseVersion ||
            this.getDerivedDatabaseVersion();

        const lastUpdated = this.databaseMeta.lastUpdated ||
            this.databaseMeta.lastDatabaseUpdate ||
            this.databaseMeta.updatedAt ||
            this.databaseMeta.lastReviewed ||
            this.getLatestDatabaseUpdate();

        return {
            version,
            lastUpdated,
            lastSyncTime: localStorage.getItem(this.cacheKeys.syncTime),
            source: this.dataSource
        };
    }

    isRemoteNewer(remoteMeta) {
        if (!this.isValidMedicationArray(this.getCachedJson(this.cacheKeys.drugs))) return true;
        if (!remoteMeta) return this.dataSource === 'Local fallback';

        const current = this.getDatabaseMetadata();
        const remoteLastUpdated = remoteMeta.lastUpdated ||
            remoteMeta.lastDatabaseUpdate ||
            remoteMeta.updatedAt ||
            remoteMeta.lastReviewed ||
            null;
        const remoteVersion = remoteMeta.version ||
            remoteMeta.databaseVersion ||
            remoteMeta.drugDatabaseVersion ||
            null;

        if (!current.version && !current.lastUpdated) return true;
        if (remoteLastUpdated && current.lastUpdated) return remoteLastUpdated > current.lastUpdated;
        if (remoteLastUpdated && !current.lastUpdated) return true;
        if (remoteVersion && current.version) return remoteVersion !== current.version;
        if (remoteVersion && !current.version) return true;

        return this.dataSource === 'Local fallback';
    }

    getDerivedDatabaseVersion() {
        const latestUpdate = this.getLatestDatabaseUpdate();
        return latestUpdate ? `DB-${latestUpdate.replaceAll('-', '.')}` : null;
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
