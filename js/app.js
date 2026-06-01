// app.js
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('ServiceWorker registration successful');
        } catch (err) {
            console.log('ServiceWorker registration failed: ', err);
        }
    }

    // 2. Load Data
    const drugs = await window.dataService.loadData();
    
    // 3. Initialize Search
    window.searchService.init(drugs);
    
    // 4. Initialize UI
    window.uiService.init();
    
    // 5. Initial render
    window.uiService.showView('home');
});
