// search.js
class SearchService {
    constructor() {
        this.drugs = [];
    }

    init(drugs) {
        this.drugs = drugs;
    }

    search(query) {
        if (!query || query.trim() === '') return [];
        
        const q = query.toLowerCase().trim();
        const results = [];
        
        const favorites = window.storageService ? window.storageService.getFavorites() : [];
        const recents = window.storageService ? window.storageService.getRecents() : [];

        this.drugs.forEach(drug => {
            let score = 0;
            const name = drug.name.toLowerCase();
            
            // Check name
            if (name === q) score = Math.max(score, 100);
            else if (name.startsWith(q)) score = Math.max(score, 80);
            else if (name.includes(q)) score = Math.max(score, 50);
            
            // Check aliases
            if (drug.aliases) {
                drug.aliases.forEach(alias => {
                    const a = alias.toLowerCase();
                    if (a === q) score = Math.max(score, 90);
                    else if (a.startsWith(q)) score = Math.max(score, 60);
                    else if (a.includes(q)) score = Math.max(score, 40);
                });
            }
            
            // Check searchTerms
            if (drug.searchTerms) {
                drug.searchTerms.forEach(term => {
                    const t = term.toLowerCase();
                    if (t === q) score = Math.max(score, 85);
                    else if (t.startsWith(q)) score = Math.max(score, 65);
                    else if (t.includes(q)) score = Math.max(score, 45);
                });
            }
            
            // Check indications
            if (drug.indications && drug.indications.some(ind => ind.toLowerCase().includes(q))) {
                score = Math.max(score, 20);
            }
            
            // Check category
            if (drug.category && drug.category.toLowerCase().includes(q)) {
                score = Math.max(score, 15);
            }

            if (score > 0) {
                // Add boosts
                if (favorites.includes(drug.id)) score += 5;
                if (recents.includes(drug.id)) score += 2;
                
                results.push({ drug, score });
            }
        });

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        
        return results.map(r => r.drug);
    }
}

window.searchService = new SearchService();
