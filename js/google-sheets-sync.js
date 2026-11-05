/**
 * Zonish Academy - Google Sheets Cloud Synchronization Module
 * Connects the academy system to Google Sheets via Google Apps Script Web App.
 * Features automated real-time background sync across multiple locations/devices
 * without requiring manual "Download Latest" clicks.
 */

const SHEETS_CONFIG_KEY = 'zonish_sheets_config_v1';

const GoogleSheetsSync = {
  webAppUrl: '',
  autoSync: true,
  pollInterval: 15000, // 15 seconds default
  lastCloudTimestamp: '',
  pollTimer: null,
  isConnected: false,
  isSyncing: false,
  lastSynced: null,
  listenersBound: false,

  init() {
    this.updateStatusBadge('checking', 'Checking Google Sheet...');
    const savedConfig = this.loadConfig();

    if (savedConfig && savedConfig.webAppUrl) {
      this.webAppUrl = savedConfig.webAppUrl;
      this.autoSync = savedConfig.autoSync !== false;
      this.pollInterval = savedConfig.pollInterval || 15000;
      this.lastSynced = savedConfig.lastSynced || null;
      this.lastCloudTimestamp = savedConfig.lastCloudTimestamp || '';
      this.isConnected = true;
      this.updateStatusBadge('online', 'Live Cloud Sync (Auto)');

      // Immediately check and pull any new records from Google Sheets on startup
      setTimeout(() => {
        this.checkForRemoteUpdates(true);
      }, 800);

      // Start real-time background watcher across locations
      if (this.autoSync) {
        this.startAutoPolling();
      }
    } else {
      this.isConnected = false;
      this.updateStatusBadge('offline', 'Local Storage Mode');
    }

    this.bindWindowFocusListeners();
  },

  bindWindowFocusListeners() {
    if (this.listenersBound) return;
    this.listenersBound = true;

    // When user switches back to this browser tab, check for updates immediately
    window.addEventListener('focus', () => {
      if (this.isConnected && this.autoSync && !this.isSyncing) {
        this.checkForRemoteUpdates(true);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isConnected && this.autoSync && !this.isSyncing) {
        this.checkForRemoteUpdates(true);
      }
    });
  },

  loadConfig() {
    try {
      const data = localStorage.getItem(SHEETS_CONFIG_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading Google Sheets config:', e);
      return null;
    }
  },

  saveConfig(config) {
    try {
      this.webAppUrl = config.webAppUrl !== undefined ? config.webAppUrl : this.webAppUrl;
      this.autoSync = config.autoSync !== undefined ? config.autoSync : this.autoSync;
      this.pollInterval = config.pollInterval || this.pollInterval;
      this.lastSynced = config.lastSynced || this.lastSynced;
      this.lastCloudTimestamp = config.lastCloudTimestamp || this.lastCloudTimestamp;

      localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify({
        webAppUrl: this.webAppUrl,
        autoSync: this.autoSync,
        pollInterval: this.pollInterval,
        lastSynced: this.lastSynced,
        lastCloudTimestamp: this.lastCloudTimestamp
      }));
    } catch (e) {
      console.error('Error saving Google Sheets config:', e);
    }
  },

  clearConfig() {
    this.stopAutoPolling();
    localStorage.removeItem(SHEETS_CONFIG_KEY);
    this.webAppUrl = '';
    this.isConnected = false;
    this.isSyncing = false;
    this.lastSynced = null;
    this.lastCloudTimestamp = '';
    this.updateStatusBadge('offline', 'Local Storage Mode (Disconnected)');
  },

  startAutoPolling() {
    this.stopAutoPolling();
    if (!this.isConnected || !this.webAppUrl || !this.autoSync) return;

    this.pollTimer = setInterval(() => {
      if (!this.isSyncing && this.isConnected && this.autoSync) {
        // Do not interrupt user if a modal form is actively open
        const hasOpenModal = document.querySelector('.modal-backdrop.open');
        if (!hasOpenModal) {
          this.checkForRemoteUpdates(true);
        }
      }
    }, this.pollInterval);
  },

  stopAutoPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  // Test the Google Apps Script Web App connection
  async testConnection(url) {
    const targetUrl = (url || this.webAppUrl || '').trim();
    if (!targetUrl) {
      return { success: false, error: 'Web App URL is required' };
    }

    try {
      this.updateStatusBadge('syncing', 'Testing Connection...');

      const testUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=test&t=' + Date.now();
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result && result.status === 'success') {
        this.isConnected = true;
        this.webAppUrl = targetUrl;
        this.saveConfig({ webAppUrl: targetUrl, autoSync: this.autoSync, pollInterval: this.pollInterval });
        this.updateStatusBadge('online', 'Live Cloud Sync (Auto)');

        // Start background watcher
        this.startAutoPolling();

        return {
          success: true,
          sheetName: result.sheetTitle || 'Google Sheet',
          sheetUrl: result.sheetUrl || ''
        };
      } else {
        throw new Error(result.message || 'Invalid response from Google Apps Script');
      }
    } catch (err) {
      console.error('Google Sheets test failed:', err);
      this.updateStatusBadge('error', 'Connection Failed');
      return { success: false, error: err.message };
    }
  },

  // Automated background check for updates from other locations
  async checkForRemoteUpdates(silent = true) {
    if (!this.isConnected || !this.webAppUrl || this.isSyncing) return;

    try {
      const checkUrl = this.webAppUrl + (this.webAppUrl.includes('?') ? '&' : '?') + 
        'action=checkUpdate&lastTimestamp=' + encodeURIComponent(this.lastCloudTimestamp || '') +
        '&t=' + Date.now();

      const response = await fetch(checkUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) return;

      const result = await response.json();

      if (result && result.status === 'updated' && result.data) {
        console.log('Automated live update detected from Google Sheets:', result.timestamp);
        this.lastCloudTimestamp = result.timestamp || new Date().toISOString();
        this.lastSynced = new Date().toLocaleTimeString();
        this.saveConfig({ lastSynced: this.lastSynced, lastCloudTimestamp: this.lastCloudTimestamp });

        // Apply updated cloud state across all modules
        window.academyStore.applyCloudState(result.data, true);
        this.updateStatusBadge('online', 'Live Cloud Synced');
      } else if (result && result.status === 'unchanged') {
        // Data is identical, no action needed
        if (result.timestamp && !this.lastCloudTimestamp) {
          this.lastCloudTimestamp = result.timestamp;
          this.saveConfig({ lastCloudTimestamp: this.lastCloudTimestamp });
        }
      }
    } catch (err) {
      // Silent error during background poll so user is not annoyed if temporary offline
      console.warn('Background auto-sync check notice:', err.message);
    }
  },

  // Push local records to Google Sheets
  async pushToCloud(stateData, showFeedback = true) {
    if (!this.isConnected || !this.webAppUrl) {
      if (showFeedback && window.App) {
        window.App.showToast('Google Sheet is not connected. Configure in Settings.', 'warning');
      }
      return { success: false, reason: 'not_connected' };
    }

    try {
      this.isSyncing = true;
      this.updateStatusBadge('syncing', 'Syncing to Google Sheets...');

      const newTimestamp = new Date().toISOString();
      const payload = {
        action: 'sync',
        timestamp: newTimestamp,
        academyInfo: stateData.academyInfo || {},
        courses: stateData.courses || [],
        students: stateData.students || [],
        feePayments: stateData.feePayments || [],
        expenses: stateData.expenses || [],
        profitSplit: stateData.profitSplit || {},
        isWipedClean: false
      };

      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      this.isSyncing = false;

      if (result && result.status === 'success') {
        this.lastSynced = new Date().toLocaleTimeString();
        this.lastCloudTimestamp = newTimestamp;
        this.saveConfig({
          webAppUrl: this.webAppUrl,
          autoSync: this.autoSync,
          lastSynced: this.lastSynced,
          lastCloudTimestamp: this.lastCloudTimestamp
        });
        this.updateStatusBadge('online', 'Live Cloud Sync (Auto)');

        if (showFeedback && window.App) {
          window.App.showToast('All records synced to Google Sheets in real-time!', 'success');
        }
        return { success: true };
      } else {
        throw new Error(result.message || 'Google Sheets sync failed');
      }
    } catch (err) {
      this.isSyncing = false;
      this.updateStatusBadge('error', 'Sync Failed');
      console.error('Error syncing to Google Sheets:', err);

      if (showFeedback && window.App) {
        window.App.showToast(`Google Sheets Sync Error: ${err.message}`, 'danger');
      }
      return { success: false, error: err.message };
    }
  },

  // Pull data from Google Sheets manually
  async pullFromCloud(showFeedback = true) {
    if (!this.isConnected || !this.webAppUrl) {
      if (showFeedback && window.App) {
        window.App.showToast('Google Sheet is not connected yet.', 'warning');
      }
      return { success: false, reason: 'not_connected' };
    }

    try {
      this.isSyncing = true;
      this.updateStatusBadge('syncing', 'Downloading from Google Sheets...');

      const pullUrl = this.webAppUrl + (this.webAppUrl.includes('?') ? '&' : '?') + 'action=pull&t=' + Date.now();
      const response = await fetch(pullUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      this.isSyncing = false;

      if (result && result.status === 'success' && result.data) {
        const cloudData = result.data;
        this.lastSynced = new Date().toLocaleTimeString();
        this.lastCloudTimestamp = result.timestamp || new Date().toISOString();
        this.saveConfig({
          webAppUrl: this.webAppUrl,
          autoSync: this.autoSync,
          lastSynced: this.lastSynced,
          lastCloudTimestamp: this.lastCloudTimestamp
        });

        window.academyStore.applyCloudState(cloudData, false);
        this.updateStatusBadge('online', 'Live Cloud Sync (Auto)');

        if (showFeedback && window.App) {
          window.App.showToast('Downloaded latest records from Google Sheets!', 'success');
        }
        return { success: true, data: cloudData };
      } else {
        throw new Error(result.message || 'No records returned from Google Sheets');
      }
    } catch (err) {
      this.isSyncing = false;
      this.updateStatusBadge('error', 'Download Failed');
      console.error('Error pulling from Google Sheets:', err);

      if (showFeedback && window.App) {
        window.App.showToast(`Failed to download from Google Sheets: ${err.message}`, 'danger');
      }
      return { success: false, error: err.message };
    }
  },

  // Wipe data from Google Sheets completely
  async wipeCloudData() {
    if (!this.isConnected || !this.webAppUrl) {
      return { success: false, reason: 'not_connected' };
    }

    try {
      this.isSyncing = true;
      this.updateStatusBadge('syncing', 'Wiping Google Sheet...');

      const payload = {
        action: 'wipe',
        timestamp: new Date().toISOString(),
        academyInfo: window.academyStore.getAcademyInfo(),
        courses: window.academyStore.getCourses(),
        students: [],
        feePayments: [],
        expenses: [],
        profitSplit: window.academyStore.getDefaultProfitSplit(),
        isWipedClean: true
      };

      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      this.isSyncing = false;

      if (result && result.status === 'success') {
        this.lastCloudTimestamp = payload.timestamp;
        this.updateStatusBadge('online', 'Google Sheet Wiped Clean');
        return { success: true };
      } else {
        throw new Error(result.message || 'Failed to wipe Google Sheet');
      }
    } catch (err) {
      this.isSyncing = false;
      this.updateStatusBadge('error', 'Sheet Wipe Failed');
      console.error('Error wiping Google Sheet:', err);
      return { success: false, error: err.message };
    }
  },

  // Top navbar visual status badge
  updateStatusBadge(status, text) {
    const badge = document.getElementById('cloud-status-indicator');
    if (!badge) return;

    badge.className = 'cloud-badge';

    if (status === 'online') {
      badge.classList.add('cloud-online');
      badge.innerHTML = `<span class="dot green"></span> <i class="fas fa-file-excel"></i> <span>${text}</span>`;
      badge.title = 'Real-time multi-location sync active with Google Sheets (Auto)';
    } else if (status === 'syncing') {
      badge.classList.add('cloud-syncing');
      badge.innerHTML = `<span class="dot yellow"></span> <i class="fas fa-sync fa-spin"></i> <span>${text}</span>`;
    } else if (status === 'error') {
      badge.classList.add('cloud-error');
      badge.innerHTML = `<span class="dot red"></span> <i class="fas fa-exclamation-triangle"></i> <span>${text}</span>`;
      badge.title = 'Google Sheets connection error. Click to review settings.';
    } else {
      badge.classList.add('cloud-offline');
      badge.innerHTML = `<span class="dot gray"></span> <i class="fas fa-hdd"></i> <span>${text}</span>`;
      badge.title = 'Running in local storage mode. Connect Google Sheets in Settings to sync across locations.';
    }
  },

  // Returns the Google Apps Script code to copy into Google Sheets
  getAppsScriptTemplate() {
    return `/**
 * =========================================================================
 * ZONISH ACADEMY - GOOGLE SHEETS LIVE CLOUD BRIDGE
 * Paste this script into: Extensions -> Apps Script in your Google Sheet!
 * Then click: Deploy -> New Deployment -> Select type: Web App
 * - Execute as: Me
 * - Who has access: Anyone
 * Copy the Web App URL and paste it into Zonish Academy Settings!
 * =========================================================================
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'test';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'test') {
    return createJsonResponse({
      status: 'success',
      message: 'Connected successfully to Google Sheet!',
      sheetTitle: ss.getName(),
      sheetUrl: ss.getUrl()
    });
  }

  // Real-time automated change detector across locations
  if (action === 'checkUpdate') {
    var lastTimestamp = (e && e.parameter && e.parameter.lastTimestamp) ? e.parameter.lastTimestamp : '';
    var currentTimestamp = '';
    try {
      currentTimestamp = PropertiesService.getScriptProperties().getProperty('LAST_MODIFIED') || '';
    } catch(err) {}

    if (!currentTimestamp) {
      var rawSheet = ss.getSheetByName('System_State');
      if (rawSheet) {
        currentTimestamp = String(rawSheet.getRange(1, 2).getValue() || '');
      }
    }

    if (lastTimestamp && currentTimestamp && lastTimestamp === currentTimestamp) {
      return createJsonResponse({
        status: 'unchanged',
        timestamp: currentTimestamp
      });
    }

    var rawSheet = ss.getSheetByName('System_State');
    if (!rawSheet) {
      return createJsonResponse({ status: 'unchanged', message: 'No records yet' });
    }

    var jsonText = rawSheet.getRange(1, 1).getValue();
    try {
      var parsed = JSON.parse(jsonText);
      return createJsonResponse({
        status: 'updated',
        timestamp: currentTimestamp || (parsed && parsed.timestamp) || new Date().toISOString(),
        data: parsed
      });
    } catch (err) {
      return createJsonResponse({ status: 'error', message: err.message });
    }
  }

  if (action === 'pull') {
    var rawSheet = ss.getSheetByName('System_State');
    if (!rawSheet) {
      return createJsonResponse({
        status: 'error',
        message: 'No System_State sheet found. Please perform a sync from Zonish Academy first.'
      });
    }
    var jsonText = rawSheet.getRange(1, 1).getValue();
    var currentTimestamp = String(rawSheet.getRange(1, 2).getValue() || new Date().toISOString());
    try {
      var parsed = JSON.parse(jsonText);
      return createJsonResponse({
        status: 'success',
        timestamp: currentTimestamp,
        data: parsed
      });
    } catch (err) {
      return createJsonResponse({
        status: 'error',
        message: 'Failed to parse state JSON from sheet: ' + err.message
      });
    }
  }

  return createJsonResponse({ status: 'error', message: 'Unknown action' });
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);
    var action = payload.action || 'sync';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'sync') {
      var timestamp = payload.timestamp || new Date().toISOString();
      writeStateBackup(ss, payload, timestamp);
      writeStudentsSheet(ss, payload.students || []);
      writeFeesSheet(ss, payload.feePayments || []);
      writeExpensesSheet(ss, payload.expenses || []);
      writeProfitDistributionSheet(ss, payload.profitSplit || {});
      writeSummarySheet(ss, payload);

      return createJsonResponse({
        status: 'success',
        message: 'All records updated in Google Sheet successfully!',
        timestamp: timestamp
      });
    }

    if (action === 'wipe') {
      var timestamp = payload.timestamp || new Date().toISOString();
      clearAllSheets(ss);
      writeStateBackup(ss, payload, timestamp);
      return createJsonResponse({
        status: 'success',
        message: 'Google Sheet wiped clean successfully!',
        timestamp: timestamp
      });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.message });
  }
}

// Write the complete raw JSON backup to System_State tab with timestamp
function writeStateBackup(ss, payload, timestamp) {
  var sheet = ss.getSheetByName('System_State');
  if (!sheet) {
    sheet = ss.insertSheet('System_State');
  }
  sheet.clear();
  sheet.getRange(1, 1).setValue(JSON.stringify(payload));
  sheet.getRange(1, 2).setValue(timestamp || new Date().toISOString());

  try {
    PropertiesService.getScriptProperties().setProperty('LAST_MODIFIED', timestamp || new Date().toISOString());
  } catch(err) {}
}

// Populate Students Directory Tab
function writeStudentsSheet(ss, students) {
  var sheet = ss.getSheetByName('Students');
  if (!sheet) sheet = ss.insertSheet('Students');
  sheet.clear();

  var headers = [
    'Roll #', 'Student Name', 'Father Name', 'Phone / WhatsApp',
    'CNIC / B-Form', 'Course', 'Duration (Months)', 'Admission Date',
    'Shift Timing', 'Monthly Fee (Rs)', 'Admission Fee (Rs)', 'Status', 'Notes'
  ];

  var rows = [headers];
  for (var i = 0; i < students.length; i++) {
    var s = students[i];
    rows.push([
      s.rollNo || '',
      s.name || '',
      s.fatherName || '',
      s.phone || '',
      s.cnic || '',
      s.courseName || s.courseCode || '',
      s.durationMonths || 3,
      s.admissionDate || '',
      s.shift || '',
      s.monthlyFee || 0,
      s.admissionFee || 0,
      s.status || 'active',
      s.notes || ''
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatHeaderRow(sheet, '#1e293b', headers.length);
  sheet.autoResizeColumns(1, headers.length);
}

// Populate Fee Collections Tab
function writeFeesSheet(ss, feePayments) {
  var sheet = ss.getSheetByName('Fee_Payments');
  if (!sheet) sheet = ss.insertSheet('Fee_Payments');
  sheet.clear();

  var headers = [
    'Receipt #', 'Payment Date', 'Roll #', 'Student Name',
    'Course', 'Month Paid', 'Amount Paid (Rs)', 'Discount',
    'Payment Mode', 'Remarks'
  ];

  var rows = [headers];
  for (var i = 0; i < feePayments.length; i++) {
    var f = feePayments[i];
    rows.push([
      f.receiptNo || '',
      f.paymentDate || '',
      f.rollNo || '',
      f.studentName || '',
      f.courseName || '',
      f.monthYear || '',
      f.amountPaid || 0,
      f.discount || 0,
      f.paymentMethod || 'Cash',
      f.remarks || ''
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatHeaderRow(sheet, '#065f46', headers.length);
  sheet.autoResizeColumns(1, headers.length);
}

// Populate Expenses Tab
function writeExpensesSheet(ss, expenses) {
  var sheet = ss.getSheetByName('Expenses');
  if (!sheet) sheet = ss.insertSheet('Expenses');
  sheet.clear();

  var headers = ['Date', 'Category', 'Description', 'Amount (Rs)', 'Authorized / Paid By'];
  var rows = [headers];

  for (var i = 0; i < expenses.length; i++) {
    var exp = expenses[i];
    rows.push([
      exp.date || '',
      exp.category || '',
      exp.description || '',
      exp.amount || 0,
      exp.paidBy || 'Admin'
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatHeaderRow(sheet, '#991b1b', headers.length);
  sheet.autoResizeColumns(1, headers.length);
}

// Populate Profit Distribution Ledger Tab
function writeProfitDistributionSheet(ss, profitSplit) {
  var sheet = ss.getSheetByName('Profit_Distribution');
  if (!sheet) sheet = ss.insertSheet('Profit_Distribution');
  sheet.clear();

  var headers = [
    'Voucher Ref', 'Disbursement Date', 'Total Disbursed (Rs)',
    'Teacher Share (Rs)', 'Teacher %', 'Admin Share (Rs)', 'Admin %',
    'Remarks / Notes'
  ];

  var rows = [headers];
  var distributions = (profitSplit && profitSplit.distributions) ? profitSplit.distributions : [];

  for (var i = 0; i < distributions.length; i++) {
    var d = distributions[i];
    rows.push([
      d.refNo || d.id || '',
      d.date || '',
      d.amount || 0,
      d.teacherShare || 0,
      d.teacherPct || 50,
      d.adminShare || 0,
      d.adminPct || 50,
      d.notes || ''
    ]);
  }

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatHeaderRow(sheet, '#1d4ed8', headers.length);
  sheet.autoResizeColumns(1, headers.length);
}

// Populate Summary & Overview Tab
function writeSummarySheet(ss, payload) {
  var sheet = ss.getSheetByName('Academy_Summary');
  if (!sheet) sheet = ss.insertSheet('Academy_Summary');
  sheet.clear();

  var info = payload.academyInfo || {};
  var students = payload.students || [];
  var fees = payload.feePayments || [];
  var expenses = payload.expenses || [];
  var split = payload.profitSplit || {};

  var totalIncome = 0;
  for (var i = 0; i < fees.length; i++) totalIncome += (Number(fees[i].amountPaid) || 0);

  var totalExpenses = 0;
  for (var j = 0; j < expenses.length; j++) totalExpenses += (Number(expenses[j].amount) || 0);

  var netBalance = totalIncome - totalExpenses;

  var summaryData = [
    ['Metric', 'Value'],
    ['Academy Name', info.name || 'Zonish Computer Academy'],
    ['Last Synchronized', new Date().toLocaleString()],
    ['Total Enrolled Students', students.length],
    ['Total Fee Collections (Rs)', totalIncome],
    ['Total Academy Expenses (Rs)', totalExpenses],
    ['Calculated Net Margin (Rs)', netBalance],
    ['Teacher Total Paid (Rs)', split.cumulativeTeacherPaid || 0],
    ['Admin Total Paid (Rs)', split.cumulativeAdminPaid || 0],
    ['Remaining Undivided Balance (Rs)', split.netBalance !== undefined ? split.netBalance : netBalance]
  ];

  sheet.getRange(1, 1, summaryData.length, 2).setValues(summaryData);
  formatHeaderRow(sheet, '#4f46e5', 2);
  sheet.autoResizeColumns(1, 2);
}

function clearAllSheets(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    sheets[i].clear();
  }
}

function formatHeaderRow(sheet, bgColor, numCols) {
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground(bgColor);
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  range.setFontFamily('Arial');
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Custom Menu inside Google Sheets interface
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎓 Zonish Academy')
    .addItem('⚡ Format & Setup All Sheets', 'setupAllSheets')
    .addToUi();
}

// 1-Click Initial Setup of All Sheet Tabs
function setupAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  writeStudentsSheet(ss, []);
  writeFeesSheet(ss, []);
  writeExpensesSheet(ss, []);
  writeProfitDistributionSheet(ss, {});
  writeSummarySheet(ss, {});
  SpreadsheetApp.getActiveSpreadsheet().toast('Zonish Academy tabs setup successfully!', 'Success', 5);
}
`;
  }
};

window.GoogleSheetsSync = GoogleSheetsSync;
