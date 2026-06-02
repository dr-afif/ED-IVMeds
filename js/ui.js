// ui.js
class UIService {
    constructor() {
        this.currentView = 'home';
        this.currentDrug = null;
        this.activePreparation = null;
        this.prepCache = {};
        this.activeInputTarget = null; // 'weight'
        this.keypadValue = '';
        this.activeCalculatorMode = 'weight_based';
        
        // Bind methods
        this.handleSearch = this.handleSearch.bind(this);
        this.handleKeypadClick = this.handleKeypadClick.bind(this);
        this.closeKeypad = this.closeKeypad.bind(this);
        
        // DOM Elements
        this.searchInput = document.getElementById('search-input');
        this.clearSearchBtn = document.getElementById('clear-search');
        this.homeView = document.getElementById('home-view');
        this.drugDetailView = document.getElementById('drug-detail-view');
        this.favoritesView = document.getElementById('favorites-view');
        this.calculatorsView = document.getElementById('calculators-view');
        this.referenceView = document.getElementById('reference-view');
        this.settingsView = document.getElementById('settings-view');
        
        this.homeDefaultContent = document.getElementById('home-default-content');
        this.searchResultsContent = document.getElementById('search-results-content');
        this.searchResultsList = document.getElementById('search-results-list');
        
        this.init();
    }

    init() {
        this.renderHomeLists();
        this.initTheme();
        this.syncWeightDisplay();

        // Search Input
        this.searchInput.addEventListener('input', this.handleSearch);
        
        // Clear Search
        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.clearSearchBtn.classList.add('hidden');
            this.handleSearch({ target: this.searchInput });
            this.searchInput.focus();
        });

        // Back Button
        document.getElementById('back-btn').addEventListener('click', () => {
            this.showView('home');
        });

        // Favorite Toggle
        document.getElementById('favorite-btn').addEventListener('click', () => {
            if (this.currentDrug) {
                this.vibrate();
                const isFav = window.storageService.toggleFavorite(this.currentDrug.id);
                this.updateFavoriteIcon(isFav);
                this.renderHomeLists();
                this.renderFavoritesViewList();
                if (this.searchInput.value.trim() !== '') {
                    this.handleSearch({ target: this.searchInput });
                }
            }
        });

        // Setup Keypad
        const keypadOverlay = document.getElementById('keypad-overlay');
        keypadOverlay.addEventListener('click', (e) => {
            if (e.target === keypadOverlay) this.closeKeypad();
        });
        document.getElementById('keypad-close').addEventListener('click', this.closeKeypad);
        
        document.querySelectorAll('.key-btn.num-btn').forEach(btn => {
            btn.addEventListener('click', this.handleKeypadClick);
        });
        document.getElementById('keypad-del').addEventListener('click', () => {
            this.vibrate();
            this.keypadValue = this.keypadValue.slice(0, -1);
            this.updateKeypadDisplay();
        });
        document.getElementById('keypad-clear').addEventListener('click', () => {
            this.vibrate();
            this.keypadValue = '';
            this.updateKeypadDisplay();
        });
        document.getElementById('keypad-done').addEventListener('click', () => {
            this.vibrate();
            this.applyKeypadValue();
            this.closeKeypad();
        });

        // Weight Input Trigger (Removed from UI, handled by patient bar)

        // Inline weight trigger on detail view
        document.getElementById('inline-weight-trigger').addEventListener('click', () => {
            this.openKeypad('weight');
        });

        // Bottom Nav Listeners
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.vibrate();
                const tab = item.dataset.tab;
                this.showView(tab);
            });
        });

        // See all favorites link on home view
        document.getElementById('home-see-all-favorites').addEventListener('click', () => {
            this.showView('favorites');
        });

        // Patient Bar triggers
        document.querySelectorAll('.patient-bar').forEach(bar => {
            bar.addEventListener('click', (e) => {
                // Prevent opening if clicking active view
                this.openKeypad('weight');
            });
        });

        // Calculator Mode Segmented Control
        document.querySelectorAll('#calculator-mode-selector .segment').forEach(btn => {
            btn.addEventListener('click', () => {
                this.vibrate();
                const mode = btn.dataset.mode;
                this.setCalculatorMode(mode);
            });
        });

        // Copy Table Button (Removed from UI)

        // Settings View Event Listeners
        document.getElementById('settings-weight-trigger').addEventListener('click', () => {
            this.openKeypad('weight');
        });

        // Theme selector buttons
        document.querySelectorAll('#theme-selector .segment').forEach(btn => {
            btn.addEventListener('click', () => {
                this.vibrate();
                const theme = btn.dataset.theme;
                this.applyTheme(theme);
            });
        });

        // Clear recents
        document.getElementById('clear-recents-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your recent searches?')) {
                localStorage.removeItem(window.storageService.recentsKey);
                this.renderHomeLists();
                alert('Recent searches cleared.');
            }
        });

        // Reset all app data
        document.getElementById('reset-app-btn').addEventListener('click', () => {
            if (confirm('WARNING: This will reset all your patient data, weight settings, and favorites. Continue?')) {
                localStorage.clear();
                this.initTheme();
                this.syncWeightDisplay();
                this.renderHomeLists();
                this.showView('home');
                alert('Application data reset successfully.');
            }
        });

        // Modal Listeners
        const prepModalOverlay = document.getElementById('prep-modal-overlay');
        const customConcModal = document.getElementById('custom-conc-modal');
        
        document.getElementById('open-prep-selector-btn').addEventListener('click', () => {
            if (this.currentDrug && this.currentDrug.preparations.length > 1) {
                this.openPrepModal();
            }
        });
        
        document.getElementById('prep-modal-close').addEventListener('click', () => this.closePrepModal());
        prepModalOverlay.addEventListener('click', (e) => {
            if (e.target === prepModalOverlay) this.closePrepModal();
        });
        
        document.getElementById('custom-conc-trigger').addEventListener('click', () => {
            this.closePrepModal();
            this.openCustomConcModal();
        });
        
        document.getElementById('custom-conc-close').addEventListener('click', () => this.closeCustomConcModal());
        document.getElementById('custom-conc-back').addEventListener('click', () => {
            this.closeCustomConcModal();
            this.openPrepModal();
        });
        
        document.getElementById('custom-conc-input-row').addEventListener('click', () => {
            this.openKeypad('custom_conc');
        });
        
        document.getElementById('apply-custom-conc-btn').addEventListener('click', () => {
            this.applyCustomConc();
        });
    }

    vibrate() {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    initTheme() {
        const theme = localStorage.getItem('ed_iv_meds_theme') || 'system';
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        localStorage.setItem('ed_iv_meds_theme', theme);
        
        // Update theme selector buttons active state
        document.querySelectorAll('#theme-selector .segment').forEach(btn => {
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        const root = document.documentElement;
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        } else {
            // System theme
            root.removeAttribute('data-theme');
            document.body.classList.remove('dark-mode', 'light-mode');
        }
    }

    showView(viewName) {
        // Hide all views
        this.homeView.classList.add('hidden');
        this.drugDetailView.classList.add('hidden');
        this.favoritesView.classList.add('hidden');
        this.calculatorsView.classList.add('hidden');
        this.referenceView.classList.add('hidden');
        this.settingsView.classList.add('hidden');

        // Update active class in bottom nav
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            if (item.dataset.tab === viewName || (viewName === 'detail' && item.dataset.tab === 'home')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        if (viewName === 'home') {
            this.homeView.classList.remove('hidden');
            this.renderHomeLists();
            if (this.searchInput.value.trim() !== '') {
                this.homeDefaultContent.classList.add('hidden');
                this.searchResultsContent.classList.remove('hidden');
            } else {
                this.homeDefaultContent.classList.remove('hidden');
                this.searchResultsContent.classList.add('hidden');
            }
        } else if (viewName === 'detail') {
            this.drugDetailView.classList.remove('hidden');
        } else if (viewName === 'favorites') {
            this.favoritesView.classList.remove('hidden');
            this.renderFavoritesViewList();
        } else if (viewName === 'settings') {
            this.settingsView.classList.remove('hidden');
            this.syncWeightDisplay();
        }
        
        this.currentView = viewName;
        window.scrollTo(0, 0);
    }

    syncWeightDisplay() {
        const weight = window.storageService.getWeight();
        const displays = document.querySelectorAll('.patient-weight-display');
        const patientBars = document.querySelectorAll('.patient-bar');
        
        if (weight) {
            displays.forEach(el => el.textContent = `${weight} kg`);
            patientBars.forEach(el => {
                el.classList.remove('weight-missing');
                const btn = el.querySelector('.edit-weight-btn-simple');
                if (btn) btn.textContent = 'Edit';
            });
            // Update sticky detail weight bar
            const detailBar = document.getElementById('inline-weight-trigger');
            if (detailBar) {
                detailBar.classList.remove('weight-missing');
                const btn = detailBar.querySelector('.edit-weight-btn-simple');
                if (btn) btn.textContent = 'Edit';
            }
            const calcWeightVal = document.getElementById('calc-weight-val');
            if (calcWeightVal) calcWeightVal.textContent = weight;
            const swDisplay = document.getElementById('settings-weight-display');
            if (swDisplay) swDisplay.textContent = weight;
        } else {
            displays.forEach(el => el.textContent = '-- kg');
            patientBars.forEach(el => {
                el.classList.add('weight-missing');
                const btn = el.querySelector('.edit-weight-btn-simple');
                if (btn) btn.textContent = 'Tap to Set';
            });
            // Update sticky detail weight bar
            const detailBar = document.getElementById('inline-weight-trigger');
            if (detailBar) {
                detailBar.classList.add('weight-missing');
                const btn = detailBar.querySelector('.edit-weight-btn-simple');
                if (btn) btn.textContent = 'Tap to Set';
            }
            const calcWeightVal2 = document.getElementById('calc-weight-val');
            if (calcWeightVal2) calcWeightVal2.textContent = '--';
            const swDisplay = document.getElementById('settings-weight-display');
            if (swDisplay) swDisplay.textContent = '--';
        }
        
        // Recalculate if detail view is active
        if (this.currentView === 'detail' && this.currentDrug) {
            this.renderDoseTable();
        }
    }

    renderHomeLists() {
        const favs = window.storageService.getFavorites();
        const recents = window.storageService.getRecents();
        const allDrugs = window.dataService.getAllDrugs();
        
        // Quick Actions — show favorites if any, otherwise show all drugs as defaults
        const quickContainer = document.getElementById('quick-actions-container');
        if (quickContainer) {
            quickContainer.innerHTML = '';
            quickContainer.parentElement.classList.remove('hidden');
            
            const pillSources = favs.length > 0
                ? favs.map(id => window.dataService.getDrugById(id)).filter(Boolean)
                : allDrugs;
            
            pillSources.forEach(drug => {
                const pill = document.createElement('div');
                let catClass = '';
                const catLower = drug.category.toLowerCase();
                if (catLower.includes('vasopressor')) catClass = 'cat-vasopressor';
                else if (catLower.includes('inotrope')) catClass = 'cat-inotrope';
                else if (catLower.includes('vasodilator')) catClass = 'cat-vasodilator';
                
                pill.className = `quick-action-pill ${catClass}`;
                
                pill.innerHTML = `
                    <div class="quick-action-name">${drug.name}</div>
                `;
                pill.addEventListener('click', () => {
                    this.vibrate();
                    this.openDrugDetail(drug);
                });
                quickContainer.appendChild(pill);
            });
        }

        // Recents
        const recentsList = document.getElementById('recents-list');
        if (recentsList) {
            recentsList.innerHTML = '';
            if (recents.length === 0) {
                recentsList.parentElement.classList.add('hidden');
            } else {
                recentsList.parentElement.classList.remove('hidden');
                recents.forEach(id => {
                    const drug = window.dataService.getDrugById(id);
                    if (drug) {
                        const li = this.createListItem(drug, 'recent');
                        recentsList.appendChild(li);
                    }
                });
            }
        }
    }

    renderFavoritesViewList() {
        const favs = window.storageService.getFavorites();
        const container = document.getElementById('favorites-list-view');
        const emptyState = document.getElementById('favorites-empty-state');
        const allDrugsContainer = document.getElementById('favorites-all-drugs-list');
        
        container.innerHTML = '';
        if (allDrugsContainer) allDrugsContainer.innerHTML = '';

        if (favs.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            container.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            favs.forEach(id => {
                const drug = window.dataService.getDrugById(id);
                if (drug) {
                    const li = this.createListItem(drug, 'favorite-view-item');
                    li.draggable = true;
                    li.dataset.id = drug.id;
                    li.addEventListener('dragstart', (e) => this.handleDragStart(e, li));
                    li.addEventListener('dragover', (e) => this.handleDragOver(e, li));
                    li.addEventListener('drop', (e) => this.handleDrop(e, li));
                    li.addEventListener('dragenter', (e) => this.handleDragEnter(e, li));
                    li.addEventListener('dragleave', (e) => this.handleDragLeave(e, li));
                    container.appendChild(li);
                }
            });
        }

        // Render all medications that are not favorited
        if (allDrugsContainer) {
            const allDrugs = window.dataService.getAllDrugs();
            const unfavorited = allDrugs.filter(d => !favs.includes(d.id));
            
            if (unfavorited.length === 0) {
                const p = document.createElement('p');
                p.textContent = "All medications have been favorited.";
                p.style.fontSize = '12px';
                p.style.color = 'var(--text-muted)';
                p.style.padding = '0 16px';
                allDrugsContainer.appendChild(p);
            } else {
                unfavorited.forEach(drug => {
                    const li = this.createListItem(drug, 'favorite-view-item');
                    allDrugsContainer.appendChild(li);
                });
            }
        }
    }

    renderCalculatorsViewList() {
        const list = document.getElementById('calculators-list');
        list.innerHTML = '';
        
        window.dataService.getAllDrugs().forEach(drug => {
            const div = document.createElement('div');
            div.className = 'list-item';
            
            div.innerHTML = `
                <svg class="list-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect></svg>
                <div class="list-content">
                    <div class="list-title">${drug.name} Calculator</div>
                    ${drug.aliases && drug.aliases.length > 0 ? `<div class="list-aliases">${drug.aliases.join(', ')}</div>` : ''}
                    <div class="list-subtitle">${drug.weightBased ? 'Weight-Based' : 'Fixed Dose'} (${drug.doseUnit})</div>
                </div>
                <div class="list-action">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            `;
            
            div.addEventListener('click', () => {
                this.vibrate();
                this.openDrugDetail(drug);
                // After detail loads, scroll to calculator section
                setTimeout(() => {
                    const calcEl = document.getElementById('drug-calculator-anchor');
                    if (calcEl) {
                        calcEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            });
            
            list.appendChild(div);
        });
    }

    createListItem(drug, type) {
        const div = document.createElement('div');
        div.className = 'list-item';
        
        let iconHtml = '';
        if (type === 'recent') {
            iconHtml = `<svg class="list-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        } else {
            iconHtml = `<svg class="list-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`;
        }
        
        const isFav = window.storageService.isFavorite(drug.id);
        const starFill = isFav ? 'var(--accent-warning)' : 'none';
        const starColor = isFav ? 'var(--accent-warning)' : 'var(--text-muted)';
        
        const actionHtml = `<button class="icon-btn fav-toggle-btn" style="padding: 4px;" aria-label="Toggle favorite">
            <svg viewBox="0 0 24 24" fill="${starFill}" stroke="${starColor}" stroke-width="2" width="20" height="20">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
        </button>`;

        div.innerHTML = `
            ${iconHtml}
            <div class="list-content">
                <div class="list-title">${drug.name}</div>
                ${drug.aliases && drug.aliases.length > 0 ? `<div class="list-aliases">${drug.aliases.join(', ')}</div>` : ''}
                <div class="list-subtitle">${drug.category}</div>
            </div>
            <div class="list-action">
                ${actionHtml}
            </div>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.closest('.fav-toggle-btn')) {
                e.stopPropagation();
                this.vibrate();
                window.storageService.toggleFavorite(drug.id);
                this.renderFavoritesViewList();
                this.renderHomeLists();
                // Also update the search results if we are currently searching
                if (this.searchInput.value.trim() !== '') {
                    this.handleSearch({ target: this.searchInput });
                }
                return;
            }
            this.vibrate();
            this.searchInput.value = '';
            this.clearSearchBtn.classList.add('hidden');
            this.openDrugDetail(drug);
        });
        
        return div;
    }

    handleSearch(e) {
        const query = e.target.value;
        if (query.length > 0) {
            this.clearSearchBtn.classList.remove('hidden');
            this.homeDefaultContent.classList.add('hidden');
            this.searchResultsContent.classList.remove('hidden');
            
            const results = window.searchService.search(query);
            this.searchResultsList.innerHTML = '';
            
            if (results.length === 0) {
                this.searchResultsList.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">No medications found.</div>';
            } else {
                results.forEach(res => {
                    this.searchResultsList.appendChild(this.createListItem(res, 'all'));
                });
            }
        } else {
            this.clearSearchBtn.classList.add('hidden');
            this.homeDefaultContent.classList.remove('hidden');
            this.searchResultsContent.classList.add('hidden');
        }
    }

    openDrugDetail(drug) {
        this.currentDrug = drug;
        window.storageService.addRecent(drug.id);
        
        // Select Preparation
        let prep = drug.preparations.find(p => p.isDefault) || drug.preparations[0];
        if (this.prepCache[drug.id]) {
            const cached = drug.preparations.find(p => p.id === this.prepCache[drug.id]);
            if (cached) prep = cached;
        }
        this.activePreparation = prep;

        // Switch to detail view FIRST so all DOM elements exist
        this.showView('detail');

        // Drug name + category
        document.getElementById('detail-title-name').textContent = drug.name;
        document.getElementById('detail-category-text').textContent = drug.category;
        
        this.updateFavoriteIcon(window.storageService.isFavorite(drug.id));
        
        // Safety Badges (reads from drug.safety or flat flags)
        this.renderSafetyBadges(drug);

        // Preparation card (full detail)
        this.updatePreparationInfo();

        // More Info Drawer — dose range
        if (drug.dosePoints) {
            document.getElementById('detail-dose-range').textContent =
                `${drug.dosePoints[0]} – ${drug.dosePoints[drug.dosePoints.length-1]} ${drug.doseUnit}`;
        } else if (drug.doseMin != null) {
            document.getElementById('detail-dose-range').textContent =
                `${drug.doseMin} – ${drug.doseMax} ${drug.doseUnit}`;
        }

        // Administration
        document.getElementById('detail-admin-guidance').textContent =
            drug.administrationGuidance || '--';
        
        // Important Cautions (now an array)
        const cautionsList = document.getElementById('detail-cautions');
        const cautionsWrapper = document.getElementById('cautions-wrapper');
        cautionsList.innerHTML = '';
        const cautions = Array.isArray(drug.importantCautions)
            ? drug.importantCautions
            : (drug.importantCautions ? [drug.importantCautions] : []);
        if (cautions.length > 0) {
            cautionsWrapper.classList.remove('hidden');
            cautions.forEach(c => {
                const li = document.createElement('li');
                li.textContent = c;
                cautionsList.appendChild(li);
            });
        } else {
            cautionsWrapper.classList.add('hidden');
        }

        // Indications
        const indList = document.getElementById('detail-indications');
        const indEmpty = document.getElementById('detail-indications-empty');
        indList.innerHTML = '';
        if (drug.indications && drug.indications.length > 0) {
            drug.indications.forEach(ind => {
                const li = document.createElement('li');
                li.textContent = ind;
                indList.appendChild(li);
            });
            indList.classList.remove('hidden');
            if (indEmpty) indEmpty.classList.add('hidden');
        } else {
            indList.classList.add('hidden');
            if (indEmpty) indEmpty.classList.remove('hidden');
        }

        // References
        const refList = document.getElementById('detail-references');
        const refEmpty = document.getElementById('detail-references-empty');
        refList.innerHTML = '';
        const refs = Array.isArray(drug.references) ? drug.references : [];
        if (refs.length > 0) {
            refs.forEach(r => {
                const li = document.createElement('li');
                li.textContent = r;
                refList.appendChild(li);
            });
            refList.classList.remove('hidden');
            if (refEmpty) refEmpty.classList.add('hidden');
        } else {
            refList.classList.add('hidden');
            if (refEmpty) refEmpty.classList.remove('hidden');
        }

        // Last reviewed
        const lrEl = document.getElementById('detail-last-reviewed');
        if (lrEl && drug.lastReviewed) {
            lrEl.textContent = `Last reviewed: ${drug.lastReviewed}`;
        }

        // Calculator Mode and table
        this.setCalculatorMode(drug.formulaType);
        
        // Prompt for weight if weight-based and not set
        if (drug.weightBased && !window.storageService.getWeight()) {
            this.openKeypad('weight');
        }
    }

    renderSafetyBadges(drug) {
        const container = document.getElementById('safety-badges');
        container.innerHTML = '';
        
        // Support both new schema (drug.safety.*) and old flat flags
        const s = drug.safety || {};
        const highAlert = s.highAlert ?? drug.highAlert;
        const requiresPump = s.requiresPump ?? drug.requiresPump;
        const requiresCVL = s.requiresCVL ?? drug.requiresCVL;
        const peripheralCompatible = s.peripheralCompatible ?? drug.peripheralCompatible;
        const requiresCardiacMonitoring = s.requiresCardiacMonitoring ?? drug.requiresCardiacMonitoring;
        
        if (highAlert) container.innerHTML += '<div class="safety-badge high-alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>High Alert</div>';
        if (requiresPump) container.innerHTML += '<div class="safety-badge pump-required"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>Pump</div>';
        if (requiresCVL) container.innerHTML += '<div class="safety-badge cvl-required"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>CVL</div>';
        else if (peripheralCompatible) container.innerHTML += '<div class="safety-badge peripheral-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>Peripheral OK</div>';
        if (requiresCardiacMonitoring) container.innerHTML += '<div class="safety-badge cardiac-monitoring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>ECG</div>';
    }

    renderPreparationSelector(drug) {
        const prepList = document.getElementById('prep-modal-list');
        prepList.innerHTML = '';
        
        drug.preparations.forEach(prep => {
            const card = document.createElement('div');
            card.className = `prep-selector-card ${this.activePreparation.id === prep.id ? 'is-active' : ''}`;
            
            let badgeHtml = '';
            if (prep.isDefault) {
                badgeHtml = '<span class="prep-card-badge badge-default"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;margin-right:2px;vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>Recommended</span>';
            } else {
                badgeHtml = '<span class="prep-card-badge badge-caution">Caution</span>';
            }
            
            card.innerHTML = `
                <div class="prep-card-header">
                    <div class="prep-card-title">${prep.label}</div>
                    ${badgeHtml}
                </div>
                <div class="prep-card-desc">${prep.description || ''}</div>
                <div class="prep-card-conc">Concentration: ${prep.concentration} ${prep.concentrationUnit}</div>
            `;
            
            card.addEventListener('click', () => {
                this.vibrate();
                this.activePreparation = prep;
                this.prepCache[this.currentDrug.id] = prep.id;
                this.updatePreparationInfo();
                this.renderDoseTable();
                this.closePrepModal();
            });
            
            prepList.appendChild(card);
        });

        // Toggle visibility of the Custom Concentration trigger
        const customTrigger = document.getElementById('custom-conc-trigger');
        if (drug.allowCustomConcentration) {
            customTrigger.parentElement.classList.remove('hidden');
        } else {
            customTrigger.parentElement.classList.add('hidden');
        }
    }

    updatePreparationInfo() {
        if (!this.activePreparation) return;
        const prep = this.activePreparation;
        
        // ---- PREP CARD NAME + BADGES ----
        const labelEl = document.getElementById('summary-prep-label');
        if (labelEl) labelEl.textContent = prep.label || 'Custom Concentration';

        const descEl = document.getElementById('summary-prep-desc');
        if (descEl) descEl.textContent = prep.description || prep.notes || '';

        const warnBadge = document.getElementById('active-prep-warning');
        const defaultBadge = document.getElementById('active-prep-default-badge');
        if (warnBadge && defaultBadge) {
            if (prep.isDefault) {
                warnBadge.classList.add('hidden');
                defaultBadge.classList.remove('hidden');
            } else {
                warnBadge.classList.remove('hidden');
                defaultBadge.classList.add('hidden');
            }
        }

        // ---- HIGH CONCENTRATION WARNING ----
        const highConcWarn = document.getElementById('high-conc-warning');
        if (highConcWarn) {
            if (prep.isHighConcentration) {
                highConcWarn.classList.remove('hidden');
            } else {
                highConcWarn.classList.add('hidden');
            }
        }

        // ---- PREPARATION DATA GRID ----
        const setEl = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? '--';
        };

        // Ampoules
        if (prep.ampouleCount != null) {
            setEl('prep-ampoule-count', `${prep.ampouleCount} × ampoule${prep.ampouleCount > 1 ? 's' : ''}`);
        } else {
            setEl('prep-ampoule-count', '--');
        }
        setEl('prep-ampoule-strength', prep.ampouleStrength || '');
        setEl('prep-med-volume', prep.medicationVolumeMl != null ? `${prep.medicationVolumeMl} ml` : '--');
        setEl('prep-diluent-name', prep.diluent || (prep.compatibleDiluents && prep.compatibleDiluents[0]) || '--');
        setEl('prep-diluent-volume', prep.diluentVolumeMl != null ? `${prep.diluentVolumeMl} ml` : '--');
        setEl('prep-final-volume', prep.finalVolumeMl != null ? `${prep.finalVolumeMl} ml` : '--');
        setEl('summary-prep-conc', `${prep.concentration} ${prep.concentrationUnit || 'mcg/ml'}`);

        // ---- PREPARATION STEPS ----
        const stepsList = document.getElementById('prep-steps-list');
        const stepsDrawer = document.getElementById('prep-steps-drawer');
        if (stepsList) {
            stepsList.innerHTML = '';
            const steps = prep.preparationSteps || [];
            if (steps.length > 0) {
                steps.forEach(step => {
                    const li = document.createElement('li');
                    li.textContent = step;
                    stepsList.appendChild(li);
                });
                if (stepsDrawer) stepsDrawer.classList.remove('hidden');
            } else {
                if (stepsDrawer) stepsDrawer.classList.add('hidden');
            }
        }

        // ---- INCOMPATIBLE DILUENTS in More Info ----
        const incompatList = document.getElementById('detail-incompatible');
        const incompatWrapper = document.getElementById('incompatible-wrapper');
        if (incompatList) {
            incompatList.innerHTML = '';
            const incompat = prep.incompatibleDiluents || [];
            if (incompat.length > 0) {
                incompatWrapper && incompatWrapper.classList.remove('hidden');
                incompat.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    incompatList.appendChild(li);
                });
            } else {
                incompatWrapper && incompatWrapper.classList.add('hidden');
            }
        }
    }

    openPrepModal() {
        this.renderPreparationSelector(this.currentDrug);
        document.getElementById('prep-modal-overlay').classList.remove('hidden');
    }

    closePrepModal() {
        document.getElementById('prep-modal-overlay').classList.add('hidden');
    }

    openCustomConcModal() {
        document.getElementById('custom-conc-modal').classList.remove('hidden');
        
        // Populate diluent select
        const sel = document.getElementById('custom-conc-diluent');
        sel.innerHTML = '';
        if (this.currentDrug) {
            // Get all possible compatible diluents for this drug
            const diluents = new Set();
            this.currentDrug.preparations.forEach(p => {
                if (p.compatibleDiluents) {
                    p.compatibleDiluents.forEach(d => diluents.add(d));
                }
            });
            diluents.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                sel.appendChild(opt);
            });
            if (diluents.size === 0) {
                sel.innerHTML = '<option value="Unknown">Unknown</option>';
            }
        }
        
        // Reset display
        document.getElementById('custom-conc-display').textContent = '0';
        document.getElementById('custom-conc-notes').value = '';
    }

    closeCustomConcModal() {
        document.getElementById('custom-conc-modal').classList.add('hidden');
        this.closeKeypad(); // Ensure keypad closes if open
    }

    applyCustomConc() {
        const valStr = document.getElementById('custom-conc-display').textContent;
        const val = parseFloat(valStr);
        if (isNaN(val) || val <= 0) {
            alert('Please enter a valid concentration.');
            return;
        }
        
        const diluent = document.getElementById('custom-conc-diluent').value;
        const notes = document.getElementById('custom-conc-notes').value;
        
        const customPrep = {
            id: 'custom_' + Date.now(),
            label: 'Custom Concentration (Advanced)',
            description: notes ? notes : 'Custom formulation',
            concentration: val,
            concentrationUnit: 'mcg/ml',
            compatibleDiluents: [diluent],
            incompatibleDiluents: [],
            notes: 'Use with caution according to local protocols.',
            isDefault: false
        };
        
        this.activePreparation = customPrep;
        this.updatePreparationInfo();
        this.renderDoseTable();
        this.closeCustomConcModal();
    }

    updateFavoriteIcon(isFav) {
        const icon = document.querySelector('#favorite-btn .star-icon');
        if (isFav) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    }

    setCalculatorMode(mode) {
        if (!this.currentDrug) return;
        this.activeCalculatorMode = mode;
        const drug = this.currentDrug;
        
        // Update selector active state
        document.querySelectorAll('#calculator-mode-selector .segment').forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Set units
        let unit = drug.doseUnit;
        if (mode === 'fixed_dose' && drug.formulaType === 'weight_based') {
            unit = 'mcg/min';
        } else if (mode === 'weight_based' && drug.formulaType === 'fixed_dose') {
            unit = 'mcg/kg/min';
        }

        document.getElementById('calc-header-unit').textContent = unit;
        const tableDoseUnitEl = document.getElementById('table-dose-unit');
        if (tableDoseUnitEl) tableDoseUnitEl.textContent = `(${unit})`;

        // Update formula display and weight visibility
        const formulaDisplay = document.getElementById('formula-display');
        const weightRow = document.getElementById('weight-input-row');
        if (mode === 'weight_based') {
            if (weightRow) weightRow.classList.remove('hidden');
            formulaDisplay.textContent = 'Formula: (Dose × Weight × 60) / Concentration';
        } else {
            if (weightRow) weightRow.classList.add('hidden');
            formulaDisplay.textContent = 'Formula: (Dose × 60) / Concentration';
        }

        this.renderDoseTable();
    }

    getDosePointsForActiveMode() {
        const drug = this.currentDrug;
        const mode = this.activeCalculatorMode;
        
        if (mode === drug.formulaType) {
            return null; // Standard mode (uses default)
        }
        
        // Alternate mode
        if (mode === 'fixed_dose') {
            if (drug.id === 'noradrenaline' || drug.id === 'adrenaline') {
                return [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30]; // mcg/min
            } else if (drug.id === 'dopamine' || drug.id === 'dobutamine') {
                return [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 1000]; // mcg/min
            }
            return [5, 10, 20, 30, 40, 50, 60, 80, 100];
        } else {
            if (drug.id === 'gtn') {
                return [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5]; // mcg/kg/min
            }
            return [0.05, 0.1, 0.2, 0.3, 0.4, 0.5];
        }
    }

    renderDoseTable() {
        const tbody = document.querySelector('#dose-table tbody');
        tbody.innerHTML = '';
        
        if (!this.currentDrug || !this.activePreparation) return;
        
        const weight = window.storageService.getWeight();
        const mode = this.activeCalculatorMode;
        
        if (mode === 'weight_based' && !weight) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color: var(--text-muted); padding: 32px 0;">Enter patient weight to view calculation table</td></tr>';
            return;
        }

        // Temporarily override properties on currentDrug for calculation engine
        const originalFormulaType = this.currentDrug.formulaType;
        const originalWeightBased = this.currentDrug.weightBased;
        const originalDosePoints = this.currentDrug.dosePoints;
        
        this.currentDrug.formulaType = mode;
        this.currentDrug.weightBased = (mode === 'weight_based');
        
        const customPoints = this.getDosePointsForActiveMode();
        if (customPoints) {
            this.currentDrug.dosePoints = customPoints;
        } else {
            delete this.currentDrug.dosePoints;
            if (originalDosePoints) this.currentDrug.dosePoints = originalDosePoints;
        }
        
        const tableData = window.calculatorService.generateDoseTable(this.currentDrug, this.activePreparation, weight);
        
        // Restore original values
        this.currentDrug.formulaType = originalFormulaType;
        this.currentDrug.weightBased = originalWeightBased;
        if (originalDosePoints) this.currentDrug.dosePoints = originalDosePoints;
        else delete this.currentDrug.dosePoints;
        
        if (tableData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color: var(--text-muted); padding: 32px 0;">No calculation data available.</td></tr>';
            return;
        }

        tableData.forEach(row => {
            const tr = document.createElement('tr');
            
            if (row.isPhase) {
                tr.innerHTML = `<td colspan="2" style="background:var(--bg-surface-elevated, #f8f9fa); border-left: 3px solid var(--accent-primary); padding: 12px 16px;">
                                   <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${row.phaseName}</div>
                                   <div style="font-size:0.9em; color:var(--text-muted); display:flex; justify-content:space-between;">
                                      <span>${row.dose} ${row.doseUnit}</span>
                                      <strong style="color:var(--text-primary);">${row.rate} mL/hr</strong>
                                   </div>
                                </td>`;
                tbody.appendChild(tr);
                return;
            }
            
            tr.dataset.dose = row.dose;
            
            const tdDose = document.createElement('td');
            tdDose.textContent = row.dose;
            
            const tdRate = document.createElement('td');
            tdRate.textContent = row.rate;
            
            tr.appendChild(tdDose);
            tr.appendChild(tdRate);
            
            tr.addEventListener('click', () => {
                this.vibrate();
                document.querySelectorAll('#dose-table tr').forEach(el => el.classList.remove('highlight-row'));
                tr.classList.add('highlight-row');
            });
            
            tbody.appendChild(tr);
        });
    }

    copyTableToClipboard() {
        if (!this.currentDrug || !this.activePreparation) return;
        const weight = window.storageService.getWeight();
        const originalFormulaType = this.currentDrug.formulaType;
        const originalWeightBased = this.currentDrug.weightBased;
        const originalDosePoints = this.currentDrug.dosePoints;
        
        this.currentDrug.formulaType = this.activeCalculatorMode;
        this.currentDrug.weightBased = (this.activeCalculatorMode === 'weight_based');
        
        const customPoints = this.getDosePointsForActiveMode();
        if (customPoints) {
            this.currentDrug.dosePoints = customPoints;
        }
        
        const tableData = window.calculatorService.generateDoseTable(this.currentDrug, this.activePreparation, weight);
        
        // restore
        this.currentDrug.formulaType = originalFormulaType;
        this.currentDrug.weightBased = originalWeightBased;
        if (originalDosePoints) this.currentDrug.dosePoints = originalDosePoints;
        else delete this.currentDrug.dosePoints;
        
        if (tableData.length === 0) return;
        
        const unit = this.activeCalculatorMode === 'weight_based' ? this.currentDrug.doseUnit : 'mcg/min';
        let text = `ED IV Meds Calculation Table\n`;
        text += `Medication: ${this.currentDrug.name}\n`;
        text += `Preparation: ${this.activePreparation.description}\n`;
        text += `Concentration: ${this.activePreparation.concentration} ${this.activePreparation.concentrationUnit}\n`;
        if (this.activeCalculatorMode === 'weight_based' && weight) {
            text += `Patient Weight: ${weight} kg\n`;
        }
        text += `\n`;
        text += `Dose (${unit}) | Pump Rate (mL/hr)\n`;
        text += `------------------------------------\n`;
        tableData.forEach(row => {
            text += `${row.dose.toString().padEnd(16)} | ${row.rate.toString().padEnd(10)}\n`;
        });
        
        navigator.clipboard.writeText(text).then(() => {
            alert('Infusion rate table copied to clipboard!');
        }).catch(err => {
            console.error('Copy failed: ', err);
        });
    }

    // Keypad Methods
    openKeypad(target) {
        this.activeInputTarget = target;
        this.keypadValue = '';
        if (target === 'weight') {
            document.getElementById('keypad-title').textContent = 'Patient Weight (kg)';
            const w = window.storageService.getWeight();
            if (w) this.keypadValue = w.toString();
        }
        
        this.updateKeypadDisplay();
        document.getElementById('keypad-overlay').classList.remove('hidden');
    }

    closeKeypad() {
        document.getElementById('keypad-overlay').classList.add('hidden');
        this.activeInputTarget = null;
    }

    handleKeypadClick(e) {
        this.vibrate();
        const val = e.target.dataset.val;
        if (val === '.') {
            if (this.keypadValue.includes('.')) return;
            if (this.keypadValue === '') this.keypadValue = '0';
        }
        
        // Max length
        if (this.keypadValue.length >= 6) return;
        
        this.keypadValue += val;
        this.updateKeypadDisplay();
    }

    updateKeypadDisplay() {
        const display = document.getElementById('keypad-display');
        display.textContent = this.keypadValue || '0';
    }

    applyKeypadValue() {
        const numVal = parseFloat(this.keypadValue);
        if (isNaN(numVal) || numVal <= 0) return;

        if (this.activeInputTarget === 'weight') {
            window.storageService.setWeight(numVal);
            this.syncWeightDisplay();
        }
    }

    // --- Drag and Drop for Favorites ---
    handleDragStart(e, li) {
        this.draggedItem = li;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', li.dataset.id);
        setTimeout(() => li.style.opacity = '0.5', 0);
    }

    handleDragOver(e, li) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e, li) {
        e.preventDefault();
        if (this.draggedItem !== li) {
            li.style.borderTop = '2px solid var(--accent-warning)';
        }
    }

    handleDragLeave(e, li) {
        li.style.borderTop = '';
    }

    handleDrop(e, li) {
        e.stopPropagation();
        e.preventDefault();
        
        li.style.borderTop = '';
        if (this.draggedItem && this.draggedItem !== li) {
            const draggedId = this.draggedItem.dataset.id;
            const targetId = li.dataset.id;
            window.storageService.reorderFavorite(draggedId, targetId);
            this.renderFavoritesViewList();
            this.renderHomeLists();
        }
        if (this.draggedItem) {
            this.draggedItem.style.opacity = '1';
        }
        return false;
    }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
    window.uiService = new UIService();
});
