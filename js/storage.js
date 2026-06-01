// storage.js
class StorageService {
    constructor() {
        this.weightKey = 'ed_iv_meds_weight';
        this.favoritesKey = 'ed_iv_meds_favorites';
        this.recentsKey = 'ed_iv_meds_recents';
    }

    // Weight
    getWeight() {
        const w = localStorage.getItem(this.weightKey);
        return w ? parseFloat(w) : null;
    }

    setWeight(weight) {
        localStorage.setItem(this.weightKey, weight);
    }

    // Favorites
    getFavorites() {
        const favs = localStorage.getItem(this.favoritesKey);
        return favs ? JSON.parse(favs) : [];
    }

    toggleFavorite(drugId) {
        let favs = this.getFavorites();
        if (favs.includes(drugId)) {
            favs = favs.filter(id => id !== drugId);
        } else {
            favs.push(drugId);
        }
        localStorage.setItem(this.favoritesKey, JSON.stringify(favs));
        return favs.includes(drugId);
    }

    isFavorite(drugId) {
        return this.getFavorites().includes(drugId);
    }

    reorderFavorite(draggedId, targetId) {
        let favs = this.getFavorites();
        const draggedIndex = favs.indexOf(draggedId);
        const targetIndex = favs.indexOf(targetId);
        
        if (draggedIndex > -1 && targetIndex > -1) {
            favs.splice(draggedIndex, 1);
            favs.splice(targetIndex, 0, draggedId);
            localStorage.setItem(this.favoritesKey, JSON.stringify(favs));
        }
    }

    // Recents
    getRecents() {
        const recents = localStorage.getItem(this.recentsKey);
        return recents ? JSON.parse(recents) : [];
    }

    addRecent(drugId) {
        let recents = this.getRecents();
        // Remove if already exists to move to top
        recents = recents.filter(id => id !== drugId);
        recents.unshift(drugId);
        // Keep only top 10
        if (recents.length > 10) {
            recents = recents.slice(0, 10);
        }
        localStorage.setItem(this.recentsKey, JSON.stringify(recents));
    }
}

window.storageService = new StorageService();
