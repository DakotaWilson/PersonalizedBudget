// app.js
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWoRetxkIjcr2IFtaDzy6O86QID5AgHvw",
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
const VERSION = "2.4.0";
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

// Current filter settings
let currentFilterMonth = new Date().getMonth(); // Current month (0-based index)
let currentFilterYear = new Date().getFullYear(); // Current year

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

    // Check if user already has data
    const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get();
    if (incomesSnapshot.empty) {
      // Initialize sample data
      const batch = db.batch();
      
      // Add incomes
      for (const income of sampleIncomes) {
        <label class="form-label">Notes</label>
        <textarea id="expense-notes" class="form-input h-20" placeholder="Add notes about this expense (optional)"></textarea>
      </div>
      
      <div class="mt-4">
        <button id="add-expense-btn" class="btn btn-red">Add Expense</button>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Expense History</h2>
      <div id="expense-list">
        <!-- Expense entries will be added here -->
      </div>
    </div>
  `;const docRef = db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(income.id);
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
      const activityLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: "Account created with sample data",
        type: "auth"
      };
      const logRef = db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(activityLog.id);
      batch.set(logRef, activityLog);
      
      await batch.commit();
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
    changeTab('dashboard');
    
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
    
    // Update local array
    activityLog.unshift(newLog);
    
    // Show save indicator
    showSaveIndicator();
    
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// Generate next recurring bill based on recurrence pattern
function generateNextRecurringBill(bill) {
  const [year, month, day] = bill.dueDate.split('-').map(Number);
  
  // Create a new bill object
  const newBill = {
    ...bill,
    id: generateId(),
    paid: false
  };
  
  // Calculate the next due date based on recurrence pattern
  const dueDate = new Date(year, month - 1, day);
  
  switch (bill.recurrencePattern) {
    case RECURRENCE_PATTERNS.MONTHLY:
      dueDate.setMonth(dueDate.getMonth() + 1);
      break;
    case RECURRENCE_PATTERNS.WEEKLY:
      dueDate.setDate(dueDate.getDate() + 7);
      break;
    case RECURRENCE_PATTERNS.BIWEEKLY:
      dueDate.setDate(dueDate.getDate() + 14);
      break;
    case RECURRENCE_PATTERNS.QUARTERLY:
      dueDate.setMonth(dueDate.getMonth() + 3);
      break;
    case RECURRENCE_PATTERNS.YEARLY:
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      break;
    default:
      return null; // Return null if not recurring
  }
  
  // Format the new due date
  const nextMonth = String(dueDate.getMonth() + 1).padStart(2, '0');
  const nextDay = String(dueDate.getDate()).padStart(2, '0');
  newBill.dueDate = `${dueDate.getFullYear()}-${nextMonth}-${nextDay}`;
  
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
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
}

// Format helpers
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "";
  // Fix timezone issues by handling the date string directly
  if (dateString.includes('T')) {
    // If it's an ISO string, create a date object
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } else {
    // If it's a YYYY-MM-DD format, parse it directly to prevent timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Month filter functions
function setFilterMonth(year, month) {
  currentFilterYear = year;
  currentFilterMonth = month;
  
  // Update active month tab
  updateActiveMonthTab();
  
  // Re-render the current tab content
  const activeTab = document.querySelector('.tab.active').id.replace('tab-', '');
  changeTab(activeTab);
}

function updateActiveMonthTab() {
  // Remove active class from all month tabs
  document.querySelectorAll('.month-tab').forEach(tab => {
    tab.classList.remove('active-month');
  });
  
  // Add active class to current month tab
  const activeMonthTab = document.getElementById(`month-tab-${currentFilterMonth}-${currentFilterYear}`);
  if (activeMonthTab) {
    activeMonthTab.classList.add('active-month');
  }
}

function generateMonthTabs() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let html = '<div class="month-tabs-container">';
  
  // Generate tabs for the past 3 months, current month, and next 2 months
  for (let i = -3; i <= 2; i++) {
    let tabMonth = currentMonth + i;
    let tabYear = currentYear;
    
    // Adjust for month overflow
    if (tabMonth < 0) {
      tabMonth += 12;
      tabYear -= 1;
    } else if (tabMonth > 11) {
      tabMonth -= 12;
      tabYear += 1;
    }
    
    const isActive = (tabMonth === currentFilterMonth && tabYear === currentFilterYear) ? 'active-month' : '';
    
    html += `
      <button id="month-tab-${tabMonth}-${tabYear}" 
              class="month-tab ${isActive}" 
              onclick="setFilterMonth(${tabYear}, ${tabMonth})">
        ${MONTH_NAMES[tabMonth]} ${tabYear}
      </button>
    `;
  }
  
  html += '</div>';
  return html;
}

// Filter data by month
function filterDataByMonth(data, dateField) {
  return data.filter(item => {
    const [year, month] = item[dateField].split('-').map(Number);
    return year === currentFilterYear && month - 1 === currentFilterMonth;
  });
}

// Calendar helper functions
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getPreviousMonth(year, month) {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

function getNextMonth(year, month) {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}

function getBillsForDay(year, month, day) {
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  return bills.filter(bill => {
    // Check if this bill falls on the specified date
    if (bill.dueDate === dateString) {
      return true;
    }
    return false;
  });
}

// Calculate totals for filtered data
function calculateTotals() {
  // Filter data by selected month
  const filteredIncomes = filterDataByMonth(incomes, 'date');
  const filteredExpenses = filterDataByMonth(expenses, 'date');
  
  // Filter bills by selected month
  const filteredBills = bills.filter(bill => {
    const [year, month] = bill.dueDate.split('-').map(Number);
    return year === currentFilterYear && month - 1 === currentFilterMonth;
  });
  
  const totalIncome = filteredIncomes.reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Calculate total for unpaid bills only
  const totalBills = filteredBills
    .filter(bill => !bill.paid)
    .reduce((sum, item) => sum + Number(item.amount), 0);
    
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIncome - totalBills - totalExpenses;
  
  const totalPaidBills = filteredBills
    .filter(bill => bill.paid)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Calculate total savings
  const totalSavings = filteredExpenses
    .filter(expense => expense.category === "Savings")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  
  return { totalIncome, totalBills, totalExpenses, balance, totalPaidBills, totalSavings };
}

// Group expenses by category for filtered data
function getExpensesByCategory() {
  // Filter expenses by selected month
  const filteredExpenses = filterDataByMonth(expenses, 'date');
  
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

// Change tab function
function changeTab(tabName) {
  // Update active tab
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  // Update content
  const contentDiv = document.getElementById('content');
  
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
  
  // Set calendar to display the filtered month/year
  const calendarYear = currentFilterYear;
  const calendarMonth = currentFilterMonth;
  
  // Store month and year as data attributes for use in navigation
  container.dataset.calendarYear = calendarYear;
  container.dataset.calendarMonth = calendarMonth;
  
  let html = `
    ${generateMonthTabs()}
    
    <div class="card">
      <h2 class="card-title">Financial Summary</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <h3 class="stat-label income-label">Income</h3>
          <p class="stat-value income-value">${formatCurrency(totalIncome)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label bills-label">Unpaid Bills</h3>
          <p class="stat-value bills-value">${formatCurrency(totalBills)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label expenses-label">Expenses</h3>
          <p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label balance-label">Balance</h3>
          <p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">
            ${formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Savings Summary</h2>
      <div class="stat-card w-full">
        <h3 class="stat-label balance-label">Total Savings</h3>
        <p class="stat-value balance-value-positive">${formatCurrency(totalSavings)}</p>
      </div>
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
        <div class="calendar-header">
          ${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        </div>
        <div class="calendar-body">
  `;
  
  // Generate calendar days
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOfMonth = getFirstDayOfMonth(calendarYear, calendarMonth);
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += `<div class="calendar-day calendar-day-empty"></div>`;
  }
  
  // Add calendar days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayBills = getBillsForDay(calendarYear, calendarMonth, day);
    const hasUnpaidBills = dayBills.some(bill => !bill.paid);
    const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
    
    let dayClass = "calendar-day";
    if (hasUnpaidBills) {
      dayClass += " calendar-day-has-bills";
    }
    
    // Check if it's today
    const currentDate = new Date();
    const isToday = calendarYear === currentDate.getFullYear() && 
                    calendarMonth === currentDate.getMonth() && 
                    day === currentDate.getDate();
    
    if (isToday) {
      dayClass += " calendar-day-today";
    }
    
    html += `
      <div class="${dayClass}">
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
            ${bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : bill.name}
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
  
  html += `
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Expense Breakdown</h2>
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
            <span class="text-gray-300">
              ${formatCurrency(amount)} (${percentage.toFixed(1)}%)
            </span>
          </div>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    });
  } else {
    html += `<p class="text-gray-400">No expense data to display for this month</p>`;
  }
  
  html += `
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Upcoming Bills</h2>
      <div class="space-y-3">
  `;
  
  // Fix timezone issues when comparing dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  // Filter bills by selected month
  const filteredBills = bills.filter(bill => {
    const [year, month] = bill.dueDate.split('-').map(Number);
    return year === currentFilterYear && month - 1 === currentFilterMonth;
  });
  
  const upcomingBills = filteredBills
    .filter(bill => {
      // Filter out paid bills
      if (bill.paid) return false;
      
      // Parse date parts to create date object correctly
      const [year, month, day] = bill.dueDate.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day);
      return dueDate >= today;
    })
    .sort((a, b) => {
      // Sort by due date
      const [yearA, monthA, dayA] = a.dueDate.split('-').map(Number);
      const [yearB, monthB, dayB] = b.dueDate.split('-').map(Number);
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    })
    .slice(0, 5);
  
  if (upcomingBills.length > 0) {
    upcomingBills.forEach(bill => {
      const recurringIcon = bill.recurring ? 
        `<span class="ml-2 text-blue-300" title="${bill.recurrencePattern}">↻</span>` : '';
        
      html += `
        <div class="flex justify-between border-b border-gray-700 pb-2">
          <div>
            <div class="font-medium text-gray-300">
              ${bill.name}${recurringIcon}
            </div>
            <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
          </div>
          <div class="flex items-center">
            <div class="text-yellow-300 font-medium mr-4">${formatCurrency(bill.amount)}</div>
            <button class="bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded text-sm" 
              onclick="toggleBillPaid('${bill.id}', true)">
              Mark Paid
            </button>
          </div>
        </div>
      `;
    });
  } else {
    html += `<p class="text-gray-400">No upcoming bills for this month</p>`;
  }
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Add event listeners for calendar navigation
  document.getElementById('prev-month').addEventListener('click', function() {
    navigateCalendar(container, 'prev');
  });
  
  document.getElementById('next-month').addEventListener('click', function() {
    navigateCalendar(container, 'next');
  });
}

// Navigate the calendar
function navigateCalendar(container, direction) {
  let year = parseInt(container.dataset.calendarYear);
  let month = parseInt(container.dataset.calendarMonth);
  
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
  document.getElementById('calendar-title').textContent = `${MONTH_NAMES[month]} ${year}`;
  
  // Regenerate calendar body
  const calendarBody = document.querySelector('.calendar-body');
  let html = '';
  
  // Generate calendar days
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += `<div class="calendar-day calendar-day-empty"></div>`;
  }
  
  // Get the current date for today highlighting
  const currentDate = new Date();
  
  // Add calendar days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayBills = getBillsForDay(year, month, day);
    const hasUnpaidBills = dayBills.some(bill => !bill.paid);
    const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
    
    let dayClass = "calendar-day";
    if (hasUnpaidBills) {
      dayClass += " calendar-day-has-bills";
    }
    
    // Check if it's today
    const isToday = year === currentDate.getFullYear() && 
                    month === currentDate.getMonth() && 
                    day === currentDate.getDate();
    
    if (isToday) {
      dayClass += " calendar-day-today";
    }
    
    html += `
      <div class="${dayClass}">
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
            ${bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : bill.name}
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
  
  calendarBody.innerHTML = html;
  
  // Update the month filter if this is a calendar navigation
  if (year !== currentFilterYear || month !== currentFilterMonth) {
    setFilterMonth(year, month);
  }
