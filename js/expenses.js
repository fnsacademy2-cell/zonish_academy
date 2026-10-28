/**
 * Zonish Academy - Expense & Cost Management Module
 * Tracks academy expenditures such as rent, teacher salaries, electricity,
 * internet bills, refreshments, and computer lab maintenance.
 */

const ExpensesModule = {
  currentCategoryFilter: 'all',
  currentMonthMode: 'all',
  customMonthValue: '',

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Add Expense Form submit
    const expenseForm = document.getElementById('add-expense-form');
    if (expenseForm) {
      expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddExpenseSubmit();
      });
    }

    // Category filter change
    const categoryFilter = document.getElementById('expense-category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.currentCategoryFilter = e.target.value;
        this.render();
      });
    }

    // Month filter change
    const monthFilter = document.getElementById('expense-month-filter');
    const customMonthInput = document.getElementById('expense-custom-month');
    if (monthFilter) {
      monthFilter.addEventListener('change', (e) => {
        this.currentMonthMode = e.target.value;
        if (this.currentMonthMode === 'custom') {
          if (customMonthInput) {
            customMonthInput.style.display = 'inline-block';
            if (!this.customMonthValue) {
              const d = new Date();
              this.customMonthValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }
            customMonthInput.value = this.customMonthValue;
            customMonthInput.focus();
          }
        } else {
          if (customMonthInput) customMonthInput.style.display = 'none';
        }
        this.render();
      });
    }

    if (customMonthInput) {
      customMonthInput.addEventListener('change', (e) => {
        this.customMonthValue = e.target.value;
        this.currentMonthMode = 'custom';
        this.render();
      });
    }
  },

  render() {
    const tableBody = document.getElementById('expenses-table-body');
    if (!tableBody) return;

    const store = window.academyStore;
    const currency = store.getAcademyInfo().currency;
    let expenses = store.getExpenses();

    // Category Filter
    if (this.currentCategoryFilter !== 'all') {
      expenses = expenses.filter(e => e.category === this.currentCategoryFilter);
    }

    // Monthly Filter
    const today = new Date();
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let targetMonth = null;

    if (this.currentMonthMode === 'current') {
      targetMonth = currentYM;
    } else if (this.currentMonthMode === 'custom') {
      targetMonth = this.customMonthValue || currentYM;
    }

    if (targetMonth) {
      expenses = expenses.filter(e => e.date && e.date.startsWith(targetMonth));
    }

    // Update expense summary numbers
    const monthlyExp = store.getMonthlyExpenses(currentYM);
    const allTimeExp = store.getAllTimeExpenses();

    const monthlyExpEl = document.getElementById('stat-expenses-monthly');
    const allTimeExpEl = document.getElementById('stat-expenses-alltime');
    if (monthlyExpEl) monthlyExpEl.textContent = `${currency} ${monthlyExp.toLocaleString()}`;
    if (allTimeExpEl) allTimeExpEl.textContent = `${currency} ${allTimeExp.toLocaleString()}`;

    if (expenses.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No expense records found. Click "Add Expense" to record utility, rent, or salary bills.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = expenses.map(item => `
      <tr>
        <td><strong>${item.date}</strong></td>
        <td>
          <span class="badge ${this.getCategoryBadgeClass(item.category)}">
            ${item.category}
          </span>
        </td>
        <td>${item.description || '-'}</td>
        <td>
          <strong style="color: var(--danger); font-size: 0.95rem;">
            ${currency} ${item.amount.toLocaleString()}
          </strong>
        </td>
        <td>${item.paidBy || 'Admin'}</td>
        <td>
          <button class="icon-btn danger" title="Delete Expense" onclick="ExpensesModule.deleteExpense('${item.id}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  getCategoryBadgeClass(category) {
    switch (category) {
      case 'Teacher Salary': return 'badge-primary';
      case 'Electricity / Utility': return 'badge-warning';
      case 'Rent': return 'badge-danger';
      case 'Internet': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  },

  openAddModal() {
    const form = document.getElementById('add-expense-form');
    form.reset();
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
    App.openModal('add-expense-modal');
  },

  handleAddExpenseSubmit() {
    const expenseData = {
      date: document.getElementById('exp-date').value,
      category: document.getElementById('exp-category').value,
      amount: parseFloat(document.getElementById('exp-amount').value) || 0,
      description: document.getElementById('exp-desc').value.trim(),
      paidBy: document.getElementById('exp-paidby').value.trim()
    };

    window.academyStore.addExpense(expenseData);
    App.closeModal('add-expense-modal');
    App.showToast(`Recorded expense of ${window.academyStore.getAcademyInfo().currency} ${expenseData.amount}`, 'success');

    this.render();
    App.refreshDashboard();
  },

  deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense entry?')) {
      window.academyStore.deleteExpense(id);
      App.showToast('Expense entry removed', 'info');
      this.render();
      App.refreshDashboard();
    }
  },

  exportCSV() {
    let expenses = window.academyStore.getExpenses();
    if (expenses.length === 0) {
      App.showToast('No expenses to export', 'warning');
      return;
    }

    if (this.currentCategoryFilter !== 'all') {
      expenses = expenses.filter(e => e.category === this.currentCategoryFilter);
    }

    const today = new Date();
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let targetMonth = null;
    let fileSuffix = 'All_Months';

    if (this.currentMonthMode === 'current') {
      targetMonth = currentYM;
      fileSuffix = targetMonth;
    } else if (this.currentMonthMode === 'custom') {
      targetMonth = this.customMonthValue || currentYM;
      fileSuffix = targetMonth;
    }

    if (targetMonth) {
      expenses = expenses.filter(e => e.date && e.date.startsWith(targetMonth));
    }

    if (expenses.length === 0) {
      App.showToast('No expenses matching current filter to export', 'warning');
      return;
    }

    const headers = ['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'Paid By'];
    const rows = expenses.map(e => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${e.category}"`,
      `"${e.description || ''}"`,
      e.amount,
      `"${e.paidBy || 'Admin'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Zonish_Academy_Expenses_${fileSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    App.showToast(`Exported ${expenses.length} expense records to CSV`, 'success');
  }
};

window.ExpensesModule = ExpensesModule;
