/**
 * Zonish Academy - Main Application Controller
 * Handles tab navigation, modals, toasts, dashboard data syncing,
 * settings management, and system lifecycle.
 */

const App = {
  activeTab: 'dashboard',

  init() {
    this.bindNavigation();
    this.bindSettings();
    this.bindModals();
    this.bindProfitSplitModal();
    this.refreshDashboard();

    // Initialize all modules
    if (window.StudentsModule) window.StudentsModule.init();
    if (window.FeesModule) window.FeesModule.init();
    if (window.ExpensesModule) window.ExpensesModule.init();
    if (window.ReportsModule) window.ReportsModule.init();
    if (window.FirebaseSync) window.FirebaseSync.init();

    this.renderSettings();
  },

  // Tab Navigation
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = item.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Mobile sidebar toggle if present
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }
  },

  switchTab(tabId) {
    if (!tabId) return;
    this.activeTab = tabId;

    // Update nav classes
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-tab') === tabId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(section => {
      if (section.id === `tab-${tabId}`) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });

    // Update Topbar Title
    const titleMap = {
      dashboard: { title: 'Executive Overview', sub: 'Real-time financial status, student enrollment & alerts' },
      students: { title: 'Student Admissions & Records', sub: 'Manage registrations, course durations & student fee schedules' },
      'fee-tracker': { title: 'Monthly Fee Tracking & Collection', sub: 'Monthly student dues, collection terminal & defaulters list' },
      expenses: { title: 'Academy Expenditures', sub: 'Log faculty salaries, lab utility bills, rent & overheads' },
      reports: { title: 'Financial Analytics & Statements', sub: 'Monthly performance trends, course stats & printables' },
      settings: { title: 'Google Firebase Cloud Sync', sub: 'Connect your cloud database to view and sync student records across other locations' }
    };

    const topTitle = document.getElementById('topbar-title');
    const topSub = document.getElementById('topbar-subtitle');
    if (titleMap[tabId]) {
      if (topTitle) topTitle.textContent = titleMap[tabId].title;
      if (topSub) topSub.textContent = titleMap[tabId].sub;
    }

    // Refresh components
    if (tabId === 'dashboard') {
      this.refreshDashboard();
      if (window.ReportsModule) window.ReportsModule.renderCharts();
    } else if (tabId === 'students' && window.StudentsModule) {
      window.StudentsModule.render();
    } else if (tabId === 'fee-tracker' && window.FeesModule) {
      window.FeesModule.render();
    } else if (tabId === 'expenses' && window.ExpensesModule) {
      window.ExpensesModule.render();
    } else if (tabId === 'settings') {
      this.renderSettings();
    }
  },

  // Update Top Banner and Dashboard Metrics
  refreshDashboard() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    const curYM = `${curYear}-${curMonth}`;

    const store = window.academyStore;
    const currency = store.getAcademyInfo().currency;
    const stats = store.getDashboardStats(curYM);

    // Dashboard Cards
    const elActiveStudents = document.getElementById('dash-active-students');
    const elCompletedStudents = document.getElementById('dash-completed-students');
    const elTotalStudents = document.getElementById('dash-total-students');
    const elDefaultersCount = document.getElementById('dash-defaulters-count');

    // Monthly & Cumulative Financials
    const elMonthIncome = document.getElementById('dash-monthly-income');
    const elAllTimeIncome = document.getElementById('dash-alltime-income');
    const elMonthExpense = document.getElementById('dash-monthly-expense');
    const elAllTimeExpense = document.getElementById('dash-alltime-expense');
    const elMonthNet = document.getElementById('dash-monthly-net');
    const elAllTimeNet = document.getElementById('dash-alltime-net');

    // Financial Banner
    const bannerIncome = document.getElementById('banner-monthly-income');
    const bannerAllTimeIncome = document.getElementById('banner-alltime-income');
    const bannerAllTimeExpense = document.getElementById('banner-alltime-expense');
    const bannerNetBalance = document.getElementById('banner-net-balance');

    if (elActiveStudents) elActiveStudents.textContent = stats.activeCount;
    if (elCompletedStudents) elCompletedStudents.textContent = stats.completedCount;
    if (elTotalStudents) elTotalStudents.textContent = stats.totalStudents;
    if (elDefaultersCount) elDefaultersCount.textContent = stats.defaulterCount;

    const split = stats.profitSplit;

    if (elMonthIncome) elMonthIncome.textContent = `${currency} ${stats.monthlyIncome.toLocaleString()}`;
    if (elAllTimeIncome) elAllTimeIncome.textContent = `${currency} ${stats.allTimeIncome.toLocaleString()}`;
    if (elMonthExpense) elMonthExpense.textContent = `${currency} ${stats.monthlyExpenses.toLocaleString()}`;
    if (elAllTimeExpense) elAllTimeExpense.textContent = `- ${currency} ${stats.allTimeExpenses.toLocaleString()}`;
    if (elMonthNet) elMonthNet.textContent = `${currency} ${stats.monthlyNet.toLocaleString()}`;
    
    // Dashboard Financial Ledger Table: All-Time Net Balance & Divided Row
    const rowDivided = document.getElementById('dash-row-divided');
    const elDividedAmount = document.getElementById('dash-divided-amount');
    if (rowDivided && elDividedAmount) {
      if (split.totalDivided > 0) {
        rowDivided.style.display = 'table-row';
        elDividedAmount.textContent = `- ${currency} ${split.totalDivided.toLocaleString()}`;
      } else {
        rowDivided.style.display = 'none';
      }
    }

    if (elAllTimeNet) {
      if (split.isFullyDivided) {
        elAllTimeNet.innerHTML = `${currency} 0 <span style="font-size: 0.72rem; font-weight: 700; background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; margin-left: 6px; vertical-align: middle;">✓ Fully Divided</span>`;
      } else {
        elAllTimeNet.textContent = `${currency} ${split.netBalance.toLocaleString()}${split.isCustom ? ' (Custom)' : ''}`;
      }
    }

    // Dashboard Financial Ledger Table shares
    const dashTeacherShare = document.getElementById('dash-teacher-share');
    const dashAdminShare = document.getElementById('dash-admin-share');
    const dashTeacherPercent = document.getElementById('dash-teacher-percent');
    const dashAdminPercent = document.getElementById('dash-admin-percent');

    if (dashTeacherShare) dashTeacherShare.textContent = `${currency} ${split.cumulativeTeacherPaid.toLocaleString()}`;
    if (dashAdminShare) dashAdminShare.textContent = `${currency} ${split.cumulativeAdminPaid.toLocaleString()}`;
    if (dashTeacherPercent) dashTeacherPercent.textContent = `(Total Paid)`;
    if (dashAdminPercent) dashAdminPercent.textContent = `(Total Paid)`;

    // Financial Banner
    if (bannerIncome) bannerIncome.textContent = `${currency} ${stats.monthlyIncome.toLocaleString()}`;
    if (bannerAllTimeIncome) bannerAllTimeIncome.textContent = `${currency} ${stats.allTimeIncome.toLocaleString()}`;
    if (bannerAllTimeExpense) bannerAllTimeExpense.textContent = `${currency} ${stats.allTimeExpenses.toLocaleString()}`;
    if (bannerNetBalance) {
      if (split.isFullyDivided) {
        bannerNetBalance.innerHTML = `${currency} 0 <span style="font-size: 0.72rem; background: rgba(16, 185, 129, 0.25); color: #6ee7b7; padding: 2px 6px; border-radius: 4px; vertical-align: middle; font-weight: 600;">✓ Fully Divided</span>`;
      } else {
        bannerNetBalance.textContent = `${currency} ${split.netBalance.toLocaleString()}${split.isCustom ? ' (Custom)' : ''}`;
      }
    }

    const bannerDividedTag = document.getElementById('banner-divided-tag');
    if (bannerDividedTag) {
      bannerDividedTag.style.display = split.isFullyDivided ? 'block' : 'none';
    }

    const bannerUndividedAlert = document.getElementById('banner-undivided-alert');
    const bannerUndividedAmount = document.getElementById('banner-undivided-amount');
    if (bannerUndividedAlert) {
      if (split.netBalance > 0 && split.totalDivided > 0) {
        bannerUndividedAlert.style.display = 'block';
        if (bannerUndividedAmount) bannerUndividedAmount.textContent = `${currency} ${split.netBalance.toLocaleString()}`;
      } else {
        bannerUndividedAlert.style.display = 'none';
      }
    }

    const bannerTeacherShare = document.getElementById('banner-teacher-share');
    const bannerAdminShare = document.getElementById('banner-admin-share');
    if (bannerTeacherShare) bannerTeacherShare.textContent = `${currency} ${split.cumulativeTeacherPaid.toLocaleString()}`;
    if (bannerAdminShare) bannerAdminShare.textContent = `${currency} ${split.cumulativeAdminPaid.toLocaleString()}`;

    // Update Quick Defaulters Alert Widget in Dashboard
    const defaultersList = store.getDefaultersForMonth(curYM);
    const dashDefaultersWidget = document.getElementById('dash-defaulters-widget');
    if (dashDefaultersWidget) {
      if (defaultersList.length === 0) {
        dashDefaultersWidget.innerHTML = `
          <div style="text-align: center; padding: 24px; color: var(--success);">
            <i class="fas fa-check-circle" style="font-size: 2rem;"></i>
            <p style="margin-top: 8px; font-weight: 600;">All fees cleared for this month!</p>
          </div>
        `;
      } else {
        dashDefaultersWidget.innerHTML = defaultersList.slice(0, 4).map(s => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-light);">
            <div>
              <strong>${s.name}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${s.courseCode} • Roll #${s.rollNo}</div>
            </div>
            <div style="text-align: right;">
              <span style="color: var(--danger); font-weight: 700; font-size: 0.85rem;">
                Unpaid
              </span>
              <div>
                <button class="btn btn-sm btn-success" style="padding: 2px 8px; font-size: 0.72rem; margin-top: 2px;" 
                        onclick="FeesModule.openCollectModal('${s.id}', '${curYM}')">
                  Collect Fee
                </button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }
  },

  // Settings Management
  bindSettings() {
    const infoForm = document.getElementById('academy-info-form');
    if (infoForm) {
      infoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const updated = {
          name: document.getElementById('setting-name').value.trim(),
          subtitle: document.getElementById('setting-subtitle').value.trim(),
          phone: document.getElementById('setting-phone').value.trim(),
          address: document.getElementById('setting-address').value.trim(),
          currency: document.getElementById('setting-currency').value.trim()
        };
        window.academyStore.updateAcademyInfo(updated);
        this.showToast('Academy settings saved successfully', 'success');
        this.refreshDashboard();
      });
    }

    const newCourseForm = document.getElementById('new-course-form');
    if (newCourseForm) {
      newCourseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const courseData = {
          code: document.getElementById('course-code').value.trim(),
          name: document.getElementById('course-name').value.trim(),
          durationMonths: parseInt(document.getElementById('course-duration').value) || 3,
          defaultFee: parseFloat(document.getElementById('course-fee').value) || 0,
          admissionFee: parseFloat(document.getElementById('course-adm-fee').value) || 0
        };
        window.academyStore.addCourse(courseData);
        newCourseForm.reset();
        this.showToast(`Course ${courseData.code} added successfully`, 'success');
        this.renderSettings();
        if (window.StudentsModule) window.StudentsModule.populateCourseDropdowns();
      });
    }

    // Import Backup file handler
    const importInput = document.getElementById('import-file-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          const success = window.academyStore.importBackupJSON(content);
          if (success) {
            this.showToast('Backup restored successfully!', 'success');
            setTimeout(() => location.reload(), 800);
          } else {
            this.showToast('Invalid backup file. Import failed.', 'danger');
          }
        };
        reader.readAsText(file);
      });
    }

    // Firebase Cloud Form Handler
    const firebaseForm = document.getElementById('firebase-config-form');
    if (firebaseForm) {
      firebaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawJson = document.getElementById('fb-raw-config').value.trim();
        let configObj = {};

        if (rawJson) {
          try {
            // Clean up if copied as JS object `const firebaseConfig = { ... };`
            let cleaned = rawJson.replace(/const\s+firebaseConfig\s*=\s*/g, '').replace(/;/g, '').trim();
            // Convert unquoted keys to quoted JSON keys if needed
            cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
            configObj = JSON.parse(cleaned);
          } catch (err) {
            this.showToast('Invalid JSON / Config pasted. Please verify format.', 'danger');
            return;
          }
        } else {
          configObj = {
            apiKey: document.getElementById('fb-apiKey').value.trim(),
            authDomain: document.getElementById('fb-authDomain').value.trim(),
            projectId: document.getElementById('fb-projectId').value.trim(),
            storageBucket: document.getElementById('fb-storageBucket').value.trim(),
            messagingSenderId: document.getElementById('fb-messagingSenderId').value.trim(),
            appId: document.getElementById('fb-appId').value.trim()
          };
        }

        if (!configObj.apiKey || !configObj.projectId) {
          this.showToast('API Key and Project ID are required to connect to Firebase.', 'warning');
          return;
        }

        const success = await window.FirebaseSync.connect(configObj, true);
        if (success) {
          this.renderSettings();
        }
      });
    }

    // Push local to cloud button
    const pushBtn = document.getElementById('btn-push-to-cloud');
    if (pushBtn) {
      pushBtn.addEventListener('click', () => {
        if (!window.FirebaseSync.isConnected) {
          this.showToast('Please connect to Firebase Cloud first.', 'warning');
          return;
        }
        window.FirebaseSync.pushToCloud(window.academyStore.state, true);
      });
    }

    // Pull from cloud button
    const pullBtn = document.getElementById('btn-pull-from-cloud');
    if (pullBtn) {
      pullBtn.addEventListener('click', () => {
        if (!window.FirebaseSync.isConnected) {
          this.showToast('Please connect to Firebase Cloud first.', 'warning');
          return;
        }
        window.FirebaseSync.pullFromCloud();
      });
    }

    // Disconnect cloud button
    const disconnectBtn = document.getElementById('btn-disconnect-cloud');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        if (confirm('Disconnect Firebase cloud synchronization? Your records will remain safe locally.')) {
          window.FirebaseSync.clearConfig();
          this.showToast('Firebase Cloud disconnected.', 'info');
          this.renderSettings();
        }
      });
    }
  },

  renderSettings() {
    const info = window.academyStore.getAcademyInfo();
    const nameEl = document.getElementById('setting-name');
    const subEl = document.getElementById('setting-subtitle');
    const phoneEl = document.getElementById('setting-phone');
    const addrEl = document.getElementById('setting-address');
    const currEl = document.getElementById('setting-currency');

    if (nameEl) nameEl.value = info.name || '';
    if (subEl) subEl.value = info.subtitle || '';
    if (phoneEl) phoneEl.value = info.phone || '';
    if (addrEl) addrEl.value = info.address || '';
    if (currEl) currEl.value = info.currency || 'Rs.';

    // Render Courses table in settings
    const coursesTable = document.getElementById('settings-courses-tbody');
    if (coursesTable) {
      const courses = window.academyStore.getCourses();
      coursesTable.innerHTML = courses.map(c => `
        <tr>
          <td><strong>${c.code}</strong></td>
          <td>${c.name}</td>
          <td>${c.durationMonths} Months</td>
          <td>${info.currency} ${c.defaultFee.toLocaleString()}/mo</td>
          <td>${info.currency} ${(c.admissionFee || 0).toLocaleString()}</td>
        </tr>
      `).join('');
    }

    // Render Firebase settings status
    const savedFbConfig = window.FirebaseSync ? window.FirebaseSync.loadConfig() : null;
    const isFbConnected = window.FirebaseSync && window.FirebaseSync.isConnected;

    if (savedFbConfig) {
      const apiKeyEl = document.getElementById('fb-apiKey');
      const authDomainEl = document.getElementById('fb-authDomain');
      const projectIdEl = document.getElementById('fb-projectId');
      const storageBucketEl = document.getElementById('fb-storageBucket');
      const messagingSenderIdEl = document.getElementById('fb-messagingSenderId');
      const appIdEl = document.getElementById('fb-appId');

      if (apiKeyEl) apiKeyEl.value = savedFbConfig.apiKey || '';
      if (authDomainEl) authDomainEl.value = savedFbConfig.authDomain || '';
      if (projectIdEl) projectIdEl.value = savedFbConfig.projectId || '';
      if (storageBucketEl) storageBucketEl.value = savedFbConfig.storageBucket || '';
      if (messagingSenderIdEl) messagingSenderIdEl.value = savedFbConfig.messagingSenderId || '';
      if (appIdEl) appIdEl.value = savedFbConfig.appId || '';
    }

    const fbStatusText = document.getElementById('fb-settings-status-text');
    if (fbStatusText) {
      if (isFbConnected) {
        fbStatusText.innerHTML = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Connected to Firebase Live Sync</span>';
      } else if (savedFbConfig) {
        fbStatusText.innerHTML = '<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Saved (Connecting or Offline)</span>';
      } else {
        fbStatusText.innerHTML = '<span class="badge badge-neutral"><i class="fas fa-plug"></i> Not Connected (Local Storage Mode)</span>';
      }
    }
  },

  // Modal Control
  bindModals() {
    // Backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });

    // Close buttons
    document.querySelectorAll('.modal-close-btn, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('open');
      });
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '<i class="fas fa-info-circle" style="color: var(--primary);"></i>';
    if (type === 'success') icon = '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
    if (type === 'danger') icon = '<i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>';
    if (type === 'warning') icon = '<i class="fas fa-exclamation-circle" style="color: var(--warning);"></i>';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // ==================== PROFIT SPLIT & EDITABLE NET BALANCE ====================

  bindProfitSplitModal() {
    const form = document.getElementById('profit-split-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleProfitSplitSubmit();
      });
    }
  },

  openProfitSplitModal() {
    const split = window.academyStore.getProfitSplit();
    const currency = window.academyStore.getAcademyInfo().currency;

    const elCalcIncome = document.getElementById('split-calc-income');
    const elCalcExpenses = document.getElementById('split-calc-expenses');
    const elCalcNet = document.getElementById('split-calc-net');
    const inputNetBalance = document.getElementById('split-net-balance-input');
    const radioAuto = document.getElementById('split-mode-auto');
    const radioCustom = document.getElementById('split-mode-custom');
    const helperText = document.getElementById('split-balance-helper');

    const inputTeacherPct = document.getElementById('split-teacher-pct');
    const inputAdminPct = document.getElementById('split-admin-pct');
    const inputNotes = document.getElementById('split-modal-notes');

    if (elCalcIncome) elCalcIncome.textContent = `${currency} ${split.calculatedIncome.toLocaleString()}`;
    if (elCalcExpenses) elCalcExpenses.textContent = `- ${currency} ${split.calculatedExpenses.toLocaleString()}`;
    if (elCalcNet) elCalcNet.textContent = `${currency} ${split.totalNetProfit.toLocaleString()}`;

    // Available amount to divide right now:
    // If there is undivided remaining balance (>0), show that. Otherwise show total net profit.
    const availableAmount = split.netBalance > 0 ? split.netBalance : (split.totalNetProfit || 0);

    if (split.isCustom) {
      if (radioCustom) radioCustom.checked = true;
      if (inputNetBalance) {
        inputNetBalance.readOnly = false;
        inputNetBalance.value = availableAmount;
      }
      if (helperText) helperText.textContent = 'Custom Net Balance manually set. You can edit this number freely.';
    } else {
      if (radioAuto) radioAuto.checked = true;
      if (inputNetBalance) {
        inputNetBalance.readOnly = true;
        inputNetBalance.value = availableAmount;
      }
      if (helperText) {
        if (split.totalDivided > 0) {
          helperText.innerHTML = `Gross Net Profit: <strong>${currency} ${split.totalNetProfit.toLocaleString()}</strong> • Already Divided: <strong style="color: #2563eb;">${currency} ${split.totalDivided.toLocaleString()}</strong> • Undivided to Divide: <strong style="color: #047857;">${currency} ${split.netBalance.toLocaleString()}</strong>`;
        } else {
          helperText.textContent = 'Using automated formula: Total Fee Income minus Expenses.';
        }
      }
    }

    if (inputTeacherPct) inputTeacherPct.value = split.teacherPercent;
    if (inputAdminPct) inputAdminPct.value = split.adminPercent;
    if (inputNotes) inputNotes.value = '';

    const chkDivide = document.getElementById('split-is-divided');
    if (chkDivide) {
      chkDivide.checked = true;
    }
    this.onDivideCheckboxChange();

    this.updateProfitSplitLivePreview();
    this.openModal('profit-split-modal');
  },

  onDivideCheckboxChange() {
    const chk = document.getElementById('split-is-divided');
    const btn = document.getElementById('split-submit-btn');
    if (!btn) return;
    if (chk && chk.checked) {
      btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Division (Net = Rs. 0)';
    } else {
      btn.innerHTML = '<i class="fas fa-save"></i> Save Split (Keep Balance)';
    }
  },

  toggleNetBalanceMode() {
    const isCustom = document.getElementById('split-mode-custom').checked;
    const inputNetBalance = document.getElementById('split-net-balance-input');
    const helperText = document.getElementById('split-balance-helper');
    const split = window.academyStore.getProfitSplit();
    const availableAmount = split.netBalance > 0 ? split.netBalance : (split.totalNetProfit || 0);

    if (isCustom) {
      inputNetBalance.readOnly = false;
      inputNetBalance.focus();
      inputNetBalance.select();
      helperText.textContent = 'Custom Net Balance enabled. Enter any amount you want above.';
    } else {
      inputNetBalance.readOnly = true;
      inputNetBalance.value = availableAmount;
      if (split.totalDivided > 0) {
        helperText.innerHTML = `Gross Net Profit: <strong>${split.totalNetProfit.toLocaleString()}</strong> • Divided: <strong>${split.totalDivided.toLocaleString()}</strong> • Undivided: <strong>${split.netBalance.toLocaleString()}</strong>`;
      } else {
        helperText.textContent = 'Using automated formula: Total Fee Income minus Expenses.';
      }
    }

    this.updateProfitSplitLivePreview();
  },

  setSplitPreset(teacherPct, adminPct) {
    const inputTeacherPct = document.getElementById('split-teacher-pct');
    const inputAdminPct = document.getElementById('split-admin-pct');
    if (inputTeacherPct) inputTeacherPct.value = teacherPct;
    if (inputAdminPct) inputAdminPct.value = adminPct;
    this.updateProfitSplitLivePreview();
  },

  onTeacherPctChange() {
    const inputTeacherPct = document.getElementById('split-teacher-pct');
    const inputAdminPct = document.getElementById('split-admin-pct');
    let tPct = parseFloat(inputTeacherPct.value);
    if (isNaN(tPct)) tPct = 50;
    tPct = Math.max(0, Math.min(100, tPct));
    inputAdminPct.value = 100 - tPct;
    this.updateProfitSplitLivePreview();
  },

  onAdminPctChange() {
    const inputTeacherPct = document.getElementById('split-teacher-pct');
    const inputAdminPct = document.getElementById('split-admin-pct');
    let aPct = parseFloat(inputAdminPct.value);
    if (isNaN(aPct)) aPct = 50;
    aPct = Math.max(0, Math.min(100, aPct));
    inputTeacherPct.value = 100 - aPct;
    this.updateProfitSplitLivePreview();
  },

  onNetBalanceInputChange() {
    this.updateProfitSplitLivePreview();
  },

  updateProfitSplitLivePreview() {
    const inputNetBalance = document.getElementById('split-net-balance-input');
    const inputTeacherPct = document.getElementById('split-teacher-pct');
    const previewTeacher = document.getElementById('split-preview-teacher');
    const previewAdmin = document.getElementById('split-preview-admin');
    const previewTeacherPct = document.getElementById('split-preview-teacher-pct');
    const previewAdminPct = document.getElementById('split-preview-admin-pct');
    const currency = window.academyStore.getAcademyInfo().currency;

    if (!inputNetBalance || !inputTeacherPct) return;

    const netBalance = parseFloat(inputNetBalance.value) || 0;
    let tPct = parseFloat(inputTeacherPct.value);
    if (isNaN(tPct)) tPct = 50;
    const aPct = 100 - tPct;

    const teacherAmount = Math.round((netBalance * tPct) / 100);
    const adminAmount = netBalance - teacherAmount;

    if (previewTeacher) previewTeacher.textContent = `${currency} ${teacherAmount.toLocaleString()}`;
    if (previewAdmin) previewAdmin.textContent = `${currency} ${adminAmount.toLocaleString()}`;
    if (previewTeacherPct) previewTeacherPct.textContent = `${tPct}% of Net Balance`;
    if (previewAdminPct) previewAdminPct.textContent = `${aPct}% of Net Balance`;
  },

  handleProfitSplitSubmit() {
    const isCustom = document.getElementById('split-mode-custom').checked;
    const customNetBalance = parseFloat(document.getElementById('split-net-balance-input').value) || 0;
    const teacherPercent = parseFloat(document.getElementById('split-teacher-pct').value) || 50;
    const adminPercent = parseFloat(document.getElementById('split-admin-pct').value) || (100 - teacherPercent);
    const notes = document.getElementById('split-modal-notes').value.trim();
    const chkDivide = document.getElementById('split-is-divided');
    const isDivided = chkDivide ? chkDivide.checked : true;

    const amountToDivide = parseFloat(document.getElementById('split-net-balance-input').value) || 0;

    window.academyStore.saveProfitSplit({
      isCustom,
      customNetBalance: isCustom ? customNetBalance : null,
      isDivided,
      amountToDivide,
      splitType: 'percentage',
      teacherPercent,
      adminPercent,
      notes
    });

    this.closeModal('profit-split-modal');
    if (isDivided) {
      this.showToast('Payment successfully divided between Teacher & Admin! All-Time Net Balance is now Rs. 0.', 'success');
    } else {
      this.showToast('Profit distribution split saved.', 'info');
    }
    this.refreshDashboard();
  },

  // Open the Teacher & Admin Fee Profit Distribution Report Modal
  openProfitReportModal() {
    const store = window.academyStore;
    const academy = store.getAcademyInfo();
    const split = store.getProfitSplit();
    const currency = academy.currency;
    const container = document.getElementById('profit-report-content');
    if (!container) return;

    const distributions = split.distributions || [];
    const dateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let distributionsHtml = '';
    if (distributions.length === 0) {
      distributionsHtml = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
            <div style="font-size: 1.8rem; margin-bottom: 6px;"><i class="fas fa-hand-holding-usd"></i></div>
            <strong>No fee payout distributions recorded yet.</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;">Click <strong>Edit & Divide</strong> on the All-Time Net Balance card to disburse fees.</p>
          </td>
        </tr>
      `;
    } else {
      distributionsHtml = distributions.map((d, index) => `
        <tr>
          <td><span style="font-family: monospace; font-weight: 700; background: #e0e7ff; color: var(--primary); padding: 2px 6px; border-radius: 4px;">${d.refNo || ('DIV-' + (index + 1))}</span></td>
          <td><strong>${d.date}</strong></td>
          <td><strong style="color: #2563eb; font-size: 0.95rem;">${currency} ${d.amount.toLocaleString()}</strong></td>
          <td><strong style="color: #047857;">${currency} ${d.teacherShare.toLocaleString()}</strong> <span style="font-size: 0.72rem; color: #065f46;">(${d.teacherPct}%)</span></td>
          <td><strong style="color: #c2410c;">${currency} ${d.adminShare.toLocaleString()}</strong> <span style="font-size: 0.72rem; color: #9a3412;">(${d.adminPct}%)</span></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${d.notes || 'Routine fee profit distribution'}</td>
          <td>
            <div class="action-buttons">
              <button class="icon-btn" title="Print Payout Voucher Slip" onclick="App.printIndividualDistributionSlip('${d.id}')">
                <i class="fas fa-print"></i>
              </button>
              <button class="icon-btn danger" title="Delete Payout Entry" onclick="App.deleteProfitDistributionEntry('${d.id}')">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      <div style="font-family: 'Inter', sans-serif;">
        
        <!-- Academy Official Header -->
        <div style="border-bottom: 2px solid var(--border); padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">
              ${academy.name}
            </h2>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 2px;">
              ${academy.subtitle}
            </p>
            <p style="font-size: 0.76rem; color: var(--text-muted);">
              ${academy.address} • Phone: ${academy.phone}
            </p>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-primary" style="font-size: 0.8rem; padding: 4px 10px;">Teacher & Admin Fee Payout Statement</span>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">
              Generated: <strong>${dateFormatted}</strong>
            </div>
          </div>
        </div>

        <!-- Financial Position Summary Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 18px;">
          
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.7rem; color: #166534; font-weight: 700; text-transform: uppercase;">Total Fee Income</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #15803d; margin-top: 2px;">${currency} ${split.calculatedIncome.toLocaleString()}</div>
            <div style="font-size: 0.68rem; color: #166534;">From student fees</div>
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.7rem; color: #991b1b; font-weight: 700; text-transform: uppercase;">Total Expenses</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #b91c1c; margin-top: 2px;">${currency} ${split.calculatedExpenses.toLocaleString()}</div>
            <div style="font-size: 0.68rem; color: #991b1b;">Academy expenditures</div>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.7rem; color: #1e40af; font-weight: 700; text-transform: uppercase;">Gross Net Profit</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #1d4ed8; margin-top: 2px;">${currency} ${split.totalNetProfit.toLocaleString()}</div>
            <div style="font-size: 0.68rem; color: #1e40af;">Total net margin</div>
          </div>

          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.7rem; color: #6b21a8; font-weight: 700; text-transform: uppercase;">Total Divided & Paid</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #7e22ce; margin-top: 2px;">${currency} ${split.totalDivided.toLocaleString()}</div>
            <div style="font-size: 0.68rem; color: #6b21a8;">To Teacher & Admin</div>
          </div>

          <div style="background: ${split.netBalance === 0 ? '#f8fafc' : '#fefce8'}; border: 1px solid ${split.netBalance === 0 ? '#cbd5e1' : '#fde047'}; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 0.7rem; color: #854d0e; font-weight: 700; text-transform: uppercase;">Remaining Net Balance</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: ${split.netBalance === 0 ? '#64748b' : '#a16207'}; margin-top: 2px;">${currency} ${split.netBalance.toLocaleString()}</div>
            <div style="font-size: 0.68rem; color: ${split.netBalance === 0 ? '#64748b' : '#854d0e'};">${split.netBalance === 0 ? '✓ Fully Cleared (0)' : 'Undivided in Fund'}</div>
          </div>

        </div>

        <!-- Cumulative Partner Payout Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
          <div style="background: #ecfdf5; border: 2px solid #6ee7b7; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; color: #065f46; font-weight: 700; text-transform: uppercase;">
                <i class="fas fa-chalkboard-teacher"></i> Teacher Total Payout Received
              </div>
              <div style="font-size: 1.45rem; font-weight: 900; color: #047857; margin-top: 4px;">
                ${currency} ${split.cumulativeTeacherPaid.toLocaleString()}
              </div>
              <div style="font-size: 0.74rem; color: #047857;">Cumulative teacher earnings</div>
            </div>
            <div style="font-size: 2.2rem; color: #10b981; opacity: 0.6;">
              <i class="fas fa-graduation-cap"></i>
            </div>
          </div>

          <div style="background: #fff7ed; border: 2px solid #fdba74; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; color: #9a3412; font-weight: 700; text-transform: uppercase;">
                <i class="fas fa-user-shield"></i> Admin Total Payout Received
              </div>
              <div style="font-size: 1.45rem; font-weight: 900; color: #c2410c; margin-top: 4px;">
                ${currency} ${split.cumulativeAdminPaid.toLocaleString()}
              </div>
              <div style="font-size: 0.74rem; color: #c2410c;">Cumulative academy share</div>
            </div>
            <div style="font-size: 2.2rem; color: #f97316; opacity: 0.6;">
              <i class="fas fa-user-tie"></i>
            </div>
          </div>
        </div>

        <!-- Distribution History Ledger Table -->
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              <i class="fas fa-history" style="color: var(--primary);"></i> Payout & Distribution Records Log
            </h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${distributions.length} disbursement record${distributions.length === 1 ? '' : 's'}</span>
          </div>

          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.85rem;">
              <thead>
                <tr>
                  <th>Voucher #</th>
                  <th>Date</th>
                  <th>Total Divided</th>
                  <th>Teacher Received</th>
                  <th>Admin Received</th>
                  <th>Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${distributionsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Official Signatures Box for Print Verification -->
        <div style="margin-top: 26px; border-top: 2px dashed #cbd5e1; padding-top: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center; font-size: 0.82rem;">
          <div>
            <div style="height: 32px;"></div>
            <div style="border-top: 1px solid #64748b; padding-top: 4px; font-weight: 600;">Teacher Signature</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Faculty Representative</div>
          </div>
          <div>
            <div style="height: 32px;"></div>
            <div style="border-top: 1px solid #64748b; padding-top: 4px; font-weight: 600;">Admin Signature</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Operations Head</div>
          </div>
          <div>
            <div style="height: 32px;"></div>
            <div style="border-top: 1px solid #64748b; padding-top: 4px; font-weight: 600;">Director / Principal</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Official Approval Seal</div>
          </div>
        </div>

      </div>
    `;

    this.openModal('profit-report-modal');
  },

  // Delete an individual payout record
  deleteProfitDistributionEntry(distId) {
    if (confirm('Are you sure you want to remove this fee payout distribution record? The amount will be restored to the undivided net balance.')) {
      window.academyStore.deleteProfitDistribution(distId);
      this.showToast('Distribution record removed. Remaining net balance updated.', 'info');
      this.refreshDashboard();
      this.openProfitReportModal();
    }
  },

  // Print full official distribution statement
  printProfitReportSlip() {
    const reportContent = document.getElementById('profit-report-content');
    const printArea = document.getElementById('printable-receipt-area');
    if (reportContent && printArea) {
      printArea.innerHTML = `
        <div style="padding: 24px; font-family: 'Inter', sans-serif;">
          ${reportContent.innerHTML}
        </div>
      `;
      window.print();
    }
  },

  // Print single individual payout distribution slip
  printIndividualDistributionSlip(distId) {
    const store = window.academyStore;
    const academy = store.getAcademyInfo();
    const split = store.getProfitSplit();
    const dist = (split.distributions || []).find(d => d.id === distId);
    if (!dist) return;

    const htmlContent = `
      <div class="receipt-slip" style="max-width: 600px; font-family: 'Inter', sans-serif; margin: 0 auto; padding: 20px; border: 2px solid #0f172a; border-radius: 8px;">
        <div class="receipt-header" style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; text-align: center;">
          <h2 style="font-size: 1.4rem; margin-bottom: 2px;">${academy.name}</h2>
          <p style="font-size: 0.85rem; color: #475569;">${academy.subtitle}</p>
          <p style="font-size: 0.75rem; color: #64748b;">${academy.address} • Phone: ${academy.phone}</p>
          <div class="receipt-voucher-title" style="background: #2563eb; color: #fff; padding: 4px 10px; font-weight: 700; margin-top: 8px; border-radius: 4px;">
            FEE PROFIT DISTRIBUTION VOUCHER
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 14px; margin-bottom: 14px; font-size: 0.85rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
          <div><strong>Voucher Ref:</strong> ${dist.refNo || dist.id}</div>
          <div><strong>Disbursement Date:</strong> ${dist.date}</div>
        </div>

        <table style="width: 100%; font-size: 0.9rem; line-height: 2; margin-bottom: 18px; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="color: #64748b; font-weight: 600;">Total Amount Disbursed:</td>
            <td style="text-align: right; font-weight: 800; font-size: 1.1rem; color: #2563eb;">${academy.currency} ${dist.amount.toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="color: #065f46; font-weight: 700;"><i class="fas fa-chalkboard-teacher"></i> Teacher Share (${dist.teacherPct}%):</td>
            <td style="text-align: right; font-weight: 800; color: #047857; font-size: 1.05rem;">${academy.currency} ${dist.teacherShare.toLocaleString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="color: #9a3412; font-weight: 700;"><i class="fas fa-user-shield"></i> Admin Share (${dist.adminPct}%):</td>
            <td style="text-align: right; font-weight: 800; color: #c2410c; font-size: 1.05rem;">${academy.currency} ${dist.adminShare.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Remarks / Note:</td>
            <td style="text-align: right; font-weight: 600;">${dist.notes || 'Routine profit disbursement'}</td>
          </tr>
        </table>

        <div style="margin-top: 36px; display: flex; justify-content: space-between; font-size: 0.8rem; border-top: 1px dashed #94a3b8; padding-top: 14px;">
          <div style="text-align: center;">
            _______________________<br>
            <strong>Teacher Signature</strong>
          </div>
          <div style="text-align: center;">
            _______________________<br>
            <strong>Admin / Director Signature</strong>
          </div>
        </div>
      </div>
    `;

    const printArea = document.getElementById('printable-receipt-area');
    if (printArea) {
      printArea.innerHTML = htmlContent;
    }
    const modalPreview = document.getElementById('slip-preview-container');
    if (modalPreview) {
      modalPreview.innerHTML = htmlContent;
      App.openModal('receipt-slip-modal');
    }
  },

  // Export all distributions to CSV
  exportProfitReportCSV() {
    const store = window.academyStore;
    const split = store.getProfitSplit();
    const distributions = split.distributions || [];

    if (distributions.length === 0) {
      this.showToast('No fee distributions to export', 'warning');
      return;
    }

    const headers = ['Voucher Ref', 'Date', 'Total Disbursed', 'Teacher Share (Rs)', 'Teacher %', 'Admin Share (Rs)', 'Admin %', 'Remarks'];
    const rows = distributions.map(d => [
      `"${d.refNo || d.id}"`,
      `"${d.date}"`,
      d.amount,
      d.teacherShare,
      d.teacherPct,
      d.adminShare,
      d.adminPct,
      `"${d.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Zonish_Academy_Fee_Distribution_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.showToast('Distribution report exported to CSV', 'success');
  },

  resetProfitSplitToAuto() {
    window.academyStore.resetProfitSplitToAuto();
    const split = window.academyStore.getProfitSplit();

    const radioAuto = document.getElementById('split-mode-auto');
    const inputNetBalance = document.getElementById('split-net-balance-input');
    const helperText = document.getElementById('split-balance-helper');
    const inputTeacherPct = document.getElementById('split-teacher-pct');
    const inputAdminPct = document.getElementById('split-admin-pct');
    const chkDivide = document.getElementById('split-is-divided');

    if (radioAuto) radioAuto.checked = true;
    if (inputNetBalance) {
      inputNetBalance.readOnly = true;
      inputNetBalance.value = split.calculatedNet;
    }
    if (helperText) helperText.textContent = 'Using automated formula: Total Fee Income minus Expenses.';
    if (inputTeacherPct) inputTeacherPct.value = 50;
    if (inputAdminPct) inputAdminPct.value = 50;
    if (chkDivide) chkDivide.checked = false;

    this.onDivideCheckboxChange();
    this.updateProfitSplitLivePreview();
    this.showToast('Net Balance re-opened and reset to full calculated income minus expenses', 'info');
    this.refreshDashboard();
  },

  // Backup & Reset Actions
  exportDataBackup() {
    window.academyStore.exportBackupJSON();
    this.showToast('Database backup downloaded successfully', 'success');
  },

  resetDemoData() {
    if (confirm('This will reset the system back to sample records for CIT, DIT, and Office Automation students. Any unsaved custom records will be overwritten. Proceed?')) {
      window.academyStore.resetToDefault();
      this.showToast('Reset to demo records completed', 'success');
      setTimeout(() => location.reload(), 600);
    }
  },

  clearData() {
    if (confirm('WARNING: Are you sure you want to completely erase all student and financial data? Please export a backup first.')) {
      if (confirm('Double confirmation: Really delete all academy records?')) {
        window.academyStore.clearAllData();
        this.showToast('All academy data cleared', 'info');
        setTimeout(() => location.reload(), 600);
      }
    }
  }
};

window.App = App;

// Bootstrap on DOM load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
