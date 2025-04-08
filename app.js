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

// Data storage (Global source of truth)
let incomes = [];
let bills = [];
let expenses = [];
let activityLog = [];
let currentUser = null;

// State for current view
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth(); // 0-indexed (0 = January)
let currentActiveTab = 'dashboard'; // Track the active tab

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const loginScreen = document.getElementById('login-screen');
const budgetApp = document.getElementById('budget-app');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');
const contentDiv = document.getElementById('content');
const monthNavigation = document.getElementById('month-navigation');
const currentMonthDisplay = document.getElementById('current-month-display');

// --- Utility Functions ---

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

// Generate a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date (YYYY-MM-DD to locale string)
function formatDate(dateString) {
    if (!dateString) return "";
    try {
        // Handle YYYY-MM-DD format safely
        const [year, month, day] = dateString.split('-').map(Number);
        if (!year || !month || !day) return "Invalid Date";
        // Month is 1-based in string, Date constructor needs 0-based
        const date = new Date(Date.UTC(year, month - 1, day)); // Use UTC to avoid timezone shifts
        return date.toLocaleDateString(undefined, { timeZone: 'UTC' }); // Specify UTC timezone
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Invalid Date";
    }
}


// Format date and time (ISO string to locale string)
function formatDateTime(dateString) {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch (e) {
        console.error("Error formatting datetime:", dateString, e);
        return "Invalid DateTime";
    }
}

// Parse YYYY-MM-DD string to a Date object (at UTC midnight)
function parseDateString(dateString) {
    if (!dateString) return null;
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!year || !month || !day) return null;
        return new Date(Date.UTC(year, month - 1, day));
    } catch (e) {
        console.error("Error parsing date string:", dateString, e);
        return null;
    }
}

// --- Firebase Authentication Functions ---

async function registerUser(email, password) {
    try {
        showLoading();
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        await initializeUserData(currentUser.uid); // Initialize data on first registration
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
        // Data will be loaded in showApp via loadData()
        hideLoading();
        showApp();
    } catch (error) {
        hideLoading();
        showError(`Login failed: ${error.message}`);
    }
}

function logout() {
    auth.signOut().then(() => {
        // State change listener will handle UI update (hideApp)
    }).catch((error) => {
        console.error("Logout failed:", error);
        showError("Logout failed. Please try again.");
    });
}

// --- Firestore Data Functions ---

// Initialize user data with sample data ONLY if they don't have any
async function initializeUserData(userId) {
    try {
        const incomesRef = db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`);
        const incomesSnapshot = await incomesRef.limit(1).get();

        // Only initialize if the incomes collection is empty
        if (incomesSnapshot.empty) {
            console.log(`Initializing sample data for user ${userId}`);
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

            const batch = db.batch();
            sampleIncomes.forEach(item => batch.set(db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(item.id), item));
            sampleBills.forEach(item => batch.set(db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).doc(item.id), item));
            sampleExpenses.forEach(item => batch.set(db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).doc(item.id), item));

            // Initial activity log
            const activityLog = {
                id: generateId(),
                timestamp: new Date().toISOString(),
                action: "Account created with sample data",
                type: "auth"
            };
            batch.set(db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(activityLog.id), activityLog);

            await batch.commit();
            console.log(`Sample data initialized for user ${userId}`);
        } else {
            console.log(`User ${userId} already has data. Skipping initialization.`);
        }
    } catch (error) {
        console.error("Error initializing user data:", error);
    }
}

// Load all data for the current user
async function loadData() {
    if (!currentUser) {
        console.log("loadData called without current user.");
        hideApp(); // Ensure app is hidden if user is somehow null
        return;
    }

    showLoading();
    console.log("Loading data for user:", currentUser.uid);
    try {
        const userId = currentUser.uid;

        // Reset local arrays
        incomes = [];
        bills = [];
        expenses = [];
        activityLog = [];

        // Load Incomes
        const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get();
        incomes = incomesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load Bills
        const billsSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).get();
        bills = billsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ensure defaults
            paid: doc.data().paid !== undefined ? doc.data().paid : false,
            recurring: doc.data().recurring !== undefined ? doc.data().recurring : false,
            recurrencePattern: doc.data().recurrencePattern || RECURRENCE_PATTERNS.NONE
        }));

        // Load Expenses
        const expensesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get();
        expenses = expensesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ensure default
            notes: doc.data().notes || ""
        }));

        // Load Activity Log
        const activityLogSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        activityLog = activityLogSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Data loaded:", { incomes: incomes.length, bills: bills.length, expenses: expenses.length, activityLog: activityLog.length });

        // Set initial month/year and update UI
        const now = new Date();
        selectedYear = now.getFullYear();
        selectedMonth = now.getMonth(); // 0-indexed
        updateMonthNavigationUI();

        // Render the initially active tab (Dashboard) with the loaded data for the current month
        changeTab(currentActiveTab); // This will call the correct render function

    } catch (error) {
        console.error("Error loading data:", error);
        showError("Failed to load data. Please check your connection and try again.");
        // Optionally logout or show a more specific error
    } finally {
        hideLoading();
    }
}


// Log activity
async function logActivity(action, type, details = {}) {
    if (!currentUser) return;

    try {
        const userId = currentUser.uid;
        const newLog = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action,
            type,
            details: JSON.parse(JSON.stringify(details)) // Basic deep clone to avoid issues
        };

        // Add to Firestore
        await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(newLog.id).set(newLog);

        // Update local array (keep it sorted)
        activityLog.unshift(newLog);
        if (activityLog.length > 50) { // Limit local log size
            activityLog.pop();
        }

        showSaveIndicator(); // Indicate save

    } catch (error) {
        console.error("Error logging activity:", error);
    }
}

// Show the save indicator
function showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    indicator.classList.add('visible');
    setTimeout(() => {
        indicator.classList.remove('visible');
    }, 2000);
}

// --- Data Filtering & Calculations for Selected Month ---

// Filters global data arrays for the specified month and year
function filterDataForMonth(year, month) { // month is 0-indexed
    const filteredIncomes = incomes.filter(item => {
        const itemDate = parseDateString(item.date);
        return itemDate && itemDate.getUTCFullYear() === year && itemDate.getUTCMonth() === month;
    });

    const filteredBills = bills.filter(item => {
        const itemDate = parseDateString(item.dueDate);
        return itemDate && itemDate.getUTCFullYear() === year && itemDate.getUTCMonth() === month;
    });

    const filteredExpenses = expenses.filter(item => {
        const itemDate = parseDateString(item.date);
        return itemDate && itemDate.getUTCFullYear() === year && itemDate.getUTCMonth() === month;
    });

    return {
        incomes: filteredIncomes,
        bills: filteredBills,
        expenses: filteredExpenses
    };
}

// Calculate totals for a given set of filtered data
function calculateTotals(filteredData) {
    const totalIncome = filteredData.incomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalUnpaidBills = filteredData.bills
        .filter(bill => !bill.paid)
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const balance = totalIncome - totalUnpaidBills - totalExpenses; // Balance considers unpaid bills for the month
    const totalPaidBills = filteredData.bills
        .filter(bill => bill.paid)
        .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalSavings = filteredData.expenses
        .filter(expense => expense.category === "Savings")
        .reduce((sum, item) => sum + Number(item.amount), 0);

    return { totalIncome, totalUnpaidBills, totalExpenses, balance, totalPaidBills, totalSavings };
}

// Group expenses by category for a given set of filtered expenses
function getExpensesByCategory(filteredExpenses) {
    const result = {};
    filteredExpenses.forEach(expense => {
        const category = expense.category;
        if (!result[category]) {
            result[category] = 0;
        }
        result[category] += Number(expense.amount);
    });
    return result;
}


// --- UI Rendering Functions (Using Filtered Data) ---

// Update the view for the currently selected tab and month
function updateCurrentTabView() {
    showLoading(); // Show loading while re-rendering
    // Get the currently active tab ID
    const activeTabElement = document.querySelector('.tab.active');
    if (activeTabElement) {
        currentActiveTab = activeTabElement.id.replace('tab-', '');
        console.log(`Updating view for tab: ${currentActiveTab}, Month: ${selectedMonth + 1}, Year: ${selectedYear}`);
        changeTab(currentActiveTab); // Re-render the active tab
    } else {
        console.warn("Could not find active tab element to update view.");
        changeTab('dashboard'); // Default to dashboard if something went wrong
    }
    hideLoading(); // Hide loading after rendering
}


// Change tab function
function changeTab(tabName) {
    console.log("Changing tab to:", tabName);
    currentActiveTab = tabName; // Update the tracking variable

    // Update active tab style
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTabElement = document.getElementById(`tab-${tabName}`);
    if(activeTabElement) {
         activeTabElement.classList.add('active');
    } else {
        console.error(`Tab element not found: tab-${tabName}`);
        // Fallback to dashboard if the requested tab doesn't exist
        document.getElementById('tab-dashboard').classList.add('active');
        currentActiveTab = 'dashboard';
        tabName = 'dashboard';
    }

    // Get data filtered for the currently selected month/year
    const filteredData = filterDataForMonth(selectedYear, selectedMonth);

    // Render content based on the tab
    contentDiv.innerHTML = ''; // Clear previous content
    showLoading(); // Show loader while rendering content

    try {
        switch (tabName) {
            case 'dashboard':
                renderDashboard(contentDiv, filteredData);
                break;
            case 'income':
                renderIncomeTracker(contentDiv, filteredData);
                break;
            case 'bills':
                renderBillTracker(contentDiv, filteredData);
                break;
            case 'expenses':
                renderExpenseTracker(contentDiv, filteredData);
                break;
            default:
                console.error("Unknown tab name:", tabName);
                renderDashboard(contentDiv, filterDataForMonth(selectedYear, selectedMonth)); // Default to dashboard
        }
    } catch (error) {
        console.error(`Error rendering tab ${tabName}:`, error);
        contentDiv.innerHTML = `<div class="text-red-400 p-4">Error rendering content. Please try refreshing.</div>`;
    } finally {
         hideLoading();
    }
}


// Render dashboard for the selected month
function renderDashboard(container, filteredData) {
    const { totalIncome, totalUnpaidBills, totalExpenses, balance, totalSavings } = calculateTotals(filteredData);
    const expensesByCategory = getExpensesByCategory(filteredData.expenses);

    // Use selectedYear and selectedMonth for the calendar
    const calendarYear = selectedYear;
    const calendarMonth = selectedMonth; // 0-indexed
    const currentDisplayDate = new Date(); // For 'today' highlighting

    let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary (${MONTH_NAMES[calendarMonth]} ${calendarYear})</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <h3 class="stat-label income-label">Income</h3>
          <p class="stat-value income-value">${formatCurrency(totalIncome)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label bills-label">Unpaid Bills Due</h3>
          <p class="stat-value bills-value">${formatCurrency(totalUnpaidBills)}</p> <!-- Renamed -->
        </div>
        <div class="stat-card">
          <h3 class="stat-label expenses-label">Expenses</h3>
          <p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label balance-label">Est. Month Balance</h3> <!-- Renamed -->
          <p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">
            ${formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Savings (${MONTH_NAMES[calendarMonth]} ${calendarYear})</h2>
      <div class="stat-card w-full savings-card"> <!-- Added savings-card class -->
        <h3 class="stat-label savings-label">Total Savings</h3> <!-- Added savings-label class -->
        <p class="stat-value savings-value">${formatCurrency(totalSavings)}</p> <!-- Added savings-value class -->
      </div>
    </div>

    <div class="card">
      <div class="flex justify-between items-center mb-4">
         <h2 class="card-title m-0">Bills Calendar (${MONTH_NAMES[calendarMonth]} ${calendarYear})</h2>
         <!-- Removed internal calendar nav buttons -->
      </div>
      <div id="bills-calendar" class="calendar-container">
        <div class="calendar-header">
          ${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        </div>
        <div class="calendar-body">
  `;

    // Generate calendar days for the selected month/year
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDayOfMonth = getFirstDayOfMonth(calendarYear, calendarMonth);

    for (let i = 0; i < firstDayOfMonth; i++) {
        html += `<div class="calendar-day calendar-day-empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        // Get bills due *specifically on this day* of the selected month/year
        const dayBills = getBillsForDay(calendarYear, calendarMonth, day); // Uses global bills array
        const hasUnpaidBills = dayBills.some(bill => !bill.paid);
        const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount), 0);

        let dayClass = "calendar-day";
        if (hasUnpaidBills) dayClass += " calendar-day-has-bills";

        const isToday = calendarYear === currentDisplayDate.getFullYear() &&
                        calendarMonth === currentDisplayDate.getMonth() &&
                        day === currentDisplayDate.getDate();
        if (isToday) dayClass += " calendar-day-today";

        html += `<div class="${dayClass}">
                   <div class="calendar-day-number">${day}</div>`;

        if (dayBills.length > 0) {
            html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div>`;
            const shownBills = dayBills.slice(0, 2);
            html += `<div class="calendar-day-bills">`;
            shownBills.forEach(bill => {
                const isPaid = bill.paid;
                html += `<div class="calendar-day-bill ${isPaid ? 'bill-paid' : 'bill-unpaid'}"
                              title="${bill.name}: ${formatCurrency(bill.amount)} (${isPaid ? 'Paid' : 'Unpaid'})">
                           ${bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : bill.name}
                         </div>`;
            });
            if (dayBills.length > 2) {
                html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
    }
    html += `</div></div></div>`; // Close calendar body, container, card

    // Expense Breakdown for the month
    html += `
    <div class="card">
      <h2 class="card-title">Expense Breakdown (${MONTH_NAMES[calendarMonth]} ${calendarYear})</h2>
      <div class="space-y-3">
    `;
    const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (Object.keys(expensesByCategory).length > 0) {
        Object.entries(expensesByCategory).forEach(([category, amount]) => {
            const percentage = totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0;
            html += `
            <div>
              <div class="flex justify-between mb-1">
                <span class="font-medium text-gray-300">${category}</span>
                <span class="text-gray-300 ${category === 'Savings' ? 'savings-amount' : ''}">
                  ${formatCurrency(amount)} (${percentage.toFixed(1)}%)
                </span>
              </div>
              <div class="progress-container">
                <div class="progress-bar ${category === 'Savings' ? 'bg-blue-500' : 'bg-green-600' }" style="width: ${percentage}%"></div>
              </div>
            </div>`;
        });
    } else {
        html += `<p class="text-gray-400">No expense data for ${MONTH_NAMES[calendarMonth]} ${calendarYear}</p>`;
    }
    html += `</div></div>`; // Close expense breakdown card

    // Bills Due in this month (replaces upcoming bills)
    html += `
    <div class="card">
      <h2 class="card-title">Bills Due (${MONTH_NAMES[calendarMonth]} ${calendarYear})</h2>
      <div class="space-y-3">
    `;
    const billsDueThisMonth = filteredData.bills
      .sort((a, b) => parseDateString(a.dueDate) - parseDateString(b.dueDate)); // Sort by due date

    if (billsDueThisMonth.length > 0) {
        billsDueThisMonth.forEach(bill => {
            const recurringIcon = bill.recurring ? `<span class="ml-2 text-blue-300 recurring-icon" title="${bill.recurrencePattern}">↻</span>` : '';
            const isPaid = bill.paid;
            html += `
            <div class="flex justify-between items-center border-b border-gray-700 pb-2">
              <div>
                <div class="font-medium text-gray-300">
                  ${bill.name}${recurringIcon}
                </div>
                <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
              </div>
              <div class="flex items-center">
                 <span class="mr-4 ${isPaid ? 'paid-tag paid-tag-yes' : 'paid-tag paid-tag-no'}">
                    ${isPaid ? 'Paid' : 'Unpaid'}
                 </span>
                 <div class="text-yellow-300 font-medium mr-4">${formatCurrency(bill.amount)}</div>
                 ${!isPaid ? `
                    <button class="mark-paid-btn toggle-paid-btn" onclick="toggleBillPaid('${bill.id}', true)">
                      Mark Paid
                    </button>
                 ` : `
                    <button class="mark-unpaid-btn toggle-paid-btn" onclick="toggleBillPaid('${bill.id}', false)">
                      Mark Unpaid
                    </button>
                 `}
              </div>
            </div>
          `;
        });
    } else {
        html += `<p class="text-gray-400">No bills due in ${MONTH_NAMES[calendarMonth]} ${calendarYear}</p>`;
    }
    html += `</div></div>`; // Close bills due card

    container.innerHTML = html;
}


// Render income tracker for the selected month
function renderIncomeTracker(container, filteredData) {
    let html = `
    <div class="card">
      <h2 class="card-title">Add New Income</h2>
      <div class="form-grid">
        <div>
          <label class="form-label">Source</label>
          <select id="income-source" class="form-select">
            <option value="Doctor Care">Doctor Care</option>
            <option value="CORE">CORE</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div id="custom-source-container" style="display: none;">
          <label class="form-label">Specify Source</label>
          <input type="text" id="income-custom-source" class="form-input" placeholder="Income source">
        </div>
        <div>
          <label class="form-label">Amount</label>
          <input type="number" id="income-amount" class="form-input" placeholder="0.00" step="0.01">
        </div>
        <div>
          <label class="form-label">Date</label>
          <input type="date" id="income-date" class="form-input">
        </div>
      </div>
      <div class="mt-4">
        <button id="add-income-btn" class="btn btn-green">Add Income</button>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Income History (${MONTH_NAMES[selectedMonth]} ${selectedYear})</h2>
      <div id="income-list">
        <!-- Income entries for the selected month will be added here -->
      </div>
    </div>
  `;
    container.innerHTML = html;

    // Setup form interactions
    const sourceSelect = document.getElementById('income-source');
    const customSourceContainer = document.getElementById('custom-source-container');
    sourceSelect.addEventListener('change', function () {
        customSourceContainer.style.display = this.value === 'Other' ? 'block' : 'none';
    });

    // Render income list for the selected month
    renderIncomeList(filteredData.incomes); // Pass filtered incomes

    // Add income button event
    document.getElementById('add-income-btn').addEventListener('click', async () => {
        const source = sourceSelect.value;
        const customSource = document.getElementById('income-custom-source').value.trim();
        const amount = document.getElementById('income-amount').value;
        const date = document.getElementById('income-date').value;

        if (!amount || !date) {
            alert('Please enter Amount and Date.');
            return;
        }
        if (parseDateString(date) === null) {
             alert('Invalid Date selected.');
             return;
        }

        const finalSource = source === 'Other' ? (customSource || 'Other Income') : source;
        const newIncome = {
            id: generateId(),
            source: finalSource,
            amount: Number(amount),
            date: date // Store as YYYY-MM-DD
        };

        try {
            showLoading();
            await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(newIncome.id).set(newIncome);
            incomes.push(newIncome); // Add to global list
            await logActivity(`Added income: ${finalSource} - ${formatCurrency(newIncome.amount)}`, 'income', newIncome);

            // Reset form
            sourceSelect.value = 'Doctor Care';
            document.getElementById('income-custom-source').value = '';
            document.getElementById('income-amount').value = '';
            document.getElementById('income-date').value = '';
            customSourceContainer.style.display = 'none';

            // Re-render the list for the current month
            updateCurrentTabView();

        } catch (error) {
            console.error("Error adding income:", error);
            alert("Failed to add income. Please try again.");
        } finally {
            hideLoading();
        }
    });
}

// Render income list using the provided filtered income data
function renderIncomeList(monthlyIncomes) {
    const listContainer = document.getElementById('income-list');
    if (!listContainer) return; // Exit if container not found

    if (monthlyIncomes.length > 0) {
        let html = `
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left border-b border-gray-700">
                <th class="p-2 text-gray-300">Source</th>
                <th class="p-2 text-gray-300">Date</th>
                <th class="p-2 text-right text-gray-300">Amount</th>
                <th class="p-2 text-center text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
        // Sort by date (newest first)
        const sortedIncomes = [...monthlyIncomes].sort((a, b) => parseDateString(b.date) - parseDateString(a.date));

        sortedIncomes.forEach(income => {
            html += `
          <tr class="border-b border-gray-700 hover:bg-gray-700">
            <td class="p-2 text-gray-300">${income.source}</td>
            <td class="p-2 text-gray-300">${formatDate(income.date)}</td>
            <td class="p-2 text-right text-green-300">${formatCurrency(income.amount)}</td>
            <td class="p-2 text-center">
              <button class="text-red-400 hover:text-red-300 px-2 py-1 text-sm" onclick="deleteIncome('${income.id}')">
                Delete
              </button>
            </td>
          </tr>
        `;
        });
        html += `</tbody></table></div>`;
        listContainer.innerHTML = html;
    } else {
        listContainer.innerHTML = `<p class="text-gray-400 italic text-center py-4">No income recorded for ${MONTH_NAMES[selectedMonth]} ${selectedYear}</p>`;
    }
}


// Delete income
async function deleteIncome(id) {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to delete this income record?")) return;


    const incomeToDelete = incomes.find(i => i.id === id);
    if (!incomeToDelete) {
        console.error("Income not found for deletion:", id);
        return;
    }

    try {
        showLoading();
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete();
        incomes = incomes.filter(i => i.id !== id); // Remove from global list
        await logActivity(`Deleted income: ${incomeToDelete.source} - ${formatCurrency(incomeToDelete.amount)}`, 'delete', incomeToDelete);

        // Re-render the current view
        updateCurrentTabView();

    } catch (error) {
        console.error("Error deleting income:", error);
        alert("Failed to delete income. Please try again.");
    } finally {
        hideLoading();
    }
}

// Render bill tracker for the selected month
function renderBillTracker(container, filteredData) {
    let html = `
    <div class="card">
      <h2 class="card-title">Add New Bill</h2>
       <div class="form-grid">
        <div>
          <label class="form-label">Bill Name</label>
          <input type="text" id="bill-name" class="form-input" placeholder="e.g., Rent, Netflix">
        </div>
        <div>
          <label class="form-label">Amount</label>
          <input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01">
        </div>
        <div>
          <label class="form-label">Due Date</label>
          <input type="date" id="bill-due-date" class="form-input">
        </div>
      </div>
      <div class="mt-4 flex items-center mb-2">
        <input type="checkbox" id="bill-recurring" class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded">
        <label for="bill-recurring" class="form-label mb-0 text-sm">Is this a recurring bill?</label>
      </div>
      <div id="recurrence-options" class="mb-4 pl-6" style="display: none;">
        <label class="form-label text-sm">How often does it recur?</label>
        <select id="recurrence-pattern" class="form-select form-select-sm text-sm">
          <option value="${RECURRENCE_PATTERNS.MONTHLY}">Monthly</option>
          <option value="${RECURRENCE_PATTERNS.WEEKLY}">Weekly</option>
          <option value="${RECURRENCE_PATTERNS.BIWEEKLY}">Bi-weekly (Every 2 Weeks)</option>
          <option value="${RECURRENCE_PATTERNS.QUARTERLY}">Quarterly (Every 3 Months)</option>
          <option value="${RECURRENCE_PATTERNS.YEARLY}">Yearly</option>
        </select>
      </div>
      <div class="mt-4">
        <button id="add-bill-btn" class="btn btn-yellow">Add Bill</button>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Bills Due (${MONTH_NAMES[selectedMonth]} ${selectedYear})</h2>
      <div class="mb-4">
         <div class="bill-tab-container"> <!-- Changed class -->
            <button id="show-all-bills" data-filter="all" class="bill-tab active-filter">All</button> <!-- Changed class -->
            <button id="show-unpaid-bills" data-filter="unpaid" class="bill-tab">Unpaid</button> <!-- Changed class -->
            <button id="show-paid-bills" data-filter="paid" class="bill-tab">Paid</button> <!-- Changed class -->
          </div>
      </div>
      <div id="bill-list">
        <!-- Bill entries for the selected month will be added here -->
      </div>
    </div>
  `;
    container.innerHTML = html;

    // Setup form interactions
    const recurringCheckbox = document.getElementById('bill-recurring');
    const recurrenceOptions = document.getElementById('recurrence-options');
    recurringCheckbox.addEventListener('change', function () {
        recurrenceOptions.style.display = this.checked ? 'block' : 'none';
    });

    // Add filter button listeners
    document.querySelectorAll('.bill-tab').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.bill-tab').forEach(btn => btn.classList.remove('active-filter'));
            this.classList.add('active-filter');
            const filter = this.getAttribute('data-filter');
            renderBillList(filteredData.bills, filter); // Re-render list with new filter
        });
    });

    // Render initial bill list (all) for the selected month
    renderBillList(filteredData.bills, 'all');

    // Add bill button event
    document.getElementById('add-bill-btn').addEventListener('click', async () => {
        const name = document.getElementById('bill-name').value.trim();
        const amount = document.getElementById('bill-amount').value;
        const dueDate = document.getElementById('bill-due-date').value;
        const recurring = document.getElementById('bill-recurring').checked;
        const recurrencePattern = recurring
            ? document.getElementById('recurrence-pattern').value
            : RECURRENCE_PATTERNS.NONE;

        if (!name || !amount || !dueDate) {
            alert('Please enter Bill Name, Amount, and Due Date.');
            return;
        }
         if (parseDateString(dueDate) === null) {
             alert('Invalid Due Date selected.');
             return;
        }

        const newBill = {
            id: generateId(),
            name: name,
            amount: Number(amount),
            dueDate: dueDate, // Store as YYYY-MM-DD
            paid: false,
            recurring: recurring,
            recurrencePattern: recurrencePattern
        };

        try {
            showLoading();
            await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(newBill.id).set(newBill);
            bills.push(newBill); // Add to global list
            await logActivity(`Added ${recurring ? 'recurring ' : ''}bill: ${name} - ${formatCurrency(newBill.amount)}`, 'bill', newBill);

            // Reset form
            document.getElementById('bill-name').value = '';
            document.getElementById('bill-amount').value = '';
            document.getElementById('bill-due-date').value = '';
            document.getElementById('bill-recurring').checked = false;
            document.getElementById('recurrence-pattern').value = RECURRENCE_PATTERNS.MONTHLY;
            recurrenceOptions.style.display = 'none';

            // Re-render the view for the current month/tab
            updateCurrentTabView();

        } catch (error) {
            console.error("Error adding bill:", error);
            alert("Failed to add bill. Please try again.");
        } finally {
            hideLoading();
        }
    });
}

// Render bill list using provided filtered bill data and status filter
function renderBillList(monthlyBills, filter = 'all') {
    const listContainer = document.getElementById('bill-list');
     if (!listContainer) return; // Exit if container not found

    let billsToDisplay = [...monthlyBills]; // Use the passed monthly bills

    // Apply paid/unpaid filter
    if (filter === 'paid') {
        billsToDisplay = billsToDisplay.filter(bill => bill.paid);
    } else if (filter === 'unpaid') {
        billsToDisplay = billsToDisplay.filter(bill => !bill.paid);
    }
    // 'all' uses all monthlyBills

    if (billsToDisplay.length > 0) {
        let html = `
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left border-b border-gray-700">
                <th class="p-2 text-gray-300 text-sm">Name</th>
                <th class="p-2 text-gray-300 text-sm">Due Date</th>
                <th class="p-2 text-gray-300 text-sm">Status</th>
                <th class="p-2 text-right text-gray-300 text-sm">Amount</th>
                <th class="p-2 text-center text-gray-300 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
        // Sort by due date
        const sortedBills = billsToDisplay.sort((a, b) => parseDateString(a.dueDate) - parseDateString(b.dueDate));

        sortedBills.forEach(bill => {
            const recurringIcon = bill.recurring ? `<span class="ml-1 text-blue-300 recurring-icon text-xs" title="${bill.recurrencePattern}">↻</span>` : '';
            const isPaid = bill.paid;
            html += `
          <tr class="border-b border-gray-700 hover:bg-gray-700">
            <td class="p-2 text-gray-300 text-sm">${bill.name}${recurringIcon}</td>
            <td class="p-2 text-gray-300 text-sm">${formatDate(bill.dueDate)}</td>
            <td class="p-2 text-sm">
               <span class="${isPaid ? 'paid-tag paid-tag-yes' : 'paid-tag paid-tag-no'}">
                ${isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </td>
            <td class="p-2 text-right text-yellow-300 text-sm">${formatCurrency(bill.amount)}</td>
            <td class="p-2 text-center">
              <div class="flex justify-center items-center space-x-2">
                ${!isPaid ? `
                  <button class="mark-paid-btn toggle-paid-btn" onclick="toggleBillPaid('${bill.id}', true)">
                    Mark Paid
                  </button>
                ` : `
                  <button class="mark-unpaid-btn toggle-paid-btn" onclick="toggleBillPaid('${bill.id}', false)">
                    Mark Unpaid
                  </button>
                `}
                <button class="text-red-400 hover:text-red-300 text-xs" onclick="deleteBill('${bill.id}')">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
        });
        html += `</tbody></table></div>`;
        listContainer.innerHTML = html;
    } else {
        listContainer.innerHTML = `<p class="text-gray-400 italic text-center py-4">No ${filter !== 'all' ? filter : ''} bills due in ${MONTH_NAMES[selectedMonth]} ${selectedYear}</p>`;
    }
}


// Toggle bill paid status
async function toggleBillPaid(id, paidStatus) {
    if (!currentUser) return;

    const billIndex = bills.findIndex(b => b.id === id);
    if (billIndex === -1) {
        console.error("Bill not found for toggling status:", id);
        return;
    }
    const bill = bills[billIndex];

    try {
        showLoading();
        // Update Firestore
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).update({ paid: paidStatus });

        // Update local global data
        bill.paid = paidStatus;

        await logActivity(`Marked bill ${bill.name} as ${paidStatus ? 'paid' : 'unpaid'}`, 'bill', bill);

        // Handle recurring bill generation IF marking as paid
        if (paidStatus && bill.recurring && bill.recurrencePattern !== RECURRENCE_PATTERNS.NONE) {
            const nextBill = generateNextRecurringBill(bill);
            if (nextBill) {
                 // Check if a bill with the same name and *next* due date already exists (prevent duplicates)
                const nextDueDateStr = nextBill.dueDate;
                const exists = bills.some(b => b.name === nextBill.name && b.dueDate === nextDueDateStr);

                if (!exists) {
                    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(nextBill.id).set(nextBill);
                    bills.push(nextBill); // Add to global list
                    await logActivity(`Generated next recurring bill: ${nextBill.name} due ${formatDate(nextBill.dueDate)}`, 'bill', nextBill);
                } else {
                     console.log(`Next recurring bill for ${nextBill.name} on ${nextDueDateStr} already exists. Skipping creation.`);
                     await logActivity(`Skipped generating duplicate recurring bill: ${nextBill.name} due ${formatDate(nextBill.dueDate)}`, 'bill_info', nextBill);
                }
            }
        }

        // Re-render the current view to reflect changes
        updateCurrentTabView();

    } catch (error) {
        console.error("Error updating bill paid status:", error);
        // Revert local change on error? Maybe not necessary if Firestore fails.
        alert("Failed to update bill status. Please try again.");
    } finally {
        hideLoading();
    }
}


// Delete bill
async function deleteBill(id) {
    if (!currentUser) return;
     if (!confirm("Are you sure you want to delete this bill? This cannot be undone.")) return;

    const billToDelete = bills.find(b => b.id === id);
    if (!billToDelete) {
        console.error("Bill not found for deletion:", id);
        return;
    }

    try {
        showLoading();
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).delete();
        bills = bills.filter(b => b.id !== id); // Remove from global list
        await logActivity(`Deleted bill: ${billToDelete.name} - ${formatCurrency(billToDelete.amount)}`, 'delete', billToDelete);

        // Re-render the current view
        updateCurrentTabView();

    } catch (error) {
        console.error("Error deleting bill:", error);
        alert("Failed to delete bill. Please try again.");
    } finally {
        hideLoading();
    }
}

// Render expense tracker for the selected month
function renderExpenseTracker(container, filteredData) {
    let html = `
    <div class="card">
      <h2 class="card-title">Add New Expense</h2>
      <div class="form-grid">
        <div>
          <label class="form-label">Category</label>
          <select id="expense-category" class="form-select">
            <option value="">-- Select Category --</option>
            <option value="Eating out">Eating out</option>
            <option value="Groceries">Groceries</option>
            <option value="Gas">Gas</option>
            <option value="Kyliee">Kyliee</option>
            <option value="Personal care">Personal care</option>
            <option value="Shopping">Shopping</option>
            <option value="Pets">Pets</option>
            <option value="Gifts">Gifts</option>
            <option value="Savings">Savings</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label class="form-label">Amount</label>
          <input type="number" id="expense-amount" class="form-input" placeholder="0.00" step="0.01">
        </div>
        <div>
          <label class="form-label">Date</label>
          <input type="date" id="expense-date" class="form-input">
        </div>
      </div>
      <div class="mt-4">
        <label class="form-label">Notes (Optional)</label>
        <textarea id="expense-notes" class="form-input h-20" placeholder="e.g., Dinner with friends, Weekly groceries"></textarea>
      </div>
      <div class="mt-4">
        <button id="add-expense-btn" class="btn btn-red">Add Expense</button>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Expense History (${MONTH_NAMES[selectedMonth]} ${selectedYear})</h2>
      <div id="expense-list">
        <!-- Expense entries for the selected month will be added here -->
      </div>
    </div>
  `;
    container.innerHTML = html;

    // Render expense list for the selected month
    renderExpenseList(filteredData.expenses); // Pass filtered expenses

    // Add expense button event
    document.getElementById('add-expense-btn').addEventListener('click', async () => {
        const category = document.getElementById('expense-category').value;
        const amount = document.getElementById('expense-amount').value;
        const date = document.getElementById('expense-date').value;
        const notes = document.getElementById('expense-notes').value.trim();

        if (!category || !amount || !date) {
            alert('Please select Category and enter Amount and Date.');
            return;
        }
        if (parseDateString(date) === null) {
             alert('Invalid Date selected.');
             return;
        }


        const newExpense = {
            id: generateId(),
            category: category,
            amount: Number(amount),
            date: date, // Store as YYYY-MM-DD
            notes: notes
        };

        try {
            showLoading();
            await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(newExpense.id).set(newExpense);
            expenses.push(newExpense); // Add to global list
            await logActivity(`Added expense: ${category} - ${formatCurrency(newExpense.amount)}`, 'expense', newExpense);

            // Reset form
            document.getElementById('expense-category').value = '';
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-date').value = '';
            document.getElementById('expense-notes').value = '';

            // Re-render the view for the current month/tab
            updateCurrentTabView();

        } catch (error) {
            console.error("Error adding expense:", error);
            alert("Failed to add expense. Please try again.");
        } finally {
            hideLoading();
        }
    });
}

// Render expense list using the provided filtered expense data
function renderExpenseList(monthlyExpenses) {
    const listContainer = document.getElementById('expense-list');
     if (!listContainer) return; // Exit if container not found

    if (monthlyExpenses.length > 0) {
        let html = `
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left border-b border-gray-700">
                <th class="p-2 text-gray-300 text-sm">Category</th>
                <th class="p-2 text-gray-300 text-sm">Date</th>
                <th class="p-2 text-gray-300 text-sm">Notes</th>
                <th class="p-2 text-right text-gray-300 text-sm">Amount</th>
                <th class="p-2 text-center text-gray-300 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
        // Sort by date (newest first)
        const sortedExpenses = [...monthlyExpenses].sort((a, b) => parseDateString(b.date) - parseDateString(a.date));

        sortedExpenses.forEach(expense => {
            const notesDisplay = expense.notes ? expense.notes : '-';
            // Apply specific color for Savings category amount
            const amountClass = expense.category === 'Savings' ? 'text-blue-300' : 'text-red-300';

            html += `
          <tr class="border-b border-gray-700 hover:bg-gray-700">
            <td class="p-2 text-gray-300 text-sm">${expense.category}</td>
            <td class="p-2 text-gray-300 text-sm">${formatDate(expense.date)}</td>
            <td class="p-2 text-gray-400 text-sm">
              <div class="note-text" title="${expense.notes}">${notesDisplay}</div>
            </td>
            <td class="p-2 text-right ${amountClass} text-sm">${formatCurrency(expense.amount)}</td>
            <td class="p-2 text-center">
              <div class="flex justify-center items-center space-x-2">
                <button class="text-blue-400 hover:text-blue-300 text-xs" onclick="editExpenseNotes('${expense.id}')">
                  Edit Notes
                </button>
                <button class="text-red-400 hover:text-red-300 text-xs" onclick="deleteExpense('${expense.id}')">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
        });
        html += `</tbody></table></div>`;
        listContainer.innerHTML = html;
    } else {
        listContainer.innerHTML = `<p class="text-gray-400 italic text-center py-4">No expenses recorded for ${MONTH_NAMES[selectedMonth]} ${selectedYear}</p>`;
    }
}


// Edit expense notes (Modal interaction)
function editExpenseNotes(id) {
    const expense = expenses.find(e => e.id === id); // Find in global list
    if (!expense) return;

    const modal = document.getElementById('edit-notes-modal');
    const notesTextarea = document.getElementById('edit-notes-textarea');
    const expenseIdField = document.getElementById('edit-expense-id');

    notesTextarea.value = expense.notes || '';
    expenseIdField.value = id;

    // Display info in modal
    document.getElementById('edit-notes-category').textContent = expense.category;
    document.getElementById('edit-notes-amount').textContent = formatCurrency(expense.amount);
    document.getElementById('edit-notes-date').textContent = formatDate(expense.date);

    modal.style.display = 'flex';
    notesTextarea.focus();
}

// Save updated expense notes
async function saveExpenseNotes() {
    if (!currentUser) return;

    const id = document.getElementById('edit-expense-id').value;
    const newNotes = document.getElementById('edit-notes-textarea').value.trim();
    const expenseIndex = expenses.findIndex(e => e.id === id); // Find index in global list

    if (expenseIndex === -1) {
        console.error("Expense not found for saving notes:", id);
        hideEditNotesModal();
        return;
    }

    try {
        showLoading();
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).update({ notes: newNotes });

        // Update local global data
        expenses[expenseIndex].notes = newNotes;

        await logActivity(`Updated notes for expense: ${expenses[expenseIndex].category}`, 'expense', expenses[expenseIndex]);

        hideEditNotesModal();
        // Re-render the current view
        updateCurrentTabView();

    } catch (error) {
        hideLoading();
        console.error("Error updating expense notes:", error);
        alert("Failed to update notes. Please try again.");
    }
}

// Hide edit notes modal
function hideEditNotesModal() {
    const modal = document.getElementById('edit-notes-modal');
    if (modal) {
         modal.style.display = 'none';
    }
    document.getElementById('edit-expense-id').value = '';
    document.getElementById('edit-notes-textarea').value = '';
}

// Delete expense
async function deleteExpense(id) {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to delete this expense? This cannot be undone.")) return;


    const expenseToDelete = expenses.find(e => e.id === id); // Find in global list
    if (!expenseToDelete) {
        console.error("Expense not found for deletion:", id);
        return;
    }

    try {
        showLoading();
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).delete();
        expenses = expenses.filter(e => e.id !== id); // Remove from global list
        await logActivity(`Deleted expense: ${expenseToDelete.category} - ${formatCurrency(expenseToDelete.amount)}`, 'delete', expenseToDelete);

        // Re-render the current view
        updateCurrentTabView();

    } catch (error) {
        hideLoading();
        console.error("Error deleting expense:", error);
        alert("Failed to delete expense. Please try again.");
    }
}

// --- Month Navigation ---

function updateMonthNavigationUI() {
    if (currentMonthDisplay) {
        currentMonthDisplay.textContent = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    } else {
        console.error("currentMonthDisplay element not found");
    }
}

function goToPreviousMonth() {
    selectedMonth--;
    if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
    }
    updateMonthNavigationUI();
    updateCurrentTabView(); // Update content for the new month
}

function goToNextMonth() {
    selectedMonth++;
    if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
    }
    updateMonthNavigationUI();
    updateCurrentTabView(); // Update content for the new month
}

function goToCurrentMonth() {
    const now = new Date();
    selectedYear = now.getFullYear();
    selectedMonth = now.getMonth();
    updateMonthNavigationUI();
    updateCurrentTabView(); // Update content for the current month
}


// --- Activity Log Modal ---

function showActivityLog() {
    const modal = document.getElementById('activity-log-modal');
    const logContent = document.getElementById('activity-log-content');
    if (!modal || !logContent) return;

    modal.style.display = 'flex';

    if (activityLog.length === 0) {
        logContent.innerHTML = `<p class="text-gray-400 text-center italic py-4">No activity recorded yet</p>`;
        return;
    }

    let html = `<div class="space-y-2">`; // Reduced spacing
    activityLog.forEach(log => {
        html += `
        <div class="log-entry">
          <div class="log-date">${formatDateTime(log.timestamp)}</div>
          <div class="log-action text-sm text-gray-200">${log.action}</div>
          ${log.details && Object.keys(log.details).length > 0 ?
            `<details class="text-xs mt-1">
                <summary class="cursor-pointer text-gray-400 hover:text-gray-300">Details</summary>
                <pre class="text-gray-400 bg-gray-800 p-1 rounded text-xs overflow-auto">${JSON.stringify(log.details, null, 2)}</pre>
            </details>` : ''
          }
        </div>
      `;
    });
    html += `</div>`;
    logContent.innerHTML = html;
}

function hideActivityLog() {
    const modal = document.getElementById('activity-log-modal');
     if (modal) {
         modal.style.display = 'none';
     }
}


// --- App Initialization and State Changes ---

// Show the main budget app UI
function showApp() {
    console.log("Showing App UI");
    loginScreen.style.display = 'none';
    budgetApp.style.display = 'block';
    monthNavigation.style.display = 'flex'; // Show month navigation
    if (currentUser) {
        userEmailDisplay.textContent = currentUser.email;
        loadData(); // Load data which will then trigger initial render
    } else {
        // This case should ideally be handled by onAuthStateChanged redirecting to hideApp
        console.warn("showApp called but currentUser is null.");
        hideApp();
    }
}

// Hide the main budget app UI and show login
function hideApp() {
    console.log("Hiding App UI, showing Login");
    budgetApp.style.display = 'none';
    monthNavigation.style.display = 'none'; // Hide month navigation
    loginScreen.style.display = 'block';

    // Clear sensitive fields and reset state
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
    loginError.classList.add('hidden');
    loginError.textContent = '';
    incomes = [];
    bills = [];
    expenses = [];
    activityLog = [];
    currentUser = null;
    currentActiveTab = 'dashboard'; // Reset active tab state
     // Reset month to current time when logged out
    const now = new Date();
    selectedYear = now.getFullYear();
    selectedMonth = now.getMonth();

}

// Initial setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");

    // Firebase auth state change listener
    auth.onAuthStateChanged(user => {
        console.log("Auth state changed. User:", user ? user.uid : 'null');
        if (user) {
            currentUser = user;
            // Only show app if DOM is ready and user exists
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                 showApp();
            } else {
                // If DOM isn't ready yet, wait for load event
                window.addEventListener('load', showApp, { once: true });
            }
        } else {
            currentUser = null;
             if (document.readyState === 'complete' || document.readyState === 'interactive') {
                hideApp();
             } else {
                 window.addEventListener('load', hideApp, { once: true });
             }
        }
    });

    // Login/Register Button Listeners
    document.getElementById('login-button').addEventListener('click', () => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        if (!email || !password) { showError('Please enter email and password.'); return; }
        loginUser(email, password);
    });

    document.getElementById('register-button').addEventListener('click', () => {
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;
        if (!email || !password) { showError('Please enter email and password.'); return; }
        if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
        registerUser(email, password);
    });

    // Allow Enter key for login
    document.getElementById('password-input').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            document.getElementById('login-button').click();
        }
    });

    // Month Navigation Button Listeners
    document.getElementById('prev-month-btn').addEventListener('click', goToPreviousMonth);
    document.getElementById('next-month-btn').addEventListener('click', goToNextMonth);
    document.getElementById('current-month-btn').addEventListener('click', goToCurrentMonth);

    // Modal Close Listeners (ensure modals can be closed)
     document.getElementById('activity-log-modal').addEventListener('click', (e) => {
        if (e.target.id === 'activity-log-modal') hideActivityLog(); // Close if clicking background
    });
     document.getElementById('edit-notes-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-notes-modal') hideEditNotesModal(); // Close if clicking background
    });

});

// --- Calendar Helper Functions (moved down, less critical for core logic) ---

function getDaysInMonth(year, month) { // month is 0-indexed
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) { // month is 0-indexed
    // Returns 0 for Sunday, 1 for Monday, etc.
    return new Date(year, month, 1).getDay();
}

// Get bills *due on a specific day* (used by calendar)
// This function still uses the *global* bills array, as the calendar shows all bills for the day regardless of paid status
function getBillsForDay(year, month, day) { // month is 0-indexed
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bills.filter(bill => bill.dueDate === dateString);
}

// Generate the next recurring bill instance based on pattern
function generateNextRecurringBill(bill) {
    const currentDueDate = parseDateString(bill.dueDate);
    if (!currentDueDate || bill.recurrencePattern === RECURRENCE_PATTERNS.NONE) {
        return null; // Not a valid date or not recurring
    }

    const nextDueDate = new Date(currentDueDate.getTime()); // Clone the date

    switch (bill.recurrencePattern) {
        case RECURRENCE_PATTERNS.MONTHLY:
            nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1);
            break;
        case RECURRENCE_PATTERNS.WEEKLY:
            nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 7);
            break;
        case RECURRENCE_PATTERNS.BIWEEKLY:
            nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 14);
            break;
        case RECURRENCE_PATTERNS.QUARTERLY:
            nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 3);
            break;
        case RECURRENCE_PATTERNS.YEARLY:
            nextDueDate.setUTCFullYear(nextDueDate.getUTCFullYear() + 1);
            break;
        default:
            return null; // Unknown pattern
    }

     // Format the new due date back to YYYY-MM-DD
    const nextYear = nextDueDate.getUTCFullYear();
    const nextMonth = String(nextDueDate.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed -> 1-indexed
    const nextDay = String(nextDueDate.getUTCDate()).padStart(2, '0');
    const nextDueDateString = `${nextYear}-${nextMonth}-${nextDay}`;


    // Create the new bill object
    const newBill = {
        ...bill, // Copy relevant details (name, amount, recurring info)
        id: generateId(), // New unique ID
        dueDate: nextDueDateString,
        paid: false // New instance is unpaid
    };

    return newBill;
}


// --- Make functions globally accessible if called directly from HTML ---
// (Consider using event delegation later for cleaner code)
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
