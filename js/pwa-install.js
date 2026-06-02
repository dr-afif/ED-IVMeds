// pwa-install.js
class PWAInstallService {
    constructor() {
        this.keys = {
            sessions: 'ed_ivmeds_install_sessions',
            drugViews: 'ed_ivmeds_install_drug_views',
            dismissedUntil: 'ed_ivmeds_install_dismissed_until',
            dismissCount: 'ed_ivmeds_install_dismiss_count'
        };
        this.backoffDays = [3, 7, 14, 30];
        this.deferredPrompt = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.incrementCounter(this.keys.sessions);

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt = event;
            this.refreshUI();
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.refreshUI();
        });

        document.getElementById('home-install-btn')?.addEventListener('click', () => this.handleInstallClick('home'));
        document.getElementById('home-install-later-btn')?.addEventListener('click', () => this.dismissHomePromotion());
        document.getElementById('settings-install-btn')?.addEventListener('click', () => this.handleInstallClick('settings'));

        this.refreshUI();
    }

    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    isIOSManualInstall() {
        const ua = window.navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
        const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
        return isIOS && isSafari && !this.isInstalled();
    }

    canOfferInstall() {
        return !this.isInstalled() && (this.deferredPrompt || this.isIOSManualInstall());
    }

    shouldShowHomePromotion() {
        if (!this.canOfferInstall()) return false;

        const sessions = this.getNumber(this.keys.sessions);
        if (sessions < 2) return false;

        const now = Date.now();
        const dismissedUntil = this.getNumber(this.keys.dismissedUntil);
        if (!dismissedUntil || now >= dismissedUntil) return true;

        if (!this.hasHighEngagement()) return false;

        const dismissCount = this.getNumber(this.keys.dismissCount);
        const backoffDays = this.getBackoffDays(dismissCount);
        const dismissedAt = dismissedUntil - (backoffDays * 24 * 60 * 60 * 1000);
        return now - dismissedAt >= (3 * 24 * 60 * 60 * 1000);
    }

    hasHighEngagement() {
        return this.getNumber(this.keys.sessions) >= 5 || this.getNumber(this.keys.drugViews) >= 20;
    }

    getBackoffDays(dismissCount) {
        return this.backoffDays[Math.min(Math.max(dismissCount - 1, 0), this.backoffDays.length - 1)];
    }

    dismissHomePromotion() {
        const dismissCount = this.getNumber(this.keys.dismissCount) + 1;
        const days = this.getBackoffDays(dismissCount);
        localStorage.setItem(this.keys.dismissCount, String(dismissCount));
        localStorage.setItem(this.keys.dismissedUntil, String(Date.now() + days * 24 * 60 * 60 * 1000));
        this.hideInstructions('home');
        this.refreshUI();
    }

    async handleInstallClick(source) {
        if (this.isInstalled()) {
            this.refreshUI();
            return;
        }

        if (this.deferredPrompt) {
            this.hideInstructions(source);
            this.deferredPrompt.prompt();
            const choice = await this.deferredPrompt.userChoice;
            this.deferredPrompt = null;
            if (choice && choice.outcome !== 'accepted' && source === 'home') {
                this.dismissHomePromotion();
            } else {
                this.refreshUI();
            }
            return;
        }

        this.showInstructions(source);
    }

    incrementDrugViews() {
        this.incrementCounter(this.keys.drugViews);
        this.refreshUI();
    }

    incrementCounter(key) {
        localStorage.setItem(key, String(this.getNumber(key) + 1));
    }

    getNumber(key) {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    showInstructions(source) {
        const el = document.getElementById(`${source}-install-instructions`);
        if (el) el.classList.remove('hidden');
    }

    hideInstructions(source) {
        const el = document.getElementById(`${source}-install-instructions`);
        if (el) el.classList.add('hidden');
    }

    refreshUI() {
        const installed = this.isInstalled();
        const homeSection = document.getElementById('home-install-section');
        const settingsInstalled = document.getElementById('install-settings-installed');
        const settingsNotInstalled = document.getElementById('install-settings-not-installed');

        if (homeSection) {
            homeSection.classList.toggle('hidden', installed || !this.shouldShowHomePromotion());
        }

        if (settingsInstalled && settingsNotInstalled) {
            settingsInstalled.classList.toggle('hidden', !installed);
            settingsNotInstalled.classList.toggle('hidden', installed);
        }

        if (installed) {
            this.hideInstructions('home');
            this.hideInstructions('settings');
        }
    }
}

window.pwaInstallService = new PWAInstallService();
