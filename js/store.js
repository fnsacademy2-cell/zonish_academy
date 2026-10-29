/**
 * Zonish Academy - State Management & Storage Engine
 * Handles LocalStorage persistence, calculations for income/expenses/fees,
 * student lifecycle records, and export/import functionality.
 */

const STORAGE_KEY = 'zonish_academy_db_v2';
const WIPED_FLAG_KEY = 'zonish_wiped_clean_v2';

class AcademyStore {
  constructor() {
    this.state = this.loadState();
    const wasWipedClean = localStorage.getItem(WIPED_FLAG_KEY) === 'true';

    // Only load sample/demo data on the very first fresh launch.
    // If the database was explicitly wiped clean, or if state already exists,
    // NEVER re-inject sample data - keep it empty until user enters new data!
    if (!this.state && !wasWipedClean) {
      this.initDefaultData();
    } else if (!this.state && wasWipedClean) {
      this.state = this.createEmptyState();
      this.saveToLocalOnly();
    } else {
      this.ensureStateIntegrity();
    }
  }

  createEmptyState() {
    return {
      academyInfo: this.getDefaultAcademyInfo(),
      courses: this.getDefaultCourses(),
      students: [],
      feePayments: [],
      expenses: [],
      profitSplit: this.getDefaultProfitSplit()
    };
  }

  getDefaultAcademyInfo() {
    return {
      name: 'Zonish Computer Academy',
      subtitle: 'Information Technology & Skill Training Center',
      phone: '+92 300 1234567',
      email: 'info@zonishacademy.com',
      address: 'Main Boulevard, Education Complex, 2nd Floor',
      currency: 'Rs.',
      dueDay: 5
    };
  }

  getDefaultCourses() {
    return [
      { id: 'c_cit', code: 'CIT', name: 'CIT (Certificate in IT)', durationMonths: 6, defaultFee: 2000, admissionFee: 1000 },
      { id: 'c_dit', code: 'DIT', name: 'DIT (Diploma in IT)', durationMonths: 12, defaultFee: 2500, admissionFee: 1500 },
      { id: 'c_oa', code: 'OA', name: 'Office Automation (MS Office & InPage)', durationMonths: 3, defaultFee: 1800, admissionFee: 800 },
      { id: 'c_gd', code: 'GD', name: 'Graphic Designing & Multimedia', durationMonths: 3, defaultFee: 2500, admissionFee: 1000 },
      { id: 'c_wd', code: 'WD', name: 'Web Development (Full Stack)', durationMonths: 6, defaultFee: 3500, admissionFee: 1500 }
    ];
  }

  getDefaultProfitSplit() {
    return {
      customNetBalance: null,
      splitType: 'percentage',
      teacherPercent: 50,
      adminPercent: 50,
      teacherAmount: 0,
      adminAmount: 0,
      notes: '',
      distributions: []
    };
  }

  ensureStateIntegrity() {
    if (!this.state) this.state = this.createEmptyState();
    if (!Array.isArray(this.state.students)) this.state.students = [];
    if (!Array.isArray(this.state.feePayments)) this.state.feePayments = [];
    if (!Array.isArray(this.state.expenses)) this.state.expenses = [];
    if (!Array.isArray(this.state.courses) || this.state.courses.length === 0) {
      this.state.courses = this.getDefaultCourses();
    }
    if (!this.state.academyInfo) this.state.academyInfo = this.getDefaultAcademyInfo();
    if (!this.state.profitSplit) this.state.profitSplit = this.getDefaultProfitSplit();
  }

  // Load from LocalStorage
  loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
      return null;
    }
  }

  // Save to LocalStorage & Sync to Cloud
  saveState() {
    this.saveToLocalOnly();
    // Sync with Firebase Cloud if connected
    if (window.FirebaseSync && window.FirebaseSync.isConnected && !window.FirebaseSync.isSyncing) {
      window.FirebaseSync.pushToCloud(this.state, false);
    }
  }

  saveToLocalOnly() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
  }

  // Check if active database is empty
  isDatabaseEmpty() {
    const students = this.getStudents();
    const fees = this.getFeePayments();
    const expenses = this.getExpenses();
    return students.length === 0 && fees.length === 0 && expenses.length === 0;
  }

  // Apply state received from Firebase Cloud
  applyCloudState(cloudData, isRemoteUpdate = false) {
    if (!cloudData) return;
    this.state = {
      academyInfo: cloudData.academyInfo || this.state.academyInfo || this.getDefaultAcademyInfo(),
      courses: Array.isArray(cloudData.courses) && cloudData.courses.length > 0 ? cloudData.courses : (this.state.courses || this.getDefaultCourses()),
      students: Array.isArray(cloudData.students) ? cloudData.students : [],
      feePayments: Array.isArray(cloudData.feePayments) ? cloudData.feePayments : [],
      expenses: Array.isArray(cloudData.expenses) ? cloudData.expenses : [],
      profitSplit: cloudData.profitSplit || this.getDefaultProfitSplit()
    };

    if (cloudData.isWipedClean) {
      localStorage.setItem(WIPED_FLAG_KEY, 'true');
    } else if (this.state.students.length > 0) {
      localStorage.removeItem(WIPED_FLAG_KEY);
    }

    this.saveToLocalOnly();

    // Trigger UI updates across open tabs
    this.notifyAllModules();

    if (isRemoteUpdate && window.App) {
      window.App.showToast('Live update received from other location via Firebase!', 'info');
    }
  }

  notifyAllModules() {
    if (window.App) {
      window.App.refreshDashboard();
      if (window.App.renderSettings) window.App.renderSettings();
    }
    if (window.StudentsModule) window.StudentsModule.render();
    if (window.FeesModule) window.FeesModule.render();
    if (window.ExpensesModule) window.ExpensesModule.render();
    if (window.ReportsModule) window.ReportsModule.renderCharts();
  }

  // Initialize sample data for realistic immediate use
  initDefaultData() {
    localStorage.removeItem(WIPED_FLAG_KEY);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYM = `${currentYear}-${currentMonth}`;

    // Previous month
    const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    this.state = {
      academyInfo: {
        name: 'Zonish Computer Academy',
        subtitle: 'Information Technology & Skill Training Center',
        phone: '+92 300 1234567',
        email: 'info@zonishacademy.com',
        address: 'Main Boulevard, Education Complex, 2nd Floor',
        currency: 'Rs.',
        dueDay: 5
      },
      courses: [
        { id: 'c_cit', code: 'CIT', name: 'CIT (Certificate in IT)', durationMonths: 6, defaultFee: 2000, admissionFee: 1000 },
        { id: 'c_dit', code: 'DIT', name: 'DIT (Diploma in IT)', durationMonths: 12, defaultFee: 2500, admissionFee: 1500 },
        { id: 'c_oa', code: 'OA', name: 'Office Automation (MS Office & InPage)', durationMonths: 3, defaultFee: 1800, admissionFee: 800 },
        { id: 'c_gd', code: 'GD', name: 'Graphic Designing & Multimedia', durationMonths: 3, defaultFee: 2500, admissionFee: 1000 },
        { id: 'c_wd', code: 'WD', name: 'Web Development (Full Stack)', durationMonths: 6, defaultFee: 3500, admissionFee: 1500 }
      ],
      students: [
        {
          id: 'ZA-2026-001',
          rollNo: '101',
          name: 'Muhammad Ali',
          fatherName: 'Tariq Mehmood',
          phone: '0312-9876543',
          cnic: '35202-1234567-1',
          courseCode: 'DIT',
          courseName: 'DIT (Diploma in IT)',
          durationMonths: 12,
          admissionDate: `${currentYear}-01-10`,
          shift: 'Morning (09:00 AM - 11:00 AM)',
          monthlyFee: 2500,
          admissionFee: 1500,
          status: 'active',
          notes: 'Regular student, very attentive in lab sessions.'
        },
        {
          id: 'ZA-2026-002',
          rollNo: '102',
          name: 'Fatima Zahra',
          fatherName: 'Abdul Rehman',
          phone: '0321-4567890',
          cnic: '35201-9876543-2',
          courseCode: 'CIT',
          courseName: 'CIT (Certificate in IT)',
          durationMonths: 6,
          admissionDate: `${currentYear}-03-05`,
          shift: 'Afternoon (02:00 PM - 04:00 PM)',
          monthlyFee: 2000,
          admissionFee: 1000,
          status: 'active',
          notes: 'Top performer in programming fundamentals.'
        },
        {
          id: 'ZA-2026-003',
          rollNo: '103',
          name: 'Hamza Khan',
          fatherName: 'Shahid Khan',
          phone: '0333-5551234',
          cnic: '35202-5432167-3',
          courseCode: 'OA',
          courseName: 'Office Automation (MS Office & InPage)',
          durationMonths: 3,
          admissionDate: `${currentYear}-07-15`,
          shift: 'Evening (05:00 PM - 07:00 PM)',
          monthlyFee: 1800,
          admissionFee: 800,
          status: 'completed',
          notes: 'Successfully completed 3-month course with distinction. Certificate issued.'
        },
        {
          id: 'ZA-2026-004',
          rollNo: '104',
          name: 'Ayesha Noor',
          fatherName: 'Muhammad Arshad',
          phone: '0304-7778899',
          cnic: '35201-1122334-4',
          courseCode: 'GD',
          courseName: 'Graphic Designing & Multimedia',
          durationMonths: 3,
          admissionDate: `${currentYear}-08-01`,
          shift: 'Morning (11:00 AM - 01:00 PM)',
          monthlyFee: 2500,
          admissionFee: 1000,
          status: 'active',
          notes: 'Submitted excellent Photoshop portfolio.'
        },
        {
          id: 'ZA-2026-005',
          rollNo: '105',
          name: 'Bilal Ahmed',
          fatherName: 'Naseer Ahmed',
          phone: '0345-3332211',
          cnic: '35202-9988776-5',
          courseCode: 'WD',
          courseName: 'Web Development (Full Stack)',
          durationMonths: 6,
          admissionDate: `${currentYear}-05-10`,
          shift: 'Evening (06:00 PM - 08:00 PM)',
          monthlyFee: 3500,
          admissionFee: 1500,
          status: 'active',
          notes: 'Learning React and Node.js.'
        }
      ],
      feePayments: [
        {
          id: 'RCPT-1001',
          receiptNo: 'REC-00101',
          studentId: 'ZA-2026-001',
          studentName: 'Muhammad Ali',
          rollNo: '101',
          courseName: 'DIT (Diploma in IT)',
          monthYear: prevYM,
          amountPaid: 2500,
          discount: 0,
          paymentDate: `${prevYM}-05`,
          paymentMethod: 'Cash',
          remarks: 'Previous month fee cleared'
        },
        {
          id: 'RCPT-1002',
          receiptNo: 'REC-00102',
          studentId: 'ZA-2026-001',
          studentName: 'Muhammad Ali',
          rollNo: '101',
          courseName: 'DIT (Diploma in IT)',
          monthYear: currentYM,
          amountPaid: 2500,
          discount: 0,
          paymentDate: `${currentYM}-03`,
          paymentMethod: 'EasyPaisa',
          remarks: 'Current month fee paid on time'
        },
        {
          id: 'RCPT-1003',
          receiptNo: 'REC-00103',
          studentId: 'ZA-2026-002',
          studentName: 'Fatima Zahra',
          rollNo: '102',
          courseName: 'CIT (Certificate in IT)',
          monthYear: currentYM,
          amountPaid: 1500,
          discount: 0,
          paymentDate: `${currentYM}-04`,
          paymentMethod: 'JazzCash',
          remarks: 'Monthly fee cleared (Rs. 1,500 paid - no dues)'
        },
        {
          id: 'RCPT-1004',
          receiptNo: 'REC-00104',
          studentId: 'ZA-2026-004',
          studentName: 'Ayesha Noor',
          rollNo: '104',
          courseName: 'Graphic Designing',
          monthYear: currentYM,
          amountPaid: 2500,
          discount: 0,
          paymentDate: `${currentYM}-06`,
          paymentMethod: 'Cash',
          remarks: 'Full monthly fee paid'
        },
        {
          id: 'RCPT-1005',
          receiptNo: 'REC-00099',
          studentId: 'ZA-2026-003',
          studentName: 'Hamza Khan',
          rollNo: '103',
          courseName: 'Office Automation',
          monthYear: `${currentYear}-08`,
          amountPaid: 1800,
          discount: 0,
          paymentDate: `${currentYear}-08-04`,
          paymentMethod: 'Cash',
          remarks: 'Course Final Month Fee Cleared'
        }
      ],
      expenses: [
        {
          id: 'EXP-101',
          date: `${currentYM}-02`,
          category: 'Teacher Salary',
          amount: 25000,
          description: 'Faculty monthly remuneration - DIT/CIT instructor',
          paidBy: 'Director'
        },
        {
          id: 'EXP-102',
          date: `${currentYM}-04`,
          category: 'Electricity / Utility',
          amount: 6800,
          description: 'Lab AC & Computer electricity bill',
          paidBy: 'Admin'
        },
        {
          id: 'EXP-103',
          date: `${currentYM}-05`,
          category: 'Internet',
          amount: 3200,
          description: 'High-speed Fiber Optic connection for computer lab',
          paidBy: 'Admin'
        },
        {
          id: 'EXP-104',
          date: `${prevYM}-02`,
          category: 'Teacher Salary',
          amount: 25000,
          description: 'Previous month instructors salary',
          paidBy: 'Director'
        },
        {
          id: 'EXP-105',
          date: `${prevYM}-07`,
          category: 'Stationery & Printing',
          amount: 2400,
          description: 'Admission forms printing & lab registers',
          paidBy: 'Office'
        }
      ],
      profitSplit: {
        customNetBalance: null,
        splitType: 'percentage',
        teacherPercent: 50,
        adminPercent: 50,
        teacherAmount: 0,
        adminAmount: 0,
        notes: ''
      }
    };
    this.saveState();
  }

  // ==================== STUDENT METHODS ====================

  getStudents() {
    return this.state.students || [];
  }

  getStudentById(id) {
    return this.getStudents().find(s => s.id === id);
  }

  generateStudentId() {
    const year = new Date().getFullYear();
    const students = this.getStudents();
    const nextSeq = students.length + 1;
    return `ZA-${year}-${String(nextSeq).padStart(3, '0')}`;
  }

  addStudent(studentData) {
    localStorage.removeItem(WIPED_FLAG_KEY);
    const newStudent = {
      ...studentData,
      id: studentData.id || this.generateStudentId(),
      status: studentData.status || 'active',
      durationMonths: Number(studentData.durationMonths) || 3,
      monthlyFee: Number(studentData.monthlyFee) || 0,
      admissionFee: Number(studentData.admissionFee) || 0
    };
    this.state.students.unshift(newStudent);
    this.saveState();
    return newStudent;
  }

  updateStudent(id, updatedFields) {
    const index = this.state.students.findIndex(s => s.id === id);
    if (index !== -1) {
      this.state.students[index] = {
        ...this.state.students[index],
        ...updatedFields,
        durationMonths: Number(updatedFields.durationMonths || this.state.students[index].durationMonths),
        monthlyFee: Number(updatedFields.monthlyFee ?? this.state.students[index].monthlyFee),
        admissionFee: Number(updatedFields.admissionFee ?? this.state.students[index].admissionFee)
      };
      this.saveState();
      return this.state.students[index];
    }
    return null;
  }

  deleteStudent(id) {
    this.state.students = this.state.students.filter(s => s.id !== id);
    // Also remove fee records associated with this student
    this.state.feePayments = this.state.feePayments.filter(f => f.studentId !== id);
    this.saveState();
  }

  setStudentStatus(id, newStatus) {
    const student = this.getStudentById(id);
    if (student) {
      student.status = newStatus;
      this.saveState();
      return true;
    }
    return false;
  }

  // Calculate detailed month-by-month fee schedule for a student
  getStudentFeeLedger(studentId) {
    const student = this.getStudentById(studentId);
    if (!student) return null;

    const payments = this.state.feePayments.filter(f => f.studentId === studentId);
    const admDate = new Date(student.admissionDate);
    const duration = student.durationMonths || 3;
    const ledger = [];

    let totalPaid = 0;
    let paidMonthsCount = 0;

    for (let i = 0; i < duration; i++) {
      const monthDate = new Date(admDate.getFullYear(), admDate.getMonth() + i, 1);
      const ym = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });

      const monthPayments = payments.filter(p => p.monthYear === ym);
      const paidAmount = monthPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

      totalPaid += paidAmount;

      // If student paid any amount (1000, 1500, 2000), month is CLEARED/PAID! No dues added.
      const isPaid = paidAmount > 0;
      const isUnpaid = paidAmount === 0;
      if (isPaid) paidMonthsCount++;

      // Check if overdue: only if completely unpaid (paid 0) and past month
      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const isOverdue = isUnpaid && ym < currentYM && student.status === 'active';

      ledger.push({
        monthIndex: i + 1,
        monthYear: ym,
        monthName,
        paidAmount,
        isPaid,
        isUnpaid,
        isOverdue,
        paymentDetails: monthPayments[monthPayments.length - 1] || null,
        paymentRecords: monthPayments
      });
    }

    const unpaidMonthsCount = duration - paidMonthsCount;

    return {
      student,
      ledger,
      totalPaid,
      paidMonthsCount,
      unpaidMonthsCount,
      percentPaid: duration > 0 ? Math.round((paidMonthsCount / duration) * 100) : 0
    };
  }

  // ==================== FEE PAYMENT METHODS ====================

  getFeePayments() {
    return this.state.feePayments || [];
  }

  generateReceiptNumber() {
    const count = this.getFeePayments().length + 1;
    return `REC-${String(count).padStart(5, '0')}`;
  }

  recordFeePayment(paymentData) {
    localStorage.removeItem(WIPED_FLAG_KEY);
    const student = this.getStudentById(paymentData.studentId);
    const newPayment = {
      id: `RCPT-${Date.now()}`,
      receiptNo: paymentData.receiptNo || this.generateReceiptNumber(),
      studentId: paymentData.studentId,
      studentName: student ? student.name : paymentData.studentName,
      rollNo: student ? student.rollNo : paymentData.rollNo,
      courseName: student ? student.courseName : paymentData.courseName,
      monthYear: paymentData.monthYear, // e.g. "2026-10"
      amountPaid: Number(paymentData.amountPaid) || 0,
      discount: Number(paymentData.discount) || 0,
      paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentData.paymentMethod || 'Cash',
      remarks: paymentData.remarks || 'Monthly fee received'
    };

    this.state.feePayments.unshift(newPayment);
    this.saveState();
    return newPayment;
  }

  deleteFeePayment(paymentId) {
    this.state.feePayments = this.state.feePayments.filter(f => f.id !== paymentId);
    this.saveState();
  }

  // ==================== EXPENSE METHODS ====================

  getExpenses() {
    return this.state.expenses || [];
  }

  addExpense(expenseData) {
    localStorage.removeItem(WIPED_FLAG_KEY);
    const newExpense = {
      id: `EXP-${Date.now()}`,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      category: expenseData.category || 'Other',
      amount: Number(expenseData.amount) || 0,
      description: expenseData.description || '',
      paidBy: expenseData.paidBy || 'Admin'
    };
    this.state.expenses.unshift(newExpense);
    this.saveState();
    return newExpense;
  }

  deleteExpense(expenseId) {
    this.state.expenses = this.state.expenses.filter(e => e.id !== expenseId);
    this.saveState();
  }

  // ==================== FINANCIAL CALCULATIONS ====================

  // Monthly Income (Fees collected in specified YYYY-MM)
  getMonthlyIncome(yearMonth) {
    return this.getFeePayments()
      .filter(f => f.paymentDate.startsWith(yearMonth))
      .reduce((sum, item) => sum + (Number(item.amountPaid) || 0), 0);
  }

  // All-time cumulative total income
  getAllTimeIncome() {
    return this.getFeePayments()
      .reduce((sum, item) => sum + (Number(item.amountPaid) || 0), 0);
  }

  // Monthly Expenses in specified YYYY-MM
  getMonthlyExpenses(yearMonth) {
    return this.getExpenses()
      .filter(e => e.date.startsWith(yearMonth))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  // All-time cumulative total expenses
  getAllTimeExpenses() {
    return this.getExpenses()
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  // Net Profit for a specific month
  getMonthlyNetProfit(yearMonth) {
    return this.getMonthlyIncome(yearMonth) - this.getMonthlyExpenses(yearMonth);
  }

  // Cumulative all-time net profit / balance (Income minus Expenses)
  getAllTimeNetProfit() {
    return this.getAllTimeIncome() - this.getAllTimeExpenses();
  }

  // Get current profit split configuration, distribution history, and live remaining net balance
  getProfitSplit() {
    if (!this.state.profitSplit) {
      this.state.profitSplit = {
        customNetBalance: null,
        isDivided: false,
        totalDivided: 0,
        distributions: [],
        splitType: 'percentage',
        teacherPercent: 50,
        adminPercent: 50,
        teacherAmount: 0,
        adminAmount: 0,
        notes: ''
      };
    }

    if (!Array.isArray(this.state.profitSplit.distributions)) {
      this.state.profitSplit.distributions = [];
    }

    const calculatedIncome = this.getAllTimeIncome();
    const calculatedExpenses = this.getAllTimeExpenses();
    const calculatedNet = calculatedIncome - calculatedExpenses; // All-time net profit before distributions

    const isCustom = this.state.profitSplit.customNetBalance !== null && !isNaN(this.state.profitSplit.customNetBalance);
    // Base gross profit generated:
    const totalNetProfit = isCustom ? Number(this.state.profitSplit.customNetBalance) : calculatedNet;

    // Migrate any legacy dividedAmount into distributions list
    if (this.state.profitSplit.distributions.length === 0 && Number(this.state.profitSplit.dividedAmount) > 0) {
      const legacyAmount = Number(this.state.profitSplit.dividedAmount);
      const tPct = Number(this.state.profitSplit.teacherPercent) || 50;
      const aPct = 100 - tPct;
      const tAmt = Number(this.state.profitSplit.teacherAmount) || Math.round((legacyAmount * tPct) / 100);
      const aAmt = Number(this.state.profitSplit.adminAmount) || (legacyAmount - tAmt);

      this.state.profitSplit.distributions.push({
        id: `DIST-INIT`,
        refNo: 'DIV-0001',
        date: new Date().toISOString().split('T')[0],
        amount: legacyAmount,
        teacherShare: tAmt,
        teacherPct: tPct,
        adminShare: aAmt,
        adminPct: aPct,
        notes: this.state.profitSplit.notes || 'Initial fee distribution between Teacher & Admin',
        timestamp: new Date().toISOString()
      });
    }

    // Total amount that has been divided & disbursed so far across all payouts:
    const totalDivided = this.state.profitSplit.distributions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // Cumulative payouts received by Teacher & Admin to date:
    const cumulativeTeacherPaid = this.state.profitSplit.distributions.reduce((sum, d) => sum + (Number(d.teacherShare) || 0), 0);
    const cumulativeAdminPaid = this.state.profitSplit.distributions.reduce((sum, d) => sum + (Number(d.adminShare) || 0), 0);

    // Remaining Undivided Net Balance:
    // If all current profit was divided, remaining is 0!
    // When a NEW MONTHLY FEE is added, totalNetProfit increases, so remainingNetBalance immediately reflects the new fees!
    const remainingNetBalance = Math.max(0, totalNetProfit - totalDivided);

    let teacherPercent = Number(this.state.profitSplit.teacherPercent);
    if (isNaN(teacherPercent)) teacherPercent = 50;
    let adminPercent = 100 - teacherPercent;

    // What would be divided next from the remaining balance:
    const nextTeacherAmount = Math.round((remainingNetBalance * teacherPercent) / 100);
    const nextAdminAmount = remainingNetBalance - nextTeacherAmount;

    return {
      calculatedIncome,
      calculatedExpenses,
      calculatedNet,
      totalNetProfit,
      totalDivided,
      isDivided: totalDivided > 0,
      isFullyDivided: remainingNetBalance === 0 && totalDivided > 0,
      netBalance: remainingNetBalance, // Active All-Time Net Balance (0 when fully divided, >0 when new fees arrive)
      isCustom,
      splitType: this.state.profitSplit.splitType || 'percentage',
      teacherPercent,
      adminPercent,
      cumulativeTeacherPaid,
      cumulativeAdminPaid,
      nextTeacherAmount,
      nextAdminAmount,
      teacherAmount: cumulativeTeacherPaid || nextTeacherAmount,
      adminAmount: cumulativeAdminPaid || nextAdminAmount,
      distributions: this.state.profitSplit.distributions,
      notes: this.state.profitSplit.notes || ''
    };
  }

  // Record a new distribution payout to teacher & admin
  recordProfitDistribution(distData) {
    if (!this.state.profitSplit) this.state.profitSplit = {};
    if (!Array.isArray(this.state.profitSplit.distributions)) {
      this.state.profitSplit.distributions = [];
    }

    const amount = Number(distData.amount) || 0;
    if (amount <= 0) return null;

    const teacherPct = Number(distData.teacherPercent) || 50;
    const adminPct = Number(distData.adminPercent) || (100 - teacherPct);
    const teacherShare = Math.round((amount * teacherPct) / 100);
    const adminShare = amount - teacherShare;
    const dateStr = distData.date || new Date().toISOString().split('T')[0];

    const newDist = {
      id: `DIST-${Date.now()}`,
      refNo: `DIV-${String(this.state.profitSplit.distributions.length + 1).padStart(4, '0')}`,
      date: dateStr,
      amount,
      teacherShare,
      teacherPct,
      adminShare,
      adminPct,
      notes: distData.notes || 'Fee profit disbursed to Teacher & Admin',
      timestamp: new Date().toISOString()
    };

    this.state.profitSplit.distributions.unshift(newDist);
    this.state.profitSplit.teacherPercent = teacherPct;
    this.state.profitSplit.adminPercent = adminPct;
    this.state.profitSplit.isDivided = true;
    this.state.profitSplit.notes = distData.notes || '';
    this.saveState();
    return newDist;
  }

  // Delete an individual distribution record
  deleteProfitDistribution(id) {
    if (!this.state.profitSplit || !Array.isArray(this.state.profitSplit.distributions)) return;
    this.state.profitSplit.distributions = this.state.profitSplit.distributions.filter(d => d.id !== id);
    if (this.state.profitSplit.distributions.length === 0) {
      this.state.profitSplit.isDivided = false;
      this.state.profitSplit.dividedAmount = 0;
    }
    this.saveState();
    return this.getProfitSplit();
  }

  // Save customized net balance and/or record distribution division
  saveProfitSplit(data) {
    if (!this.state.profitSplit) this.state.profitSplit = {};
    if (!Array.isArray(this.state.profitSplit.distributions)) {
      this.state.profitSplit.distributions = [];
    }

    const isDivided = data.isDivided !== undefined ? Boolean(data.isDivided) : true;
    const isCustom = Boolean(data.isCustom);
    const teacherPercent = Number(data.teacherPercent) || 50;
    const adminPercent = Number(data.adminPercent) || (100 - teacherPercent);
    const notes = data.notes || '';

    if (isDivided) {
      const currentSplit = this.getProfitSplit();
      const amountToDivide = Number(data.amountToDivide) !== undefined && !isNaN(data.amountToDivide)
        ? Number(data.amountToDivide)
        : currentSplit.netBalance;

      if (amountToDivide > 0) {
        this.recordProfitDistribution({
          amount: amountToDivide,
          teacherPercent,
          adminPercent,
          notes
        });
      }
    }

    this.state.profitSplit.customNetBalance = isCustom ? (Number(data.customNetBalance) || 0) : null;
    this.state.profitSplit.splitType = data.splitType || 'percentage';
    this.state.profitSplit.teacherPercent = teacherPercent;
    this.state.profitSplit.adminPercent = adminPercent;
    this.state.profitSplit.notes = notes;
    this.saveState();
    return this.getProfitSplit();
  }

  // Reset net balance back to automated (Income - Expenses) and clear distribution history
  resetProfitSplitToAuto() {
    if (!this.state.profitSplit) this.state.profitSplit = {};
    this.state.profitSplit.customNetBalance = null;
    this.state.profitSplit.distributions = [];
    this.state.profitSplit.dividedAmount = 0;
    this.state.profitSplit.isDivided = false;
    this.saveState();
    return this.getProfitSplit();
  }

  // Get active students who have NOT paid anything for the given month
  getDefaultersForMonth(yearMonth) {
    const activeStudents = this.getStudents().filter(s => s.status === 'active');
    const paymentsForMonth = this.getFeePayments().filter(f => f.monthYear === yearMonth);
    const paidStudentIds = new Set(paymentsForMonth.filter(p => (Number(p.amountPaid) || 0) > 0).map(p => p.studentId));

    // Only students who have NOT paid anything (0) for this month are considered pending
    return activeStudents.filter(student => !paidStudentIds.has(student.id));
  }

  // Summary statistics for dashboard
  getDashboardStats(yearMonth) {
    const students = this.getStudents();
    const activeStudents = students.filter(s => s.status === 'active');
    const completedStudents = students.filter(s => s.status === 'completed');
    const defaulters = this.getDefaultersForMonth(yearMonth);

    const monthlyIncome = this.getMonthlyIncome(yearMonth);
    const monthlyExpenses = this.getMonthlyExpenses(yearMonth);
    const monthlyNet = monthlyIncome - monthlyExpenses;

    const allTimeIncome = this.getAllTimeIncome();
    const allTimeExpenses = this.getAllTimeExpenses();
    const profitSplit = this.getProfitSplit();
    const allTimeNet = profitSplit.netBalance; // Expenses subtracted or custom editable balance

    return {
      totalStudents: students.length,
      activeCount: activeStudents.length,
      completedCount: completedStudents.length,
      defaulterCount: defaulters.length,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet,
      allTimeIncome,
      allTimeExpenses,
      allTimeNet,
      profitSplit
    };
  }

  // ==================== COURSES & SETTINGS ====================

  getCourses() {
    return this.state.courses || [];
  }

  addCourse(course) {
    const newCourse = {
      id: `c_${Date.now()}`,
      code: course.code.toUpperCase(),
      name: course.name,
      durationMonths: Number(course.durationMonths),
      defaultFee: Number(course.defaultFee),
      admissionFee: Number(course.admissionFee || 0)
    };
    this.state.courses.push(newCourse);
    this.saveState();
    return newCourse;
  }

  getAcademyInfo() {
    return this.state.academyInfo;
  }

  updateAcademyInfo(info) {
    this.state.academyInfo = { ...this.state.academyInfo, ...info };
    this.saveState();
  }

  // ==================== BACKUP & RESTORE ====================

  exportBackupJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Zonish_Academy_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  importBackupJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.students && parsed.feePayments && parsed.expenses) {
        this.state = parsed;
        this.saveState();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }

  resetToDefault() {
    localStorage.removeItem(WIPED_FLAG_KEY);
    this.initDefaultData();
    this.notifyAllModules();
  }

  // Complete Wipe Out: Erases students, fee payments, expenses, and resets ledger.
  // Sets WIPED_FLAG_KEY so that reload NEVER loads sample/demo data!
  async wipeAllData(options = {}) {
    const wipeCloud = options.wipeCloud !== false;
    const statsBefore = {
      studentsCount: (this.state.students || []).length,
      feesCount: (this.state.feePayments || []).length,
      expensesCount: (this.state.expenses || []).length
    };

    const keepCourses = options.resetCourses ? this.getDefaultCourses() : (this.state.courses || this.getDefaultCourses());
    const keepInfo = options.resetInfo ? this.getDefaultAcademyInfo() : (this.state.academyInfo || this.getDefaultAcademyInfo());

    this.state = {
      academyInfo: keepInfo,
      courses: keepCourses,
      students: [],
      feePayments: [],
      expenses: [],
      profitSplit: this.getDefaultProfitSplit()
    };

    // Set flag in localStorage so browser refreshes NEVER resurrect demo data
    localStorage.setItem(WIPED_FLAG_KEY, 'true');
    this.saveToLocalOnly();

    let cloudResult = { attempted: false, success: false };

    // If Firebase is connected and cloud wipe is enabled, wipe the remote Firestore doc
    if (wipeCloud && window.FirebaseSync && window.FirebaseSync.isConnected) {
      cloudResult.attempted = true;
      try {
        const res = await window.FirebaseSync.wipeCloudData();
        cloudResult.success = res && res.success;
        cloudResult.error = res && res.error;
      } catch (err) {
        cloudResult.success = false;
        cloudResult.error = err.message;
      }
    }

    this.notifyAllModules();

    return {
      success: true,
      statsBefore,
      cloudResult
    };
  }

  clearAllData() {
    return this.wipeAllData({ wipeCloud: true });
  }
}

// Global store instance
window.academyStore = new AcademyStore();
