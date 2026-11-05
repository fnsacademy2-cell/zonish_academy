# Zonish Computer Academy - Student Admission & Monthly Fees Tracking System

A complete, modern, standalone Google Chrome / web-based Academy Management System designed specifically for Computer Academies.

---

## 🚀 Key Features

### 1. Student Admission & Registration
- **Course Catalog with Custom Durations**:
  - **DIT (Diploma in Information Technology)**: 12 Months (1 Year)
  - **CIT (Certificate in Information Technology)**: 6 Months
  - **Office Automation (MS Office & InPage)**: 3 Months
  - **Graphic Designing**: 3 Months
  - **Web Development (Full Stack)**: 6 Months
  - Custom courses can be added easily in **Settings**.
- **Student Profile Records**: Roll Number, Full Name, Father's Name, Contact / WhatsApp, CNIC/B-Form, Batch Timing Shift, Monthly Tuition Fee, Admission Fee, Academic Status.
- **Academic Status Lifecycle**:
  - `Studying (Active)`
  - `Course Completed`
  - `Dropped / Left`

### 2. Flexible Monthly Fee Tracking (No Debt / No Dues Added)
- **Open & Optional Fee Policy**:
  - The standard **Rs. 2,000** monthly fee is optional and serves only as a suggested guide.
  - If a student pays **Rs. 1,500**, **Rs. 1,000**, or any other agreed amount, **NO dues or debt are added to their account**!
  - Any payment received for that month clears that month as **Paid (Cleared)**.
- **Defaulters & Payment Status**:
  - 🟢 `Paid (Cleared)`: Student has paid for that month (e.g. Rs. 1,000, Rs. 1,500, or Rs. 2,000). Month is settled.
  - 🔴 `Unpaid`: Student has submitted Rs. 0 (nothing paid yet).
  - Only students with zero payment appear in the Defaulters list.
- **1-Click Quick Amount Selector**:
  - `Rs. 1,000`, `Rs. 1,500`, `Rs. 2,000`, `Rs. 2,500` shortcuts for rapid payment recording.
- **WhatsApp Fee Reminders**:
  - 1-click WhatsApp message to remind unpaid students to submit their monthly fee.
- **Printable Fee Voucher Slip**: Shows Enrolled Course, Fee Month, Amount Paid, and confirms **Fee Cleared with 0 Remaining Dues**.

### 3. Income, Expenses & Profit Division (Teacher vs. Admin)
- **Monthly Income & Expenses**:
  - Fees collected during the active month minus current month expenses.
- **Total All-Time Cumulative Income & Expenses**:
  - Automatically calculates: **All-Time Net Balance = (Total All-Time Income - Total All-Time Expenses) - Total Divided to Date**.
- **Live Net Balance When New Fees Are Added**:
  - When payment is divided, remaining balance becomes **Rs. 0** (`✓ Fully Divided`).
  - As soon as a student pays a new monthly fee, the All-Time Net Balance **instantly updates** to show the new available cash (e.g. `Rs. 2,000`), never remaining stuck at zero!
  - Clicking **"Edit & Divide"** allows you to disburse this new incoming balance anytime.
- **Teacher & Admin Fee Distribution Report & Statement**:
  - Direct **`[Report]`** button right on the **All-Time Net Balance card** in the Financial Banner, in the Dashboard Ledger, and in the Reports tab.
  - Displays: Total Fee Income, Expenses, Gross Net Profit, Total Amount Distributed, Remaining Undivided Balance, Cumulative Teacher Earnings, Cumulative Admin Share, and an itemized Payouts History Table.
  - 1-click **Print Official Statement Slip** with formal signatures for Teacher, Admin, and Director.
  - 1-click **Export Report (CSV)** for Excel bookkeeping.
- **Editable Net Balance & Division Presets**:
  - Quick split presets: `50/50`, `60/40`, `70/30`, `40/60`, or custom percentages.
  - Displays live monetary shares: **👨‍🏫 Teacher Share (Rs)** vs **🏢 Admin Share (Rs)**.
  - Real-time cloud synchronization via Google Sheets!
- **Academy Expenses Logger**:
  - Faculty Salaries, Lab Electricity, AC Utility bills, Internet, Tea, PC Maintenance, Stationery.
  - Includes **Monthly Filter** (`All Months`, `Current Month`, or `Custom Month`) and CSV Export.

### 4. Interactive Analytics & Printable Slips
- **Monthly Revenue vs. Expenses Trend**: 6-month visual comparison.
- **Enrollment by Course Breakdown**: Visual doughnut chart.
- **Print Admission Form**: Formal registration profile slip.
- **Print Fee Receipt Slip**: Professional voucher with signatures.

### 5. Multi-Location Real-Time Cloud Access (Google Sheets)
- **Access & Manage from Google Sheets**: Access all student admissions, monthly fee statuses, and academy expenses live in formatted Google Sheets tabs (`Students`, `Fee_Payments`, `Expenses`, `Academy_Summary`).
- **Real-Time Sync**: Any admission or fee collected at the academy syncs automatically to your Google Sheet!
- **Free Google Sheets Setup (No Database Servers Needed)**:
  1. Open a new Google Sheet at [sheets.google.com](https://sheets.google.com).
  2. Click **Extensions -> Apps Script**, delete any code, and paste the Zonish Apps Script Bridge code (available with 1 click in Settings).
  3. Click **Deploy -> New deployment -> Web App**:
     - Execute as: `Me`
     - Who has access: `Anyone`
  4. Copy your Web App URL and paste it into **Settings -> Google Sheets Cloud Sync**.
  5. Click **Save & Test Connection**!
- **Dual Offline/Online Architecture**: The app continues to work smoothly offline using local storage, and automatically syncs all updates once reconnected.

### 6. Data Storage, Wipe Out & Backup
- Powered by Google Chrome's local storage engine (no internet required for data operations).
- **Permanent Data Wipe Out (Local & Google Sheets)**:
  - 1-click Wipe Out with confirmation security safeguard (typing `DELETE`).
  - Clears all student records, fee vouchers, expenses, and ledger profit splits from both Local Storage and Google Sheets.
  - **Zero Residual Demo Data**: Once wiped, the system remains completely empty (0 records) across all refreshes and will **never show sample data again until new data is entered**.
  - Live execution log console displays step-by-step progress during the wipe operation.
- **Download Full Backup (.JSON)**: Save a complete backup file to your computer anytime.
- **Restore from Backup**: Upload your JSON backup to restore all data instantly.
- **Export to CSV / Excel**: Export student directories, fee payment transactions, and expenses.

---

## 🖥️ How to Run

1. Simply double-click **[Start_Zonish_Academy.bat](file:///c:/Users/shah/Desktop/Master%20Dashboards/Other%20Tasks/Zonish_Academy/Start_Zonish_Academy.bat)**, OR
2. Right-click **[index.html](file:///c:/Users/shah/Desktop/Master%20Dashboards/Other%20Tasks/Zonish_Academy/index.html)** and choose **Open with Google Chrome**.

No server installation (Node.js/Python) is needed; it runs directly in your Chrome browser!
