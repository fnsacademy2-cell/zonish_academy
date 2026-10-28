/**
 * Zonish Academy - Student Management Module
 * Handles admission forms, student directory, profile views,
 * course completion lifecycle, and student ledger inspection.
 */

const StudentsModule = {
  currentFilter: {
    search: '',
    course: 'all',
    status: 'all'
  },

  init() {
    this.bindEvents();
    this.populateCourseDropdowns();
    this.render();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('student-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentFilter.search = e.target.value.toLowerCase();
        this.render();
      });
    }

    // Filter course
    const courseFilter = document.getElementById('student-course-filter');
    if (courseFilter) {
      courseFilter.addEventListener('change', (e) => {
        this.currentFilter.course = e.target.value;
        this.render();
      });
    }

    // Filter status
    const statusFilter = document.getElementById('student-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentFilter.status = e.target.value;
        this.render();
      });
    }

    // Admission course change -> auto-populate duration and default fee
    const admissionCourseSelect = document.getElementById('adm-course');
    if (admissionCourseSelect) {
      admissionCourseSelect.addEventListener('change', (e) => {
        const courseId = e.target.value;
        const courses = window.academyStore.getCourses();
        const selected = courses.find(c => c.id === courseId || c.code === courseId);
        if (selected) {
          const durationInput = document.getElementById('adm-duration');
          const feeInput = document.getElementById('adm-monthly-fee');
          const admFeeInput = document.getElementById('adm-admission-fee');
          if (durationInput) durationInput.value = selected.durationMonths;
          if (feeInput && !feeInput.value) feeInput.value = selected.defaultFee;
          if (admFeeInput) admFeeInput.value = selected.admissionFee || 0;
        }
      });
    }

    // Admission form submit
    const admissionForm = document.getElementById('student-admission-form');
    if (admissionForm) {
      admissionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAdmissionSubmit();
      });
    }
  },

  populateCourseDropdowns() {
    const courses = window.academyStore.getCourses();
    
    // In filter
    const filterSelect = document.getElementById('student-course-filter');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">All Courses</option>' +
        courses.map(c => `<option value="${c.code}">${c.code} (${c.durationMonths} Mo)</option>`).join('');
    }

    // In admission form
    const admSelect = document.getElementById('adm-course');
    if (admSelect) {
      admSelect.innerHTML = '<option value="">-- Select Course --</option>' +
        courses.map(c => `<option value="${c.code}" data-id="${c.id}">${c.name} [${c.durationMonths} Months]</option>`).join('');
    }
  },

  render() {
    const tableBody = document.getElementById('students-table-body');
    if (!tableBody) return;

    let students = window.academyStore.getStudents();
    const currency = window.academyStore.getAcademyInfo().currency;

    // Apply filters
    students = students.filter(student => {
      const matchSearch = !this.currentFilter.search || 
        student.name.toLowerCase().includes(this.currentFilter.search) ||
        student.rollNo.toLowerCase().includes(this.currentFilter.search) ||
        student.phone.toLowerCase().includes(this.currentFilter.search) ||
        student.id.toLowerCase().includes(this.currentFilter.search);

      const matchCourse = this.currentFilter.course === 'all' || student.courseCode === this.currentFilter.course;
      const matchStatus = this.currentFilter.status === 'all' || student.status === this.currentFilter.status;

      return matchSearch && matchCourse && matchStatus;
    });

    if (students.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 8px;">🎓</div>
            <strong>No students found matching your filters.</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;">Click "New Admission" to register a new student.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = students.map(student => {
      // Calculate payment status summary
      const ledgerData = window.academyStore.getStudentFeeLedger(student.id);
      const paidMonthsCount = ledgerData ? ledgerData.ledger.filter(l => l.isPaid).length : 0;
      const totalMonths = student.durationMonths || 3;
      const percent = Math.min(100, Math.round((paidMonthsCount / totalMonths) * 100));

      let statusBadge = '';
      if (student.status === 'active') {
        statusBadge = '<span class="badge badge-success"><i class="fas fa-book-reader"></i> Studying</span>';
      } else if (student.status === 'completed') {
        statusBadge = '<span class="badge badge-primary"><i class="fas fa-graduation-cap"></i> Completed</span>';
      } else {
        statusBadge = '<span class="badge badge-neutral"><i class="fas fa-user-slash"></i> Dropped</span>';
      }

      return `
        <tr>
          <td>
            <span style="font-family: monospace; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 2px 6px; border-radius: 4px;">
              #${student.rollNo}
            </span>
          </td>
          <td>
            <div class="student-info-cell">
              <div class="student-avatar">${student.name.charAt(0).toUpperCase()}</div>
              <div class="student-name-group">
                <div class="name">${student.name}</div>
                <div class="sub">S/D/O ${student.fatherName || 'N/A'} • ${student.id}</div>
              </div>
            </div>
          </td>
          <td>
            <strong>${student.courseCode}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${student.durationMonths} Months Duration</div>
          </td>
          <td>
            <div>${student.monthlyFee ? `${currency} ${student.monthlyFee.toLocaleString()}/mo` : `${currency} 2,000 (Guide)`}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${student.shift.split(' ')[0]}</div>
          </td>
          <td>
            <div class="fee-progress-wrapper" title="${paidMonthsCount} of ${totalMonths} months cleared (${percent}%) • Total Paid: ${currency} ${ledgerData.totalPaid.toLocaleString()}">
              <div class="progress-track">
                <div class="progress-bar-fill" style="width: ${percent}%;"></div>
              </div>
              <div class="progress-label" style="min-width: 65px; font-size: 0.72rem;">
                ${paidMonthsCount}/${totalMonths} M (${percent}%)
              </div>
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div class="action-buttons">
              <button class="icon-btn" title="View Student Profile & Fee Ledger" onclick="StudentsModule.viewProfile('${student.id}')">
                <i class="fas fa-eye"></i>
              </button>
              <button class="icon-btn" title="Collect Monthly Fee" onclick="FeesModule.openCollectModal('${student.id}')">
                <i class="fas fa-money-bill-wave" style="color: var(--success);"></i>
              </button>
              <button class="icon-btn" title="Edit Student Info" onclick="StudentsModule.editStudent('${student.id}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="icon-btn danger" title="Delete Student" onclick="StudentsModule.deleteStudent('${student.id}')">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAdmissionModal(studentToEdit = null) {
    const modal = document.getElementById('admission-modal');
    const modalTitle = document.getElementById('admission-modal-title');
    const form = document.getElementById('student-admission-form');
    form.reset();

    this.populateCourseDropdowns();

    if (studentToEdit) {
      modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Edit Student Record';
      document.getElementById('adm-id').value = studentToEdit.id;
      document.getElementById('adm-rollno').value = studentToEdit.rollNo;
      document.getElementById('adm-name').value = studentToEdit.name;
      document.getElementById('adm-father').value = studentToEdit.fatherName || '';
      document.getElementById('adm-phone').value = studentToEdit.phone || '';
      document.getElementById('adm-cnic').value = studentToEdit.cnic || '';
      document.getElementById('adm-course').value = studentToEdit.courseCode;
      document.getElementById('adm-duration').value = studentToEdit.durationMonths;
      document.getElementById('adm-date').value = studentToEdit.admissionDate;
      document.getElementById('adm-shift').value = studentToEdit.shift;
      document.getElementById('adm-monthly-fee').value = studentToEdit.monthlyFee;
      document.getElementById('adm-admission-fee').value = studentToEdit.admissionFee || 0;
      document.getElementById('adm-status').value = studentToEdit.status || 'active';
      document.getElementById('adm-notes').value = studentToEdit.notes || '';
    } else {
      modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> New Student Admission';
      document.getElementById('adm-id').value = '';
      
      // Auto-assign roll number
      const existing = window.academyStore.getStudents();
      const nextRoll = existing.length > 0 
        ? Math.max(...existing.map(s => parseInt(s.rollNo) || 100)) + 1 
        : 101;
      document.getElementById('adm-rollno').value = nextRoll;
      document.getElementById('adm-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('adm-status').value = 'active';
      document.getElementById('adm-monthly-fee').value = '';
      document.getElementById('adm-monthly-fee').placeholder = 'Enter agreed fee (e.g. 1000, 1500, 2000)';
      document.getElementById('adm-admission-fee').value = 0;
    }

    App.openModal('admission-modal');
  },

  handleAdmissionSubmit() {
    const id = document.getElementById('adm-id').value;
    const courseCode = document.getElementById('adm-course').value;
    const courses = window.academyStore.getCourses();
    const courseObj = courses.find(c => c.code === courseCode);

    const studentData = {
      rollNo: document.getElementById('adm-rollno').value.trim(),
      name: document.getElementById('adm-name').value.trim(),
      fatherName: document.getElementById('adm-father').value.trim(),
      phone: document.getElementById('adm-phone').value.trim(),
      cnic: document.getElementById('adm-cnic').value.trim(),
      courseCode: courseCode,
      courseName: courseObj ? courseObj.name : courseCode,
      durationMonths: parseInt(document.getElementById('adm-duration').value) || 3,
      admissionDate: document.getElementById('adm-date').value,
      shift: document.getElementById('adm-shift').value,
      monthlyFee: parseFloat(document.getElementById('adm-monthly-fee').value) || 0,
      admissionFee: parseFloat(document.getElementById('adm-admission-fee').value) || 0,
      status: document.getElementById('adm-status').value,
      notes: document.getElementById('adm-notes').value.trim()
    };

    if (id) {
      window.academyStore.updateStudent(id, studentData);
      App.showToast(`Updated record for ${studentData.name}`, 'success');
    } else {
      const created = window.academyStore.addStudent(studentData);
      App.showToast(`Successfully admitted ${studentData.name} (Roll #${studentData.rollNo})`, 'success');
    }

    App.closeModal('admission-modal');
    this.render();
    App.refreshDashboard();
    if (window.FeesModule) window.FeesModule.render();
  },

  editStudent(studentId) {
    const student = window.academyStore.getStudentById(studentId);
    if (student) {
      this.openAdmissionModal(student);
    }
  },

  deleteStudent(studentId) {
    const student = window.academyStore.getStudentById(studentId);
    if (!student) return;

    if (confirm(`Are you sure you want to delete student "${student.name}" (Roll #${student.rollNo}) and their associated fee records? This cannot be undone.`)) {
      window.academyStore.deleteStudent(studentId);
      App.showToast(`Student ${student.name} deleted`, 'info');
      this.render();
      App.refreshDashboard();
      if (window.FeesModule) window.FeesModule.render();
    }
  },

  viewProfile(studentId) {
    const data = window.academyStore.getStudentFeeLedger(studentId);
    if (!data) return;

    const { student, ledger, totalPaid, paidMonthsCount, unpaidMonthsCount, percentPaid } = data;
    const currency = window.academyStore.getAcademyInfo().currency;
    const modalBody = document.getElementById('profile-modal-body');

    modalBody.innerHTML = `
      <div class="student-profile-header-card">
        <div class="student-avatar" style="width: 64px; height: 64px; font-size: 1.5rem;">
          ${student.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">${student.name}</h2>
            <span class="badge ${student.status === 'active' ? 'badge-success' : student.status === 'completed' ? 'badge-primary' : 'badge-neutral'}">
              ${student.status}
            </span>
          </div>
          <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 3px;">
            Father: <strong>${student.fatherName || 'N/A'}</strong> | Roll No: <strong>#${student.rollNo}</strong> | Reg ID: <strong>${student.id}</strong>
          </div>
          <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 0.82rem; flex-wrap: wrap;">
            <span><i class="fas fa-phone-alt"></i> ${student.phone}</span>
            <span><i class="fas fa-id-card"></i> ${student.cnic || 'N/A'}</span>
            <span><i class="fas fa-clock"></i> ${student.shift}</span>
          </div>
        </div>
        <div class="profile-header-actions">
          ${student.phone ? `
            <a href="https://wa.me/${student.phone.replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(student.name)},%20Greetings%20from%20Zonish%20Computer%20Academy." 
               target="_blank" class="btn btn-sm btn-outline" style="color: #25D366; border-color: #25D366;">
              <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
          ` : ''}
          <button class="btn btn-sm btn-outline" style="margin-left: 6px;" onclick="ReportsModule.printAdmissionSlip('${student.id}')">
            <i class="fas fa-print"></i> Form
          </button>
        </div>
      </div>

      <!-- Quick Status Toggle -->
      <div class="student-status-toggle-bar">
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">
          Academic Status:
        </span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-sm ${student.status === 'active' ? 'btn-success' : 'btn-outline'}" 
                  onclick="StudentsModule.updateStatus('${student.id}', 'active')">
            <i class="fas fa-book-reader"></i> Studying (Active)
          </button>
          <button class="btn btn-sm ${student.status === 'completed' ? 'btn-primary' : 'btn-outline'}" 
                  onclick="StudentsModule.updateStatus('${student.id}', 'completed')">
            <i class="fas fa-graduation-cap"></i> Course Completed
          </button>
          <button class="btn btn-sm ${student.status === 'dropped' ? 'btn-danger' : 'btn-outline'}" 
                  onclick="StudentsModule.updateStatus('${student.id}', 'dropped')">
            <i class="fas fa-user-slash"></i> Dropped / Left
          </button>
        </div>
      </div>

      <!-- Course & Fee Clearance Summary -->
      <div class="student-profile-stats-grid">
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Enrolled Course</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--primary); margin-top: 4px;">${student.courseCode}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${student.durationMonths} Months Duration</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px;">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Months Cleared</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">${paidMonthsCount} of ${student.durationMonths} Months</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${percentPaid}% Course Cleared</div>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-md); padding: 14px;">
          <div style="font-size: 0.75rem; color: #065f46; font-weight: 600; text-transform: uppercase;">Total Fees Paid</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #059669; margin-top: 4px;">${currency} ${totalPaid.toLocaleString()}</div>
          <div style="font-size: 0.75rem; color: #047857;">All Payments Received</div>
        </div>
        <div style="background: ${unpaidMonthsCount > 0 ? '#fff7ed' : '#ecfdf5'}; border: 1px solid ${unpaidMonthsCount > 0 ? '#ffedd5' : '#a7f3d0'}; border-radius: var(--radius-md); padding: 14px;">
          <div style="font-size: 0.75rem; color: ${unpaidMonthsCount > 0 ? '#9a3412' : '#065f46'}; font-weight: 600; text-transform: uppercase;">Fee Status</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: ${unpaidMonthsCount > 0 ? '#c2410c' : '#059669'}; margin-top: 4px;">${unpaidMonthsCount === 0 ? 'All Settled ✓' : unpaidMonthsCount + ' Unpaid Month(s)'}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${unpaidMonthsCount === 0 ? 'No pending months' : 'No dues added on payment'}</div>
        </div>
      </div>

      <!-- Month by Month Fee Ledger -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-calendar-alt" style="color: var(--primary);"></i>
          Monthly Fee Schedule (${student.durationMonths} Months)
        </h4>
        <button class="btn btn-sm btn-primary" onclick="FeesModule.openCollectModal('${student.id}'); App.closeModal('profile-modal');">
          <i class="fas fa-plus"></i> Collect Fee Payment
        </button>
      </div>

      <div class="fee-ledger-grid">
        ${ledger.map(item => `
          <div class="ledger-month-card ${item.isPaid ? 'is-paid' : item.isOverdue ? 'is-overdue' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="ledger-month-name">M${item.monthIndex}: ${item.monthName}</span>
              ${item.isPaid 
                ? '<i class="fas fa-check-circle" style="color: var(--success);" title="Paid / Cleared"></i>' 
                : item.isOverdue 
                  ? '<i class="fas fa-exclamation-circle" style="color: var(--danger);" title="Overdue"></i>' 
                  : '<i class="far fa-circle" style="color: var(--text-light);" title="Unpaid"></i>'
              }
            </div>
            
            <div class="ledger-month-fee">
              ${item.isPaid 
                ? `<span style="color: #065f46; font-weight: 700;">${currency} ${item.paidAmount.toLocaleString()}</span>`
                : `<span style="color: var(--text-muted); font-size: 0.85rem;">${currency} 2,000 (Guide)</span>`
              }
            </div>

            ${item.isPaid ? `
              <div class="ledger-month-date" style="color: #065f46;">
                Status: <strong>Paid (Cleared)</strong><br>
                <small>${item.paymentDetails ? item.paymentDetails.paymentMethod + ' • ' + item.paymentDetails.receiptNo : 'Cleared'}</small>
              </div>
              ${item.paymentDetails ? `
                <button class="btn btn-sm btn-outline" style="font-size: 0.7rem; padding: 2px 6px; margin-top: 4px;" 
                        onclick="ReportsModule.printReceiptSlip('${item.paymentDetails.id}')">
                  <i class="fas fa-print"></i> Slip
                </button>
              ` : ''}
            ` : `
              <div class="ledger-month-date" style="color: ${item.isOverdue ? '#991b1b' : 'var(--text-muted)'};">
                ${item.isOverdue ? 'Status: Overdue' : 'Status: Unpaid'}
              </div>
              <button class="btn btn-sm btn-primary" style="font-size: 0.7rem; padding: 2px 6px; margin-top: 4px;" 
                      onclick="FeesModule.openCollectModal('${student.id}', '${item.monthYear}'); App.closeModal('profile-modal');">
                Collect Fee
              </button>
            `}
          </div>
        `).join('')}
      </div>

      ${student.notes ? `
        <div style="margin-top: 20px; padding: 12px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); font-size: 0.82rem; color: #92400e;">
          <strong>Student Notes:</strong> ${student.notes}
        </div>
      ` : ''}
    `;

    App.openModal('profile-modal');
  },

  updateStatus(studentId, newStatus) {
    window.academyStore.setStudentStatus(studentId, newStatus);
    App.showToast(`Student status updated to: ${newStatus}`, 'success');
    this.viewProfile(studentId);
    this.render();
    App.refreshDashboard();
  },

  exportCSV() {
    const students = window.academyStore.getStudents();
    if (students.length === 0) {
      App.showToast('No student records to export', 'warning');
      return;
    }

    const headers = ['Roll No', 'Registration ID', 'Name', 'Father Name', 'Phone', 'CNIC', 'Course', 'Duration (Months)', 'Admission Date', 'Shift', 'Monthly Fee', 'Admission Fee', 'Status'];
    const rows = students.map(s => [
      `"${s.rollNo}"`,
      `"${s.id}"`,
      `"${s.name}"`,
      `"${s.fatherName || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.cnic || ''}"`,
      `"${s.courseCode}"`,
      s.durationMonths,
      `"${s.admissionDate}"`,
      `"${s.shift}"`,
      s.monthlyFee,
      s.admissionFee || 0,
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Zonish_Academy_Students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

window.StudentsModule = StudentsModule;
