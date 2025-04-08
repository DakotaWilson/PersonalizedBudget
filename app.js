// app.js
// ... (Firebase config, constants, data storage, DOM elements - ALL THE SAME AS BEFORE) ...
const firebaseConfig = {
  apiKey: "AIzaSyDWoRetxkIjcr2IFtaDzy6O86QID5AgHvw", // Replace with your actual API key if needed
  authDomain: "budgetcalc-b5f98.firebaseapp.com",
  projectId: "budgetcalc-b5f98",
  storageBucket: "budgetcalc-b5f98.firebasestorage.app",
  messagingSenderId: "696280368169",
  appId: "1:696280368169:web:812c497f97343ef1064838",
  measurementId: "G-DYR1LH8VVB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Constants
const VERSION = "2.4.1"; // Updated version
const COLLECTIONS = {
  INCOMES: "incomes",
  BILLS: "bills",
  EXPENSES: "expenses",
  ACTIVITY_LOG: "activityLog"
};

// Recurrence pattern options
const RECURRENCE_PATTERNS = {
  NONE: "none",
  MONTHLY: "monthly",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly"
};

// Month names
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Day names
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Data storage
let incomes = [];
let bills = [];
let expenses = [];
let activityLog = [];
let currentUser = null;

// Month Filter State
let selectedFilterYear = null;
let selectedFilterMonth = null; // 0-indexed (0 for January, 11 for December)

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const loginScreen = document.getElementById('login-screen');
const budgetApp = document.getElementById('budget-app');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');
const monthFilterSelect = document.getElementById('month-filter-select');
const contentDiv = document.getElementById('content');

// ... (showLoading, hideLoading, showError, auth functions, initializeUserData - ALL THE SAME AS BEFORE) ...
async function registerUser(email, password) {
  try {
    showLoading();
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    currentUser = userCredential.user;
    await initializeUserData(currentUser.uid);
    hideLoading();
    showApp();
  } catch (error) {
    hideLoading();
    showError(`Registration failed: ${error.message}`);
  }
}

async function loginUser(email, password) {
  try {
    showLoading();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    currentUser = userCredential.user;
    hideLoading();
    showApp();
  } catch (error) {
    hideLoading();
    showError(`Login failed: ${error.message}`);
  }
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    // Clear local data arrays on logout
    incomes = [];
    bills = [];
    expenses = [];
    activityLog = [];
    hideApp();
  }).catch((error) => {
    console.error("Logout failed:", error);
  });
}

async function initializeUserData(userId) {
    const sampleDataDate = new Date(2025, 2, 1); // Base date for sample data (March 2025)

    try {
        // Sample data with dates relative to sampleDataDate
        const sampleIncomes = [
            { id: generateId(), source: "Doctor Care", amount: 1500, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth() - 1, 25)) }, // Feb 25
            { id: generateId(), source: "CORE", amount: 300, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 7)) }      // Mar 7
        ];

        const sampleBills = [
            { id: generateId(), name: "Rent", amount: 1200, dueDate: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 1)), paid: false, recurring: true, recurrencePattern: RECURRENCE_PATTERNS.MONTHLY }, // Mar 1
            { id: generateId(), name: "Internet", amount: 100, dueDate: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 11)), paid: false, recurring: false, recurrencePattern: RECURRENCE_PATTERNS.NONE } // Mar 11
        ];

        const sampleExpenses = [
            { id: generateId(), category: "Groceries", amount: 120, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 5)), notes: "Weekly grocery shopping" }, // Mar 5
            { id: generateId(), category: "Shopping", amount: 45, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 1)), notes: "New clothes" },              // Mar 1
            { id: generateId(), category: "Savings", amount: 200, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 2)), notes: "Monthly savings deposit" }   // Mar 2
        ];

        // Check if user already has data (check one collection is sufficient)
        const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).limit(1).get();

        if (incomesSnapshot.empty) {
          console.log("Initializing sample data for new user:", userId);
          const batch = db.batch();

          sampleIncomes.forEach(income => {
            const docRef = db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(income.id);
            batch.set(docRef, income);
          });

          sampleBills.forEach(bill => {
            const docRef = db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).doc(bill.id);
            batch.set(docRef, bill);
          });

          sampleExpenses.forEach(expense => {
            const docRef = db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).doc(expense.id);
            batch.set(docRef, expense);
          });

          const activityLogEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: "Account created with sample data",
            type: "auth"
          };
          const logRef = db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(activityLogEntry.id);
          batch.set(logRef, activityLogEntry);

          await batch.commit();
          console.log("Sample data initialized.");
        } else {
          console.log("User already has data, skipping sample data initialization.");
        }
      } catch (error) {
        console.error("Error initializing user data:", error);
      }
}


// Firestore data functions
async function loadData() {
  try {
    showLoading();

    if (!currentUser) {
      hideLoading();
      return;
    }

    const userId = currentUser.uid;

    // Load incomes, bills, expenses, activity log (SAME AS BEFORE)
     // Load incomes
    const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get();
    incomes = incomesSnapshot.docs.map(doc => doc.data());

    // Load bills
    const billsSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).get();
    bills = billsSnapshot.docs.map(doc => doc.data());
    bills = bills.map(bill => ({
      ...bill,
      paid: bill.paid !== undefined ? bill.paid : false,
      recurring: bill.recurring !== undefined ? bill.recurring : false,
      recurrencePattern: bill.recurrencePattern || RECURRENCE_PATTERNS.NONE
    }));

    // Load expenses
    const expensesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get();
    expenses = expensesSnapshot.docs.map(doc => doc.data());
    expenses = expenses.map(expense => ({
      ...expense,
      notes: expense.notes || ""
    }));

    // Load activity log
    const activityLogSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    activityLog = activityLogSnapshot.docs.map(doc => doc.data());


    // Initialize filter to current month *** THIS IS THE DEFAULT ***
    const now = new Date();
    selectedFilterYear = now.getFullYear();
    selectedFilterMonth = now.getMonth(); // 0-indexed

    // Populate the month filter dropdown
    populateMonthFilterDropdown(); // Will set the dropdown to the current month value

    hideLoading();

    // Update UI
    userEmailDisplay.textContent = currentUser.email;
    document.querySelector('.app-subtitle').textContent = `v${VERSION}`; // Display version
    changeTab('dashboard'); // Render the default tab with the current month filter

  } catch (error) {
    console.error("Error loading data:", error);
    hideLoading();
    showError("Failed to load data. Please try again.");
  }
}

// ... (logActivity, generateNextRecurringBill, showSaveIndicator, generateId - SAME AS BEFORE) ...
async function logActivity(action, type, details = {}) {
  if (!currentUser) return;

  try {
    const userId = currentUser.uid;
    const newLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      type,
      details: { ...details } // Create a shallow copy to avoid potential circular references
    };
    await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(newLog.id).set(newLog);
    activityLog.unshift(newLog); // Add to the beginning of the local array
    if (activityLog.length > 50) { // Keep the local log capped
        activityLog.pop();
    }
    showSaveIndicator();

  } catch (error) {
    console.error("Error logging activity:", error);
  }
}
function generateNextRecurringBill(bill) {
  if (!bill.dueDate) {
      console.error("Cannot generate next recurring bill: Missing dueDate.", bill);
      return null;
  }
  const [year, month, day] = bill.dueDate.split('-').map(Number);
  const newBill = { ...bill, id: generateId(), paid: false };
  const dueDate = new Date(Date.UTC(year, month - 1, day));

  switch (bill.recurrencePattern) {
    case RECURRENCE_PATTERNS.MONTHLY: dueDate.setUTCMonth(dueDate.getUTCMonth() + 1); break;
    case RECURRENCE_PATTERNS.WEEKLY: dueDate.setUTCDate(dueDate.getUTCDate() + 7); break;
    case RECURRENCE_PATTERNS.BIWEEKLY: dueDate.setUTCDate(dueDate.getUTCDate() + 14); break;
    case RECURRENCE_PATTERNS.QUARTERLY: dueDate.setUTCMonth(dueDate.getUTCMonth() + 3); break;
    case RECURRENCE_PATTERNS.YEARLY: dueDate.setUTCFullYear(dueDate.getUTCFullYear() + 1); break;
    default: return null;
  }
  newBill.dueDate = formatDateForInput(dueDate);
  return newBill;
}
function showSaveIndicator() {
  const indicator = document.getElementById('save-indicator');
  indicator.classList.add('visible');
  setTimeout(() => { indicator.classList.remove('visible'); }, 2000);
}
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ... (showApp, hideApp, format helpers, calendar helpers - SAME AS BEFORE) ...
function showApp() {
  loginScreen.style.display = 'none';
  budgetApp.style.display = 'block';
  loadData(); // Load data when app is shown
}
function hideApp() {
  budgetApp.style.display = 'none';
  loginScreen.style.display = 'block';
  document.getElementById('email-input').value = '';
  document.getElementById('password-input').value = '';
  loginError.classList.add('hidden'); // Hide any previous errors
}
function formatCurrency(amount) {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numAmount);
}
function formatDate(dateString) {
    if (!dateString) return "";
    try {
        if (typeof dateString === 'string' && dateString.includes('-') && !dateString.includes('T')) {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day));
            return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
        } else {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return ""; // Invalid date
            return date.toLocaleDateString('en-US');
        }
    } catch (e) { console.error("Error formatting date:", dateString, e); return ""; }
}
function formatDateTime(dateString) {
  if (!dateString) return "";
  try { const date = new Date(dateString); if (isNaN(date.getTime())) return ""; return date.toLocaleString('en-US'); }
  catch (e) { console.error("Error formatting datetime:", dateString, e); return ""; }
}
function formatDateForInput(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function getPreviousMonth(year, month) { return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }; }
function getNextMonth(year, month) { return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }; }
function getBillsForDay(year, month, day) {
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return bills.filter(bill => bill.dueDate === dateString);
}


// --- Month Filter Logic (SAME AS BEFORE) ---
function populateMonthFilterDropdown() {
    monthFilterSelect.innerHTML = '';
    const options = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    options.push({ value: 'all', text: 'All Time' });
    for (let i = -12; i <= 6; i++) {
        const date = new Date(currentYear, currentMonth + i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const value = `${year}-${String(month + 1).padStart(2, '0')}`;
        const text = `${MONTH_NAMES[month]} ${year}`;
        options.push({ value, text });
    }
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        monthFilterSelect.appendChild(option);
    });

    // Set selected value based on state (will be current month on initial load)
    if (selectedFilterYear === null) {
        monthFilterSelect.value = 'all';
    } else {
        const selectedValue = `${selectedFilterYear}-${String(selectedFilterMonth + 1).padStart(2, '0')}`;
        monthFilterSelect.value = selectedValue;
        if (monthFilterSelect.value !== selectedValue) { // Fallback if month not in range
             monthFilterSelect.value = 'all';
             selectedFilterYear = null;
             selectedFilterMonth = null;
        }
    }
}
function handleMonthFilterChange() {
    const selectedValue = monthFilterSelect.value;
    if (selectedValue === 'all') {
        selectedFilterYear = null;
        selectedFilterMonth = null;
    } else {
        const [year, month] = selectedValue.split('-').map(Number);
        selectedFilterYear = year;
        selectedFilterMonth = month - 1;
    }
    const activeTab = document.querySelector('.tab.active').id.split('-')[1];
    changeTab(activeTab);
}
function filterDataByMonth(dataArray, dateField = 'date') {
    if (selectedFilterYear === null || selectedFilterMonth === null) {
        return [...dataArray];
    }
    return dataArray.filter(item => {
        if (!item[dateField] || typeof item[dateField] !== 'string') return false;
        try {
            const [itemYear, itemMonth] = item[dateField].split('-').map(Number);
            return itemYear === selectedFilterYear && itemMonth === selectedFilterMonth + 1;
        } catch (e) { console.warn(`Error parsing date field '${dateField}' for item:`, item, e); return false; }
    });
}

// --- Calculation and Rendering Functions (SAME AS BEFORE except renderDashboard) ---
function calculateTotals() {
  const filteredIncomes = filterDataByMonth(incomes, 'date');
  const filteredBills = filterDataByMonth(bills, 'dueDate');
  const filteredExpenses = filterDataByMonth(expenses, 'date');
  const totalIncome = filteredIncomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalBills = filteredBills.filter(bill => !bill.paid).reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIncome - totalBills - totalExpenses;
  const totalPaidBills = filteredBills.filter(bill => bill.paid).reduce((sum, item) => sum + Number(item.amount), 0);
  const totalSavings = filteredExpenses.filter(expense => expense.category === "Savings").reduce((sum, item) => sum + Number(item.amount), 0);
  return { totalIncome, totalBills, totalExpenses, balance, totalPaidBills, totalSavings };
}
function getExpensesByCategory() {
  const filteredExpenses = filterDataByMonth(expenses, 'date');
  const result = {};
  filteredExpenses.forEach(expense => {
    const category = expense.category;
    if (!result[category]) { result[category] = 0; }
    result[category] += Number(expense.amount);
  });
  return result;
}
function changeTab(tabName) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  contentDiv.innerHTML = '';
  if (tabName === 'dashboard') renderDashboard(contentDiv);
  else if (tabName === 'income') renderIncomeTracker(contentDiv);
  else if (tabName === 'bills') renderBillTracker(contentDiv);
  else if (tabName === 'expenses') renderExpenseTracker(contentDiv);
}

// Render dashboard *** UPDATED ***
function renderDashboard(container) {
    const { totalIncome, totalBills, totalExpenses, balance, totalPaidBills, totalSavings } = calculateTotals();
    const expensesByCategory = getExpensesByCategory();

    const calendarYear = selectedFilterYear !== null ? selectedFilterYear : new Date().getFullYear();
    const calendarMonth = selectedFilterMonth !== null ? selectedFilterMonth : new Date().getMonth();

    container.dataset.calendarYear = calendarYear;
    container.dataset.calendarMonth = calendarMonth;

    const filterPeriodText = selectedFilterYear !== null ? `${MONTH_NAMES[selectedFilterMonth]} ${selectedFilterYear}` : 'All Time';

    let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary (${filterPeriodText})</h2>
      <div class="stat-grid">
        <div class="stat-card"><h3 class="stat-label income-label">Income</h3><p class="stat-value income-value">${formatCurrency(totalIncome)}</p></div>
        <div class="stat-card"><h3 class="stat-label bills-label">Unpaid Bills</h3><p class="stat-value bills-value">${formatCurrency(totalBills)}</p></div>
        <div class="stat-card"><h3 class="stat-label expenses-label">Expenses</h3><p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p></div>
        <div class="stat-card"><h3 class="stat-label balance-label">Net Change</h3><p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">${formatCurrency(balance)}</p></div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Savings Summary (${filterPeriodText})</h2>
      <div class="stat-card w-full"><h3 class="stat-label savings-label">Total Saved</h3><p class="stat-value savings-value">${formatCurrency(totalSavings)}</p></div>
    </div>

    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title m-0">Bills Calendar</h2>
        <div class="flex items-center">
          <button id="prev-month" class="calendar-nav-btn">❮</button>
          <h3 id="calendar-title" class="text-gray-300 mx-4">${MONTH_NAMES[calendarMonth]} ${calendarYear}</h3>
          <button id="next-month" class="calendar-nav-btn">❯</button>
        </div>
      </div>
      <div id="bills-calendar" class="calendar-container">
        <div class="calendar-header">${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}</div>
        <div class="calendar-body"><!-- Calendar days generated by JS --></div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Expense Breakdown (${filterPeriodText})</h2>
      <div class="space-y-3">
  `;

    // Expense Breakdown rendering (SAME AS BEFORE)
    const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (Object.keys(expensesByCategory).length > 0) {
        Object.entries(expensesByCategory).forEach(([category, amount]) => {
            const percentage = totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0;
            const progressBarColor = category === 'Savings' ? '#3b82f6' : '#059669';
            html += `<div><div class="flex justify-between mb-1"><span class="font-medium text-gray-300">${category}</span><span class="text-gray-300">${formatCurrency(amount)} (${percentage.toFixed(1)}%)</span></div><div class="progress-container"><div class="progress-bar" style="width: ${percentage}%; background-color: ${progressBarColor};"></div></div></div>`;
        });
    } else { html += `<p class="text-gray-400">No expense data for this period.</p>`; }
    html += `</div></div>`; // Close Expense Breakdown card

    // --- Upcoming Bills Section - UPDATED ---
    html += `<div class="card">
                <h2 class="card-title">Bills Due in ${filterPeriodText}</h2>
                <div class="space-y-3">`;

    let billsForSelectedMonth = [];
    if (selectedFilterYear !== null && selectedFilterMonth !== null) {
        // Filter bills specifically for the selected month and year
        billsForSelectedMonth = bills
            .filter(bill => {
                if (!bill.dueDate) return false; // Skip bills without due date
                try {
                    const [itemYear, itemMonth] = bill.dueDate.split('-').map(Number);
                    return itemYear === selectedFilterYear && itemMonth === selectedFilterMonth + 1;
                } catch {
                    return false; // Skip invalid dates
                }
            })
            .sort((a, b) => { // Sort by due date within the month
                 try {
                    const dateA = new Date(Date.UTC(...a.dueDate.split('-').map((n,i)=>i===1?n-1:n)));
                    const dateB = new Date(Date.UTC(...b.dueDate.split('-').map((n,i)=>i===1?n-1:n)));
                    return dateA - dateB; // Ascending
                 } catch { return 0; }
            });
    }

    if (billsForSelectedMonth.length > 0) {
        billsForSelectedMonth.forEach(bill => {
            const recurringIcon = bill.recurring ? `<span class="ml-2 text-blue-300 recurring-icon" title="${bill.recurrencePattern}">↻</span>` : '';
            const isPaid = bill.paid;
            const statusText = isPaid ? 'Paid' : 'Unpaid';
            const statusClass = isPaid ? 'text-green-300 paid-indicator-yes' : 'text-yellow-300 paid-indicator-no';

            html += `
                <div class="flex justify-between items-center border-b border-gray-700 pb-2">
                <div>
                    <div class="font-medium text-gray-300">${bill.name}${recurringIcon}</div>
                    <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
                </div>
                <div class="flex items-center space-x-3">
                     <span class="text-sm ${statusClass}">${statusText}</span>
                     <div class="text-yellow-300 font-medium">${formatCurrency(bill.amount)}</div>
                    ${!isPaid ? `
                    <button class="bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded text-sm mark-paid-btn" onclick="toggleBillPaid('${bill.id}', true)">
                        Mark Paid
                    </button>
                    ` : `
                     <button class="bg-yellow-800 hover:bg-yellow-700 text-white px-2 py-1 rounded text-sm mark-unpaid-btn" onclick="toggleBillPaid('${bill.id}', false)">
                        Mark Unpaid
                    </button>
                    `}
                </div>
                </div>`;
        });
    } else {
        if (selectedFilterYear !== null) {
            html += `<p class="text-gray-400">No bills found due in ${filterPeriodText}.</p>`;
        } else {
            html += `<p class="text-gray-400">Select a specific month to see bills due in that period.</p>`;
        }
    }

    html += `</div></div>`; // Close Upcoming Bills card
    // --- End of Upcoming Bills Section ---

    container.innerHTML = html;

    renderCalendarBody(calendarYear, calendarMonth);

    document.getElementById('prev-month')?.addEventListener('click', () => navigateCalendar(container, 'prev'));
    document.getElementById('next-month')?.addEventListener('click', () => navigateCalendar(container, 'next'));
}

// ... (renderCalendarBody, navigateCalendar, renderIncomeTracker, renderIncomeList, deleteIncome - SAME AS BEFORE) ...
function renderCalendarBody(year, month) {
    const calendarBody = document.querySelector('.calendar-body');
    if (!calendarBody) return;
    let html = '';
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    const currentDate = new Date();

    for (let i = 0; i < firstDayOfMonth; i++) { html += `<div class="calendar-day calendar-day-empty"></div>`; }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayBills = getBillsForDay(year, month, day);
        const hasUnpaidBills = dayBills.some(bill => !bill.paid);
        const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
        let dayClass = "calendar-day";
        if (hasUnpaidBills) dayClass += " calendar-day-has-bills";
        const isToday = year === currentDate.getFullYear() && month === currentDate.getMonth() && day === currentDate.getDate();
        if (isToday) dayClass += " calendar-day-today";

        html += `<div class="${dayClass}"><div class="calendar-day-number">${day}</div>`;
        if (dayBills.length > 0) {
            html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div>`;
            const shownBills = dayBills.slice(0, 2);
            html += `<div class="calendar-day-bills">`;
            shownBills.forEach(bill => {
                const isPaid = bill.paid;
                html += `<div class="calendar-day-bill ${isPaid ? 'bill-paid' : 'bill-unpaid'}" title="${bill.name}: ${formatCurrency(bill.amount)} (${isPaid ? 'Paid' : 'Unpaid'})">${bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : bill.name}</div>`;
            });
            if (dayBills.length > 2) { html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`; }
            html += `</div>`;
        }
        html += `</div>`;
    }
    calendarBody.innerHTML = html;
}
function navigateCalendar(container, direction) {
  let year = parseInt(container.dataset.calendarYear);
  let month = parseInt(container.dataset.calendarMonth);
  const newDate = direction === 'prev' ? getPreviousMonth(year, month) : getNextMonth(year, month);
  container.dataset.calendarYear = newDate.year;
  container.dataset.calendarMonth = newDate.month;
  document.getElementById('calendar-title').textContent = `${MONTH_NAMES[newDate.month]} ${newDate.year}`;
  renderCalendarBody(newDate.year, newDate.month);
}
function renderIncomeTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Income</h2>
      <div class="form-grid">
        <div><label class="form-label">Source</label><select id="income-source" class="form-select"><option value="Doctor Care">Doctor Care</option><option value="CORE">CORE</option><option value="Other">Other</option></select></div>
        <div id="custom-source-container" style="display: none;"><label class="form-label">Specify Source</label><input type="text" id="income-custom-source" class="form-input" placeholder="Income source"></div>
        <div><label class="form-label">Amount</label><input type="number" id="income-amount" class="form-input" placeholder="0.00" step="0.01"></div>
        <div><label class="form-label">Date</label><input type="date" id="income-date" class="form-input" value="${formatDateForInput(new Date())}"></div>
      </div>
      <div class="mt-4"><button id="add-income-btn" class="btn btn-green">Add Income</button></div>
    </div>
    <div class="card">
      <h2 class="card-title">Income History (${selectedFilterYear !== null ? MONTH_NAMES[selectedFilterMonth] + ' ' + selectedFilterYear : 'All Time'})</h2>
      <div id="income-list"><!-- Income entries will be added here --></div>
    </div>`;
  container.innerHTML = html;
  const sourceSelect = document.getElementById('income-source');
  const customSourceContainer = document.getElementById('custom-source-container');
  sourceSelect.addEventListener('change', function() { customSourceContainer.style.display = this.value === 'Other' ? 'block' : 'none'; });
  renderIncomeList();
  document.getElementById('add-income-btn').addEventListener('click', async function() {
    const source = sourceSelect.value; const customSource = document.getElementById('income-custom-source').value.trim();
    const amountInput = document.getElementById('income-amount'); const dateInput = document.getElementById('income-date');
    const amount = amountInput.value; const date = dateInput.value;
    if (!amount || !date) { alert('Please fill in amount and date.'); return; }
    if (isNaN(Number(amount)) || Number(amount) <= 0) { alert('Please enter a valid positive amount.'); return; }
    const finalSource = source === 'Other' ? (customSource || 'Other Income') : source;
    const newIncome = { id: generateId(), source: finalSource, amount: Number(amount), date: date };
    try {
      showLoading(); await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(newIncome.id).set(newIncome);
      incomes.push(newIncome); await logActivity(`Added income: ${finalSource} - ${formatCurrency(newIncome.amount)}`, 'income', { id: newIncome.id, source: newIncome.source, amount: newIncome.amount, date: newIncome.date });
      sourceSelect.value = 'Doctor Care'; customSourceContainer.style.display = 'none'; document.getElementById('income-custom-source').value = ''; amountInput.value = ''; dateInput.value = formatDateForInput(new Date());
      hideLoading(); renderIncomeList();
    } catch (error) { hideLoading(); console.error("Error adding income:", error); alert("Failed to add income. Please try again."); }
  });
}
function renderIncomeList() {
  const container = document.getElementById('income-list'); if (!container) return;
  const filteredIncomes = filterDataByMonth(incomes, 'date');
  if (filteredIncomes.length > 0) {
    let html = `<div class="overflow-x-auto"><table class="w-full"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Source</th><th class="p-2 text-gray-300">Date</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300">Actions</th></tr></thead><tbody>`;
    const sortedIncomes = filteredIncomes.sort((a, b) => { try { const dateA = new Date(Date.UTC(...a.date.split('-').map((n, i) => i === 1 ? n - 1 : n))); const dateB = new Date(Date.UTC(...b.date.split('-').map((n, i) => i === 1 ? n - 1 : n))); return dateB - dateA; } catch { return 0; }});
    sortedIncomes.forEach(income => { html += `<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300">${income.source}</td><td class="p-2 text-gray-300">${formatDate(income.date)}</td><td class="p-2 text-right text-green-300">${formatCurrency(income.amount)}</td><td class="p-2 text-center"><button class="text-red-400 hover:text-red-300 px-2 py-1" onclick="deleteIncome('${income.id}')">Delete</button></td></tr>`; });
    html += `</tbody></table></div>`; container.innerHTML = html;
  } else { container.innerHTML = `<p class="text-gray-400 p-4">No income entries found for this period.</p>`; }
}
async function deleteIncome(id) {
  if (!currentUser) return; if (!confirm("Are you sure you want to delete this income entry?")) return;
  const incomeIndex = incomes.findIndex(i => i.id === id); if (incomeIndex === -1) { console.warn("Income not found locally:", id); return; }
  const incomeToDelete = { ...incomes[incomeIndex] };
  try {
    showLoading(); await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete(); incomes.splice(incomeIndex, 1);
    await logActivity(`Deleted income: ${incomeToDelete.source} - ${formatCurrency(incomeToDelete.amount)}`, 'delete', { id: incomeToDelete.id, source: incomeToDelete.source });
    hideLoading(); renderIncomeList();
    if (document.getElementById('tab-dashboard').classList.contains('active')) { renderDashboard(contentDiv); }
  } catch (error) { hideLoading(); console.error("Error deleting income:", error); alert("Failed to delete income."); }
}


// ... (renderBillTracker, renderBillList, toggleBillPaid, deleteBill - SAME AS BEFORE) ...
function renderBillTracker(container) {
    let html = `
    <div class="card"><h2 class="card-title">Add New Bill</h2><div class="form-grid"><div><label class="form-label">Bill Name</label><input type="text" id="bill-name" class="form-input" placeholder="e.g., Rent, Netflix"></div><div><label class="form-label">Amount</label><input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01"></div><div><label class="form-label">Due Date</label><input type="date" id="bill-due-date" class="form-input" value="${formatDateForInput(new Date())}"></div></div><div class="mt-4 flex items-center mb-4"><input type="checkbox" id="bill-recurring" class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded"><label for="bill-recurring" class="form-label mb-0 cursor-pointer">Is this a recurring bill?</label></div><div id="recurrence-options" class="mb-4 space-y-2" style="display: none;"><label class="form-label">How often does it recur?</label><select id="recurrence-pattern" class="form-select"><option value="${RECURRENCE_PATTERNS.MONTHLY}">Monthly</option><option value="${RECURRENCE_PATTERNS.WEEKLY}">Weekly</option><option value="${RECURRENCE_PATTERNS.BIWEEKLY}">Bi-weekly (Every 2 Weeks)</option><option value="${RECURRENCE_PATTERNS.QUARTERLY}">Quarterly (Every 3 Months)</option><option value="${RECURRENCE_PATTERNS.YEARLY}">Yearly</option></select></div><div class="mt-4"><button id="add-bill-btn" class="btn btn-yellow">Add Bill</button></div></div>
    <div class="card"><h2 class="card-title">Bill List (${selectedFilterYear !== null ? MONTH_NAMES[selectedFilterMonth] + ' ' + selectedFilterYear : 'All Time'})</h2><div class="mb-4 flex justify-start items-center"><span class="mr-2 text-gray-400 font-medium">Filter:</span><div class="inline-flex rounded-md shadow-sm" role="group"><button id="show-all-bills" data-filter="all" class="bill-filter-btn px-4 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded-l-lg border border-gray-600 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-white active-filter">All</button><button id="show-unpaid-bills" data-filter="unpaid" class="bill-filter-btn px-4 py-1 text-sm font-medium text-gray-300 bg-gray-700 border-t border-b border-gray-600 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-white">Unpaid</button><button id="show-paid-bills" data-filter="paid" class="bill-filter-btn px-4 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded-r-lg border border-gray-600 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-white">Paid</button></div></div><div id="bill-list"><!-- Bill entries will be added here --></div></div>`;
    container.innerHTML = html;
    const recurringCheckbox = document.getElementById('bill-recurring'); const recurrenceOptionsDiv = document.getElementById('recurrence-options');
    recurringCheckbox.addEventListener('change', function() { recurrenceOptionsDiv.style.display = this.checked ? 'block' : 'none'; });
    document.querySelectorAll('.bill-filter-btn').forEach(button => { button.addEventListener('click', function() { document.querySelectorAll('.bill-filter-btn').forEach(btn => btn.classList.remove('active-filter', 'bg-gray-600')); this.classList.add('active-filter', 'bg-gray-600'); renderBillList(this.dataset.filter); }); });
    renderBillList('all');
    document.getElementById('add-bill-btn').addEventListener('click', async function() {
        const nameInput = document.getElementById('bill-name'); const amountInput = document.getElementById('bill-amount'); const dueDateInput = document.getElementById('bill-due-date'); const isRecurring = recurringCheckbox.checked; const recurrencePatternSelect = document.getElementById('recurrence-pattern');
        const name = nameInput.value.trim(); const amount = amountInput.value; const dueDate = dueDateInput.value;
        if (!name || !amount || !dueDate) { alert('Please fill in bill name, amount, and due date.'); return; }
        if (isNaN(Number(amount)) || Number(amount) <= 0) { alert('Please enter a valid positive amount.'); return; }
        const newBill = { id: generateId(), name: name, amount: Number(amount), dueDate: dueDate, paid: false, recurring: isRecurring, recurrencePattern: isRecurring ? recurrencePatternSelect.value : RECURRENCE_PATTERNS.NONE };
        try {
            showLoading(); await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(newBill.id).set(newBill); bills.push(newBill);
            await logActivity(`Added ${newBill.recurring ? 'recurring ' : ''}bill: ${newBill.name} - ${formatCurrency(newBill.amount)}`, 'bill', { id: newBill.id, name: newBill.name, recurring: newBill.recurring });
            nameInput.value = ''; amountInput.value = ''; dueDateInput.value = formatDateForInput(new Date()); recurringCheckbox.checked = false; recurrenceOptionsDiv.style.display = 'none'; recurrencePatternSelect.value = RECURRENCE_PATTERNS.MONTHLY;
            hideLoading(); renderBillList(document.querySelector('.bill-filter-btn.active-filter')?.dataset.filter || 'all');
        } catch (error) { hideLoading(); console.error("Error adding bill:", error); alert("Failed to add bill."); }
    });
}
function renderBillList(statusFilter = 'all') {
    const container = document.getElementById('bill-list'); if (!container) return;
    let monthFilteredBills = filterDataByMonth(bills, 'dueDate');
    let finalFilteredBills = monthFilteredBills;
    if (statusFilter === 'paid') finalFilteredBills = monthFilteredBills.filter(bill => bill.paid); else if (statusFilter === 'unpaid') finalFilteredBills = monthFilteredBills.filter(bill => !bill.paid);
    if (finalFilteredBills.length > 0) {
        let html = `<div class="overflow-x-auto"><table class="w-full"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Name</th><th class="p-2 text-gray-300">Due Date</th><th class="p-2 text-gray-300">Status</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300 min-w-[150px]">Actions</th></tr></thead><tbody>`;
        const sortedBills = finalFilteredBills.sort((a, b) => { try { const dateA = new Date(Date.UTC(...a.dueDate.split('-').map((n, i) => i === 1 ? n - 1 : n))); const dateB = new Date(Date.UTC(...b.dueDate.split('-').map((n, i) => i === 1 ? n - 1 : n))); return dateA - dateB; } catch { return 0;} });
        sortedBills.forEach(bill => {
            const recurringIcon = bill.recurring ? `<span class="ml-2 text-blue-300 recurring-icon" title="Recurring: ${bill.recurrencePattern}">↻</span>` : ''; const statusClass = bill.paid ? 'text-green-300 paid-indicator-yes' : 'text-yellow-300 paid-indicator-no'; const statusText = bill.paid ? 'Paid' : 'Unpaid';
            html += `<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300">${bill.name}${recurringIcon}</td><td class="p-2 text-gray-300">${formatDate(bill.dueDate)}</td><td class="p-2"><span class="${statusClass}">${statusText}</span></td><td class="p-2 text-right text-yellow-300">${formatCurrency(bill.amount)}</td><td class="p-2 text-center"><div class="flex justify-center items-center space-x-2">${!bill.paid ? `<button class="toggle-paid-btn mark-paid-btn" onclick="toggleBillPaid('${bill.id}', true)">Mark Paid</button>` : `<button class="toggle-paid-btn mark-unpaid-btn" onclick="toggleBillPaid('${bill.id}', false)">Mark Unpaid</button>`}<button class="text-red-400 hover:text-red-300 px-2 py-1" onclick="deleteBill('${bill.id}')">Delete</button></div></td></tr>`;
        });
        html += `</tbody></table></div>`; container.innerHTML = html;
    } else { const filterText = statusFilter !== 'all' ? statusFilter : ''; container.innerHTML = `<p class="text-gray-400 p-4">No ${filterText} bills found for this period.</p>`; }
}
async function toggleBillPaid(id, paidStatus) {
  if (!currentUser) return;
  const billIndex = bills.findIndex(b => b.id === id); if (billIndex === -1) { console.warn("Bill not found locally:", id); return; }
  const billToUpdate = bills[billIndex]; if (billToUpdate.paid === paidStatus) return;
  const activeFilterButton = document.querySelector('.bill-filter-btn.active-filter'); const statusFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';
  try {
    showLoading(); billToUpdate.paid = paidStatus; renderBillList(statusFilter); // Optimistic UI
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).update({ paid: paidStatus });
    await logActivity(`Marked bill '${billToUpdate.name}' as ${paidStatus ? 'Paid' : 'Unpaid'}`, 'bill', { id: billToUpdate.id, name: billToUpdate.name, paid: paidStatus });
    let nextBillCreated = false;
    if (paidStatus && billToUpdate.recurring && billToUpdate.recurrencePattern !== RECURRENCE_PATTERNS.NONE) {
        const nextBill = generateNextRecurringBill(billToUpdate);
        if (nextBill) {
            const exists = bills.some(b => b.name === nextBill.name && b.dueDate === nextBill.dueDate && b.id !== nextBill.id);
            if (!exists) {
                await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(nextBill.id).set(nextBill); bills.push(nextBill);
                await logActivity(`Generated next recurring bill: ${nextBill.name} for ${formatDate(nextBill.dueDate)}`, 'bill', { id: nextBill.id, name: nextBill.name }); nextBillCreated = true;
            } else { console.log("Next recurring bill already exists:", nextBill.name, nextBill.dueDate); }
        }
    }
    hideLoading(); if (nextBillCreated) { renderBillList(statusFilter); }
    if (document.getElementById('tab-dashboard').classList.contains('active')) { renderDashboard(contentDiv); }
  } catch (error) { billToUpdate.paid = !paidStatus; renderBillList(statusFilter); hideLoading(); console.error("Error updating bill status:", error); alert(`Failed to mark bill as ${paidStatus ? 'Paid' : 'Unpaid'}.`); }
}
async function deleteBill(id) {
  if (!currentUser) return; if (!confirm("Are you sure you want to delete this bill? This cannot be undone.")) return;
  const billIndex = bills.findIndex(b => b.id === id); if (billIndex === -1) { console.warn("Bill not found locally:", id); return; }
  const billToDelete = { ...bills[billIndex] };
  const activeFilterButton = document.querySelector('.bill-filter-btn.active-filter'); const statusFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';
  try {
    showLoading(); bills.splice(billIndex, 1); renderBillList(statusFilter); // Optimistic UI
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).delete();
    await logActivity(`Deleted bill: ${billToDelete.name} (${formatCurrency(billToDelete.amount)})`, 'delete', { id: billToDelete.id, name: billToDelete.name });
    hideLoading();
    if (document.getElementById('tab-dashboard').classList.contains('active')) { renderDashboard(contentDiv); }
  } catch (error) { bills.splice(billIndex, 0, billToDelete); renderBillList(statusFilter); hideLoading(); console.error("Error deleting bill:", error); alert("Failed to delete bill."); }
}


// ... (renderExpenseTracker, renderExpenseList, editExpenseNotes, saveExpenseNotes, hideEditNotesModal, deleteExpense - SAME AS BEFORE) ...
function renderExpenseTracker(container) {
    let html = `
    <div class="card"><h2 class="card-title">Add New Expense</h2><div class="form-grid"><div><label class="form-label">Category</label><select id="expense-category" class="form-select"><option value="">-- Select Category --</option><option value="Eating out">Eating out</option><option value="Groceries">Groceries</option><option value="Gas">Gas</option><option value="Kyliee">Kyliee</option><option value="Personal care">Personal care</option><option value="Shopping">Shopping</option><option value="Pets">Pets</option><option value="Gifts">Gifts</option><option value="Savings">Savings</option><option value="Entertainment">Entertainment</option><option value="Utilities">Utilities (non-bill)</option><option value="Transportation">Transportation (non-gas)</option><option value="Health">Health</option><option value="Other">Other</option></select></div><div><label class="form-label">Amount</label><input type="number" id="expense-amount" class="form-input" placeholder="0.00" step="0.01"></div><div><label class="form-label">Date</label><input type="date" id="expense-date" class="form-input" value="${formatDateForInput(new Date())}"></div></div><div class="mt-4"><label class="form-label" for="expense-notes">Notes (Optional)</label><textarea id="expense-notes" class="form-input h-20 resize-y" placeholder="e.g., Dinner with friends, Weekly groceries"></textarea></div><div class="mt-4"><button id="add-expense-btn" class="btn btn-red">Add Expense</button></div></div>
    <div class="card"><h2 class="card-title">Expense History (${selectedFilterYear !== null ? MONTH_NAMES[selectedFilterMonth] + ' ' + selectedFilterYear : 'All Time'})</h2><div id="expense-list"><!-- Expense entries will be added here --></div></div>`;
    container.innerHTML = html;
    renderExpenseList();
    document.getElementById('add-expense-btn').addEventListener('click', async function() {
        const categorySelect = document.getElementById('expense-category'); const amountInput = document.getElementById('expense-amount'); const dateInput = document.getElementById('expense-date'); const notesTextarea = document.getElementById('expense-notes');
        const category = categorySelect.value; const amount = amountInput.value; const date = dateInput.value; const notes = notesTextarea.value.trim();
        if (!category || !amount || !date) { alert('Please select a category and fill in amount and date.'); return; }
        if (isNaN(Number(amount)) || Number(amount) <= 0) { alert('Please enter a valid positive amount.'); return; }
        const newExpense = { id: generateId(), category: category, amount: Number(amount), date: date, notes: notes };
        try {
            showLoading(); await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(newExpense.id).set(newExpense); expenses.push(newExpense);
            await logActivity(`Added expense: ${category} - ${formatCurrency(newExpense.amount)}`, 'expense', { id: newExpense.id, category: newExpense.category, amount: newExpense.amount });
            categorySelect.value = ''; amountInput.value = ''; dateInput.value = formatDateForInput(new Date()); notesTextarea.value = '';
            hideLoading(); renderExpenseList();
        } catch (error) { hideLoading(); console.error("Error adding expense:", error); alert("Failed to add expense."); }
    });
}
function renderExpenseList() {
    const container = document.getElementById('expense-list'); if (!container) return;
    const filteredExpenses = filterDataByMonth(expenses, 'date');
    if (filteredExpenses.length > 0) {
        let html = `<div class="overflow-x-auto"><table class="w-full"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Category</th><th class="p-2 text-gray-300">Date</th><th class="p-2 text-gray-300">Notes</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300 min-w-[150px]">Actions</th></tr></thead><tbody>`;
        const sortedExpenses = filteredExpenses.sort((a, b) => { try { const dateA = new Date(Date.UTC(...a.date.split('-').map((n, i) => i === 1 ? n - 1 : n))); const dateB = new Date(Date.UTC(...b.date.split('-').map((n, i) => i === 1 ? n - 1 : n))); return dateB - dateA; } catch {return 0;} });
        sortedExpenses.forEach(expense => { const notesDisplay = expense.notes ? expense.notes : '-'; const amountClass = expense.category === 'Savings' ? 'savings-amount' : 'text-red-300'; html += `<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300">${expense.category}</td><td class="p-2 text-gray-300">${formatDate(expense.date)}</td><td class="p-2 text-gray-400"><div class="note-text" title="${expense.notes || ''}">${notesDisplay}</div></td><td class="p-2 text-right ${amountClass}">${formatCurrency(expense.amount)}</td><td class="p-2 text-center"><div class="flex justify-center items-center space-x-2"><button class="text-blue-400 hover:text-blue-300 px-2 py-1" onclick="editExpenseNotes('${expense.id}')">Edit Notes</button><button class="text-red-400 hover:text-red-300 px-2 py-1" onclick="deleteExpense('${expense.id}')">Delete</button></div></td></tr>`; });
        html += `</tbody></table></div>`; container.innerHTML = html;
    } else { container.innerHTML = `<p class="text-gray-400 p-4">No expense entries found for this period.</p>`; }
}
function editExpenseNotes(id) {
  const expense = expenses.find(e => e.id === id); if (!expense) return;
  const modal = document.getElementById('edit-notes-modal');
  document.getElementById('edit-expense-id').value = id; document.getElementById('edit-notes-category').textContent = expense.category; document.getElementById('edit-notes-amount').textContent = formatCurrency(expense.amount); document.getElementById('edit-notes-date').textContent = formatDate(expense.date); document.getElementById('edit-notes-textarea').value = expense.notes || '';
  modal.style.display = 'flex'; document.getElementById('edit-notes-textarea').focus();
}
async function saveExpenseNotes() {
  if (!currentUser) return;
  const id = document.getElementById('edit-expense-id').value; const newNotes = document.getElementById('edit-notes-textarea').value.trim();
  const expenseIndex = expenses.findIndex(e => e.id === id); if (expenseIndex === -1) { hideEditNotesModal(); return; }
  if (expenses[expenseIndex].notes === newNotes) { hideEditNotesModal(); return; }
  try {
    showLoading(); expenses[expenseIndex].notes = newNotes; hideEditNotesModal(); renderExpenseList(); // Optimistic UI
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).update({ notes: newNotes });
    await logActivity(`Updated notes for expense: ${expenses[expenseIndex].category}`, 'expense', { id: id, category: expenses[expenseIndex].category, notes: newNotes });
    hideLoading();
  } catch (error) { renderExpenseList(); hideLoading(); console.error("Error updating expense notes:", error); alert("Failed to update notes."); }
}
function hideEditNotesModal() {
  const modal = document.getElementById('edit-notes-modal'); if (modal) modal.style.display = 'none';
}
async function deleteExpense(id) {
  if (!currentUser) return; if (!confirm("Are you sure you want to delete this expense?")) return;
  const expenseIndex = expenses.findIndex(e => e.id === id); if (expenseIndex === -1) { console.warn("Expense not found locally:", id); return; }
  const expenseToDelete = { ...expenses[expenseIndex] };
  try {
    showLoading(); expenses.splice(expenseIndex, 1); renderExpenseList(); // Optimistic UI
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).delete();
    await logActivity(`Deleted expense: ${expenseToDelete.category} - ${formatCurrency(expenseToDelete.amount)}`, 'delete', { id: expenseToDelete.id, category: expenseToDelete.category });
    hideLoading();
    if (document.getElementById('tab-dashboard').classList.contains('active')) { renderDashboard(contentDiv); }
  } catch (error) { expenses.splice(expenseIndex, 0, expenseToDelete); renderExpenseList(); hideLoading(); console.error("Error deleting expense:", error); alert("Failed to delete expense."); }
}

// ... (Activity log functions - SAME AS BEFORE) ...
function showActivityLog() {
  const modal = document.getElementById('activity-log-modal'); const logContent = document.getElementById('activity-log-content');
  logContent.innerHTML = '';
  if (activityLog.length === 0) { logContent.innerHTML = `<p class="text-gray-400 text-center p-4">No recent activity recorded.</p>`; }
  else { let html = `<div class="space-y-3">`; activityLog.forEach(log => { html += `<div class="log-entry"><div class="log-date">${formatDateTime(log.timestamp)}</div><div class="log-action">${log.action || 'Unknown Action'}</div></div>`; }); html += `</div>`; logContent.innerHTML = html; }
  modal.style.display = 'flex';
}
function hideActivityLog() { document.getElementById('activity-log-modal').style.display = 'none'; }

// Initialize App (SAME AS BEFORE)
document.addEventListener('DOMContentLoaded', function() {
  auth.onAuthStateChanged(user => { if (user) { currentUser = user; showApp(); } else { currentUser = null; hideApp(); } });
  document.getElementById('login-button').addEventListener('click', () => { const email = document.getElementById('email-input').value; const password = document.getElementById('password-input').value; if (!email || !password) { showError('Please enter email and password.'); return; } loginUser(email, password); });
  document.getElementById('register-button').addEventListener('click', () => { const email = document.getElementById('email-input').value; const password = document.getElementById('password-input').value; if (!email || !password) { showError('Please enter email and password.'); return; } if (password.length < 6) { showError('Password must be at least 6 characters.'); return; } registerUser(email, password); });
  document.getElementById('password-input').addEventListener('keyup', function(event) { if (event.key === 'Enter') { document.getElementById('login-button').click(); } });
  monthFilterSelect.addEventListener('change', handleMonthFilterChange);
  document.addEventListener('keydown', function(event) { if (event.key === 'Escape') { hideActivityLog(); hideEditNotesModal(); } });
});

// Expose functions to global scope (SAME AS BEFORE)
window.changeTab = changeTab;
window.deleteIncome = deleteIncome;
window.deleteBill = deleteBill;
window.deleteExpense = deleteExpense;
window.showActivityLog = showActivityLog;
window.hideActivityLog = hideActivityLog;
window.logout = logout;
window.toggleBillPaid = toggleBillPaid;
window.editExpenseNotes = editExpenseNotes;
window.saveExpenseNotes = saveExpenseNotes;
window.hideEditNotesModal = hideEditNotesModal;
