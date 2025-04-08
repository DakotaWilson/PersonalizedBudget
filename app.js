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
const VERSION = "2.3.0"; // Updated version if desired
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
    // User registered successfully
    currentUser = userCredential.user;

    // Initialize user's data
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
    // User logged in successfully
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
    // Clear local data on logout
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
    // Sample data
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

    // Check if user already has data (check one collection is usually enough)
    const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).limit(1).get();
    if (incomesSnapshot.empty) {
      // Initialize sample data
      const batch = db.batch();

      // Add incomes
      for (const income of sampleIncomes) {
        const docRef = db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(income.id);
        batch.set(docRef, income);
      }

      // Add bills
      for (const bill of sampleBills) {
        const docRef = db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).doc(bill.id);
        batch.set(docRef, bill);
      }

      // Add expenses
      for (const expense of sampleExpenses) {
        const docRef = db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).doc(expense.id);
        batch.set(docRef, expense);
      }

      // Log activity
      const activityLogEntry = { // Renamed variable
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: "Account created with sample data",
        type: "auth"
      };
      const logRef = db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(activityLogEntry.id);
      batch.set(logRef, activityLogEntry);

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

    if (!currentUser) {
      hideLoading();
      return;
    }

    const userId = currentUser.uid;

    // Load incomes
    const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get();
    incomes = incomesSnapshot.docs.map(doc => doc.data());

    // Load bills
    const billsSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).get();
    bills = billsSnapshot.docs.map(doc => doc.data());

    // Ensure all bills have paid status and recurring properties
    bills = bills.map(bill => ({
      ...bill,
      paid: bill.paid !== undefined ? bill.paid : false,
      recurring: bill.recurring !== undefined ? bill.recurring : false,
      recurrencePattern: bill.recurrencePattern || RECURRENCE_PATTERNS.NONE
    }));

    // Load expenses
    const expensesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get();
    expenses = expensesSnapshot.docs.map(doc => doc.data());

    // Ensure all expenses have notes field
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

    hideLoading();

    // Update UI
    userEmailDisplay.textContent = currentUser.email;
    changeTab('dashboard'); // Always start on dashboard after loading

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
    const newLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      type,
      details
    };

    // Add to Firestore
    await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(newLog.id).set(newLog);

    // Update local array (and keep it limited)
    activityLog.unshift(newLog);
    if (activityLog.length > 50) {
        activityLog.pop(); // Keep the log size manageable in memory
    }

    // Show save indicator
    showSaveIndicator();

  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// Generate next recurring bill based on recurrence pattern
function generateNextRecurringBill(bill) {
  if (!bill.dueDate) return null; // Safety check

  const [year, month, day] = bill.dueDate.split('-').map(Number);

  // Create a new bill object
  const newBill = {
    ...bill,
    id: generateId(),
    paid: false
  };

  // Calculate the next due date based on recurrence pattern
  // Use UTC to avoid timezone shifts affecting the date calculation
  const dueDate = new Date(Date.UTC(year, month - 1, day));

  switch (bill.recurrencePattern) {
    case RECURRENCE_PATTERNS.MONTHLY:
      dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);
      break;
    case RECURRENCE_PATTERNS.WEEKLY:
      dueDate.setUTCDate(dueDate.getUTCDate() + 7);
      break;
    case RECURRENCE_PATTERNS.BIWEEKLY:
      dueDate.setUTCDate(dueDate.getUTCDate() + 14);
      break;
    case RECURRENCE_PATTERNS.QUARTERLY:
      dueDate.setUTCMonth(dueDate.getUTCMonth() + 3);
      break;
    case RECURRENCE_PATTERNS.YEARLY:
      dueDate.setUTCFullYear(dueDate.getUTCFullYear() + 1);
      break;
    default:
      return null; // Return null if not recurring or invalid pattern
  }

  // Format the new due date back to YYYY-MM-DD
  const nextYear = dueDate.getUTCFullYear();
  const nextMonth = String(dueDate.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(dueDate.getUTCDate()).padStart(2, '0');
  newBill.dueDate = `${nextYear}-${nextMonth}-${nextDay}`;

  return newBill;
}

// Show the save indicator
function showSaveIndicator() {
  const indicator = document.getElementById('save-indicator');
  indicator.classList.add('visible');

  // Hide after 2 seconds
  setTimeout(() => {
    indicator.classList.remove('visible');
  }, 2000);
}

// Generate a unique ID
function generateId() {
  // More robust ID generation
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// UI functions
function showApp() {
  loginScreen.style.display = 'none';
  budgetApp.style.display = 'block';
  loadData(); // Load data when showing the app
}

function hideApp() {
  budgetApp.style.display = 'none';
  loginScreen.style.display = 'block';
  document.getElementById('email-input').value = '';
  document.getElementById('password-input').value = '';
  loginError.classList.add('hidden'); // Hide any previous login errors
}

// Format helpers
function formatCurrency(amount) {
    // Handle non-numeric inputs gracefully
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
        return "$0.00"; // Or some other default/error indicator
    }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numericAmount);
}

function formatDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return "Invalid Date";
  // Handles YYYY-MM-DD format reliably without timezone issues for display
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    // Check if parts are valid numbers
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "Invalid Date";
    // Create date object using UTC to prevent timezone shifts from changing the date
    const date = new Date(Date.UTC(year, month - 1, day));
    // Use locale formatting, specifying UTC to ensure correct date display
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
      return date.toLocaleString('en-US'); // Use local time zone for activity log timestamps
  } catch (e) {
      console.error("Error formatting datetime:", dateString, e);
      return "Invalid Timestamp";
  }
}

// Calendar helper functions
function getDaysInMonth(year, month) {
  // Month is 0-indexed here
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
   // Month is 0-indexed here
  return new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday
}

function getPreviousMonth(year, month) {
  if (month === 0) { // January
    return { year: year - 1, month: 11 }; // December of previous year
  }
  return { year, month: month - 1 };
}

function getNextMonth(year, month) {
  if (month === 11) { // December
    return { year: year + 1, month: 0 }; // January of next year
  }
  return { year, month: month + 1 };
}

function getBillsForDay(year, month, day) {
  // month is 0-indexed here
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return bills.filter(bill => bill.dueDate === dateString);
}

// Calculate totals
function calculateTotals() {
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Calculate total for unpaid bills only
  const totalUnpaidBills = bills
    .filter(bill => !bill.paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = totalIncome - totalUnpaidBills - totalExpenses; // Balance often calculated against unpaid bills

  const totalPaidBills = bills
    .filter(bill => bill.paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Calculate total savings (specific expense category)
  const totalSavings = expenses
    .filter(expense => expense.category === "Savings")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return { totalIncome, totalBills: totalUnpaidBills, totalExpenses, balance, totalPaidBills, totalSavings };
}

// Group expenses by category
function getExpensesByCategory() {
  const result = {};
  expenses.forEach(expense => {
    const category = expense.category || "Uncategorized"; // Handle missing category
    if (!result[category]) {
      result[category] = 0;
    }
    result[category] += Number(expense.amount || 0);
  });
  return result;
}

// Change tab function
function changeTab(tabName) {
  // Update active tab styling
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeTabElement = document.getElementById(`tab-${tabName}`);
   if (activeTabElement) {
       activeTabElement.classList.add('active');
   } else {
       console.warn(`Tab element not found: tab-${tabName}`);
       // Optionally default to dashboard if tab not found
       document.getElementById('tab-dashboard')?.classList.add('active');
       tabName = 'dashboard';
   }


  // Update content area
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = ''; // Clear previous content

  // Render the correct content based on the tab
  if (tabName === 'dashboard') {
    renderDashboard(contentDiv);
  } else if (tabName === 'income') {
    renderIncomeTracker(contentDiv);
  } else if (tabName === 'bills') {
    renderBillTracker(contentDiv);
  } else if (tabName === 'expenses') {
    renderExpenseTracker(contentDiv);
  }
}

// Render dashboard
function renderDashboard(container) {
  const { totalIncome, totalBills, totalExpenses, balance, totalPaidBills, totalSavings } = calculateTotals();
  const expensesByCategory = getExpensesByCategory();

  // Initialize with current month and year for the calendar
  const currentDate = new Date();
  const calendarInitialYear = currentDate.getFullYear();
  const calendarInitialMonth = currentDate.getMonth(); // 0-indexed

  // Store month and year as data attributes for use in calendar navigation
  // Ensure container exists before setting dataset
    if (container) {
        container.dataset.calendarYear = calendarInitialYear;
        container.dataset.calendarMonth = calendarInitialMonth;
    } else {
        console.error("Dashboard container not found for setting dataset.");
        return; // Exit if container is missing
    }

  let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <h3 class="stat-label income-label">Total Income</h3>
          <p class="stat-value income-value">${formatCurrency(totalIncome)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label bills-label">Unpaid Bills</h3>
          <p class="stat-value bills-value">${formatCurrency(totalBills)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label expenses-label">Total Expenses</h3>
          <p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label balance-label">Est. Balance</h3>
          <p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">
            ${formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Savings Summary</h2>
      <div class="stat-card w-full">
        <h3 class="stat-label savings-label">Total Savings</h3>
        <p class="stat-value savings-value">${formatCurrency(totalSavings)}</p>
      </div>
    </div>

    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title m-0">Bills Calendar</h2>
        <div class="flex items-center">
          <button id="prev-month" class="calendar-nav-btn">❮</button>
          <h3 id="calendar-title" class="text-gray-300 mx-4">${MONTH_NAMES[calendarInitialMonth]} ${calendarInitialYear}</h3>
          <button id="next-month" class="calendar-nav-btn">❯</button>
        </div>
      </div>
      <div id="bills-calendar" class="calendar-container">
        <div class="calendar-header">
          ${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        </div>
        <div class="calendar-body">
          ${generateCalendarDays(calendarInitialYear, calendarInitialMonth)}
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Expense Breakdown</h2>
      <div class="space-y-3">
  `;

  const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);

  if (Object.keys(expensesByCategory).length > 0 && totalExpenseAmount > 0) {
    Object.entries(expensesByCategory).sort(([,a], [,b]) => b - a).forEach(([category, amount]) => { // Sort by amount desc
      const percentage = (amount / totalExpenseAmount) * 100;
      const progressBarColor = category === 'Savings' ? '#3b82f6' : '#059669'; // Blue for savings

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
    html += `<p class="text-gray-400">No expense data to display</p>`;
  }

  html += `
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Upcoming Bills (This Month)</h2>
      <div class="space-y-3">
  `;

  // --- UPDATED LOGIC for Upcoming Bills ---
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison
  const currentMonth = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();

  const upcomingBillsThisMonth = bills
    .filter(bill => {
      if (bill.paid || !bill.dueDate) return false; // Filter out paid bills and bills without due dates

      // Parse date parts to create date object correctly using UTC
      const [year, month, day] = bill.dueDate.split('-').map(Number);
       if (isNaN(year) || isNaN(month) || isNaN(day)) return false; // Invalid date format
      const dueDate = new Date(Date.UTC(year, month - 1, day));

      // Check if the bill is due in the *current* month and year,
      // and its due date is on or after today.
      return year === currentYear &&
             month - 1 === currentMonth && // Compare 0-indexed months
             dueDate >= today;
    })
    .sort((a, b) => {
      // Sort by due date (using UTC dates for consistency)
      const [yearA, monthA, dayA] = a.dueDate.split('-').map(Number);
      const [yearB, monthB, dayB] = b.dueDate.split('-').map(Number);
      return new Date(Date.UTC(yearA, monthA - 1, dayA)) - new Date(Date.UTC(yearB, monthB - 1, dayB));
    })
    .slice(0, 5); // Show top 5 for the current month

  if (upcomingBillsThisMonth.length > 0) {
    upcomingBillsThisMonth.forEach(bill => {
      const recurringIcon = bill.recurring ?
        `<span class="ml-2 text-blue-300 recurring-icon" title="Recurring: ${bill.recurrencePattern}">↻</span>` : '';

      html += `
        <div class="flex justify-between items-center border-b border-gray-700 pb-2">
          <div>
            <div class="font-medium text-gray-300">
              ${bill.name || 'Unnamed Bill'}${recurringIcon}
            </div>
            <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
          </div>
          <div class="flex items-center">
            <div class="text-yellow-300 font-medium mr-4">${formatCurrency(bill.amount)}</div>
            <button class="toggle-paid-btn mark-paid-btn"
              onclick="toggleBillPaid('${bill.id}', true)">
              Mark Paid
            </button>
          </div>
        </div>
      `;
    });
  } else {
    html += `<p class="text-gray-400">No upcoming unpaid bills for the rest of this month.</p>`;
  }
  // --- END OF UPDATED LOGIC ---

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Add event listeners for calendar navigation only if buttons exist
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');

  if(prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => navigateCalendar(container, 'prev'));
  }
  if(nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => navigateCalendar(container, 'next'));
  }
}

// Generate calendar days HTML
function generateCalendarDays(year, month) {
  let html = '';
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month); // 0 = Sunday
  const currentDate = new Date();
  currentDate.setHours(0,0,0,0); // For accurate 'today' comparison

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += `<div class="calendar-day calendar-day-empty"></div>`;
  }

  // Add calendar days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(Date.UTC(year, month, day)); // Use UTC
    const dayBills = getBillsForDay(year, month, day);
    const hasUnpaidBills = dayBills.some(bill => !bill.paid);
    const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

    let dayClass = "calendar-day";
    if (hasUnpaidBills) {
      dayClass += " calendar-day-has-bills";
    }

    // Check if it's today (compare UTC dates)
    const todayDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
    if (dayDate.getTime() === todayDate.getTime()) {
      dayClass += " calendar-day-today";
    }

    html += `
      <div class="${dayClass}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">
        <div class="calendar-day-number">${day}</div>
    `;

    if (dayBills.length > 0) {
      html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div>`;

      // Display bills on this day (maximum 2 to avoid overflow)
      const shownBills = dayBills.slice(0, 2);
      html += `<div class="calendar-day-bills">`;

      shownBills.forEach(bill => {
        const isPaid = bill.paid;
        html += `
          <div class="calendar-day-bill ${isPaid ? 'bill-paid' : 'bill-unpaid'}"
               title="${bill.name}: ${formatCurrency(bill.amount)} (${isPaid ? 'Paid' : 'Unpaid'})">
            ${bill.name && bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : (bill.name || 'Bill')}
          </div>
        `;
      });

      if (dayBills.length > 2) {
        html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`;
      }

      html += `</div>`;
    }

    html += `</div>`;
  }
    // Add empty cells to complete the grid if needed
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
        html += `<div class="calendar-day calendar-day-empty"></div>`;
    }


  return html;
}


// Navigate the calendar
function navigateCalendar(container, direction) {
  // Ensure container and dataset exist
    if (!container || !container.dataset || container.dataset.calendarYear === undefined || container.dataset.calendarMonth === undefined) {
        console.error("Cannot navigate calendar: container or dataset missing.");
        return;
    }
  let year = parseInt(container.dataset.calendarYear, 10);
  let month = parseInt(container.dataset.calendarMonth, 10); // 0-indexed

  if (isNaN(year) || isNaN(month)) {
      console.error("Invalid year/month in calendar dataset:", container.dataset.calendarYear, container.dataset.calendarMonth);
      // Reset to current month/year as fallback
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
  }

  if (direction === 'prev') {
    const prev = getPreviousMonth(year, month);
    year = prev.year;
    month = prev.month;
  } else if (direction === 'next') {
    const next = getNextMonth(year, month);
    year = next.year;
    month = next.month;
  }

  // Update data attributes
  container.dataset.calendarYear = year;
  container.dataset.calendarMonth = month;

  // Update calendar title
  const calendarTitle = document.getElementById('calendar-title');
  if(calendarTitle) {
    calendarTitle.textContent = `${MONTH_NAMES[month]} ${year}`;
  }

  // Regenerate calendar body
  const calendarBody = container.querySelector('.calendar-body');
  if(calendarBody) {
    calendarBody.innerHTML = generateCalendarDays(year, month);
  } else {
      console.error("Calendar body not found during navigation.");
  }
}

// Render income tracker
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
      <h2 class="card-title">Income History</h2>
      <div id="income-list" class="mt-4">
        <!-- Income entries will be added here -->
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Show/hide custom source field
  const sourceSelect = document.getElementById('income-source');
  const customSourceContainer = document.getElementById('custom-source-container');
  const customSourceInput = document.getElementById('income-custom-source');

  sourceSelect.addEventListener('change', function() {
    const isOther = this.value === 'Other';
    customSourceContainer.style.display = isOther ? 'block' : 'none';
    customSourceInput.required = isOther; // Make custom input required only if 'Other' is selected
  });

  // Render income list
  renderIncomeList();

  // Add income form submission
  document.getElementById('add-income-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission

    const sourceValue = sourceSelect.value;
    const customSourceValue = customSourceInput.value.trim();
    const amountValue = document.getElementById('income-amount').value;
    const dateValue = document.getElementById('income-date').value;

    // Basic validation (HTML5 required attributes handle most)
    if (sourceValue === 'Other' && !customSourceValue) {
        alert('Please specify the source for "Other" income.');
        customSourceInput.focus();
        return;
    }

    const finalSource = sourceValue === 'Other' ? customSourceValue : sourceValue;

    const newIncome = {
      id: generateId(),
      source: finalSource,
      amount: Number(amountValue),
      date: dateValue // date input already provides YYYY-MM-DD format
    };

    if (!currentUser) {
        alert("Not logged in. Cannot add income.");
        return;
    }

    try {
      showLoading();

      // Add to Firestore
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(newIncome.id).set(newIncome);

      // Add to local array
      incomes.push(newIncome);

      // Log activity
      await logActivity(`Added income: ${finalSource} - ${formatCurrency(newIncome.amount)}`, 'income', newIncome);

      // Reset form
      this.reset(); // Resets the form elements
      customSourceContainer.style.display = 'none'; // Hide custom source again

      hideLoading();

      // Update income list and potentially dashboard if visible
      renderIncomeList();
      if (document.getElementById('tab-dashboard').classList.contains('active')) {
        renderDashboard(document.getElementById('content'));
      }
    } catch (error) {
      hideLoading();
      console.error("Error adding income:", error);
      alert("Failed to add income. Please try again.");
    }
  });
}

// Render income list
function renderIncomeList() {
  const container = document.getElementById('income-list');
    if(!container) return; // Safety check

  if (incomes.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
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

    // Sort incomes by date (newest first) using UTC for reliable sorting
    const sortedIncomes = [...incomes].sort((a, b) => {
        try {
            const [yearA, monthA, dayA] = (a.date || '').split('-').map(Number);
            const [yearB, monthB, dayB] = (b.date || '').split('-').map(Number);
            if(isNaN(yearA) || isNaN(yearB)) return 0; // Handle invalid dates
            const dateA = new Date(Date.UTC(yearA, monthA - 1, dayA));
            const dateB = new Date(Date.UTC(yearB, monthB - 1, dayB));
            return dateB - dateA; // Newest first
         } catch (e) {
            return 0; // Keep original order on error
         }
    });

    sortedIncomes.forEach(income => {
      html += `
        <tr class="border-b border-gray-700 hover:bg-gray-700">
          <td class="p-2 text-gray-300">${income.source || 'N/A'}</td>
          <td class="p-2 text-gray-300">${formatDate(income.date)}</td>
          <td class="p-2 text-right text-green-300 font-medium">${formatCurrency(income.amount)}</td>
          <td class="p-2 text-center">
            <button class="text-red-400 hover:text-red-300 text-xs px-2 py-1" onclick="deleteIncome('${income.id}')">
              Delete
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } else {
    container.innerHTML = `<p class="text-gray-400 text-center">No income entries yet.</p>`;
  }
}

// Delete income
async function deleteIncome(id) {
  if (!currentUser) {
      alert("Not logged in.");
      return;
  }
  if (!confirm("Are you sure you want to delete this income entry?")) {
      return;
  }

  try {
    showLoading();

    // Find the income to delete for logging purposes
    const incomeToDelete = incomes.find(i => i.id === id);
    if (!incomeToDelete) {
        console.warn("Income entry not found locally:", id);
        // Attempt deletion anyway, maybe it only exists in Firestore?
    }

    // Delete from Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete();

    // Delete from local array
    incomes = incomes.filter(i => i.id !== id);

    // Log activity (even if local find failed, log based on ID)
    const logDetails = incomeToDelete || { id: id, note: 'Local data missing' };
    const logAction = incomeToDelete
        ? `Deleted income: ${incomeToDelete.source} - ${formatCurrency(incomeToDelete.amount)}`
        : `Deleted income (ID: ${id})`;
    await logActivity(logAction, 'delete', logDetails);

    hideLoading();

    // Update UI
    renderIncomeList(); // Update the list on the income tab
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content')); // Update dashboard if active
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting income:", error);
    alert("Failed to delete income. Please try again.");
  }
}

// Render bill tracker
function renderBillTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Bill</h2>
      <form id="add-bill-form">
        <div class="form-grid">
          <div>
            <label for="bill-name" class="form-label">Bill Name</label>
            <input type="text" id="bill-name" class="form-input" placeholder="e.g., Rent, Netflix" required>
          </div>

          <div>
            <label for="bill-amount" class="form-label">Amount</label>
            <input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required>
          </div>

          <div>
            <label for="bill-due-date" class="form-label">Due Date</label>
            <input type="date" id="bill-due-date" class="form-input" required>
          </div>
        </div>

        <div class="mt-4 flex items-center mb-4">
          <input type="checkbox" id="bill-recurring" class="mr-2 h-4 w-4 text-blue-600 accent-blue-500">
          <label for="bill-recurring" class="form-label mb-0 cursor-pointer">Recurring Bill</label>
        </div>

        <div id="recurrence-options" class="mb-4" style="display: none;">
          <label for="recurrence-pattern" class="form-label">Recurrence Pattern</label>
          <select id="recurrence-pattern" class="form-select">
            <option value="${RECURRENCE_PATTERNS.MONTHLY}">Monthly</option>
            <option value="${RECURRENCE_PATTERNS.WEEKLY}">Weekly</option>
            <option value="${RECURRENCE_PATTERNS.BIWEEKLY}">Bi-weekly (Every 2 Weeks)</option>
            <option value="${RECURRENCE_PATTERNS.QUARTERLY}">Quarterly (Every 3 Months)</option>
            <option value="${RECURRENCE_PATTERNS.YEARLY}">Yearly</option>
          </select>
        </div>

        <div class="mt-4">
          <button type="submit" id="add-bill-btn" class="btn btn-yellow">Add Bill</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h2 class="card-title">Bill List</h2>
      <div class="mb-4">
        <div class="flex justify-between items-center mb-2">
          <div class="flex border border-gray-600 rounded overflow-hidden">
            <button id="show-all-bills" class="bg-gray-700 text-white px-3 py-1 hover:bg-gray-600 active-filter">All</button>
            <button id="show-unpaid-bills" class="bg-gray-700 text-white px-3 py-1 border-l border-r border-gray-600 hover:bg-gray-600">Unpaid</button>
            <button id="show-paid-bills" class="bg-gray-700 text-white px-3 py-1 hover:bg-gray-600">Paid</button>
          </div>
           <!-- Optional: Add sorting controls here -->
        </div>
      </div>
      <div id="bill-list" class="mt-4">
        <!-- Bill entries will be added here -->
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Show/hide recurrence options
  const recurringCheckbox = document.getElementById('bill-recurring');
  const recurrenceOptions = document.getElementById('recurrence-options');
  const recurrenceSelect = document.getElementById('recurrence-pattern');

  recurringCheckbox.addEventListener('change', function() {
    const isChecked = this.checked;
    recurrenceOptions.style.display = isChecked ? 'block' : 'none';
    recurrenceSelect.required = isChecked; // Make pattern selection required if recurring
  });

  // Setup filter button listeners
  const filterButtons = container.querySelectorAll('#show-all-bills, #show-unpaid-bills, #show-paid-bills');
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active-filter'));
      // Add active class to the clicked button
      this.classList.add('active-filter');

      // Determine filter type and re-render list
      let filterType = 'all';
      if (this.id === 'show-unpaid-bills') filterType = 'unpaid';
      if (this.id === 'show-paid-bills') filterType = 'paid';
      renderBillList(filterType);
    });
  });

  // Render bill list (default to 'all')
  renderBillList('all');

  // Add bill form submission
  document.getElementById('add-bill-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const nameValue = document.getElementById('bill-name').value.trim();
    const amountValue = document.getElementById('bill-amount').value;
    const dueDateValue = document.getElementById('bill-due-date').value;
    const isRecurring = recurringCheckbox.checked;
    const recurrencePatternValue = isRecurring
      ? recurrenceSelect.value
      : RECURRENCE_PATTERNS.NONE;

    const newBill = {
      id: generateId(),
      name: nameValue,
      amount: Number(amountValue),
      dueDate: dueDateValue, // date input already provides YYYY-MM-DD format
      paid: false,
      recurring: isRecurring,
      recurrencePattern: recurrencePatternValue
    };

    if (!currentUser) {
        alert("Not logged in. Cannot add bill.");
        return;
    }

    try {
      showLoading();

      // Add to Firestore
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(newBill.id).set(newBill);

      // Add to local array
      bills.push(newBill);

      // Log activity
      await logActivity(`Added ${isRecurring ? 'recurring' : ''} bill: ${nameValue} - ${formatCurrency(newBill.amount)}`, 'bill', newBill);

      // Reset form
      this.reset();
      recurrenceOptions.style.display = 'none'; // Hide recurrence options

      hideLoading();

      // Update bill list (maintain current filter)
      const activeFilterButton = document.querySelector('.active-filter');
      let currentFilter = 'all';
       if (activeFilterButton) {
           if (activeFilterButton.id === 'show-unpaid-bills') currentFilter = 'unpaid';
           if (activeFilterButton.id === 'show-paid-bills') currentFilter = 'paid';
       }
      renderBillList(currentFilter);
      if (document.getElementById('tab-dashboard').classList.contains('active')) {
        renderDashboard(document.getElementById('content')); // Update dashboard
      }
    } catch (error) {
      hideLoading();
      console.error("Error adding bill:", error);
      alert("Failed to add bill. Please try again.");
    }
  });
}

// Render bill list with filter option
function renderBillList(filter = 'all') {
  const container = document.getElementById('bill-list');
  if (!container) return;

  // Filter bills based on the selected filter
  let filteredBills = [...bills];
  if (filter === 'paid') {
    filteredBills = filteredBills.filter(bill => bill.paid);
  } else if (filter === 'unpaid') {
    filteredBills = filteredBills.filter(bill => !bill.paid);
  }

  if (filteredBills.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b border-gray-700">
              <th class="p-2 text-gray-300">Bill Name</th>
              <th class="p-2 text-gray-300">Due Date</th>
              <th class="p-2 text-gray-300">Status</th>
              <th class="p-2 text-right text-gray-300">Amount</th>
              <th class="p-2 text-center text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Sort bills by due date (using UTC for reliable sorting)
    const sortedBills = filteredBills.sort((a, b) => {
        try {
            const [yearA, monthA, dayA] = (a.dueDate || '').split('-').map(Number);
            const [yearB, monthB, dayB] = (b.dueDate || '').split('-').map(Number);
             if(isNaN(yearA) || isNaN(yearB)) return 0; // Handle invalid dates
            const dateA = new Date(Date.UTC(yearA, monthA - 1, dayA));
            const dateB = new Date(Date.UTC(yearB, monthB - 1, dayB));
            return dateA - dateB; // Sort oldest first for bills usually
         } catch(e) {
            return 0; // Keep original order on error
         }
    });

    sortedBills.forEach(bill => {
      // Add recurring icon if bill is recurring
      const recurringIcon = bill.recurring ?
        `<span class="ml-1 text-blue-300 recurring-icon text-xs" title="Recurring: ${bill.recurrencePattern}">↻</span>` : '';

      const statusClass = bill.paid ? 'text-green-300 paid-indicator-yes' : 'text-yellow-300 paid-indicator-no';
      const statusText = bill.paid ? 'Paid' : 'Unpaid';

      html += `
        <tr class="border-b border-gray-700 hover:bg-gray-700">
          <td class="p-2 text-gray-300 flex items-center">${bill.name || 'Unnamed Bill'}${recurringIcon}</td>
          <td class="p-2 text-gray-300">${formatDate(bill.dueDate)}</td>
          <td class="p-2">
            <span class="${statusClass}">${statusText}</span>
          </td>
          <td class="p-2 text-right text-yellow-300 font-medium">${formatCurrency(bill.amount)}</td>
          <td class="p-2 text-center">
            <div class="flex justify-center items-center space-x-2">
              ${!bill.paid ? `
                <button class="toggle-paid-btn mark-paid-btn text-xs"
                  onclick="toggleBillPaid('${bill.id}', true)">
                  Pay
                </button>
              ` : `
                <button class="toggle-paid-btn mark-unpaid-btn text-xs"
                  onclick="toggleBillPaid('${bill.id}', false)">
                  Unpay
                </button>
              `}
              <button class="text-red-400 hover:text-red-300 text-xs px-1" onclick="deleteBill('${bill.id}')">
                Del
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } else {
    const filterText = filter === 'all' ? '' : filter;
    container.innerHTML = `<p class="text-gray-400 text-center">No ${filterText} bills found.</p>`;
  }
}

// Toggle bill paid status
async function toggleBillPaid(id, paidStatus) {
  if (!currentUser) {
      alert("Not logged in.");
      return;
  }

  // Optional: Confirmation for marking as unpaid?
  // if (!paidStatus && !confirm("Mark this bill as unpaid?")) return;

  try {
    showLoading();

    // Find the bill to update
    const billIndex = bills.findIndex(b => b.id === id);
    if (billIndex === -1) {
      hideLoading();
      console.warn("Bill not found locally for toggling status:", id);
      // Still try to update Firestore
    }

    const bill = bills[billIndex] || { id: id, name: `Bill ID ${id}` }; // Use placeholder if not found locally

    // --- Firestore Update ---
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).update({ paid: paidStatus });

    // --- Local Data Update ---
     if (billIndex !== -1) {
        bills[billIndex].paid = paidStatus;
     } else {
         // If it wasn't found locally, maybe fetch it again? Or rely on next full loadData.
         // For now, we'll assume it will sync on next load or dashboard refresh.
     }


    // --- Log Activity ---
    await logActivity(`Marked bill '${bill.name}' as ${paidStatus ? 'paid' : 'unpaid'}`, 'bill', { id: bill.id, name: bill.name, paid: paidStatus, amount: bill.amount });

    // --- Recurring Bill Generation ---
    let nextBill = null;
    if (paidStatus && bill.recurring && bill.recurrencePattern !== RECURRENCE_PATTERNS.NONE) {
      nextBill = generateNextRecurringBill(bill);
      if (nextBill) {
        // Add next recurring bill to Firestore
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(nextBill.id).set(nextBill);
        // Add to local array
        bills.push(nextBill);
        // Log generation
        await logActivity(`Generated next recurring bill: ${nextBill.name} due ${formatDate(nextBill.dueDate)}`, 'bill', nextBill);
      }
    }

    hideLoading();

    // --- Update UI ---
    // Update the bill list (maintaining the current filter)
    if (document.getElementById('tab-bills').classList.contains('active')) {
       const activeFilterButton = document.querySelector('.active-filter');
       let currentFilter = 'all';
       if (activeFilterButton) {
           if (activeFilterButton.id === 'show-unpaid-bills') currentFilter = 'unpaid';
           if (activeFilterButton.id === 'show-paid-bills') currentFilter = 'paid';
       }
       renderBillList(currentFilter);
    }

    // Update the dashboard if it's active
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content'));
    }

  } catch (error) {
    hideLoading();
    console.error("Error updating bill paid status:", error);
    alert(`Failed to update bill status. Error: ${error.message}`);
    // Optional: Revert local change if Firestore failed?
    // if (billIndex !== -1) bills[billIndex].paid = !paidStatus;
  }
}


// Delete bill
async function deleteBill(id) {
    if (!currentUser) {
        alert("Not logged in.");
        return;
    }
   if (!confirm("Are you sure you want to delete this bill? This cannot be undone.")) {
       return;
   }

  try {
    showLoading();

    // Find the bill for logging
    const billToDelete = bills.find(b => b.id === id);

    // Delete from Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).delete();

    // Delete from local array
    bills = bills.filter(b => b.id !== id);

    // Log activity
    const logDetails = billToDelete || { id: id, note: 'Local data missing' };
     const logAction = billToDelete
         ? `Deleted bill: ${billToDelete.name} - ${formatCurrency(billToDelete.amount)}`
         : `Deleted bill (ID: ${id})`;
    await logActivity(logAction, 'delete', logDetails);

    hideLoading();

    // Update UI
     if (document.getElementById('tab-bills').classList.contains('active')) {
       const activeFilterButton = document.querySelector('.active-filter');
       let currentFilter = 'all';
       if (activeFilterButton) {
           if (activeFilterButton.id === 'show-unpaid-bills') currentFilter = 'unpaid';
           if (activeFilterButton.id === 'show-paid-bills') currentFilter = 'paid';
       }
       renderBillList(currentFilter);
     }
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content'));
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting bill:", error);
    alert("Failed to delete bill. Please try again.");
  }
}

// Render expense tracker
function renderExpenseTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Expense</h2>
      <form id="add-expense-form">
        <div class="form-grid">
          <div>
            <label for="expense-category" class="form-label">Category</label>
            <select id="expense-category" class="form-select" required>
              <option value="">-- Select Category --</option>
              <option value="Eating out">Eating out</option>
              <option value="Groceries">Groceries</option>
              <option value="Gas">Gas</option>
              <option value="Kyliee">Kyliee</option>
              <option value="Personal care">Personal care</option>
              <option value="Shopping">Shopping</option>
              <option value="Pets">Pets</option>
              <option value="Gifts">Gifts</option>
              <option value="Savings">Savings</option> <!-- Keep Savings here -->
              <option value="Entertainment">Entertainment</option>
              <option value="Utilities">Utilities</option>
              <option value="Transportation">Transportation</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label for="expense-amount" class="form-label">Amount</label>
            <input type="number" id="expense-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required>
          </div>

          <div>
            <label for="expense-date" class="form-label">Date</label>
            <input type="date" id="expense-date" class="form-input" required>
          </div>
        </div>

        <div class="mt-4">
          <label for="expense-notes" class="form-label">Notes (Optional)</label>
          <textarea id="expense-notes" class="form-input h-20" placeholder="Add details like 'Lunch with John' or 'Target run'"></textarea>
        </div>

        <div class="mt-4">
          <button type="submit" id="add-expense-btn" class="btn btn-red">Add Expense</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h2 class="card-title">Expense History</h2>
      <div id="expense-list" class="mt-4">
        <!-- Expense entries will be added here -->
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Render expense list
  renderExpenseList();

  // Add expense form submission
  document.getElementById('add-expense-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const categoryValue = document.getElementById('expense-category').value;
    const amountValue = document.getElementById('expense-amount').value;
    const dateValue = document.getElementById('expense-date').value;
    const notesValue = document.getElementById('expense-notes').value.trim();

    const newExpense = {
      id: generateId(),
      category: categoryValue,
      amount: Number(amountValue),
      date: dateValue, // date input already provides YYYY-MM-DD format
      notes: notesValue
    };

    if (!currentUser) {
        alert("Not logged in. Cannot add expense.");
        return;
    }

    try {
      showLoading();

      // Add to Firestore
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(newExpense.id).set(newExpense);

      // Add to local array
      expenses.push(newExpense);

      // Log activity
      await logActivity(`Added expense: ${categoryValue} - ${formatCurrency(newExpense.amount)}`, 'expense', newExpense);

      // Reset form
      this.reset();

      hideLoading();

      // Update expense list and potentially dashboard
      renderExpenseList();
      if (document.getElementById('tab-dashboard').classList.contains('active')) {
        renderDashboard(document.getElementById('content'));
      }
    } catch (error) {
      hideLoading();
      console.error("Error adding expense:", error);
      alert("Failed to add expense. Please try again.");
    }
  });
}

// Render expense list
function renderExpenseList() {
  const container = document.getElementById('expense-list');
    if(!container) return;

  if (expenses.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left border-b border-gray-700">
              <th class="p-2 text-gray-300">Category</th>
              <th class="p-2 text-gray-300">Date</th>
              <th class="p-2 text-gray-300">Notes</th>
              <th class="p-2 text-right text-gray-300">Amount</th>
              <th class="p-2 text-center text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Sort expenses by date (newest first) using UTC
    const sortedExpenses = [...expenses].sort((a, b) => {
        try {
            const [yearA, monthA, dayA] = (a.date || '').split('-').map(Number);
            const [yearB, monthB, dayB] = (b.date || '').split('-').map(Number);
             if(isNaN(yearA) || isNaN(yearB)) return 0;
            const dateA = new Date(Date.UTC(yearA, monthA - 1, dayA));
            const dateB = new Date(Date.UTC(yearB, monthB - 1, dayB));
            return dateB - dateA; // Newest first
        } catch (e) {
            return 0;
        }
    });

    sortedExpenses.forEach(expense => {
      const notesDisplay = expense.notes ? expense.notes : '-';
      // Conditional styling for Savings amount
      const amountClass = expense.category === 'Savings' ? 'text-blue-300 savings-amount' : 'text-red-300';

      html += `
        <tr class="border-b border-gray-700 hover:bg-gray-700">
          <td class="p-2 text-gray-300">${expense.category || 'N/A'}</td>
          <td class="p-2 text-gray-300">${formatDate(expense.date)}</td>
          <td class="p-2 text-gray-400">
            <div class="note-text" title="${expense.notes || ''}">${notesDisplay}</div>
          </td>
          <td class="p-2 text-right ${amountClass} font-medium">${formatCurrency(expense.amount)}</td>
          <td class="p-2 text-center">
            <div class="flex justify-center space-x-2">
              <button class="text-blue-400 hover:text-blue-300 text-xs px-1" onclick="editExpenseNotes('${expense.id}')">
                Edit
              </button>
              <button class="text-red-400 hover:text-red-300 text-xs px-1" onclick="deleteExpense('${expense.id}')">
                Del
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } else {
    container.innerHTML = `<p class="text-gray-400 text-center">No expense entries yet.</p>`;
  }
}

// Edit expense notes
function editExpenseNotes(id) {
  // Find the expense
  const expense = expenses.find(e => e.id === id);
  if (!expense) {
      alert("Expense not found.");
      return;
  }

  // Show the edit notes modal
  const modal = document.getElementById('edit-notes-modal');
  const notesTextarea = document.getElementById('edit-notes-textarea');
  const expenseIdField = document.getElementById('edit-expense-id');

  // Set the current notes and expense ID
  notesTextarea.value = expense.notes || '';
  expenseIdField.value = id;

  // Display the expense info in the modal
  document.getElementById('edit-notes-category').textContent = expense.category || 'N/A';
  document.getElementById('edit-notes-amount').textContent = formatCurrency(expense.amount);
  document.getElementById('edit-notes-date').textContent = formatDate(expense.date);

  // Show the modal
  modal.style.display = 'flex';
  notesTextarea.focus(); // Focus on the textarea
}

// Save updated notes
async function saveExpenseNotes() {
  if (!currentUser) {
      alert("Not logged in.");
      return;
  }

  const id = document.getElementById('edit-expense-id').value;
  const newNotes = document.getElementById('edit-notes-textarea').value.trim();

  // Find the expense index
  const expenseIndex = expenses.findIndex(e => e.id === id);
  if (expenseIndex === -1) {
      alert("Expense not found locally. Cannot save notes.");
      hideEditNotesModal(); // Hide modal anyway
      return;
  }
    const expense = expenses[expenseIndex];


  // Only proceed if notes actually changed
  if (expense.notes === newNotes) {
      hideEditNotesModal(); // No changes, just close
      return;
  }

  try {
    showLoading();

    // Update in Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).update({ notes: newNotes });

     // Update the notes locally
    expenses[expenseIndex].notes = newNotes;

    // Log activity
    await logActivity(`Updated notes for expense: ${expense.category}`, 'expense', {id: expense.id, category: expense.category, notes: newNotes});

    hideLoading();

    // Hide the modal
    hideEditNotesModal();

    // Update UI
    renderExpenseList(); // Refresh the list to show updated notes

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
  // Clear fields for next time
  const expenseIdField = document.getElementById('edit-expense-id');
  const notesTextarea = document.getElementById('edit-notes-textarea');
  if(expenseIdField) expenseIdField.value = '';
  if(notesTextarea) notesTextarea.value = '';

}

// Delete expense
async function deleteExpense(id) {
   if (!currentUser) {
        alert("Not logged in.");
        return;
    }
   if (!confirm("Are you sure you want to delete this expense?")) {
       return;
   }

  try {
    showLoading();

    // Find the expense for logging
    const expenseToDelete = expenses.find(e => e.id === id);

    // Delete from Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).delete();

    // Delete from local array
    expenses = expenses.filter(e => e.id !== id);

    // Log activity
    const logDetails = expenseToDelete || { id: id, note: 'Local data missing' };
    const logAction = expenseToDelete
        ? `Deleted expense: ${expenseToDelete.category} - ${formatCurrency(expenseToDelete.amount)}`
        : `Deleted expense (ID: ${id})`;
    await logActivity(logAction, 'delete', logDetails);

    hideLoading();

    // Update UI
    renderExpenseList(); // Update expense tab list
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content')); // Update dashboard if active
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting expense:", error);
    alert("Failed to delete expense. Please try again.");
  }
}

// Activity log functions
function showActivityLog() {
  const modal = document.getElementById('activity-log-modal');
  const logContent = document.getElementById('activity-log-content');
  if (!modal || !logContent) return;

  modal.style.display = 'flex';

  if (activityLog.length === 0) {
    logContent.innerHTML = `<p class="text-gray-400 text-center py-4">No activity recorded yet.</p>`;
    return;
  }

  let html = `<div class="space-y-2">`; // Reduced spacing slightly

  // Activity log is already sorted newest first from loadData/logActivity
  activityLog.forEach(log => {
    html += `
      <div class="log-entry text-sm">
        <div class="log-date text-xs">${formatDateTime(log.timestamp)}</div>
        <div class="log-action">${log.action || 'Unknown action'}</div>
        <!-- Optionally add more details here if needed -->
      </div>
    `;
  });

  html += `</div>`;
  logContent.innerHTML = html;
  // Scroll to top of log content
  logContent.scrollTop = 0;
}

function hideActivityLog() {
  const modal = document.getElementById('activity-log-modal');
   if (modal) {
    modal.style.display = 'none';
   }
}

// Initialize App Listeners
function initializeApp() {
    // Set up Firebase auth state change listener
    auth.onAuthStateChanged(user => {
      if (user) {
        // User is signed in
        if (!currentUser || currentUser.uid !== user.uid) { // Avoid reloading if user hasn't changed
             console.log("Auth state changed: User signed in", user.email);
             currentUser = user;
             showApp(); // This calls loadData()
        }
      } else {
        // User is signed out
         if (currentUser) { // Only run if a user was previously logged in
            console.log("Auth state changed: User signed out");
            currentUser = null;
            hideApp();
         }
      }
    }, error => {
        // Handle errors in the auth listener itself
        console.error("Auth state listener error:", error);
        showError("Authentication error. Please refresh the page.");
        hideLoading();
        hideApp(); // Go back to login on auth error
    });

    // Initialize login button
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', function() {
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('password-input').value;

            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }
            loginUser(email, password);
        });
    }

    // Initialize register button
    const registerButton = document.getElementById('register-button');
    if (registerButton) {
        registerButton.addEventListener('click', function() {
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('password-input').value;

            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }
            registerUser(email, password);
        });
    }

    // Allow Enter key to submit login/register from password field
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
        passwordInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                // Determine if email is also filled to attempt login/register
                const email = document.getElementById('email-input').value;
                if (email) {
                     // Prioritize login if both fields filled on Enter
                     document.getElementById('login-button').click();
                }
            }
        });
    }

    // Close modals when clicking outside content (optional but good UX)
     window.addEventListener('click', function(event) {
         const activityModal = document.getElementById('activity-log-modal');
         const notesModal = document.getElementById('edit-notes-modal');

         if (event.target === activityModal) {
             hideActivityLog();
         }
         if (event.target === notesModal) {
            hideEditNotesModal();
         }
     });

     // Add listeners for modal close buttons inside the modals (redundant OK)
    const activityCloseBtn = document.querySelector('#activity-log-modal .modal-close');
    if(activityCloseBtn) activityCloseBtn.addEventListener('click', hideActivityLog);
    const notesCloseBtn = document.querySelector('#edit-notes-modal .modal-close');
    if(notesCloseBtn) notesCloseBtn.addEventListener('click', hideEditNotesModal);
    const notesCancelBtn = document.querySelector('#edit-notes-modal button[onclick="hideEditNotesModal()"]'); // The cancel button
    if(notesCancelBtn) notesCancelBtn.addEventListener('click', hideEditNotesModal);


    // Set app version if element exists
    const appSubtitle = document.querySelector('.app-subtitle');
    if(appSubtitle) {
        appSubtitle.textContent = `v${VERSION}`;
    }
}


// Wait for DOM content to load before initializing
document.addEventListener('DOMContentLoaded', initializeApp);


// Add global functions needed by inline HTML event handlers
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
