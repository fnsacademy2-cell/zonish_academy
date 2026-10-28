/**
 * Zonish Academy - Firebase Cloud Synchronization Module
 * Connects the academy system to Google Firebase Cloud (Firestore)
 * allowing real-time multi-location access from any computer, phone, or home.
 */

const FIREBASE_CONFIG_KEY = 'zonish_firebase_config_v1';

const FirebaseSync = {
  db: null,
  app: null,
  isConnected: false,
  isSyncing: false,
  unsubscribeSnapshot: null,
  docPath: 'academies/zonish_main',

  init() {
    this.updateCloudStatusBadge('checking', 'Checking Cloud...');
    const savedConfig = this.loadConfig();

    if (savedConfig && savedConfig.apiKey && savedConfig.projectId) {
      this.connect(savedConfig, false);
    } else {
      this.updateCloudStatusBadge('offline', 'Local Mode (No Cloud)');
    }
  },

  loadConfig() {
    try {
      const data = localStorage.getItem(FIREBASE_CONFIG_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading Firebase config:', e);
      return null;
    }
  },

  saveConfig(config) {
    try {
      localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving Firebase config:', e);
    }
  },

  clearConfig() {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    this.isConnected = false;
    this.db = null;
    this.updateCloudStatusBadge('offline', 'Local Mode (Disconnected)');
  },

  // Initialize and connect to Firebase
  async connect(config, showToasts = true) {
    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded.');
        this.updateCloudStatusBadge('error', 'Firebase SDK Unavailable');
        return false;
      }

      this.updateCloudStatusBadge('syncing', 'Connecting to Cloud...');

      // If already initialized, use existing app or reinitialize
      if (firebase.apps.length > 0) {
        this.app = firebase.apps[0];
      } else {
        this.app = firebase.initializeApp(config);
      }

      this.db = firebase.firestore();

      // Save valid config
      this.saveConfig(config);

      // Verify connection by reading doc
      const docRef = this.db.doc(this.docPath);
      const docSnap = await docRef.get();

      this.isConnected = true;
      this.updateCloudStatusBadge('online', 'Cloud Connected (Live Sync)');

      if (showToasts && window.App) {
        window.App.showToast('Connected to Google Firebase Cloud successfully!', 'success');
      }

      // If cloud document has data, prompt or sync; otherwise upload local data
      if (docSnap.exists) {
        const cloudData = docSnap.data();
        if (cloudData && cloudData.students) {
          console.log('Found remote cloud data in Firebase. Merging...');
          window.academyStore.applyCloudState(cloudData);
        }
      } else {
        console.log('Firebase document is empty. Uploading current local records...');
        await this.pushToCloud(window.academyStore.state, false);
      }

      // Start Real-Time Listener across other locations!
      this.listenToCloudChanges();

      return true;
    } catch (error) {
      console.error('Firebase connection error:', error);
      this.isConnected = false;
      this.updateCloudStatusBadge('error', 'Cloud Error: Check Config');
      if (showToasts && window.App) {
        window.App.showToast(`Firebase Connection Failed: ${error.message}`, 'danger');
      }
      return false;
    }
  },

  // Listen to remote changes made from other locations in real-time
  listenToCloudChanges() {
    if (!this.db) return;

    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
    }

    const docRef = this.db.doc(this.docPath);
    this.unsubscribeSnapshot = docRef.onSnapshot(
      (snapshot) => {
        // Prevent feedback loop if local write caused this snapshot
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }

        if (snapshot.exists) {
          const remoteData = snapshot.data();
          if (remoteData && remoteData.students) {
            console.log('Realtime update received from remote location.');
            window.academyStore.applyCloudState(remoteData, true);
          }
        }
      },
      (error) => {
        console.error('Snapshot listener error:', error);
        this.updateCloudStatusBadge('error', 'Cloud Disconnected');
      }
    );
  },

  // Push local changes to Firebase Firestore
  async pushToCloud(stateData, showFeedback = true) {
    if (!this.isConnected || !this.db) return;

    try {
      this.isSyncing = true;
      this.updateCloudStatusBadge('syncing', 'Syncing to Cloud...');

      const payload = {
        academyInfo: stateData.academyInfo || {},
        courses: stateData.courses || [],
        students: stateData.students || [],
        feePayments: stateData.feePayments || [],
        expenses: stateData.expenses || [],
        lastUpdated: new Date().toISOString(),
        updatedByLocation: window.navigator.userAgent || 'Remote User'
      };

      await this.db.doc(this.docPath).set(payload, { merge: true });

      this.isSyncing = false;
      this.updateCloudStatusBadge('online', 'Cloud Synced (Live)');

      if (showFeedback && window.App) {
        window.App.showToast('All records synced to Firebase Cloud!', 'success');
      }
    } catch (err) {
      console.error('Error syncing to Firebase:', err);
      this.isSyncing = false;
      this.updateCloudStatusBadge('error', 'Sync Failed');
      if (showFeedback && window.App) {
        window.App.showToast(`Cloud Sync Error: ${err.message}`, 'danger');
      }
    }
  },

  // Pull remote data manually
  async pullFromCloud() {
    if (!this.isConnected || !this.db) {
      if (window.App) window.App.showToast('Firebase is not connected yet.', 'warning');
      return;
    }

    try {
      this.updateCloudStatusBadge('syncing', 'Downloading from Cloud...');
      const docSnap = await this.db.doc(this.docPath).get();

      if (docSnap.exists) {
        const cloudData = docSnap.data();
        window.academyStore.applyCloudState(cloudData, false);
        this.updateCloudStatusBadge('online', 'Cloud Synced');
        if (window.App) window.App.showToast('Downloaded latest data from Cloud!', 'success');
      } else {
        if (window.App) window.App.showToast('No records found in cloud database yet.', 'info');
      }
    } catch (err) {
      console.error('Error pulling cloud data:', err);
      if (window.App) window.App.showToast(`Failed to download: ${err.message}`, 'danger');
    }
  },

  // Visual status badge in Top Navbar
  updateCloudStatusBadge(status, text) {
    const badge = document.getElementById('cloud-status-indicator');
    if (!badge) return;

    badge.className = 'cloud-badge';

    if (status === 'online') {
      badge.classList.add('cloud-online');
      badge.innerHTML = `<span class="dot green"></span> <i class="fas fa-cloud"></i> <span>${text}</span>`;
      badge.title = 'Real-time multi-location sync active with Google Firebase';
    } else if (status === 'syncing') {
      badge.classList.add('cloud-syncing');
      badge.innerHTML = `<span class="dot yellow"></span> <i class="fas fa-sync fa-spin"></i> <span>${text}</span>`;
    } else if (status === 'error') {
      badge.classList.add('cloud-error');
      badge.innerHTML = `<span class="dot red"></span> <i class="fas fa-exclamation-triangle"></i> <span>${text}</span>`;
      badge.title = 'Click Settings to review Firebase credentials';
    } else {
      badge.classList.add('cloud-offline');
      badge.innerHTML = `<span class="dot gray"></span> <i class="fas fa-hdd"></i> <span>${text}</span>`;
      badge.title = 'Running in offline local mode. Connect Firebase in Settings to sync across locations.';
    }
  }
};

window.FirebaseSync = FirebaseSync;
