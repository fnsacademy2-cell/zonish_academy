/**
 * Zonish Academy - Reports, Charts & Printable Document Generator
 * Handles dynamic Chart.js dashboards, fee voucher slips, admission cards,
 * and comprehensive academy financial statements.
 */

const ReportsModule = {
  incomeExpenseChart: null,
  courseDistributionChart: null,

  init() {
    this.renderCharts();
  },

  renderCharts() {
    this.renderIncomeExpenseChart();
    this.renderCourseDistributionChart();
  },

  renderIncomeExpenseChart() {
    const canvas = document.getElementById('incomeExpenseChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Generate data for the last 6 months
    const labels = [];
    const incomeData = [];
    const expenseData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      labels.push(monthLabel);

      incomeData.push(window.academyStore.getMonthlyIncome(ym));
      expenseData.push(window.academyStore.getMonthlyExpenses(ym));
    }

    if (this.incomeExpenseChart) {
      this.incomeExpenseChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.incomeExpenseChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Monthly Fee Income (Rs)',
            data: incomeData,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderRadius: 6,
            borderWidth: 1
          },
          {
            label: 'Monthly Expenses (Rs)',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderColor: '#ef4444',
            borderRadius: 6,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: Rs. ${context.raw.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'Rs ' + (value >= 1000 ? (value / 1000) + 'k' : value);
              }
            },
            grid: { color: 'rgba(226, 232, 240, 0.6)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  },

  renderCourseDistributionChart() {
    const canvas = document.getElementById('courseDistributionChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const students = window.academyStore.getStudents();
    const courseCounts = {};

    students.forEach(s => {
      courseCounts[s.courseCode] = (courseCounts[s.courseCode] || 0) + 1;
    });

    const labels = Object.keys(courseCounts);
    const data = Object.values(courseCounts);

    if (labels.length === 0) {
      labels.push('No Enrollments');
      data.push(1);
    }

    if (this.courseDistributionChart) {
      this.courseDistributionChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.courseDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#4f46e5', // Indigo
            '#0ea5e9', // Sky blue
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#ec4899', // Pink
            '#8b5cf6'  // Purple
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, font: { family: 'Inter', size: 11 } }
          }
        },
        cutout: '68%'
      }
    });
  },

  // ==================== PRINTABLE FEE RECEIPT SLIP ====================

  printReceiptSlip(paymentId) {
    const payment = window.academyStore.getFeePayments().find(p => p.id === paymentId);
    if (!payment) {
      App.showToast('Payment receipt not found', 'danger');
      return;
    }

    const student = window.academyStore.getStudentById(payment.studentId) || {
      name: payment.studentName,
      fatherName: 'N/A',
      phone: 'N/A',
      shift: 'Morning',
      rollNo: payment.rollNo
    };

    const academy = window.academyStore.getAcademyInfo();
    const [year, month] = (payment.monthYear || '').split('-');
    const monthDate = new Date(parseInt(year) || 2026, (parseInt(month) || 1) - 1, 1);
    const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const htmlContent = `
      <div class="receipt-slip">
        <div class="receipt-header">
          <h2>${academy.name}</h2>
          <p>${academy.subtitle}</p>
          <p style="font-size: 0.72rem; margin-top: 2px;">${academy.address} • Tel: ${academy.phone}</p>
          <div class="receipt-voucher-title">OFFICIAL STUDENT FEE RECEIPT</div>
        </div>

        <div class="receipt-meta">
          <div>
            <strong>Receipt #:</strong> ${payment.receiptNo}<br>
            <strong>Date:</strong> ${payment.paymentDate}
          </div>
          <div style="text-align: right;">
            <strong>Roll No:</strong> #${payment.rollNo}<br>
            <strong>Reg ID:</strong> ${payment.studentId}
          </div>
        </div>

        <table class="receipt-details-table">
          <tr>
            <td class="label">Student Name:</td>
            <td class="val">${payment.studentName}</td>
          </tr>
          <tr>
            <td class="label">Father's Name:</td>
            <td class="val">${student.fatherName || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Contact / Phone:</td>
            <td class="val">${student.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Enrolled Course:</td>
            <td class="val">${payment.courseName}</td>
          </tr>
          <tr>
            <td class="label">Batch / Shift:</td>
            <td class="val">${student.shift || 'General'}</td>
          </tr>
          <tr>
            <td class="label">Fee Month:</td>
            <td class="val" style="color: var(--primary); text-transform: uppercase; font-weight: 700;">${monthName}</td>
          </tr>
          <tr>
            <td class="label">Amount Paid:</td>
            <td class="val" style="color: #065f46; font-weight: 800; font-size: 1.05rem;">${academy.currency} ${payment.amountPaid.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">Month Status:</td>
            <td class="val" style="color: #065f46; font-weight: 700;">FEE CLEARED (PAID)</td>
          </tr>
          <tr>
            <td class="label">Remaining Dues:</td>
            <td class="val" style="color: var(--text-muted); font-weight: 600;">Rs. 0 (Nil / No Dues Added)</td>
          </tr>
          <tr>
            <td class="label">Payment Mode:</td>
            <td class="val">${payment.paymentMethod}</td>
          </tr>
          ${payment.remarks ? `
          <tr>
            <td class="label">Remarks / Note:</td>
            <td class="val">${payment.remarks}</td>
          </tr>
          ` : ''}
        </table>

        <div class="receipt-total-box">
          <span>AMOUNT RECEIVED:</span>
          <span style="color: #065f46;">${academy.currency} ${payment.amountPaid.toLocaleString()}</span>
        </div>

        <div class="receipt-signatures">
          <div>
            ___________________<br>
            Student Signature
          </div>
          <div style="text-align: right;">
            ___________________<br>
            Authorized Signature
          </div>
        </div>

        <div class="receipt-footer-note">
          * Fee once paid is non-refundable & non-transferable.<br>
          Generated via Zonish Academy Management System.
        </div>
      </div>
    `;

    // Populate the printable area
    const printArea = document.getElementById('printable-receipt-area');
    if (printArea) {
      printArea.innerHTML = htmlContent;
    }

    // Also populate the modal for user preview
    const modalPreview = document.getElementById('slip-preview-container');
    if (modalPreview) {
      modalPreview.innerHTML = htmlContent;
      App.openModal('receipt-slip-modal');
    }
  },

  triggerBrowserPrint() {
    window.print();
  },

  // ==================== PRINTABLE ADMISSION FORM ====================

  printAdmissionSlip(studentId) {
    const student = window.academyStore.getStudentById(studentId);
    if (!student) return;

    const academy = window.academyStore.getAcademyInfo();

    const htmlContent = `
      <div class="receipt-slip" style="max-width: 600px; font-family: 'Inter', sans-serif;">
        <div class="receipt-header" style="border-bottom: 2px solid #0f172a; padding-bottom: 14px;">
          <h2 style="font-size: 1.4rem;">${academy.name}</h2>
          <p>${academy.subtitle}</p>
          <p style="font-size: 0.75rem;">${academy.address} • Ph: ${academy.phone}</p>
          <div class="receipt-voucher-title" style="background: #4f46e5; margin-top: 8px;">STUDENT ADMISSION & REGISTRATION RECORD</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 0.85rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
          <div><strong>Roll No:</strong> #${student.rollNo}</div>
          <div><strong>Reg ID:</strong> ${student.id}</div>
          <div><strong>Admission Date:</strong> ${student.admissionDate}</div>
        </div>

        <table class="receipt-details-table" style="font-size: 0.88rem; line-height: 1.8;">
          <tr>
            <td class="label">Full Name:</td>
            <td class="val">${student.name}</td>
          </tr>
          <tr>
            <td class="label">Father's Name:</td>
            <td class="val">${student.fatherName || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Mobile / WhatsApp:</td>
            <td class="val">${student.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">CNIC / B-Form:</td>
            <td class="val">${student.cnic || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Course Name:</td>
            <td class="val"><strong>${student.courseName}</strong></td>
          </tr>
          <tr>
            <td class="label">Course Duration:</td>
            <td class="val">${student.durationMonths} Months</td>
          </tr>
          <tr>
            <td class="label">Batch Shift:</td>
            <td class="val">${student.shift}</td>
          </tr>
          <tr>
            <td class="label">Monthly Tuition Fee:</td>
            <td class="val"><strong>${academy.currency} ${student.monthlyFee.toLocaleString()} / month</strong></td>
          </tr>
          <tr>
            <td class="label">Admission Registration Fee:</td>
            <td class="val">${academy.currency} ${(student.admissionFee || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td class="label">Enrollment Status:</td>
            <td class="val" style="text-transform: capitalize;">${student.status}</td>
          </tr>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 0.8rem; border-top: 1px dashed #94a3b8; padding-top: 12px;">
          <div>____________________<br>Student / Parent Signature</div>
          <div style="text-align: right;">____________________<br>Principal / Administrator Signature</div>
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
  }
};

window.ReportsModule = ReportsModule;
