// app.js
// Firebase Configuration
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
const VERSION = "2.4.0"; // Updated version
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

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const loginScreen = document.getElementById('login-screen');
const budgetApp = document.getElementById('budget-app');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');

// Show loading indicator
function showLoading() {
    loadingIndicator.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

// Show error message
function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
    setTimeout(() => {
        loginError.classList.add('hidden');
    }, 5000);
}

// Firebase Authentication functions
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
        incomes = [];
        bills = [];
        expenses = [];
        activityLog = [];
        hideApp();
    }).catch((error) => {
        console.error("Logout failed:", error);
    });
}

// Initialize user data with sample data
async function initializeUserData(userId) {
    try {
        const sampleIncomes = [
            { id: generateId(), source: "Doctor Care", amount: 1500, date: "2025-02-25" },
            { id: generateId(), source: "CORE", amount: 300, date: "2025-03-07" }
        ];
        const sampleBills = [
            { id: generateId(), name: "Rent", amount: 1200, dueDate: "2025-03-01", paid: false, recurring: true, recurrencePattern: RECURRENCE_PATTERNS.MONTHLY },
            { id: generateId(), name: "Internet", amount: 100, dueDate: "2025-03-11", paid: false, recurring: false, recurrencePattern: RECURRENCE_PATTERNS.NONE }
        ];
        const sampleExpenses = [
            { id: generateId(), category: "Groceries", amount: 120, date: "2025-03-05", notes: "Weekly grocery shopping" },
            { id: generateId(), category: "Shopping", amount: 45, date: "2025-03-01", notes: "New clothes" },
            { id: generateId(), category: "Savings", amount: 200, date: "2025-03-02", notes: "Monthly savings deposit" }
        ];

        const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).limit(1).get();
        if (incomesSnapshot.empty) {
            const batch = db.batch();
            sampleIncomes.forEach(item => batch.set(db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(item.id), item));
            sampleBills.forEach(item => batch.set(db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).doc(item.id), item));
            sampleExpenses.forEach(item => batch.set(db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).doc(item.id), item));
            const logEntry = { id: generateId(), timestamp: new Date().toISOString(), action: "Account created with sample data", type: "auth" };
            batch.set(db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(logEntry.id), logEntry);
            await batch.commit();
            console.log("User data initialized with samples.");
        } else {
            console.log("User data already exists. Skipping initialization.");
        }
    } catch (error) {
        console.error("Error initializing user data:", error);
    }
}

// Firestore data functions
async function loadData() {
    try {
        showLoading();
        if (!currentUser) { hideLoading(); return; }
        const userId = currentUser.uid;

        const [incomesSnap, billsSnap, expensesSnap, activityLogSnap] = await Promise.all([
            db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get(),
            db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).get(),
            db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get(),
            db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).orderBy('timestamp', 'desc').limit(50).get()
        ]);

        incomes = incomesSnap.docs.map(doc => doc.data());
        bills = billsSnap.docs.map(doc => ({
            ...doc.data(),
            paid: doc.data().paid ?? false,
            recurring: doc.data().recurring ?? false,
            recurrencePattern: doc.data().recurrencePattern || RECURRENCE_PATTERNS.NONE
        }));
        expenses = expensesSnap.docs.map(doc => ({
            ...doc.data(),
            notes: doc.data().notes || ""
        }));
        activityLog = activityLogSnap.docs.map(doc => doc.data());

        hideLoading();
        userEmailDisplay.textContent = currentUser.email;
        changeTab('dashboard'); // Load dashboard with current month data

    } catch (error) {
        console.error("Error loading data:", error);
        hideLoading();
        showError("Failed to load data. Please try again.");
    }
}

// Log activity
async function logActivity(action, type, details = {}) {
    if (!currentUser) return;
    try {
        const userId = currentUser.uid;
        const newLog = { id: generateId(), timestamp: new Date().toISOString(), action, type, details };
        await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(newLog.id).set(newLog);
        activityLog.unshift(newLog);
        if (activityLog.length > 50) activityLog.pop();
        showSaveIndicator();
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}

// Generate next recurring bill based on recurrence pattern
function generateNextRecurringBill(bill) {
    if (!bill.dueDate || !bill.recurring || bill.recurrencePattern === RECURRENCE_PATTERNS.NONE) return null;

    const [year, month, day] = bill.dueDate.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null; // Invalid date guard

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

    newBill.dueDate = `${dueDate.getUTCFullYear()}-${String(dueDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dueDate.getUTCDate()).padStart(2, '0')}`;
    return newBill;
}

// Show the save indicator
function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    indicator.classList.add('visible');
    setTimeout(() => indicator.classList.remove('visible'), 2000);
}

// Generate a unique ID
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// UI functions
function showApp() {
    loginScreen.style.display = 'none';
    budgetApp.style.display = 'block';
    loadData();
}

function hideApp() {
    budgetApp.style.display = 'none';
    loginScreen.style.display = 'block';
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
    loginError.classList.add('hidden');
}

// Format helpers
function formatCurrency(amount) {
    const numericAmount = Number(amount);
    return isNaN(numericAmount) ? "$0.00" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numericAmount);
}

function formatDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return "Invalid Date";
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return "Invalid Date";
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Invalid Date";
    }
}

function formatDateTime(dateString) {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US');
    } catch (e) { return "Invalid Timestamp"; }
}

// Calendar helper functions
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function getPreviousMonth(year, month) { return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }; }
function getNextMonth(year, month) { return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }; }

// Helper to check if a date string (YYYY-MM-DD) falls within a given year and month (0-indexed)
function isDateInMonth(dateString, year, month) {
    if (!dateString) return false;
    const [itemYear, itemMonth] = dateString.split('-').map(Number);
    return itemYear === year && (itemMonth - 1) === month;
}

// --- MODIFIED: Calculate totals for a specific month ---
function calculateTotals(year, month) {
    // Filter data for the given month and year
    const monthlyIncomes = incomes.filter(item => isDateInMonth(item.date, year, month));
    const monthlyBills = bills.filter(item => isDateInMonth(item.dueDate, year, month));
    const monthlyExpenses = expenses.filter(item => isDateInMonth(item.date, year, month));

    const totalIncome = monthlyIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Calculate total for unpaid bills *due in this month*
    const totalUnpaidBills = monthlyBills
        .filter(bill => !bill.paid)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totalExpenses = monthlyExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Balance considers income, unpaid bills, and expenses *for this specific month*
    const balance = totalIncome - totalUnpaidBills - totalExpenses;

    // Calculate total savings *for this specific month*
    const totalSavings = monthlyExpenses
        .filter(expense => expense.category === "Savings")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Also calculate total paid bills *for this specific month* (optional, but can be useful)
     const totalPaidBills = monthlyBills
        .filter(bill => bill.paid)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);


    return {
        totalIncome,
        totalBills: totalUnpaidBills, // Represents unpaid bills due in this month
        totalExpenses,
        balance,
        totalSavings,
        totalPaidBills // Added this for potential future use
     };
}

// --- MODIFIED: Group expenses by category for a specific month ---
function getExpensesByCategory(year, month) {
    const monthlyExpenses = expenses.filter(item => isDateInMonth(item.date, year, month));
    const result = {};
    monthlyExpenses.forEach(expense => {
        const category = expense.category || "Uncategorized";
        result[category] = (result[category] || 0) + Number(expense.amount || 0);
    });
    return result;
}

// Change tab function
function changeTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const activeTabElement = document.getElementById(`tab-${tabName}`);
    if (activeTabElement) {
        activeTabElement.classList.add('active');
    } else {
        console.warn(`Tab element not found: tab-${tabName}`);
        document.getElementById('tab-dashboard')?.classList.add('active');
        tabName = 'dashboard';
    }

    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = ''; // Clear previous content

    // Render the correct content based on the tab
    if (tabName === 'dashboard') {
        // --- MODIFIED: Pass current year/month for initial dashboard load ---
        const currentDate = new Date();
        renderDashboard(contentDiv, currentDate.getFullYear(), currentDate.getMonth());
    } else if (tabName === 'income') {
        renderIncomeTracker(contentDiv);
    } else if (tabName === 'bills') {
        renderBillTracker(contentDiv);
    } else if (tabName === 'expenses') {
        renderExpenseTracker(contentDiv);
    }
}

// --- MODIFIED: Render dashboard for a specific month ---
function renderDashboard(container, year, month) { // Added year, month parameters
    // Calculate totals and expenses *for the given month*
    const { totalIncome, totalBills, totalExpenses, balance, totalSavings } = calculateTotals(year, month);
    const expensesByCategory = getExpensesByCategory(year, month);

    // Store the currently displayed month and year in the dataset
    if (container) {
        container.dataset.calendarYear = year;
        container.dataset.calendarMonth = month; // month is 0-indexed
    } else {
        console.error("Dashboard container not found.");
        return;
    }

    let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary for ${MONTH_NAMES[month]} ${year}</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <h3 class="stat-label income-label">Income</h3>
          <p class="stat-value income-value">${formatCurrency(totalIncome)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label bills-label">Unpaid Bills Due</h3>
          <p class="stat-value bills-value">${formatCurrency(totalBills)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label expenses-label">Expenses</h3>
          <p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label balance-label">Est. Net</h3>
          <p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">
            ${formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Savings for ${MONTH_NAMES[month]} ${year}</h2>
      <div class="stat-card w-full">
        <h3 class="stat-label savings-label">Total Savings</h3>
        <p class="stat-value savings-value">${formatCurrency(totalSavings)}</p>
      </div>
    </div>

    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title m-0">Calendar View</h2>
        <div class="flex items-center">
          <button id="prev-month" class="calendar-nav-btn">❮</button>
          <h3 id="calendar-title" class="text-gray-300 mx-4 font-semibold">${MONTH_NAMES[month]} ${year}</h3>
          <button id="next-month" class="calendar-nav-btn">❯</button>
        </div>
      </div>
      <div id="bills-calendar" class="calendar-container">
        <div class="calendar-header">
          ${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        </div>
        <div class="calendar-body">
          ${generateCalendarDays(year, month)}
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Expense Breakdown for ${MONTH_NAMES[month]} ${year}</h2>
      <div class="space-y-3">
  `;

    const totalMonthlyExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);

    if (Object.keys(expensesByCategory).length > 0 && totalMonthlyExpenseAmount > 0) {
        Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a).forEach(([category, amount]) => {
            const percentage = (amount / totalMonthlyExpenseAmount) * 100;
            const progressBarColor = category === 'Savings' ? '#3b82f6' : '#059669';
            html += `
            <div>
              <div class="flex justify-between mb-1">
                <span class="font-medium text-gray-300">${category}</span>
                <span class="text-gray-300">
                  ${formatCurrency(amount)} (${percentage.toFixed(1)}%)
                </span>
              </div>
              <div class="progress-container">
                <div class="progress-bar" style="width: ${percentage}%; background-color: ${progressBarColor};"></div>
              </div>
            </div>
          `;
        });
    } else {
        html += `<p class="text-gray-400">No expense data for ${MONTH_NAMES[month]} ${year}.</p>`;
    }

    html += `
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Bills Due in ${MONTH_NAMES[month]} ${year}</h2>
      <div class="space-y-3">
  `;

    // --- Filter bills due in the selected month ---
    const billsDueThisMonth = bills
        .filter(bill => isDateInMonth(bill.dueDate, year, month))
        .sort((a, b) => {
            // Sort by due date within the month
            try {
                const dayA = parseInt((a.dueDate || '').split('-')[2], 10);
                const dayB = parseInt((b.dueDate || '').split('-')[2], 10);
                 if (isNaN(dayA) || isNaN(dayB)) return 0;
                return dayA - dayB;
            } catch { return 0; }
        });

    if (billsDueThisMonth.length > 0) {
        billsDueThisMonth.forEach(bill => {
            const recurringIcon = bill.recurring ? `<span class="ml-2 text-blue-300 recurring-icon" title="Recurring: ${bill.recurrencePattern}">↻</span>` : '';
            const isPaid = bill.paid;
            html += `
            <div class="flex justify-between items-center border-b border-gray-700 pb-2">
              <div>
                <div class="font-medium text-gray-300">
                  ${bill.name || 'Unnamed Bill'}${recurringIcon}
                </div>
                <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
              </div>
              <div class="flex items-center">
                <div class="${isPaid ? 'text-green-300' : 'text-yellow-300'} font-medium mr-4">${formatCurrency(bill.amount)}</div>
                 ${!isPaid ? `
                    <button class="toggle-paid-btn mark-paid-btn" onclick="toggleBillPaid('${bill.id}', true)">
                      Mark Paid
                    </button>
                  ` : `
                    <span class="text-sm paid-indicator-yes">(Paid)</span>
                    <button class="ml-2 toggle-paid-btn mark-unpaid-btn text-xs" onclick="toggleBillPaid('${bill.id}', false)">
                      Unpay
                    </button>
                 `}
              </div>
            </div>
          `;
        });
    } else {
        html += `<p class="text-gray-400">No bills due in ${MONTH_NAMES[month]} ${year}.</p>`;
    }
    // --- End of Bills Due This Month section ---

    html += `
      </div>
    </div>
  `;

    container.innerHTML = html;

    // Re-attach event listeners for calendar navigation
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => navigateCalendar(container, 'prev'));
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => navigateCalendar(container, 'next'));
    }
}


// Generate calendar days HTML (no changes needed here, uses year/month passed to it)
function generateCalendarDays(year, month) {
    let html = '';
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month); // 0 = Sunday
    const currentDate = new Date();
    const todayYear = currentDate.getFullYear();
    const todayMonth = currentDate.getMonth();
    const todayDay = currentDate.getDate();

    for (let i = 0; i < firstDayOfMonth; i++) html += `<div class="calendar-day calendar-day-empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dayBills = bills.filter(bill => bill.dueDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        const hasUnpaidBills = dayBills.some(bill => !bill.paid);
        const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

        let dayClass = "calendar-day";
        if (hasUnpaidBills) dayClass += " calendar-day-has-bills";
        if (year === todayYear && month === todayMonth && day === todayDay) dayClass += " calendar-day-today";

        html += `<div class="${dayClass}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">
                  <div class="calendar-day-number">${day}</div>`;
        if (dayBills.length > 0) {
            html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div>
                     <div class="calendar-day-bills">`;
            dayBills.slice(0, 2).forEach(bill => {
                html += `<div class="calendar-day-bill ${bill.paid ? 'bill-paid' : 'bill-unpaid'}" title="${bill.name}: ${formatCurrency(bill.amount)} (${bill.paid ? 'Paid' : 'Unpaid'})">
                          ${bill.name && bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : (bill.name || 'Bill')}
                        </div>`;
            });
            if (dayBills.length > 2) html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`;
            html += `</div>`;
        }
        html += `</div>`;
    }

    const totalCells = firstDayOfMonth + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) html += `<div class="calendar-day calendar-day-empty"></div>`;

    return html;
}

// --- MODIFIED: Navigate the calendar AND re-render the dashboard ---
function navigateCalendar(container, direction) {
    if (!container || !container.dataset || container.dataset.calendarYear === undefined || container.dataset.calendarMonth === undefined) {
        console.error("Cannot navigate calendar: container or dataset missing.");
        return;
    }
    let year = parseInt(container.dataset.calendarYear, 10);
    let month = parseInt(container.dataset.calendarMonth, 10); // 0-indexed

    if (isNaN(year) || isNaN(month)) {
        console.error("Invalid year/month in calendar dataset:", container.dataset.calendarYear, container.dataset.calendarMonth);
        const now = new Date(); year = now.getFullYear(); month = now.getMonth();
    }

    if (direction === 'prev') { ({ year, month } = getPreviousMonth(year, month)); }
    else if (direction === 'next') { ({ year, month } = getNextMonth(year, month)); }

    // --- Re-render the entire dashboard for the new month/year ---
    renderDashboard(container, year, month);
}


// Render income tracker (no changes needed for month selection)
function renderIncomeTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Income</h2>
      <form id="add-income-form">
        <div class="form-grid">
          <div>
            <label for="income-source" class="form-label">Source</label>
            <select id="income-source" class="form-select" required>
              <option value="Doctor Care">Doctor Care</option>
              <option value="CORE">CORE</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div id="custom-source-container" style="display: none;">
            <label for="income-custom-source" class="form-label">Specify Source</label>
            <input type="text" id="income-custom-source" class="form-input" placeholder="Income source">
          </div>
          <div>
            <label for="income-amount" class="form-label">Amount</label>
            <input type="number" id="income-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required>
          </div>
          <div>
            <label for="income-date" class="form-label">Date</label>
            <input type="date" id="income-date" class="form-input" required>
          </div>
        </div>
        <div class="mt-4">
          <button type="submit" id="add-income-btn" class="btn btn-green">Add Income</button>
        </div>
      </form>
    </div>
    <div class="card">
      <h2 class="card-title">Income History (All Time)</h2>
      <div id="income-list" class="mt-4"></div>
    </div>
  `;
  container.innerHTML = html;

  const sourceSelect = document.getElementById('income-source');
  const customSourceContainer = document.getElementById('custom-source-container');
  const customSourceInput = document.getElementById('income-custom-source');
  sourceSelect.addEventListener('change', function() {
    const isOther = this.value === 'Other';
    customSourceContainer.style.display = isOther ? 'block' : 'none';
    customSourceInput.required = isOther;
  });

  renderIncomeList(); // Shows all-time income

  document.getElementById('add-income-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const sourceValue = sourceSelect.value;
    const customSourceValue = customSourceInput.value.trim();
    const amountValue = document.getElementById('income-amount').value;
    const dateValue = document.getElementById('income-date').value;
    if (sourceValue === 'Other' && !customSourceValue) { alert('Please specify the source.'); return; }
    const finalSource = sourceValue === 'Other' ? customSourceValue : sourceValue;
    const newIncome = { id: generateId(), source: finalSource, amount: Number(amountValue), date: dateValue };

    if (!currentUser) { alert("Not logged in."); return; }
    try {
      showLoading();
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(newIncome.id).set(newIncome);
      incomes.push(newIncome);
      await logActivity(`Added income: ${finalSource} - ${formatCurrency(newIncome.amount)}`, 'income', newIncome);
      this.reset(); customSourceContainer.style.display = 'none';
      hideLoading();
      renderIncomeList();
      // No need to update dashboard from here unless specifically desired
    } catch (error) {
      hideLoading(); console.error("Error adding income:", error); alert("Failed to add income.");
    }
  });
}

// Render income list (shows all time)
function renderIncomeList() {
  const container = document.getElementById('income-list'); if(!container) return;
  if (incomes.length > 0) {
    let html = `<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Source</th><th class="p-2 text-gray-300">Date</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300">Actions</th></tr></thead><tbody>`;
    const sortedIncomes = [...incomes].sort((a, b) => (new Date(b.date) - new Date(a.date))); // Simplistic sort, assumes valid dates
    sortedIncomes.forEach(income => {
      html += `<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300">${income.source || 'N/A'}</td><td class="p-2 text-gray-300">${formatDate(income.date)}</td><td class="p-2 text-right text-green-300 font-medium">${formatCurrency(income.amount)}</td><td class="p-2 text-center"><button class="text-red-400 hover:text-red-300 text-xs px-2 py-1" onclick="deleteIncome('${income.id}')">Delete</button></td></tr>`;
    });
    html += `</tbody></table></div>`; container.innerHTML = html;
  } else { container.innerHTML = `<p class="text-gray-400 text-center">No income entries yet.</p>`; }
}

// Delete income
async function deleteIncome(id) {
  if (!currentUser || !confirm("Delete this income entry?")) return;
  try {
    showLoading();
    const incomeToDelete = incomes.find(i => i.id === id);
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete();
    incomes = incomes.filter(i => i.id !== id);
    const logAction = incomeToDelete ? `Deleted income: ${incomeToDelete.source} - ${formatCurrency(incomeToDelete.amount)}` : `Deleted income (ID: ${id})`;
    await logActivity(logAction, 'delete', incomeToDelete || { id });
    hideLoading();
    renderIncomeList();
    // Re-render dashboard ONLY if it's the active tab and needs update for the *currently viewed month*
    const dashboardTab = document.getElementById('tab-dashboard');
    if(dashboardTab.classList.contains('active') && incomeToDelete && isDateInMonth(incomeToDelete.date, parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth))) {
         renderDashboard(document.getElementById('content'), parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth));
    }
  } catch (error) { hideLoading(); console.error("Error deleting income:", error); alert("Failed to delete income."); }
}

// Render bill tracker (no changes needed for month selection)
function renderBillTracker(container) {
    let html = `
    <div class="card">
      <h2 class="card-title">Add New Bill</h2>
      <form id="add-bill-form">
        <div class="form-grid">
          <div><label for="bill-name" class="form-label">Bill Name</label><input type="text" id="bill-name" class="form-input" placeholder="e.g., Rent" required></div>
          <div><label for="bill-amount" class="form-label">Amount</label><input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required></div>
          <div><label for="bill-due-date" class="form-label">Due Date</label><input type="date" id="bill-due-date" class="form-input" required></div>
        </div>
        <div class="mt-4 flex items-center mb-4"><input type="checkbox" id="bill-recurring" class="mr-2 h-4 w-4 accent-blue-500"><label for="bill-recurring" class="form-label mb-0 cursor-pointer">Recurring Bill</label></div>
        <div id="recurrence-options" class="mb-4" style="display: none;"><label for="recurrence-pattern" class="form-label">Recurrence Pattern</label><select id="recurrence-pattern" class="form-select"><option value="${RECURRENCE_PATTERNS.MONTHLY}">Monthly</option><option value="${RECURRENCE_PATTERNS.WEEKLY}">Weekly</option><option value="${RECURRENCE_PATTERNS.BIWEEKLY}">Bi-weekly</option><option value="${RECURRENCE_PATTERNS.QUARTERLY}">Quarterly</option><option value="${RECURRENCE_PATTERNS.YEARLY}">Yearly</option></select></div>
        <div class="mt-4"><button type="submit" id="add-bill-btn" class="btn btn-yellow">Add Bill</button></div>
      </form>
    </div>
    <div class="card">
      <h2 class="card-title">Bill List (All Time)</h2>
      <div class="mb-4"><div class="flex border border-gray-600 rounded overflow-hidden"><button id="show-all-bills" class="bg-gray-700 text-white px-3 py-1 hover:bg-gray-600 active-filter">All</button><button id="show-unpaid-bills" class="bg-gray-700 text-white px-3 py-1 border-l border-r border-gray-600 hover:bg-gray-600">Unpaid</button><button id="show-paid-bills" class="bg-gray-700 text-white px-3 py-1 hover:bg-gray-600">Paid</button></div></div>
      <div id="bill-list" class="mt-4"></div>
    </div>
  `;
  container.innerHTML = html;

  const recurringCheckbox = document.getElementById('bill-recurring');
  const recurrenceOptions = document.getElementById('recurrence-options');
  const recurrenceSelect = document.getElementById('recurrence-pattern');
  recurringCheckbox.addEventListener('change', function() { recurrenceOptions.style.display = this.checked ? 'block' : 'none'; recurrenceSelect.required = this.checked; });

  const filterButtons = container.querySelectorAll('#show-all-bills, #show-unpaid-bills, #show-paid-bills');
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      filterButtons.forEach(btn => btn.classList.remove('active-filter')); this.classList.add('active-filter');
      let filterType = this.id.replace('show-', '').replace('-bills', ''); renderBillList(filterType);
    });
  });

  renderBillList('all'); // Shows all-time bills by default

  document.getElementById('add-bill-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const nameValue = document.getElementById('bill-name').value.trim();
    const amountValue = document.getElementById('bill-amount').value;
    const dueDateValue = document.getElementById('bill-due-date').value;
    const isRecurring = recurringCheckbox.checked;
    const recurrencePatternValue = isRecurring ? recurrenceSelect.value : RECURRENCE_PATTERNS.NONE;
    const newBill = { id: generateId(), name: nameValue, amount: Number(amountValue), dueDate: dueDateValue, paid: false, recurring: isRecurring, recurrencePattern: recurrencePatternValue };

    if (!currentUser) { alert("Not logged in."); return; }
    try {
      showLoading();
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(newBill.id).set(newBill);
      bills.push(newBill);
      await logActivity(`Added ${isRecurring ? 'recurring' : ''} bill: ${nameValue} - ${formatCurrency(newBill.amount)}`, 'bill', newBill);
      this.reset(); recurrenceOptions.style.display = 'none';
      hideLoading();
      const currentFilter = document.querySelector('.active-filter')?.id.replace('show-', '').replace('-bills', '') || 'all';
      renderBillList(currentFilter);
        // Conditional dashboard update if the new bill falls in the currently viewed month
        const dashboardTab = document.getElementById('tab-dashboard');
        if(dashboardTab.classList.contains('active') && isDateInMonth(newBill.dueDate, parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth))) {
             renderDashboard(document.getElementById('content'), parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth));
        }
    } catch (error) { hideLoading(); console.error("Error adding bill:", error); alert("Failed to add bill."); }
  });
}

// Render bill list (shows all time, filtered by paid status)
function renderBillList(filter = 'all') {
  const container = document.getElementById('bill-list'); if (!container) return;
  let filteredBills = [...bills];
  if (filter === 'paid') filteredBills = filteredBills.filter(bill => bill.paid);
  else if (filter === 'unpaid') filteredBills = filteredBills.filter(bill => !bill.paid);

  if (filteredBills.length > 0) {
    let html = `<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Bill Name</th><th class="p-2 text-gray-300">Due Date</th><th class="p-2 text-gray-300">Status</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300">Actions</th></tr></thead><tbody>`;
    const sortedBills = filteredBills.sort((a, b) => (new Date(a.dueDate) - new Date(b.dueDate))); // Sort oldest first
    sortedBills.forEach(bill => {
      const recurringIcon = bill.recurring ? `<span class="ml-1 text-blue-300 recurring-icon text-xs" title="Recurring: ${bill.recurrencePattern}">↻</span>` : '';
      const statusClass = bill.paid ? 'text-green-300 paid-indicator-yes' : 'text-yellow-300 paid-indicator-no';
      html += `<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300 flex items-center">${bill.name || 'Unnamed Bill'}${recurringIcon}</td><td class="p-2 text-gray-300">${formatDate(bill.dueDate)}</td><td class="p-2"><span class="${statusClass}">${bill.paid ? 'Paid' : 'Unpaid'}</span></td><td class="p-2 text-right text-yellow-300 font-medium">${formatCurrency(bill.amount)}</td><td class="p-2 text-center"><div class="flex justify-center items-center space-x-2">${!bill.paid ? `<button class="toggle-paid-btn mark-paid-btn text-xs" onclick="toggleBillPaid('${bill.id}', true)">Pay</button>` : `<button class="toggle-paid-btn mark-unpaid-btn text-xs" onclick="toggleBillPaid('${bill.id}', false)">Unpay</button>`}<button class="text-red-400 hover:text-red-300 text-xs px-1" onclick="deleteBill('${bill.id}')">Del</button></div></td></tr>`;
    });
    html += `</tbody></table></div>`; container.innerHTML = html;
  } else { container.innerHTML = `<p class="text-gray-400 text-center">No ${filter === 'all' ? '' : filter} bills found.</p>`; }
}

// Toggle bill paid status
async function toggleBillPaid(id, paidStatus) {
  if (!currentUser) { alert("Not logged in."); return; }
  try {
    showLoading();
    const billIndex = bills.findIndex(b => b.id === id);
    const bill = bills[billIndex] || { id: id, name: `Bill ID ${id}` }; // Placeholder for logging if local not found

    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).update({ paid: paidStatus });
    if (billIndex !== -1) bills[billIndex].paid = paidStatus;

    await logActivity(`Marked bill '${bill.name}' as ${paidStatus ? 'paid' : 'unpaid'}`, 'bill', { id: bill.id, name: bill.name, paid: paidStatus, amount: bill.amount });

    let nextBill = null;
    if (paidStatus && bill.recurring && bill.recurrencePattern !== RECURRENCE_PATTERNS.NONE) {
      nextBill = generateNextRecurringBill(bill);
      if (nextBill) {
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(nextBill.id).set(nextBill);
        bills.push(nextBill);
        await logActivity(`Generated next recurring bill: ${nextBill.name} due ${formatDate(nextBill.dueDate)}`, 'bill', nextBill);
      }
    }
    hideLoading();

    // Update bill list tab if active
    if (document.getElementById('tab-bills').classList.contains('active')) {
       const currentFilter = document.querySelector('#bill-list').closest('.card').querySelector('.active-filter')?.id.replace('show-', '').replace('-bills', '') || 'all';
       renderBillList(currentFilter);
    }
    // Update dashboard tab if active AND the changed/generated bill is relevant to the currently viewed month
    const dashboardTab = document.getElementById('tab-dashboard');
    if(dashboardTab.classList.contains('active')) {
        const displayedYear = parseInt(document.getElementById('content').dataset.calendarYear);
        const displayedMonth = parseInt(document.getElementById('content').dataset.calendarMonth);
        const billInDisplayedMonth = isDateInMonth(bill.dueDate, displayedYear, displayedMonth);
        const nextBillInDisplayedMonth = nextBill && isDateInMonth(nextBill.dueDate, displayedYear, displayedMonth);

        if (billInDisplayedMonth || nextBillInDisplayedMonth) {
             renderDashboard(document.getElementById('content'), displayedYear, displayedMonth);
        }
    }

  } catch (error) {
    hideLoading(); console.error("Error updating bill status:", error); alert(`Failed to update bill status.`);
    // Consider reverting local change on error: if (billIndex !== -1) bills[billIndex].paid = !paidStatus;
  }
}


// Delete bill
async function deleteBill(id) {
   if (!currentUser || !confirm("Delete this bill? This cannot be undone.")) return;
   try {
    showLoading();
    const billToDelete = bills.find(b => b.id === id);
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).delete();
    bills = bills.filter(b => b.id !== id);
    const logAction = billToDelete ? `Deleted bill: ${billToDelete.name} - ${formatCurrency(billToDelete.amount)}` : `Deleted bill (ID: ${id})`;
    await logActivity(logAction, 'delete', billToDelete || { id });
    hideLoading();

    // Update bill list tab if active
    if (document.getElementById('tab-bills').classList.contains('active')) {
       const currentFilter = document.querySelector('#bill-list').closest('.card').querySelector('.active-filter')?.id.replace('show-', '').replace('-bills', '') || 'all';
       renderBillList(currentFilter);
    }
    // Update dashboard if active and the deleted bill was in the viewed month
     const dashboardTab = document.getElementById('tab-dashboard');
    if(dashboardTab.classList.contains('active') && billToDelete && isDateInMonth(billToDelete.dueDate, parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth))) {
         renderDashboard(document.getElementById('content'), parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth));
    }

  } catch (error) { hideLoading(); console.error("Error deleting bill:", error); alert("Failed to delete bill."); }
}

// Render expense tracker (no changes needed for month selection)
function renderExpenseTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Expense</h2>
      <form id="add-expense-form">
        <div class="form-grid">
          <div><label for="expense-category" class="form-label">Category</label><select id="expense-category" class="form-select" required><option value="">-- Select --</option><option value="Eating out">Eating out</option><option value="Groceries">Groceries</option><option value="Gas">Gas</option><option value="Kyliee">Kyliee</option><option value="Personal care">Personal care</option><option value="Shopping">Shopping</option><option value="Pets">Pets</option><option value="Gifts">Gifts</option><option value="Savings">Savings</option><option value="Entertainment">Entertainment</option><option value="Utilities">Utilities</option><option value="Transportation">Transportation</option><option value="Healthcare">Healthcare</option><option value="Other">Other</option></select></div>
          <div><label for="expense-amount" class="form-label">Amount</label><input type="number" id="expense-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required></div>
          <div><label for="expense-date" class="form-label">Date</label><input type="date" id="expense-date" class="form-input" required></div>
        </div>
        <div class="mt-4"><label for="expense-notes" class="form-label">Notes (Optional)</label><textarea id="expense-notes" class="form-input h-20" placeholder="Details..."></textarea></div>
        <div class="mt-4"><button type="submit" id="add-expense-btn" class="btn btn-red">Add Expense</button></div>
      </form>
    </div>
    <div class="card">
      <h2 class="card-title">Expense History (All Time)</h2>
      <div id="expense-list" class="mt-4"></div>
    </div>
  `;
  container.innerHTML = html;
  renderExpenseList(); // Shows all-time expenses

  document.getElementById('add-expense-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const categoryValue = document.getElementById('expense-category').value;
    const amountValue = document.getElementById('expense-amount').value;
    const dateValue = document.getElementById('expense-date').value;
    const notesValue = document.getElementById('expense-notes').value.trim();
    const newExpense = { id: generateId(), category: categoryValue, amount: Number(amountValue), date: dateValue, notes: notesValue };

    if (!currentUser) { alert("Not logged in."); return; }
    try {
      showLoading();
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(newExpense.id).set(newExpense);
      expenses.push(newExpense);
      await logActivity(`Added expense: ${categoryValue} - ${formatCurrency(newExpense.amount)}`, 'expense', newExpense);
      this.reset(); hideLoading();
      renderExpenseList();
        // Conditional dashboard update
        const dashboardTab = document.getElementById('tab-dashboard');
        if(dashboardTab.classList.contains('active') && isDateInMonth(newExpense.date, parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth))) {
             renderDashboard(document.getElementById('content'), parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth));
        }
    } catch (error) { hideLoading(); console.error("Error adding expense:", error); alert("Failed to add expense."); }
  });
}

// Render expense list (shows all time)
function renderExpenseList() {
  const container = document.getElementById('expense-list'); if(!container) return;
  if (expenses.length > 0) {
    let html = `<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Category</th><th class="p-2 text-gray-300">Date</th><th class="p-2 text-gray-300">Notes</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300">Actions</th></tr></thead><tbody>`;
    const sortedExpenses = [...expenses].sort((a, b) => (new Date(b.date) - new Date(a.date)));
    sortedExpenses.forEach(expense => {
      const notesDisplay = expense.notes ? expense.notes : '-';
      const amountClass = expense.category === 'Savings' ? 'text-blue-300 savings-amount' : 'text-red-300';
      html += `<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300">${expense.category || 'N/A'}</td><td class="p-2 text-gray-300">${formatDate(expense.date)}</td><td class="p-2 text-gray-400"><div class="note-text" title="${expense.notes || ''}">${notesDisplay}</div></td><td class="p-2 text-right ${amountClass} font-medium">${formatCurrency(expense.amount)}</td><td class="p-2 text-center"><div class="flex justify-center space-x-2"><button class="text-blue-400 hover:text-blue-300 text-xs px-1" onclick="editExpenseNotes('${expense.id}')">Edit</button><button class="text-red-400 hover:text-red-300 text-xs px-1" onclick="deleteExpense('${expense.id}')">Del</button></div></td></tr>`;
    });
    html += `</tbody></table></div>`; container.innerHTML = html;
  } else { container.innerHTML = `<p class="text-gray-400 text-center">No expense entries yet.</p>`; }
}

// Edit expense notes
function editExpenseNotes(id) {
  const expense = expenses.find(e => e.id === id); if (!expense) { alert("Expense not found."); return; }
  const modal = document.getElementById('edit-notes-modal');
  const notesTextarea = document.getElementById('edit-notes-textarea');
  const expenseIdField = document.getElementById('edit-expense-id');
  notesTextarea.value = expense.notes || ''; expenseIdField.value = id;
  document.getElementById('edit-notes-category').textContent = expense.category || 'N/A';
  document.getElementById('edit-notes-amount').textContent = formatCurrency(expense.amount);
  document.getElementById('edit-notes-date').textContent = formatDate(expense.date);
  modal.style.display = 'flex'; notesTextarea.focus();
}

// Save updated notes
async function saveExpenseNotes() {
  if (!currentUser) { alert("Not logged in."); return; }
  const id = document.getElementById('edit-expense-id').value;
  const newNotes = document.getElementById('edit-notes-textarea').value.trim();
  const expenseIndex = expenses.findIndex(e => e.id === id); if (expenseIndex === -1) { alert("Expense not found locally."); hideEditNotesModal(); return; }
  const expense = expenses[expenseIndex];
  if (expense.notes === newNotes) { hideEditNotesModal(); return; } // No changes

  try {
    showLoading();
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).update({ notes: newNotes });
    expenses[expenseIndex].notes = newNotes;
    await logActivity(`Updated notes for expense: ${expense.category}`, 'expense', { id: expense.id, category: expense.category, notes: newNotes });
    hideLoading(); hideEditNotesModal();
    renderExpenseList(); // Refresh list
        // Conditional dashboard update
        const dashboardTab = document.getElementById('tab-dashboard');
        if(dashboardTab.classList.contains('active') && isDateInMonth(expense.date, parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth))) {
             renderDashboard(document.getElementById('content'), parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth));
        }
  } catch (error) { hideLoading(); console.error("Error updating notes:", error); alert("Failed to update notes."); }
}

// Hide edit notes modal
function hideEditNotesModal() {
  const modal = document.getElementById('edit-notes-modal'); if (modal) modal.style.display = 'none';
  const expenseIdField = document.getElementById('edit-expense-id'); if(expenseIdField) expenseIdField.value = '';
  const notesTextarea = document.getElementById('edit-notes-textarea'); if(notesTextarea) notesTextarea.value = '';
}

// Delete expense
async function deleteExpense(id) {
   if (!currentUser || !confirm("Delete this expense?")) return;
   try {
    showLoading();
    const expenseToDelete = expenses.find(e => e.id === id);
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).delete();
    expenses = expenses.filter(e => e.id !== id);
    const logAction = expenseToDelete ? `Deleted expense: ${expenseToDelete.category} - ${formatCurrency(expenseToDelete.amount)}` : `Deleted expense (ID: ${id})`;
    await logActivity(logAction, 'delete', expenseToDelete || { id });
    hideLoading();
    renderExpenseList();
        // Conditional dashboard update
        const dashboardTab = document.getElementById('tab-dashboard');
        if(dashboardTab.classList.contains('active') && expenseToDelete && isDateInMonth(expenseToDelete.date, parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth))) {
             renderDashboard(document.getElementById('content'), parseInt(document.getElementById('content').dataset.calendarYear), parseInt(document.getElementById('content').dataset.calendarMonth));
        }
  } catch (error) { hideLoading(); console.error("Error deleting expense:", error); alert("Failed to delete expense."); }
}

// Activity log functions
function showActivityLog() {
  const modal = document.getElementById('activity-log-modal'); const logContent = document.getElementById('activity-log-content'); if (!modal || !logContent) return;
  modal.style.display = 'flex';
  if (activityLog.length === 0) { logContent.innerHTML = `<p class="text-gray-400 text-center py-4">No activity recorded yet.</p>`; return; }
  let html = `<div class="space-y-2">`;
  activityLog.forEach(log => { html += `<div class="log-entry text-sm"><div class="log-date text-xs">${formatDateTime(log.timestamp)}</div><div class="log-action">${log.action || 'Unknown action'}</div></div>`; });
  html += `</div>`; logContent.innerHTML = html; logContent.scrollTop = 0;
}
function hideActivityLog() { const modal = document.getElementById('activity-log-modal'); if (modal) modal.style.display = 'none'; }

// Initialize App Listeners
function initializeApp() {
    auth.onAuthStateChanged(user => {
        if (user) { if (!currentUser || currentUser.uid !== user.uid) { currentUser = user; showApp(); } }
        else { if (currentUser) { currentUser = null; hideApp(); } }
    }, error => { console.error("Auth listener error:", error); showError("Authentication error."); hideLoading(); hideApp(); });

    document.getElementById('login-button')?.addEventListener('click', () => { const e = document.getElementById('email-input').value, p = document.getElementById('password-input').value; if (!e || !p) { showError('Email and password required'); return; } loginUser(e, p); });
    document.getElementById('register-button')?.addEventListener('click', () => { const e = document.getElementById('email-input').value, p = document.getElementById('password-input').value; if (!e || !p) { showError('Email and password required'); return; } if (p.length < 6) { showError('Password must be at least 6 characters'); return; } registerUser(e, p); });
    document.getElementById('password-input')?.addEventListener('keyup', (event) => { if (event.key === 'Enter' && document.getElementById('email-input').value) { document.getElementById('login-button').click(); } });

    window.addEventListener('click', (event) => { if (event.target === document.getElementById('activity-log-modal')) hideActivityLog(); if (event.target === document.getElementById('edit-notes-modal')) hideEditNotesModal(); });
    document.querySelector('#activity-log-modal .modal-close')?.addEventListener('click', hideActivityLog);
    document.querySelector('#edit-notes-modal .modal-close')?.addEventListener('click', hideEditNotesModal);
    document.querySelector('#edit-notes-modal button[onclick="hideEditNotesModal()"]')?.addEventListener('click', hideEditNotesModal); // Cancel button

    const appSubtitle = document.querySelector('.app-subtitle'); if(appSubtitle) appSubtitle.textContent = `v${VERSION}`;
}

document.addEventListener('DOMContentLoaded', initializeApp);

// Expose functions needed by inline handlers globally
window.changeTab = changeTab;
window.deleteIncome = deleteIncome; window.deleteBill = deleteBill; window.deleteExpense = deleteExpense;
window.showActivityLog = showActivityLog; window.hideActivityLog = hideActivityLog;
window.logout = logout;
window.toggleBillPaid = toggleBillPaid;
window.editExpenseNotes = editExpenseNotes; window.saveExpenseNotes = saveExpenseNotes; window.hideEditNotesModal = hideEditNotesModal;
// navigateCalendar is NOT exposed globally as it's only called from within renderDashboard's listeners
