/**
 * Zonish Academy - Monthly Fee Tracking Module
 * Handles monthly fee collection, payment receipts, fee defaulters list,
 * WhatsApp payment reminders, and transaction ledgers.
 */

const FeesModule = {
  selectedYearMonth: '',

  init() {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    this.selectedYearMonth = `${curYear}-${curMonth}`;

    this.bindEvents();
    this.populateStudentDropdown();
    this.render();
  },

  bindEvents() {
    // Month picker in Fee Tracker tab
    const monthPicker = document.getElementById('fee-month-selector');
    if (monthPicker) {
      monthPicker.value = this.selectedYearMonth;
      monthPicker.addEventListener('change', (e) => {
        this.selectedYearMonth = e.target.value;
        this.render();
      });
    }

    // Collect Fee Form submission
    const collectForm = document.getElementById('collect-fee-form');
    if (collectForm) {
      collectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCollectSubmit();
      });
    }

    // Student change in Collect Modal -> update fee details
    const studentSelect = document.getElementById('fee-student-select');
    if (studentSelect) {
      studentSelect.addEventListener('change', () => this.updateFeeBalanceDetails());
    }

    // Month change in Collect Modal -> recalculate details
    const monthInput = document.getElementById('fee-month-input');
    if (monthInput) {
      monthInput.addEventListener('change', () => this.updateFeeBalanceDetails());
    }

    // Live amount change -> calculate live feedback
    const amountInput = document.getElementById('fee-amount');
    if (amountInput) {
      amountInput.addEventListener('input', () => this.calculateLiveBalance());
    }
  },

  setPaymentAmount(amount) {
    const amountInput = document.getElementById('fee-amount');
    if (amountInput) {
      amountInput.value = amount;
      this.calculateLiveBalance();
    }
  },

  calculateLiveBalance() {
    const amountInput = document.getElementById('fee-amount');
    const liveBox = document.getElementById('fee-live-balance-box');
    if (!amountInput || !liveBox) return;

    const payingNow = parseFloat(amountInput.value) || 0;
    const currency = window.academyStore.getAcademyInfo().currency;

    liveBox.style.display = 'block';

    if (payingNow <= 0) {
      liveBox.style.background = '#f1f5f9';
      liveBox.style.color = 'var(--text-muted)';
      liveBox.style.border = '1px solid var(--border)';
      liveBox.innerHTML = `<i class="fas fa-info-circle"></i> 2,000 is optional. Enter whatever the student pays (e.g. 1000, 1500, 2000).`;
    } else {
      liveBox.style.background = '#ecfdf5';
      liveBox.style.color = '#065f46';
      liveBox.style.border = '1px solid #a7f3d0';
      liveBox.innerHTML = `<strong><i class="fas fa-check-circle"></i> Fee Cleared:</strong> Collecting ${currency} ${payingNow.toLocaleString()} marks this month as <strong>Paid</strong> in full. <strong>Zero dues added</strong> to the student's account!`;
    }
  },

  updateFeeBalanceDetails() {
    const studentSelect = document.getElementById('fee-student-select');
    const monthInput = document.getElementById('fee-month-input');
    const amountInput = document.getElementById('fee-amount');
    const infoContainer = document.getElementById('fee-course-info');
    if (!studentSelect || !amountInput || !infoContainer) return;

    const studentId = studentSelect.value;
    const targetMonth = monthInput ? monthInput.value : this.selectedYearMonth;

    if (!studentId) {
      infoContainer.innerHTML = '';
      return;
    }

    const student = window.academyStore.getStudentById(studentId);
    if (!student) return;

    const currency = window.academyStore.getAcademyInfo().currency;
    const allPayments = window.academyStore.getFeePayments()
      .filter(f => f.studentId === studentId && f.monthYear === targetMonth);
    const alreadyPaid = allPayments.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);

    if (alreadyPaid > 0) {
      infoContainer.innerHTML = `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 7px 12px; margin-top: 6px; color: #065f46; font-size: 0.82rem;">
          <i class="fas fa-check-circle"></i> <strong>${student.name}</strong> • ${student.courseCode} — Already paid <strong>${currency} ${alreadyPaid.toLocaleString()}</strong> for ${targetMonth}. Month fee is already settled!
        </div>
      `;
      amountInput.value = '';
      amountInput.placeholder = 'Already paid. Enter amount only if collecting extra.';
    } else {
      infoContainer.innerHTML = `
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; padding: 7px 12px; margin-top: 6px; color: var(--text-main); font-size: 0.82rem;">
          <strong>${student.name}</strong> • ${student.courseCode} (Roll #${student.rollNo}) — Status: <strong style="color: var(--danger);">Unpaid</strong> for ${targetMonth}.<br>
          <span style="color: var(--text-muted); font-size: 0.76rem;">(Rs. 2,000 is optional. Paying 1,000, 1,500, or 2,000 clears this month with 0 dues added).</span>
        </div>
      `;
      if (!amountInput.value || parseFloat(amountInput.value) === 0) {
        amountInput.value = (student.monthlyFee && student.monthlyFee > 0) ? student.monthlyFee : 2000;
      }
    }

    this.calculateLiveBalance();
  },

  populateStudentDropdown() {
    const studentSelect = document.getElementById('fee-student-select');
    if (!studentSelect) return;

    const students = window.academyStore.getStudents().filter(s => s.status === 'active');
    studentSelect.innerHTML = '<option value="">-- Select Active Student --</option>' +
      students.map(s => `<option value="${s.id}">${s.name} (Roll #${s.rollNo} - ${s.courseCode})</option>`).join('');
  },

  render() {
    this.renderMonthStats();
    this.renderDefaultersList();
    this.renderTransactionsList();
  },

  renderMonthStats() {
    const ym = this.selectedYearMonth;
    const store = window.academyStore;
    const currency = store.getAcademyInfo().currency;
    const activeStudents = store.getStudents().filter(s => s.status === 'active');

    // Payments for this month (fees designated for this monthYear)
    const paymentsThisMonth = store.getFeePayments().filter(f => f.monthYear === ym);
    const collectedTotal = paymentsThisMonth.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);

    const paidStudentIds = new Set(paymentsThisMonth.filter(p => (Number(p.amountPaid) || 0) > 0).map(p => p.studentId));
    const paidCount = activeStudents.filter(s => paidStudentIds.has(s.id)).length;
    const defaultersCount = activeStudents.length - paidCount;

    // Expected target based on active students
    const expectedTotal = activeStudents.reduce((sum, s) => sum + (s.monthlyFee || 2000), 0);
    const pendingTotal = defaultersCount * 2000;
    const pct = activeStudents.length > 0 ? Math.round((paidCount / activeStudents.length) * 100) : 0;

    // Update UI elements
    const statCollected = document.getElementById('fee-stat-collected');
    const statPending = document.getElementById('fee-stat-pending');
    const statExpected = document.getElementById('fee-stat-expected');
    const statPaidStudents = document.getElementById('fee-stat-paid-count');
    const progressBar = document.getElementById('fee-month-progress-bar');
    const progressText = document.getElementById('fee-month-progress-text');

    if (statCollected) statCollected.textContent = `${currency} ${collectedTotal.toLocaleString()}`;
    if (statPending) statPending.textContent = `${defaultersCount} Students Unpaid (${currency} ${pendingTotal.toLocaleString()} est.)`;
    if (statExpected) statExpected.textContent = `${currency} ${expectedTotal.toLocaleString()}`;
    if (statPaidStudents) statPaidStudents.textContent = `${paidCount} / ${activeStudents.length} Students Cleared (${pct}%)`;
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${pct}% Students Cleared`;
  },

  renderDefaultersList() {
    const container = document.getElementById('defaulters-table-body');
    if (!container) return;

    const store = window.academyStore;
    const currency = store.getAcademyInfo().currency;
    const activeStudents = store.getStudents().filter(s => s.status === 'active');
    const defaulters = store.getDefaultersForMonth(this.selectedYearMonth);

    if (activeStudents.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 8px;">🎓</div>
            <strong>No active students registered yet.</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;">Click "Students & Records" to admit your first student.</p>
          </td>
        </tr>
      `;
      return;
    }

    if (defaulters.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--success);">
            <div style="font-size: 1.8rem; margin-bottom: 6px;"><i class="fas fa-check-circle"></i></div>
            <strong>All active students have cleared their fees for ${this.formatMonthName(this.selectedYearMonth)}!</strong>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = defaulters.map(student => {
      const monthFormatted = this.formatMonthName(this.selectedYearMonth);
      const reminderMsg = encodeURIComponent(
        `Assalam-o-Alaikum ${student.name}! This is a friendly reminder from ${store.getAcademyInfo().name}. Your monthly fee for ${monthFormatted} is due. Kindly submit your fee at the academy office. Thank you!`
      );
      const whatsappUrl = student.phone
        ? `https://wa.me/${student.phone.replace(/[^0-9]/g, '')}?text=${reminderMsg}`
        : '#';

      return `
        <tr>
          <td>
            <strong style="color: var(--primary);">#${student.rollNo}</strong>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${student.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">S/O ${student.fatherName || 'N/A'} • ${student.phone || 'No phone'}</div>
          </td>
          <td>
            <span class="badge badge-primary">${student.courseCode}</span>
          </td>
          <td>
            <strong style="color: var(--danger); font-size: 0.95rem;">
              ${currency} ${(student.monthlyFee || 2000).toLocaleString()} (Guide)
            </strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">Open amount (1000 / 1500 / 2000)</div>
          </td>
          <td>
            <span class="badge badge-danger"><i class="fas fa-times-circle"></i> Unpaid</span>
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-success" onclick="FeesModule.openCollectModal('${student.id}', '${this.selectedYearMonth}')">
                <i class="fas fa-money-bill-wave"></i> Collect Fee
              </button>
              ${student.phone ? `
                <a href="${whatsappUrl}" target="_blank" class="btn btn-sm btn-outline" style="color: #25D366; border-color: #25D366;" title="Send WhatsApp Fee Reminder">
                  <i class="fab fa-whatsapp"></i> Reminder
                </a>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  handleTransactionFilterChange(mode) {
    this.transactionFilterMode = mode;
    const customMonthInput = document.getElementById('transactions-custom-month');

    if (mode === 'custom') {
      if (customMonthInput) {
        customMonthInput.style.display = 'inline-block';
        if (!this.transactionCustomMonth) {
          this.transactionCustomMonth = this.selectedYearMonth;
        }
        customMonthInput.value = this.transactionCustomMonth;
        customMonthInput.focus();
      }
    } else {
      if (customMonthInput) {
        customMonthInput.style.display = 'none';
      }
    }

    this.renderTransactionsList();
  },

  handleCustomMonthFilter(monthYear) {
    this.transactionCustomMonth = monthYear;
    this.transactionFilterMode = 'custom';
    this.renderTransactionsList();
  },

  renderTransactionsList() {
    const container = document.getElementById('transactions-table-body');
    if (!container) return;

    const store = window.academyStore;
    const currency = store.getAcademyInfo().currency;
    const allPayments = store.getFeePayments();

    // Determine target month based on filter mode
    let targetMonth = null;
    let filterLabel = '';

    if (this.transactionFilterMode === 'selected') {
      targetMonth = this.selectedYearMonth;
      filterLabel = `Month: ${this.formatMonthName(targetMonth)}`;
    } else if (this.transactionFilterMode === 'custom') {
      targetMonth = this.transactionCustomMonth || this.selectedYearMonth;
      filterLabel = `Month: ${this.formatMonthName(targetMonth)}`;
    } else {
      filterLabel = 'All Months (Complete History)';
    }

    const filteredPayments = targetMonth
      ? allPayments.filter(p => p.monthYear === targetMonth)
      : allPayments;

    const totalCollectedInView = filteredPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

    // Update filter subtitle in panel header
    const subtitleEl = document.getElementById('transactions-filter-subtitle');
    if (subtitleEl) {
      subtitleEl.innerHTML = `Showing <strong>${filteredPayments.length}</strong> record${filteredPayments.length === 1 ? '' : 's'} for <strong style="color: var(--primary);">${filterLabel}</strong> • Total Collected: <strong style="color: var(--success);">${currency} ${totalCollectedInView.toLocaleString()}</strong>`;
    }

    if (filteredPayments.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            <div style="font-size: 1.8rem; margin-bottom: 6px;"><i class="fas fa-search"></i></div>
            <strong>No fee payment records found for ${filterLabel}.</strong>
            <p style="font-size: 0.8rem; margin-top: 6px;">
              ${targetMonth ? `<button class="btn btn-sm btn-outline" style="margin-right: 6px;" onclick="FeesModule.handleTransactionFilterChange('all')">Show All Months</button>` : ''}
              <button class="btn btn-sm btn-success" onclick="FeesModule.openCollectModal(null, '${targetMonth || this.selectedYearMonth}')">Collect Fee for this Month</button>
            </p>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = filteredPayments.map(payment => `
      <tr>
        <td>
          <span style="font-family: monospace; font-weight: 700; background: #e0e7ff; color: var(--primary); padding: 2px 6px; border-radius: 4px;">
            ${payment.receiptNo}
          </span>
        </td>
        <td>${payment.paymentDate}</td>
        <td>
          <strong>${payment.studentName}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Roll #${payment.rollNo}</span>
        </td>
        <td>${payment.courseName}</td>
        <td>
          <span class="badge badge-neutral">${this.formatMonthName(payment.monthYear)}</span>
        </td>
        <td>
          <strong style="color: var(--success); font-size: 0.95rem;">
            ${currency} ${payment.amountPaid.toLocaleString()}
          </strong>
        </td>
        <td>
          <span class="badge badge-neutral">${payment.paymentMethod}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="icon-btn" title="Print Fee Receipt Voucher" onclick="ReportsModule.printReceiptSlip('${payment.id}')">
              <i class="fas fa-print"></i>
            </button>
            <button class="icon-btn danger" title="Delete Payment Record" onclick="FeesModule.deletePayment('${payment.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openCollectModal(studentId = null, monthYear = null) {
    this.populateStudentDropdown();
    const form = document.getElementById('collect-fee-form');
    form.reset();

    const studentSelect = document.getElementById('fee-student-select');
    const monthInput = document.getElementById('fee-month-input');
    const dateInput = document.getElementById('fee-date');
    const receiptNoInput = document.getElementById('fee-receipt-no');

    dateInput.value = new Date().toISOString().split('T')[0];
    receiptNoInput.value = window.academyStore.generateReceiptNumber();
    monthInput.value = monthYear || this.selectedYearMonth;

    if (studentId) {
      studentSelect.value = studentId;
    }

    this.updateFeeBalanceDetails();
    App.openModal('collect-fee-modal');
  },

  handleCollectSubmit() {
    const studentId = document.getElementById('fee-student-select').value;
    if (!studentId) {
      App.showToast('Please select a student', 'warning');
      return;
    }

    const student = window.academyStore.getStudentById(studentId);
    const amountPaid = parseFloat(document.getElementById('fee-amount').value) || 0;
    if (amountPaid <= 0) {
      App.showToast('Please enter a valid amount paid', 'warning');
      return;
    }

    const paymentData = {
      studentId: studentId,
      studentName: student ? student.name : '',
      rollNo: student ? student.rollNo : '',
      courseName: student ? student.courseName : '',
      monthYear: document.getElementById('fee-month-input').value,
      amountPaid: amountPaid,
      paymentDate: document.getElementById('fee-date').value,
      paymentMethod: document.getElementById('fee-method').value,
      receiptNo: document.getElementById('fee-receipt-no').value,
      discount: parseFloat(document.getElementById('fee-discount').value) || 0,
      remarks: document.getElementById('fee-remarks').value.trim() || 'Monthly fee paid'
    };

    const newPayment = window.academyStore.recordFeePayment(paymentData);
    App.closeModal('collect-fee-modal');
    App.showToast(`Received ${window.academyStore.getAcademyInfo().currency} ${paymentData.amountPaid} from ${paymentData.studentName}. Month cleared!`, 'success');

    this.render();
    if (window.StudentsModule) window.StudentsModule.render();
    App.refreshDashboard();

    // Ask to print receipt voucher immediately
    setTimeout(() => {
      if (confirm(`Fee recorded successfully! Would you like to print or view the Fee Slip Receipt for ${paymentData.studentName} now?`)) {
        ReportsModule.printReceiptSlip(newPayment.id);
      }
    }, 200);
  },

  deletePayment(paymentId) {
    if (confirm('Are you sure you want to delete this payment record? This will adjust financial balances accordingly.')) {
      window.academyStore.deleteFeePayment(paymentId);
      App.showToast('Fee payment record deleted', 'info');
      this.render();
      if (window.StudentsModule) window.StudentsModule.render();
      App.refreshDashboard();
    }
  },

  formatMonthName(yearMonth) {
    if (!yearMonth) return '';
    const [year, month] = yearMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  },

  exportCSV() {
    const store = window.academyStore;
    const allPayments = store.getFeePayments();
    if (allPayments.length === 0) {
      App.showToast('No payment transactions to export', 'warning');
      return;
    }

    let targetMonth = null;
    let fileSuffix = 'All_Months';

    if (this.transactionFilterMode === 'selected') {
      targetMonth = this.selectedYearMonth;
      fileSuffix = targetMonth;
    } else if (this.transactionFilterMode === 'custom') {
      targetMonth = this.transactionCustomMonth || this.selectedYearMonth;
      fileSuffix = targetMonth;
    }

    const filteredPayments = targetMonth
      ? allPayments.filter(p => p.monthYear === targetMonth)
      : allPayments;

    if (filteredPayments.length === 0) {
      App.showToast(`No payment transactions found for ${targetMonth || 'selected filter'}`, 'warning');
      return;
    }

    const headers = ['Receipt No', 'Date', 'Student ID', 'Student Name', 'Roll No', 'Course', 'Month Paid For', 'Amount Paid', 'Discount', 'Payment Method', 'Remarks'];
    const rows = filteredPayments.map(p => [
      `"${p.receiptNo}"`,
      `"${p.paymentDate}"`,
      `"${p.studentId}"`,
      `"${p.studentName}"`,
      `"${p.rollNo}"`,
      `"${p.courseName}"`,
      `"${p.monthYear}"`,
      p.amountPaid,
      p.discount || 0,
      `"${p.paymentMethod}"`,
      `"${p.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Zonish_Academy_Fee_Receipts_${fileSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    App.showToast(`Exported ${filteredPayments.length} fee records (${fileSuffix}) to CSV`, 'success');
  }
};

window.FeesModule = FeesModule;
